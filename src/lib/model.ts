// Model danych po stronie klienta — celowo w tym samym kształcie co Pracownia v4
// (camelCase, znaczniki czasu w ms, '' zamiast null), żeby widoki dało się przenosić 1:1.
// Zamianę na wiersze bazy robi mappers.ts.

export type BlockType =
	| 'p'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'ul'
	| 'ol'
	| 'todo'
	| 'quote'
	| 'callout'
	| 'code'
	| 'mermaid'
	| 'mindmap'
	| 'hr';

export interface Block {
	id: string;
	type: BlockType;
	text: string;
	checked?: boolean;
	taskId?: string;
	/** tylko blok `mermaid`: silnik układu (domyślnie ELK) i wygląd (klasyczny albo szkic) */
	layout?: 'elk' | 'dagre';
	look?: 'classic' | 'handDrawn';
}

export type TaskStatus = 'todo' | 'doing' | 'paused' | 'done';
export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'paused', 'done'];
export type ProjectStatus = 'idea' | 'active' | 'paused' | 'done';

export interface Project {
	name: string;
	icon: string;
	color: string;
	status: ProjectStatus;
	due: string;
	client: string;
	rate: number;
	blocks: Block[];
	example?: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface Subtask {
	id: string;
	text: string;
	done: boolean;
}

export interface Task {
	title: string;
	status: TaskStatus;
	priority: number;
	due: string;
	projectId: string;
	subtasks: Subtask[];
	notes: string;
	example?: boolean;
	createdAt: number;
	doneAt: number | null;
	updatedAt: number;
}

export interface Note {
	title: string;
	projectId: string;
	tags: string[];
	pinned: boolean;
	blocks: Block[];
	source?: string;
	example?: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface TimeEntry {
	userId?: string;
	projectId: string;
	taskId: string;
	note: string;
	date: string;
	minutes: number;
	start: number | null;
	end: number | null;
	running: boolean;
	billable: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface Collections {
	projects: Project;
	tasks: Task;
	notes: Note;
	time: TimeEntry;
}
export type CollectionName = keyof Collections;
export const COLLECTIONS: CollectionName[] = ['projects', 'tasks', 'notes', 'time'];

export interface SkinPalette {
	bg: string;
	surface: string;
	surface2: string;
	text: string;
	muted: string;
	border: string;
	accent: string;
	accentText: string;
}

export interface Skin {
	id: string;
	name: string;
	font: string;
	display: string;
	c: SkinPalette;
	cd?: SkinPalette;
	auto?: boolean;
	hint?: string;
}

export interface Labels {
	task: Record<TaskStatus, string>;
	project: Record<ProjectStatus, string>;
	priority: string[];
}

/** Ustawienia w kształcie v4. Część trafia do user_settings, część do workspaces.settings. */
export interface Settings {
	skinId: string;
	customSkins: Skin[];
	radius: number;
	density: 'compact' | 'normal' | 'comfy';
	labels: Labels;
	time: { currency: string; defaultRate: number; rounding: number; me: string };
}
