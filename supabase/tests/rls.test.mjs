// Test schematu i polityk RLS na wbudowanym Postgresie (PGlite): npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const q = async (sql, params) => { try { return await db.query(sql, params); } catch (e) { return { error: e.message }; } };

// Stuby Supabase: schemat auth, rola authenticated, auth.uid() z ustawienia sesji, publikacja realtime
await db.exec(`
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create publication supabase_realtime;
`);
await db.exec(readFileSync(new URL("../migrations/20261025000000_init.sql", import.meta.url), 'utf8'));
await db.exec(`grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;`);
console.log('migration OK');

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
await db.query(`insert into auth.users values ($1,'a@x'),($2,'b@x')`, [A, B]);
const wsA = (await db.query(`select workspace_id from workspace_members where user_id=$1`, [A])).rows[0].workspace_id;
const wsB = (await db.query(`select workspace_id from workspace_members where user_id=$1`, [B])).rows[0].workspace_id;
console.log('workspaces created:', !!wsA, !!wsB);

const as = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false);`);
  const r = await q(sql, params);
  await db.exec(`reset role;`);
  return r;
};
const check = (name, ok) => console.log((ok ? 'PASS ' : 'FAIL ') + name);

let r = await as(A, `insert into projects (id, workspace_id, name) values ('p1', $1, 'Projekt A')`, [wsA]);
check('A inserts project in own ws', !r.error);
r = await as(A, `insert into projects (id, workspace_id, name) values ('p2', $1, 'Hack')`, [wsB]);
check('A cannot insert into B ws', !!r.error);
r = await as(B, `select * from projects`);
check('B sees no A projects', r.rows.length === 0);
r = await as(A, `insert into tasks (id, workspace_id, project_id, title) values ('t1', $1, 'p1', 'Zadanie')`, [wsA]);
check('A inserts task with project', !r.error);
r = await as(A, `insert into time_entries (id, workspace_id, project_id, task_id, minutes, running, start_at) values ('e1', $1, 'p1', 't1', 0, true, now())`, [wsA]);
check('A starts timer', !r.error);
r = await as(A, `insert into time_entries (id, workspace_id, minutes, running) values ('e2', $1, 0, true)`, [wsA]);
check('second running timer rejected', !!r.error);
r = await as(A, `insert into time_entries (id, workspace_id, user_id, minutes) values ('e3', $1, $2, 30)`, [wsA, B]);
check('A cannot log time as B', !!r.error);
r = await as(A, `update tasks set title='Zmienione' where id='t1' returning updated_at`);
check('update touches updated_at', !r.error && r.rows.length === 1);
r = await as(A, `delete from projects where id='p1'`);
check('A deletes project', !r.error);
r = await as(A, `select project_id from tasks where id='t1'`);
check('task keeps workspace, loses project', r.rows[0]?.project_id === null);
r = await as(A, `select project_id, task_id from time_entries where id='e1'`);
check('time entry loses project, keeps task', r.rows[0]?.project_id === null && r.rows[0]?.task_id === 't1');
r = await as(B, `update workspaces set name='x' where id=$1 returning id`, [wsA]);
check('B cannot rename A ws', !r.error && r.rows.length === 0);
r = await as(A, `select data from user_settings`);
check('A sees only own settings', r.rows.length === 1);
r = await as(A, `insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')`, [wsB, A]);
check('A cannot join B ws', !!r.error);
