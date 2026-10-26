// Czas pracy: stoper, wpisy, formaty, stawki — port z Pracowni v6
import type { TimeEntry } from './model';
import { app, arr, removeDoc, save, toast } from './store.svelte';
import { setTaskStatus } from './ops';
import { clone, fmtLong, iso, todayISO, uid } from './util';

export type Entry = TimeEntry & { id: string };

/* ---------- zegar do odświeżania stopera (raz na sekundę, tylko gdy ktoś słucha) ---------- */
class Clock {
	now = $state(Date.now());
}
export const clock = new Clock();
let ticker: ReturnType<typeof setInterval> | undefined;
let listeners = 0;
/** Wywołaj w $effect komponentu, który pokazuje biegnący czas */
export function useClock() {
	listeners++;
	if (!ticker) ticker = setInterval(() => (clock.now = Date.now()), 1000);
	return () => {
		listeners--;
		if (!listeners && ticker) {
			clearInterval(ticker);
			ticker = undefined;
		}
	};
}

/* ---------- formaty ---------- */
const addD = (dt: Date, n: number) => {
	const x = new Date(dt);
	x.setDate(x.getDate() + n);
	return x;
};
export const fmtHM = (m: number) => {
	m = Math.round(m || 0);
	return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
export const fmtDur = (m: number) => {
	m = Math.round(m || 0);
	const h = Math.floor(m / 60),
		r = m % 60;
	return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
};
export const fmtClock = (ms: number) => {
	const s = Math.max(0, Math.floor(ms / 1000));
	return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
		.map((x) => String(x).padStart(2, '0'))
		.join(':');
};
export const fmtTime = (ts: number) =>
	new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
const num2 = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (v: number) =>
	num2.format(v || 0) + ' ' + (app.settings.time.currency || 'zł');
export const decH = (m: number) => num2.format((m || 0) / 60);

/** „1:30”, „1,5h”, „90m”, „2h 15min”, „1.5” → minuty; liczby do 8 traktujemy jako godziny */
export function parseDur(input: string): number | null {
	const s = String(input || '')
		.trim()
		.toLowerCase()
		.replace(/,/g, '.');
	if (!s) return null;
	const hm = s.match(/^(\d{1,3}):(\d{1,2})$/);
	if (hm) return +hm[1] * 60 + +hm[2] || null;
	if (/^\d+(\.\d+)?$/.test(s)) {
		const v = parseFloat(s);
		return Math.round(s.includes('.') || v <= 8 ? v * 60 : v) || null;
	}
	let tot = 0,
		hit = false;
	for (const mm of s.matchAll(/(\d+(?:\.\d+)?)\s*(h|godz|g|m|min)/g)) {
		hit = true;
		tot += mm[2].startsWith('m') ? parseFloat(mm[1]) : parseFloat(mm[1]) * 60;
	}
	return hit && tot > 0 ? Math.round(tot) : null;
}

export type RangeKey = 'week' | 'lastweek' | 'month' | 'lastmonth' | 'year' | 'all';
export function rangeFor(k: string): [string, string] {
	const d = new Date(),
		mon = addD(d, -((d.getDay() + 6) % 7));
	switch (k) {
		case 'week':
			return [iso(mon), iso(addD(mon, 6))];
		case 'lastweek':
			return [iso(addD(mon, -7)), iso(addD(mon, -1))];
		case 'month':
			return [
				iso(new Date(d.getFullYear(), d.getMonth(), 1)),
				iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
			];
		case 'lastmonth':
			return [
				iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
				iso(new Date(d.getFullYear(), d.getMonth(), 0))
			];
		case 'year':
			return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
		default:
			return ['0000-01-01', '9999-12-31'];
	}
}
export function fmtRange(a: string, b: string) {
	if (a.startsWith('0000')) return 'Cały okres';
	const A = new Date(a + 'T00:00'),
		B = new Date(b + 'T00:00');
	const dm = (x: Date) =>
		new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' }).format(x);
	if (a === b) return fmtLong(a);
	if (A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth())
		return `${A.getDate()}–${dm(B)} ${B.getFullYear()}`;
	if (A.getFullYear() === B.getFullYear()) return `${dm(A)} – ${dm(B)} ${B.getFullYear()}`;
	return `${fmtLong(a)} – ${fmtLong(b)}`;
}
export { addD };

/* ---------- dane ---------- */
const mine = (t: TimeEntry) => !t.userId || t.userId === app.userId || app.local;

/** Mój działający stoper (w przestrzeni zespołu inni mogą mieć własne) */
export const runningEntry = (): Entry | undefined => arr('time').find((t) => t.running && mine(t));
export const entryMin = (t: TimeEntry, now = Date.now()) =>
	t.running && t.start ? (now - t.start) / 60000 : t.minutes || 0;
export const rateFor = (pid: string) => {
	const r = Number(pid ? app.data.projects[pid]?.rate : 0) || 0;
	return r > 0 ? r : Number(app.settings.time.defaultRate) || 0;
};
export const timeEntries = (filter?: (t: Entry) => boolean) =>
	arr('time')
		.filter((t) => !t.running)
		.filter(filter || (() => true));

export function startTimer({ projectId = '', taskId = '', note = '' } = {}) {
	const prev = runningEntry();
	if (prev) stopTimer(prev.id, true);
	if (taskId && !projectId) projectId = app.data.tasks[taskId]?.projectId || '';
	const id = uid();
	const now = Date.now();
	app.data.time[id] = {
		userId: app.local ? undefined : app.userId,
		projectId,
		taskId,
		note,
		date: todayISO(),
		start: now,
		end: null,
		minutes: 0,
		running: true,
		billable: true,
		createdAt: now,
		updatedAt: now
	};
	// poprzedni stoper zapisuje się pierwszy (w bazie może działać tylko jeden na osobę)
	save('time', id, prev ? 400 : 0);
	if (taskId) {
		const t = app.data.tasks[taskId];
		if (t && t.status === 'todo') setTaskStatus(taskId, 'doing');
	}
	return id;
}

export function stopTimer(id: string, quiet = false, onEdit?: (id: string) => void) {
	const t = app.data.time[id];
	if (!t || !t.running || !t.start) return;
	t.end = Date.now();
	t.minutes = Math.max(1, Math.round((t.end - t.start) / 60000));
	t.running = false;
	t.date = iso(new Date(t.start));
	save('time', id);
	if (!quiet)
		toast(
			`Zapisano ${fmtDur(t.minutes)}`,
			onEdit ? 'Edytuj' : undefined,
			onEdit && (() => onEdit(id))
		);
}

export function delTime(id: string) {
	const t = app.data.time[id];
	if (!t) return;
	const copy = clone(t);
	removeDoc('time', id);
	toast('Usunięto wpis czasu', 'Cofnij', () => {
		app.data.time[id] = copy;
		save('time', id);
	});
}

/** Dane raportu (podgląd w oknie i PDF) */
export interface ReportOpts {
	scope: 'project' | 'client' | 'all';
	projectId: string;
	client: string;
	from: string;
	to: string;
	details: boolean;
	amounts: boolean;
	rounding: number;
}
export interface ReportRow {
	date: string;
	project: string;
	task: string;
	note: string;
	min: number;
	rate: number;
	bill: boolean;
	amount: number;
}
export function reportData(m: ReportOpts) {
	const a = m.from || '0000-01-01',
		b = m.to || '9999-12-31';
	let list = timeEntries((t) => t.date >= a && t.date <= b);
	if (m.scope === 'project') list = list.filter((t) => t.projectId === m.projectId);
	if (m.scope === 'client')
		list = list.filter((t) => (app.data.projects[t.projectId]?.client || '') === m.client);
	const step = +m.rounding || 0;
	const rows: ReportRow[] = list
		.sort(
			(x, y) =>
				x.date.localeCompare(y.date) ||
				(x.start || x.createdAt || 0) - (y.start || y.createdAt || 0)
		)
		.map((t) => {
			const min = step ? Math.ceil(t.minutes / step) * step : t.minutes;
			const p = app.data.projects[t.projectId],
				task = t.taskId ? app.data.tasks[t.taskId] : undefined;
			const rate = rateFor(t.projectId),
				bill = t.billable !== false;
			return {
				date: t.date,
				project: p?.name || 'Bez projektu',
				task: task?.title || '',
				note: t.note || '',
				min,
				rate,
				bill,
				amount: bill ? (min / 60) * rate : 0
			};
		});
	const key =
		m.scope === 'project' ? (r: ReportRow) => r.task || 'Bez zadania' : (r: ReportRow) => r.project;
	const groups = new Map<string, { name: string; min: number; amount: number }>();
	for (const r of rows) {
		const k = key(r);
		const g = groups.get(k) || { name: k, min: 0, amount: 0 };
		g.min += r.min;
		g.amount += r.amount;
		groups.set(k, g);
	}
	const total = rows.reduce((s, r) => s + r.min, 0),
		amount = rows.reduce((s, r) => s + r.amount, 0);
	const rates = [...new Set(rows.filter((r) => r.bill && r.rate).map((r) => r.rate))];
	let title = 'Wszystkie projekty',
		sub = '';
	if (m.scope === 'project') {
		const p = app.data.projects[m.projectId];
		title = p?.name || 'Projekt';
		sub = p?.client ? `Klient: ${p.client}` : '';
	}
	if (m.scope === 'client') {
		title = m.client || 'Klient';
		const ps = new Set(rows.map((r) => r.project)).size;
		sub = ps ? `${ps} ${ps === 1 ? 'projekt' : ps < 5 ? 'projekty' : 'projektów'}` : '';
	}
	return {
		rows,
		groups: [...groups.values()].sort((x, y) => y.min - x.min),
		total,
		amount,
		rates,
		title,
		sub,
		from: a,
		to: b,
		multiProject: m.scope !== 'project',
		showAmounts: m.amounts && amount > 0,
		details: m.details,
		step,
		groupLabel: m.scope === 'project' ? 'Zadanie' : 'Projekt'
	};
}
export type Report = ReturnType<typeof reportData>;
