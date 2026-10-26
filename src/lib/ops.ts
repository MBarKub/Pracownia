// Operacje na danych — przeniesione z Pracowni v4 („data ops” i pomocnicze widoków)
import type { Project, Task, TaskStatus, Note } from './model';
import { app, arr, removeDoc, save, toast } from './store.svelte';
import { PCOLORS } from './skins';
import { clone, dayDiff, fmtShort, fmtWd, uid } from './util';
import { ui } from './ui.svelte';

export type WithId<T> = T & { id: string };

export function createTask(f: Partial<Task> = {}) {
	const id = uid();
	const now = Date.now();
	app.data.tasks[id] = {
		title: '',
		status: 'todo',
		priority: 0,
		due: '',
		projectId: '',
		subtasks: [],
		notes: '',
		createdAt: now,
		doneAt: null,
		updatedAt: now,
		...f
	};
	save('tasks', id);
	return id;
}

export function createProject(f: Partial<Project> = {}) {
	const id = uid();
	const now = Date.now();
	const n = Object.keys(app.data.projects).length;
	app.data.projects[id] = {
		name: '',
		icon: '',
		color: PCOLORS[n % PCOLORS.length],
		status: 'active',
		due: '',
		client: '',
		rate: 0,
		blocks: [],
		createdAt: now,
		updatedAt: now,
		...f
	};
	save('projects', id);
	return id;
}

export function createNote(f: Partial<Note> = {}) {
	const id = uid();
	const now = Date.now();
	app.data.notes[id] = {
		title: '',
		projectId: '',
		tags: [],
		pinned: false,
		blocks: [],
		createdAt: now,
		updatedAt: now,
		...f
	};
	save('notes', id);
	return id;
}

export function setTaskStatus(id: string, s: TaskStatus) {
	const t = app.data.tasks[id];
	if (!t) return;
	t.status = s;
	t.doneAt = s === 'done' ? Date.now() : null;
	save('tasks', id);
}

export function toggleTask(id: string) {
	const t = app.data.tasks[id];
	if (t) setTaskStatus(id, t.status === 'done' ? 'todo' : 'done');
}

export function delTask(id: string) {
	const t = app.data.tasks[id];
	if (!t) return;
	const copy = clone(t);
	if (ui.taskOpen === id) ui.taskOpen = null;
	removeDoc('tasks', id);
	toast('Usunięto zadanie', 'Cofnij', () => {
		app.data.tasks[id] = copy;
		save('tasks', id);
	});
}

export const taskSort = (a: Task, b: Task) =>
	(a.due || '9999').localeCompare(b.due || '9999') ||
	(b.priority || 0) - (a.priority || 0) ||
	(a.createdAt || 0) - (b.createdAt || 0);

/** Otwarte = wszystko poza zrobionymi (także wstrzymane). */
export const openTasks = () => arr('tasks').filter((t) => t.status !== 'done');
/** Aktywne = otwarte bez wstrzymanych: plan dnia, liczniki, „następne zadanie”. */
export const activeTasks = () => openTasks().filter((t) => t.status !== 'paused');

export function progress(pid: string) {
	const ts = arr('tasks').filter((t) => t.projectId === pid);
	return { total: ts.length, done: ts.filter((t) => t.status === 'done').length };
}

export function dueInfo(d: string) {
	if (!d) return null;
	const diff = dayDiff(d);
	const label =
		diff === 0
			? 'Dziś'
			: diff === 1
				? 'Jutro'
				: diff === -1
					? 'Wczoraj'
					: diff > 1 && diff < 7
						? fmtWd(d)
						: fmtShort(d);
	return { label, cls: diff < 0 ? 'over' : diff === 0 ? 'today' : '' };
}

export const projectsSorted = () =>
	arr('projects').sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));

export const L = () => app.settings.labels;

export const clients = () =>
	[
		...new Set(
			arr('projects')
				.map((p) => (p.client || '').trim())
				.filter(Boolean)
		)
	].sort((a, b) => a.localeCompare(b, 'pl'));

/** Usuwa notatkę z możliwością cofnięcia; zwraca projekt, do którego należała */
export function delNote(id: string, onUndo?: () => void) {
	const n = app.data.notes[id];
	if (!n) return '';
	const copy = clone(n);
	removeDoc('notes', id);
	toast('Usunięto notatkę', 'Cofnij', () => {
		app.data.notes[id] = copy;
		save('notes', id);
		onUndo?.();
	});
	return copy.projectId;
}

/** Usuwa projekt; zadania, notatki i wpisy czasu zostają bez projektu (cofnięcie przywraca powiązania) */
export function delProject(id: string, onUndo?: () => void) {
	const p = app.data.projects[id];
	if (!p) return;
	const copy = clone(p);
	const linked: ['tasks' | 'notes' | 'time', string][] = [];
	for (const c of ['tasks', 'notes', 'time'] as const)
		for (const [xid, x] of Object.entries(app.data[c]))
			if (x.projectId === id) {
				linked.push([c, xid]);
				x.projectId = '';
				save(c, xid, 50);
			}
	removeDoc('projects', id);
	toast(
		`Usunięto projekt${linked.length ? '. Zadania i notatki zostały bez projektu' : ''}`,
		'Cofnij',
		() => {
			app.data.projects[id] = copy;
			save('projects', id);
			// powiązania zapisujemy po projekcie, żeby klucz obcy w bazie już istniał
			setTimeout(() => {
				for (const [c, xid] of linked) {
					const x = app.data[c][xid];
					if (x) {
						x.projectId = id;
						save(c, xid);
					}
				}
			}, 600);
			onUndo?.();
		}
	);
}
