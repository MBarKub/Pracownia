// Kopia zapasowa JSON: eksport i import (także kopii z Pracowni v4 na claude.ai)
import { supabase } from './supabase';
import { toRow, TABLE } from './mappers';
import {
	COLLECTIONS,
	type CollectionName,
	type Collections,
	type Note,
	type Project,
	type Task,
	type TimeEntry
} from './model';
import { app, save, snapshotData } from './store.svelte';
import { mergeSettings, applySkin } from './skins';
import { clone, todayISO } from './util';

export function exportObj() {
	return {
		app: 'pracownia',
		version: 3,
		exportedAt: new Date().toISOString(),
		settings: clone(app.settings),
		...snapshotData()
	};
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const dateStr = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function normProject(v: Any): Project {
	return {
		name: s(v.name),
		icon: s(v.icon),
		color: s(v.color) || '#3B6FE0',
		status: ['idea', 'active', 'paused', 'done'].includes(v.status) ? v.status : 'active',
		due: dateStr(v.due),
		client: s(v.client),
		rate: num(v.rate),
		blocks: Array.isArray(v.blocks) ? v.blocks : [],
		...(v.example ? { example: true } : {}),
		createdAt: num(v.createdAt, Date.now()),
		updatedAt: num(v.updatedAt, num(v.createdAt, Date.now()))
	};
}
function normTask(v: Any): Task {
	return {
		title: s(v.title),
		status: ['todo', 'doing', 'paused', 'done'].includes(v.status) ? v.status : 'todo',
		priority: Math.max(0, Math.min(3, num(v.priority))),
		due: dateStr(v.due),
		projectId: s(v.projectId),
		subtasks: Array.isArray(v.subtasks) ? v.subtasks : [],
		notes: s(v.notes),
		...(v.example ? { example: true } : {}),
		createdAt: num(v.createdAt, Date.now()),
		doneAt: v.doneAt ? num(v.doneAt) : null,
		updatedAt: num(v.updatedAt, num(v.createdAt, Date.now()))
	};
}
function normNote(v: Any): Note {
	return {
		title: s(v.title),
		projectId: s(v.projectId),
		tags: Array.isArray(v.tags) ? v.tags.map(String) : [],
		pinned: !!v.pinned,
		blocks: Array.isArray(v.blocks) ? v.blocks : [],
		...(v.source ? { source: s(v.source) } : {}),
		...(v.example ? { example: true } : {}),
		createdAt: num(v.createdAt, Date.now()),
		updatedAt: num(v.updatedAt, num(v.createdAt, Date.now()))
	};
}
function normTime(v: Any): TimeEntry {
	const e: TimeEntry = {
		userId: app.userId,
		projectId: s(v.projectId),
		taskId: s(v.taskId),
		note: s(v.note),
		date: dateStr(v.date) || todayISO(),
		minutes: Math.round(num(v.minutes)),
		start: v.start ? num(v.start) : null,
		end: v.end ? num(v.end) : null,
		running: false,
		billable: v.billable !== false,
		createdAt: num(v.createdAt, Date.now()),
		updatedAt: num(v.updatedAt, num(v.createdAt, Date.now()))
	};
	// stoper działający w chwili eksportu zapisujemy jako zakończony teraz
	if (v.running && e.start) {
		e.end = Date.now();
		e.minutes = Math.max(1, Math.round((e.end - e.start) / 60000));
	}
	return e;
}
const NORM = { projects: normProject, tasks: normTask, notes: normNote, time: normTime };

export interface ImportResult {
	counts: Record<CollectionName, number>;
	fixed: number;
}

/** Wczytuje kopię JSON (v2 z claude.ai albo v3 z forka) do bieżącej przestrzeni. */
export async function importBackup(
	obj: Any,
	onProgress?: (msg: string) => void
): Promise<ImportResult> {
	if (!obj || obj.app !== 'pracownia') throw new Error('To nie jest kopia z Pracowni.');
	const incoming = {} as { [C in CollectionName]: Record<string, Collections[C]> };
	for (const c of COLLECTIONS) {
		incoming[c] = {} as never;
		for (const [id, v] of Object.entries(obj[c] || {}))
			if (id && v && typeof v === 'object') (incoming[c] as Any)[id] = NORM[c](v);
	}
	// odwołania do usuniętych projektów i zadań zamieniamy na „bez projektu / bez zadania”
	const projectIds = new Set([
		...Object.keys(incoming.projects),
		...Object.keys(app.data.projects)
	]);
	const taskIds = new Set([...Object.keys(incoming.tasks), ...Object.keys(app.data.tasks)]);
	let fixed = 0;
	for (const c of ['tasks', 'notes', 'time'] as const)
		for (const d of Object.values(incoming[c]) as Any[])
			if (d.projectId && !projectIds.has(d.projectId)) {
				d.projectId = '';
				fixed++;
			}
	for (const d of Object.values(incoming.time))
		if (d.taskId && !taskIds.has(d.taskId)) {
			d.taskId = '';
			fixed++;
		}
	// najwyżej jeden działający stoper — import i tak wszystkie zatrzymuje

	const counts = { projects: 0, tasks: 0, notes: 0, time: 0 } as Record<CollectionName, number>;
	// kolejność ze względu na klucze obce: projekty → zadania → notatki → czas
	for (const c of COLLECTIONS) {
		const entries = Object.entries(incoming[c]);
		for (let i = 0; i < entries.length; i += 200) {
			const batch = entries.slice(i, i + 200);
			onProgress?.(`${label(c)}: ${Math.min(i + 200, entries.length)}/${entries.length}`);
			if (app.dbState === 'on') {
				const rows = batch.map(([id, d]) => toRow(c, id, d as never, app.workspaceId));
				const { error } = await supabase.from(TABLE[c]).upsert(rows);
				if (error) throw new Error(`${label(c)}: ${error.message}`);
			}
			for (const [id, d] of batch) (app.data[c] as Any)[id] = d;
			counts[c] += batch.length;
		}
	}
	if (obj.settings) {
		app.settings = mergeSettings(obj.settings);
		applySkin(app.settings);
		save('settings', 'app');
	}
	return { counts, fixed };
}

const label = (c: CollectionName) =>
	({ projects: 'Projekty', tasks: 'Zadania', notes: 'Notatki', time: 'Czas pracy' })[c];
