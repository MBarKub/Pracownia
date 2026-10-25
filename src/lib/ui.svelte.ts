// Stan interfejsu (nie trafia do bazy). Część ustawień widoków zapamiętujemy w przeglądarce, jak w v4.
import { lsGet, lsSet } from './util';

type Saved = { taskTab?: 'list' | 'board'; showDone?: boolean; timeRange?: string };
const saved = lsGet<Saved>('pracownia-ui') || {};

class UiState {
	taskOpen = $state<string | null>(null);
	taskTab = $state<'list' | 'board'>(saved.taskTab || 'list');
	taskFilter = $state<'all' | 'today' | 'week' | 'overdue' | 'nodate'>('all');
	taskProject = $state('');
	showDone = $state(!!saved.showDone);
	timeRange = $state(saved.timeRange || 'week');
}

export const ui = new UiState();

export function persistUi() {
	lsSet('pracownia-ui', { taskTab: ui.taskTab, showDone: ui.showDone, timeRange: ui.timeRange });
}
