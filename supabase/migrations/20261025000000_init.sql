-- Pracownia — schemat początkowy
-- Przestrzenie robocze (workspaces) od pierwszego dnia: etap 1 używa jednej
-- osobistej przestrzeni na konto, etap 2 dołoży zaproszenia bez migracji danych.
--
-- Identyfikatory projektów, zadań, notatek i wpisów czasu są tekstowe,
-- w tym samym formacie co uid() w Pracowni v4, żeby import kopii JSON
-- przepisywał wiersze 1:1.


-- ---------------------------------------------------------------------------
-- Przestrzenie i członkostwo
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Moja pracownia',
  -- ustawienia wspólne: nazwy statusów i priorytetów, waluta, domyślna stawka, zaokrąglanie
  settings    jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Ustawienia osobiste: skórka, własne skórki, gęstość, zaokrąglenie, dane do raportu
create table public.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dane robocze
-- ---------------------------------------------------------------------------

create table public.projects (
  id           text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null default '',
  icon         text not null default '',
  color        text not null default '#3B6FE0',
  status       text not null default 'active' check (status in ('idea', 'active', 'paused', 'done')),
  due          date,
  client       text not null default '',
  rate         numeric(12, 2) not null default 0 check (rate >= 0),
  blocks       jsonb not null default '[]'::jsonb,
  example      boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, workspace_id)
);
create index projects_ws_idx on public.projects (workspace_id);

create table public.tasks (
  id           text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id   text,
  title        text not null default '',
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority     smallint not null default 0 check (priority between 0 and 3),
  due          date,
  subtasks     jsonb not null default '[]'::jsonb,
  notes        text not null default '',
  assignee     uuid references auth.users (id) on delete set null, -- etap 3
  example      boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  done_at      timestamptz,
  updated_at   timestamptz not null default now(),
  unique (id, workspace_id),
  -- projekt musi należeć do tej samej przestrzeni; usunięcie projektu zostawia zadanie bez projektu
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id)
    on delete set null (project_id)
);
create index tasks_ws_idx on public.tasks (workspace_id);
create index tasks_project_idx on public.tasks (project_id);

create table public.notes (
  id           text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id   text,
  title        text not null default '',
  tags         text[] not null default '{}',
  pinned       boolean not null default false,
  blocks       jsonb not null default '[]'::jsonb,
  source       text not null default '', -- nazwa importowanego pliku .md
  example      boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id)
    on delete set null (project_id)
);
create index notes_ws_idx on public.notes (workspace_id);

create table public.time_entries (
  id           text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   text,
  task_id      text,
  note         text not null default '',
  date         date not null default current_date,
  minutes      integer not null default 0 check (minutes >= 0),
  start_at     timestamptz,
  end_at       timestamptz,
  running      boolean not null default false,
  billable     boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id)
    on delete set null (project_id),
  foreign key (task_id, workspace_id) references public.tasks (id, workspace_id)
    on delete set null (task_id)
);
create index time_ws_date_idx on public.time_entries (workspace_id, date);
-- jeden działający stoper na osobę
create unique index time_one_running_per_user on public.time_entries (user_id) where running;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before update on public.workspaces    for each row execute function public.touch_updated_at();
create trigger touch before update on public.user_settings for each row execute function public.touch_updated_at();
-- Dla danych roboczych updated_at przychodzi z klienta (czas zmiany, do rozstrzygania konfliktów),
-- więc trigger ustawia go tylko wtedy, gdy klient go nie podał.
create or replace function public.default_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger touch before update on public.projects     for each row execute function public.default_updated_at();
create trigger touch before update on public.tasks        for each row execute function public.default_updated_at();
create trigger touch before update on public.notes        for each row execute function public.default_updated_at();
create trigger touch before update on public.time_entries for each row execute function public.default_updated_at();

-- ---------------------------------------------------------------------------
-- Uprawnienia (RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.user_settings     enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.notes             enable row level security;
alter table public.time_entries      enable row level security;

-- przestrzenie: widzą członkowie, zmienia właściciel; tworzy je tylko trigger rejestracji (na razie)
create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy ws_update on public.workspaces for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- członkostwo: widzą członkowie, zarządza właściciel (zaproszenia w etapie 2)
create policy wm_select on public.workspace_members for select to authenticated using (public.is_member(workspace_id));
create policy wm_insert on public.workspace_members for insert to authenticated with check (public.is_owner(workspace_id));
create policy wm_delete on public.workspace_members for delete to authenticated
  using (public.is_owner(workspace_id) and user_id <> auth.uid());

-- ustawienia osobiste: tylko własne
create policy us_all on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- dane robocze: pełny dostęp dla członków przestrzeni
create policy p_all on public.projects for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy t_all on public.tasks for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy n_all on public.notes for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- czas pracy: członkowie widzą wpisy całej przestrzeni (raporty zespołu),
-- ale dodają, zmieniają i usuwają tylko własne
create policy te_select on public.time_entries for select to authenticated using (public.is_member(workspace_id));
create policy te_insert on public.time_entries for insert to authenticated
  with check (public.is_member(workspace_id) and user_id = auth.uid());
create policy te_update on public.time_entries for update to authenticated
  using (user_id = auth.uid()) with check (public.is_member(workspace_id) and user_id = auth.uid());
create policy te_delete on public.time_entries for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Nowe konto → osobista przestrzeń
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  insert into public.workspaces (name, created_by) values ('Moja pracownia', new.id) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, new.id, 'owner');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- pełne stare wiersze w zdarzeniach usunięcia (potrzebne do filtrowania po workspace_id)
alter table public.projects     replica identity full;
alter table public.tasks        replica identity full;
alter table public.notes        replica identity full;
alter table public.time_entries replica identity full;
alter table public.workspaces   replica identity full;

alter publication supabase_realtime add table
  public.projects, public.tasks, public.notes, public.time_entries, public.workspaces, public.user_settings;
