// Stan aplikacji i synchronizacja z Supabase.
// Port mechanizmu z Pracowni v4: lokalne zmiany od razu w interfejsie, zapis z opóźnieniem,
// echo z Realtime ignorowane dla dokumentów, które mają niezapisane lokalne zmiany.
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase, configured } from './supabase';
import { fromRow, toRow, TABLE } from './mappers';
import { COLLECTIONS, type CollectionName, type Collections, type Settings } from './model';
import { applySkin, joinSettings, mergeSettings, splitSettings } from './skins';
import { clone, lsGet, lsSet, stable } from './util';

type Store = { [C in CollectionName]: Record<string, Collections[C]> };

class AppState {
	session = $state<Session | null>(null);
	authReady = $state(false);
	workspaceId = $state('');
	workspaceName = $state('');
	role = $state<'owner' | 'member' | ''>('');
	dbState = $state<'connecting' | 'on' | 'off'>(configured ? 'connecting' : 'off');
	loaded = $state(false);
	settings = $state<Settings>(mergeSettings(lsGet('pracownia-settings-cache')));
	data = $state<Store>({ projects: {}, tasks: {}, notes: {}, time: {} });
	toastMsg = $state<{ msg: string; action?: string; fn?: () => void } | null>(null);

	get userId() {
		return this.session?.user.id || '';
	}
}

export const app = new AppState();

/* ---------- toast ---------- */
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, action?: string, fn?: () => void) {
	app.toastMsg = { msg, action, fn };
	clearTimeout(toastT);
	toastT = setTimeout(() => (app.toastMsg = null), action ? 6000 : 2800);
}

/* ---------- odczyt ---------- */
export function arr<C extends CollectionName>(c: C): (Collections[C] & { id: string })[] {
	return Object.entries(app.data[c]).map(([id, v]) => ({ ...(v as Collections[C]), id }));
}
export function getDoc<C extends CollectionName>(c: C, id: string): Collections[C] | undefined {
	return app.data[c][id] as Collections[C] | undefined;
}

/* ---------- zapis ---------- */
// celowo nie reaktywne: to stan kolejki zapisu, nie interfejsu
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const dirty = new Set<string>();
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
const inflight: Record<string, { again: boolean }> = {};

/** Oznacza dokument jako zmieniony i zapisuje go po `delay` ms. */
export function save(c: CollectionName | 'settings', id: string, delay = 0) {
	const key = c + '/' + id;
	if (c !== 'settings') {
		const d = app.data[c][id];
		if (d) d.updatedAt = Date.now();
	}
	dirty.add(key);
	clearTimeout(timers[key]);
	timers[key] = setTimeout(() => {
		delete timers[key];
		flush(c, id);
	}, delay);
}

async function flush(c: CollectionName | 'settings', id: string) {
	const key = c + '/' + id;
	if (inflight[key]) {
		inflight[key].again = true;
		return;
	}
	if (c === 'settings') lsSet('pracownia-settings-cache', $state.snapshot(app.settings));
	const doc = c === 'settings' ? app.settings : app.data[c][id];
	if (!doc || app.dbState !== 'on' || !app.workspaceId) {
		if (!timers[key]) dirty.delete(key);
		return;
	}
	inflight[key] = { again: false };
	try {
		if (c === 'settings') await writeSettings();
		else {
			const row = toRow(c, id, $state.snapshot(doc) as Collections[typeof c], app.workspaceId);
			const { error } = await supabase.from(TABLE[c]).upsert(row);
			if (error) throw error;
		}
	} catch (e) {
		dbError(e);
	}
	const again = inflight[key].again;
	delete inflight[key];
	if (again) flush(c, id);
	else if (!timers[key]) dirty.delete(key);
}

async function writeSettings() {
	const { personal, workspace } = splitSettings($state.snapshot(app.settings) as Settings);
	const r1 = await supabase.from('user_settings').upsert({ user_id: app.userId, data: personal });
	if (r1.error) throw r1.error;
	if (app.role === 'owner') {
		const r2 = await supabase
			.from('workspaces')
			.update({ settings: workspace })
			.eq('id', app.workspaceId);
		if (r2.error) throw r2.error;
	}
}

export async function removeDoc(c: CollectionName, id: string) {
	const key = c + '/' + id;
	clearTimeout(timers[key]);
	delete timers[key];
	delete app.data[c][id];
	dirty.add(key);
	if (app.dbState === 'on') {
		const { error } = await supabase.from(TABLE[c]).delete().eq('id', id);
		if (error) dbError(error);
	}
	dirty.delete(key);
}

function dbError(e: unknown) {
	const err = e as { code?: string; message?: string };
	console.error('[db]', err);
	if (err?.code === '23505' && /running/.test(err.message || ''))
		toast('Masz już uruchomiony stoper.');
	else if (err?.code === '42501') toast('Brak uprawnień do tej zmiany.');
	else toast('Problem z zapisem. Spróbuję ponownie przy następnej zmianie.');
}

/** Czy są niezapisane zmiany (ostrzeżenie przy zamykaniu karty) */
export const hasPending = () => dirty.size > 0;

/* ---------- start i Realtime ---------- */
let channel: RealtimeChannel | null = null;

async function selectAll(table: string) {
	const out: Record<string, unknown>[] = [];
	const page = 1000;
	for (let from = 0; ; from += page) {
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.eq('workspace_id', app.workspaceId)
			.range(from, from + page - 1);
		if (error) throw error;
		out.push(...(data || []));
		if (!data || data.length < page) break;
	}
	return out;
}

function applyRemote(
	c: CollectionName,
	type: string,
	row: Record<string, unknown> | null,
	oldRow: Record<string, unknown> | null
) {
	const id = String((row && row.id) || (oldRow && oldRow.id) || '');
	if (!id || dirty.has(c + '/' + id)) return;
	if (type === 'DELETE') {
		delete app.data[c][id];
		return;
	}
	if (!row) return;
	const next = fromRow(c, row);
	const cur = app.data[c][id];
	if (!cur || stable($state.snapshot(cur)) !== stable(next)) app.data[c][id] = next as never;
}

export async function startSync() {
	if (!app.session) return;
	app.dbState = 'connecting';
	try {
		const { data: mem, error } = await supabase
			.from('workspace_members')
			.select('workspace_id, role, workspaces(name, settings)')
			.eq('user_id', app.userId)
			.order('created_at')
			.limit(1)
			.single();
		if (error) throw error;
		app.workspaceId = mem.workspace_id;
		app.role = mem.role as 'owner' | 'member';
		const ws = mem.workspaces as unknown as { name: string; settings: unknown } | null;
		app.workspaceName = ws?.name || '';
		const us = await supabase
			.from('user_settings')
			.select('data')
			.eq('user_id', app.userId)
			.maybeSingle();
		app.settings = joinSettings(us.data?.data, ws?.settings);
		lsSet('pracownia-settings-cache', $state.snapshot(app.settings));
		applySkin(app.settings);

		const fresh: Store = { projects: {}, tasks: {}, notes: {}, time: {} };
		await Promise.all(
			COLLECTIONS.map(async (c) => {
				for (const r of await selectAll(TABLE[c]))
					(fresh[c] as Record<string, unknown>)[String(r.id)] = fromRow(c, r);
			})
		);
		app.data = fresh;
		app.loaded = true;
		app.dbState = 'on';

		channel?.unsubscribe();
		let ch = supabase.channel('ws:' + app.workspaceId);
		for (const c of COLLECTIONS) {
			ch = ch.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: TABLE[c],
					filter: `workspace_id=eq.${app.workspaceId}`
				},
				(p) =>
					applyRemote(
						c,
						p.eventType,
						p.new as Record<string, unknown>,
						p.old as Record<string, unknown>
					)
			);
		}
		ch = ch
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'workspaces',
					filter: `id=eq.${app.workspaceId}`
				},
				(p) => {
					if (dirty.has('settings/app')) return;
					const row = p.new as { name: string; settings: unknown };
					app.workspaceName = row.name;
					const { personal } = splitSettings($state.snapshot(app.settings) as Settings);
					app.settings = joinSettings(personal, row.settings);
					applySkin(app.settings);
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_settings',
					filter: `user_id=eq.${app.userId}`
				},
				(p) => {
					if (dirty.has('settings/app')) return;
					const { workspace } = splitSettings($state.snapshot(app.settings) as Settings);
					const next = joinSettings((p.new as { data: unknown }).data, workspace);
					if (stable(next) !== stable($state.snapshot(app.settings))) {
						app.settings = next;
						applySkin(app.settings);
					}
				}
			);
		channel = ch.subscribe();
	} catch (e) {
		console.error(e);
		app.dbState = 'off';
		app.loaded = true;
		toast('Nie udało się połączyć z bazą.');
	}
}

export async function initAuth() {
	if (!configured) {
		app.authReady = true;
		return;
	}
	const { data } = await supabase.auth.getSession();
	app.session = data.session;
	app.authReady = true;
	if (app.session) startSync();
	supabase.auth.onAuthStateChange((event, session) => {
		const was = app.userId;
		app.session = session;
		if (event === 'SIGNED_OUT') {
			channel?.unsubscribe();
			channel = null;
			app.data = { projects: {}, tasks: {}, notes: {}, time: {} };
			app.loaded = false;
			app.workspaceId = '';
		} else if (session && session.user.id !== was) startSync();
	});
}

export const signOut = () => supabase.auth.signOut();

/** Do eksportu kopii — snapshot bez proxy */
export function snapshotData() {
	return clone($state.snapshot(app.data)) as Store;
}
