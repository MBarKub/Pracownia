<script lang="ts">
	import { page } from '$app/state';
	import { arr } from '#lib/store.svelte.ts';
	import { L, openTasks, projectsSorted, setTaskStatus, taskSort, dueInfo } from '#lib/ops.ts';
	import { ui, persistUi } from '#lib/ui.svelte.ts';
	import { addDays, fmtShort, todayISO } from '#lib/util.ts';
	import type { Task, TaskStatus } from '#lib/model.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import TaskRow from '#lib/ui/TaskRow.svelte';
	import AddLine from '#lib/ui/AddLine.svelte';
	import ProjChip from '#lib/ui/ProjChip.svelte';
	import { app } from '#lib/store.svelte.ts';
	import AddKanban from '#lib/ui/AddKanban.svelte';

	// parametry z adresu: ?filtr=today|week, ?projekt=<id> (np. z Startu i strony projektu)
	$effect(() => {
		const f = page.url.searchParams.get('filtr');
		if (f === 'today' || f === 'week') ui.taskFilter = f;
		const p = page.url.searchParams.get('projekt');
		if (p != null) {
			ui.taskProject = p;
			ui.taskTab = 'board';
			ui.taskFilter = 'all';
		}
	});

	const t = todayISO();
	const FILTERS = [
		['all', 'Wszystkie'],
		['today', 'Dziś'],
		['week', '7 dni'],
		['overdue', 'Zaległe'],
		['nodate', 'Bez terminu']
	] as const;

	const counts = $derived.by(() => {
		const o = openTasks();
		return {
			all: o.length,
			today: o.filter((x) => x.due && x.due <= t).length,
			overdue: o.filter((x) => x.due && x.due < t).length
		} as Record<string, number>;
	});

	const list = $derived.by(() => {
		let l = arr('tasks');
		if (ui.taskProject) l = l.filter((x) => x.projectId === ui.taskProject);
		const f = ui.taskFilter,
			we = addDays(7);
		if (f === 'today') l = l.filter((x) => x.due && x.due <= t);
		if (f === 'week') l = l.filter((x) => x.due && x.due <= we);
		if (f === 'overdue') l = l.filter((x) => x.due && x.due < t);
		if (f === 'nodate') l = l.filter((x) => !x.due);
		return l;
	});

	const groups = $derived.by(() => {
		const open = list.filter((x) => x.status !== 'done').sort(taskSort);
		const tm = addDays(1),
			we = addDays(7);
		const G: [string, (x: Task) => boolean, string][] = [
			['Zaległe', (x) => !!x.due && x.due < t, 'over'],
			['Dziś', (x) => x.due === t, ''],
			['Jutro', (x) => x.due === tm, ''],
			['Najbliższe 7 dni', (x) => x.due > tm && x.due <= we, ''],
			['Później', (x) => x.due > we, ''],
			['Bez terminu', (x) => !x.due, '']
		];
		return G.map(([name, fn, cls]) => ({ name, cls, items: open.filter(fn) })).filter(
			(g) => g.items.length
		);
	});
	const done = $derived(
		ui.showDone
			? list
					.filter((x) => x.status === 'done')
					.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
					.slice(0, 60)
			: []
	);

	const columns = $derived(
		(['todo', 'doing', 'done'] as TaskStatus[]).map((s) => {
			let items = list.filter((x) => x.status === s);
			items =
				s === 'done'
					? items.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30)
					: items.sort(taskSort);
			return { s, items };
		})
	);

	// przeciąganie kart w kanbanie
	let dragId = $state<string | null>(null);
	let dropCol = $state<TaskStatus | null>(null);

	function setTab(v: 'list' | 'board') {
		ui.taskTab = v;
		persistUi();
	}
</script>

<div
	class="page"
	class:narrow={ui.taskTab === 'list'}
	style={ui.taskTab === 'board' ? 'max-width:1280px' : ''}
>
	<header class="page-head">
		<div class="head-row">
			<h1>Zadania</h1>
			<div class="seg" role="tablist">
				<button class:on={ui.taskTab === 'list'} onclick={() => setTab('list')}
					><Icon name="list" size={15} />Lista</button
				>
				<button class:on={ui.taskTab === 'board'} onclick={() => setTab('board')}
					><Icon name="board" size={15} />Kanban</button
				>
			</div>
		</div>
	</header>

	<div class="toolbar">
		<div class="chips">
			{#each FILTERS as [k, l] (k)}
				<button class="chip" class:on={ui.taskFilter === k} onclick={() => (ui.taskFilter = k)}>
					{l}{#if counts[k]}<span class="n">{counts[k]}</span>{/if}
				</button>
			{/each}
		</div>
		<span class="spacer"></span>
		<select
			class="in"
			style="width:auto; max-width:200px"
			bind:value={ui.taskProject}
			aria-label="Filtr projektu"
		>
			<option value="">Wszystkie projekty</option>
			{#each projectsSorted() as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option
				>{/each}
		</select>
		{#if ui.taskTab === 'list'}
			<button
				class="toggle"
				class:on={ui.showDone}
				onclick={() => {
					ui.showDone = !ui.showDone;
					persistUi();
				}}><i></i>Zrobione</button
			>
		{/if}
	</div>

	{#if ui.taskTab === 'list'}
		<div class="tlist">
			<AddLine
				placeholder="Nowe zadanie, Enter zapisuje"
				defaults={{ projectId: ui.taskProject, due: ui.taskFilter === 'today' ? t : '' }}
			/>
			<div style="height:10px"></div>
			{#each groups as g (g.name)}
				<div class="tgroup">
					<div class="tgroup-h {g.cls}">
						<span class="eyebrow">{g.name}</span><span class="count">{g.items.length}</span>
					</div>
					{#each g.items as x (x.id)}<TaskRow t={x} />{/each}
				</div>
			{:else}
				<div class="empty">
					<b>{list.length ? 'Wszystko zrobione' : 'Brak zadań w tym widoku'}</b>
					<span
						>{list.length
							? 'Ten filtr nie ma otwartych zadań.'
							: 'Wpisz pierwsze zadanie w polu powyżej.'}</span
					>
				</div>
			{/each}
			{#if done.length}
				<div class="tgroup" style="margin-top:18px">
					<div class="tgroup-h">
						<span class="eyebrow">{L().task.done}</span><span class="count">{done.length}</span>
					</div>
					{#each done as x (x.id)}<TaskRow t={x} />{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="kanban">
			{#each columns as col (col.s)}
				<section
					class="kcol"
					class:drop={dropCol === col.s}
					role="group"
					aria-label={L().task[col.s]}
					ondragover={(e) => {
						if (!dragId) return;
						e.preventDefault();
						dropCol = col.s;
					}}
					ondragleave={(e) => {
						if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) dropCol = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						if (dragId) setTaskStatus(dragId, col.s);
						dragId = null;
						dropCol = null;
					}}
				>
					<header class="kcol-h">
						<span class="kdot st-{col.s}"></span>{L().task[col.s]}<span class="count"
							>{col.items.length}</span
						>
					</header>
					<div class="kbody">
						{#each col.items as x (x.id)}
							{@const p = x.projectId ? app.data.projects[x.projectId] : null}
							{@const di = x.status !== 'done' ? dueInfo(x.due) : null}
							<div
								class="kcard"
								class:dragging={dragId === x.id}
								draggable="true"
								role="button"
								tabindex="0"
								ondragstart={(e) => {
									dragId = x.id;
									e.dataTransfer?.setData('text/plain', x.id);
									if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
								}}
								ondragend={() => {
									dragId = null;
									dropCol = null;
								}}
								onclick={() => (ui.taskOpen = x.id)}
								onkeydown={(e) => e.key === 'Enter' && (ui.taskOpen = x.id)}
							>
								<div class="t-title">{x.title || 'Bez tytułu'}</div>
								<div class="kcard-foot">
									{#if p}<ProjChip {p} />{/if}
									{#if x.subtasks?.length}
										<span class="meta-i muted" style="font-size:12px"
											><Icon name="check" size={12} />{x.subtasks.filter((s) => s.done).length}/{x
												.subtasks.length}</span
										>
									{/if}
									{#if x.priority > 0}<span class="prio p{x.priority}"
											><Icon name="flag" size={13} /></span
										>{/if}
									{#if x.due}<span class="due {di?.cls || ''}"
											>{di ? di.label : fmtShort(x.due)}</span
										>{/if}
								</div>
							</div>
						{:else}
							<div class="kempty">Przeciągnij tu zadanie</div>
						{/each}
					</div>
					<AddKanban status={col.s} projectId={ui.taskProject} />
				</section>
			{/each}
		</div>
	{/if}
</div>
