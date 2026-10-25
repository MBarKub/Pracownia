// Zamiana model klienta (kształt v4) <-> wiersz bazy (snake_case, timestamptz, null)
import type { CollectionName, Collections, Note, Project, Task, TimeEntry } from './model';

export const TABLE: Record<CollectionName, string> = {
	projects: 'projects',
	tasks: 'tasks',
	notes: 'notes',
	time: 'time_entries'
};

type Row = Record<string, unknown>;

const ts = (v: unknown): number => (v ? Date.parse(String(v)) || 0 : 0);
const tsN = (v: unknown): number | null => (v ? Date.parse(String(v)) || null : null);
const toTs = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);
const str = (v: unknown) => (v == null ? '' : String(v));
const date = (v: string | undefined) => (v ? v : null);

export function fromRow<C extends CollectionName>(c: C, r: Row): Collections[C] {
	switch (c) {
		case 'projects':
			return {
				name: str(r.name),
				icon: str(r.icon),
				color: str(r.color) || '#3B6FE0',
				status: (r.status as Project['status']) || 'active',
				due: str(r.due),
				client: str(r.client),
				rate: Number(r.rate) || 0,
				blocks: (r.blocks as Project['blocks']) || [],
				...(r.example ? { example: true } : {}),
				createdAt: ts(r.created_at),
				updatedAt: ts(r.updated_at)
			} satisfies Project as Collections[C];
		case 'tasks':
			return {
				title: str(r.title),
				status: (r.status as Task['status']) || 'todo',
				priority: Number(r.priority) || 0,
				due: str(r.due),
				projectId: str(r.project_id),
				subtasks: (r.subtasks as Task['subtasks']) || [],
				notes: str(r.notes),
				...(r.example ? { example: true } : {}),
				createdAt: ts(r.created_at),
				doneAt: tsN(r.done_at),
				updatedAt: ts(r.updated_at)
			} satisfies Task as Collections[C];
		case 'notes':
			return {
				title: str(r.title),
				projectId: str(r.project_id),
				tags: (r.tags as string[]) || [],
				pinned: !!r.pinned,
				blocks: (r.blocks as Note['blocks']) || [],
				...(r.source ? { source: str(r.source) } : {}),
				...(r.example ? { example: true } : {}),
				createdAt: ts(r.created_at),
				updatedAt: ts(r.updated_at)
			} satisfies Note as Collections[C];
		case 'time':
			return {
				userId: str(r.user_id),
				projectId: str(r.project_id),
				taskId: str(r.task_id),
				note: str(r.note),
				date: str(r.date),
				minutes: Number(r.minutes) || 0,
				start: tsN(r.start_at),
				end: tsN(r.end_at),
				running: !!r.running,
				billable: r.billable !== false,
				createdAt: ts(r.created_at),
				updatedAt: ts(r.updated_at)
			} satisfies TimeEntry as Collections[C];
	}
	throw new Error('unknown collection ' + c);
}

export function toRow<C extends CollectionName>(
	c: C,
	id: string,
	d: Collections[C],
	workspaceId: string
): Row {
	const base = {
		id,
		workspace_id: workspaceId,
		created_at: toTs(d.createdAt) ?? new Date().toISOString(),
		updated_at: toTs(d.updatedAt) ?? new Date().toISOString()
	};
	switch (c) {
		case 'projects': {
			const p = d as Project;
			return {
				...base,
				name: p.name,
				icon: p.icon,
				color: p.color,
				status: p.status,
				due: date(p.due),
				client: p.client || '',
				rate: Number(p.rate) || 0,
				blocks: p.blocks || [],
				example: !!p.example
			};
		}
		case 'tasks': {
			const t = d as Task;
			return {
				...base,
				project_id: t.projectId || null,
				title: t.title,
				status: t.status,
				priority: Math.max(0, Math.min(3, Number(t.priority) || 0)),
				due: date(t.due),
				subtasks: t.subtasks || [],
				notes: t.notes || '',
				done_at: toTs(t.doneAt),
				example: !!t.example
			};
		}
		case 'notes': {
			const n = d as Note;
			return {
				...base,
				project_id: n.projectId || null,
				title: n.title,
				tags: n.tags || [],
				pinned: !!n.pinned,
				blocks: n.blocks || [],
				source: n.source || '',
				example: !!n.example
			};
		}
		case 'time': {
			const e = d as TimeEntry;
			const row: Row = {
				...base,
				project_id: e.projectId || null,
				task_id: e.taskId || null,
				note: e.note || '',
				date: e.date,
				minutes: Math.max(0, Math.round(e.minutes || 0)),
				start_at: toTs(e.start),
				end_at: toTs(e.end),
				running: !!e.running,
				billable: e.billable !== false
			};
			if (e.userId) row.user_id = e.userId;
			return row;
		}
	}
	throw new Error('unknown collection ' + c);
}
