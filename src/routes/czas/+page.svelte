<script lang="ts">
	import { page } from '$app/state';
	import { app, arr } from '#lib/store.svelte.ts';
	import { clients, projectsSorted, taskSort } from '#lib/ops.ts';
	import { ui, persistUi } from '#lib/ui.svelte.ts';
	import {
		addD,
		clock,
		decH,
		entryMin,
		fmtClock,
		fmtDur,
		fmtHM,
		fmtRange,
		fmtTime,
		money,
		rangeFor,
		rateFor,
		runningEntry,
		startTimer,
		stopTimer,
		timeEntries,
		useClock
	} from '#lib/time.svelte.ts';
	import { fmtWd, iso, plural, todayISO } from '#lib/util.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import ProjChip from '#lib/ui/ProjChip.svelte';
	import TimeRow from '#lib/ui/time/TimeRow.svelte';

	// ?projekt=<id> ze strony projektu
	$effect(() => {
		const p = page.url.searchParams.get('projekt');
		if (p != null) {
			ui.timeProject = p;
			ui.timeClient = '';
		}
	});

	const run = $derived(runningEntry());
	$effect(() => (run ? useClock() : undefined));

	const R = [
		['week', 'Ten tydzień'],
		['lastweek', 'Poprzedni tydzień'],
		['month', 'Ten miesiąc'],
		['lastmonth', 'Poprzedni miesiąc'],
		['year', 'Ten rok'],
		['all', 'Wszystko']
	];
	const range = $derived(rangeFor(ui.timeRange));
	const list = $derived.by(() => {
		const [a, b] = range;
		let l = timeEntries((t) => t.date >= a && t.date <= b);
		if (ui.timeProject) l = l.filter((t) => t.projectId === ui.timeProject);
		else if (ui.timeClient)
			l = l.filter((t) => (app.data.projects[t.projectId]?.client || '') === ui.timeClient);
		return l;
	});
	const total = $derived(list.reduce((s, t) => s + (t.minutes || 0), 0));
	const amount = $derived(
		list.reduce(
			(s, t) => s + (t.billable === false ? 0 : ((t.minutes || 0) / 60) * rateFor(t.projectId)),
			0
		)
	);
	const today = $derived(
		timeEntries((t) => t.date === todayISO()).reduce((s, t) => s + t.minutes, 0) +
			(run && run.date === todayISO() ? entryMin(run, clock.now) : 0)
	);
	const byP = $derived.by(() => {
		const m = new Map<string, { min: number; amt: number }>();
		for (const t of list) {
			const k = t.projectId || '';
			const g = m.get(k) || { min: 0, amt: 0 };
			g.min += t.minutes;
			if (t.billable !== false) g.amt += (t.minutes / 60) * rateFor(k);
			m.set(k, g);
		}
		return [...m].sort((x, y) => y[1].min - x[1].min);
	});
	const pmax = $derived(Math.max(1, ...byP.map((x) => x[1].min)));
	const days = $derived([...new Set(list.map((t) => t.date))].sort().reverse());
	const week = $derived.by(() => {
		if (ui.timeRange !== 'week' && ui.timeRange !== 'lastweek') return null;
		const vals = [...Array(7)].map((_, i) => {
			const d = iso(addD(new Date(range[0] + 'T00:00'), i));
			return { d, m: list.filter((t) => t.date === d).reduce((s, t) => s + t.minutes, 0) };
		});
		return { vals, mx: Math.max(60, ...vals.map((v) => v.m)) };
	});
	const cl = $derived(clients());
	const filterProjects = $derived(
		projectsSorted().filter((p) => !ui.timeClient || p.client === ui.timeClient)
	);
	const startProjects = $derived(projectsSorted().filter((p) => p.status !== 'done'));
	const startTasks = $derived(
		arr('tasks')
			.filter(
				(t) =>
					(!ui.td.projectId || t.projectId === ui.td.projectId) &&
					(t.status !== 'done' || t.id === ui.td.taskId)
			)
			.sort(taskSort)
	);
	const dayLabel = (d: string) =>
		new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(
			new Date(d + 'T00:00')
		);
	const dayItems = (d: string) =>
		list
			.filter((t) => t.date === d)
			.sort((x, y) => (y.start || y.createdAt || 0) - (x.start || x.createdAt || 0));

	function start() {
		startTimer({ ...ui.td, note: ui.td.note.trim() });
		ui.td.note = '';
	}
	const runProject = $derived(run?.projectId ? app.data.projects[run.projectId] : undefined);
	const runTask = $derived(run?.taskId ? app.data.tasks[run.taskId] : undefined);
</script>

<div class="page">
	<header class="page-head">
		<div class="head-row">
			<h1>Czas pracy</h1>
			<div class="btnrow">
				<button class="btn" onclick={() => (ui.modal = { kind: 'time', projectId: ui.timeProject })}
					><Icon name="plus" size={16} />Dodaj wpis ręcznie</button
				>
				<button
					class="btn primary"
					onclick={() =>
						(ui.modal = { kind: 'report', projectId: ui.timeProject, client: ui.timeClient })}
					><Icon name="pdf" size={16} />Raport PDF</button
				>
			</div>
		</div>
		<span class="muted">Dziś: {fmtDur(today)}</span>
	</header>

	{#if run}
		<div class="timer on">
			<div style="display:flex; flex-direction:column; gap:4px; min-width:0">
				<span class="eyebrow">Mierzę czas od {fmtTime(run.start || clock.now)}</span>
				<div class="clock">{fmtClock(clock.now - (run.start || clock.now))}</div>
				<div class="t-meta">
					{#if runProject}<ProjChip p={runProject} />{:else}<span>Bez projektu</span>{/if}
					{#if runTask}<span>{runTask.title}</span>{/if}
					{#if run.note}<span>· {run.note}</span>{/if}
				</div>
			</div>
			<button
				class="btn stop"
				onclick={() => stopTimer(run.id, false, (id) => (ui.modal = { kind: 'time', id }))}
				><Icon name="stop" size={15} />Zatrzymaj</button
			>
		</div>
	{:else}
		<form
			class="timer"
			onsubmit={(e) => {
				e.preventDefault();
				start();
			}}
		>
			<select
				class="in"
				aria-label="Projekt"
				bind:value={ui.td.projectId}
				onchange={() => (ui.td.taskId = '')}
			>
				<option value="">Bez projektu</option>
				{#each startProjects as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option
					>{/each}
			</select>
			<select
				class="in"
				aria-label="Zadanie"
				bind:value={ui.td.taskId}
				onchange={() => {
					if (ui.td.taskId && !ui.td.projectId)
						ui.td.projectId = app.data.tasks[ui.td.taskId]?.projectId || '';
				}}
			>
				<option value="">Bez zadania</option>
				{#each startTasks as t (t.id)}<option value={t.id}
						>{(t.title || 'Bez tytułu').slice(0, 70)}</option
					>{/each}
			</select>
			<input
				class="in"
				bind:value={ui.td.note}
				placeholder="Nad czym pracujesz?"
				aria-label="Opis pracy"
				enterkeyhint="go"
			/>
			<button class="btn primary"><Icon name="play" size={15} />Start</button>
		</form>
	{/if}

	<div class="toolbar">
		<div class="chips">
			{#each R as [k, l] (k)}
				<button
					class="chip"
					class:on={ui.timeRange === k}
					onclick={() => {
						ui.timeRange = k;
						persistUi();
					}}>{l}</button
				>
			{/each}
		</div>
		<span class="spacer"></span>
		{#if cl.length}
			<select
				class="in"
				style="width:auto; max-width:180px"
				aria-label="Klient"
				bind:value={ui.timeClient}
				onchange={() => (ui.timeProject = '')}
			>
				<option value="">Wszyscy klienci</option>
				{#each cl as c (c)}<option>{c}</option>{/each}
			</select>
		{/if}
		<select
			class="in"
			style="width:auto; max-width:200px"
			aria-label="Projekt"
			bind:value={ui.timeProject}
		>
			<option value="">Wszystkie projekty</option>
			{#each filterProjects as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option>{/each}
		</select>
	</div>

	<div class="tsum">
		<div class="stat">
			<span>Łącznie · {fmtRange(range[0], range[1])}</span><b>{fmtHM(total)}</b><span
				>{decH(total)} h</span
			>
		</div>
		<div class="stat">
			<span>Wpisy</span><b>{list.length}</b><span
				>{days.length} {plural(days.length, 'dzień', 'dni', 'dni')} pracy</span
			>
		</div>
		{#if amount > 0}
			<div class="stat">
				<span>Wartość według stawek</span><b>{money(amount)}</b><span>wpisy rozliczalne</span>
			</div>
		{/if}
	</div>

	{#if week}
		<section class="panel">
			<div class="panel-h">
				<h2>Tydzień</h2>
				<span class="count">{fmtRange(range[0], range[1])}</span>
			</div>
			<div class="week">
				{#each week.vals as v (v.d)}
					<div class="d" class:today={v.d === todayISO()} class:zero={!v.m}>
						<span class="v">{v.m ? fmtHM(v.m) : ''}</span>
						<div class="bar2" style="height:{Math.round((v.m / week.mx) * 100)}%"></div>
						<span class="l">{fmtWd(v.d)}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if byP.length}
		<section class="panel">
			<div class="panel-h"><h2>Według projektów</h2></div>
			<div class="pbars">
				{#each byP as [pid, g] (pid)}
					{@const p = app.data.projects[pid]}
					<div class="pbar" style="--pc:{p?.color || 'var(--muted)'}">
						{#if p}<ProjChip {p} />{:else}<span class="muted">Bez projektu</span>{/if}
						<div class="bar"><span style="width:{Math.round((g.min / pmax) * 100)}%"></span></div>
						<span class="n">{fmtHM(g.min)}{g.amt ? ` · ${money(g.amt)}` : ''}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<section class="sec">
		<div class="sec-h"><h2>Wpisy</h2></div>
		{#each days as d (d)}
			{@const items = dayItems(d)}
			<div class="eday">
				<div class="tgroup-h">
					<span class="eyebrow">{dayLabel(d)}</span><span class="count" style="margin-left:auto"
						>{fmtHM(items.reduce((s, t) => s + t.minutes, 0))}</span
					>
				</div>
				{#each items as t (t.id)}<TimeRow {t} />{/each}
			</div>
		{:else}
			<div class="empty">
				<b>Brak wpisów w tym okresie</b><span>Uruchom stoper powyżej albo dodaj wpis ręcznie.</span>
			</div>
		{/each}
	</section>
</div>
