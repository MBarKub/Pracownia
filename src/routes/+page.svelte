<script lang="ts">
	import { app, arr } from '#lib/store.svelte.ts';
	import { L, openTasks, taskSort } from '#lib/ops.ts';
	import { addDays, plural, todayISO } from '#lib/util.ts';
	import TaskRow from '#lib/ui/TaskRow.svelte';
	import AddLine from '#lib/ui/AddLine.svelte';

	const greet = $derived.by(() => {
		const h = new Date().getHours();
		return h < 5 ? 'Dobrej nocy' : h < 18 ? 'Dzień dobry' : 'Dobry wieczór';
	});
	const date = new Intl.DateTimeFormat('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date());
	const t = todayISO();
	const open = $derived(openTasks());
	const today = $derived(open.filter((x) => x.due && x.due <= t).sort(taskSort));
	const doing = $derived(
		open.filter((x) => x.status === 'doing' && !(x.due && x.due <= t)).sort(taskSort)
	);
	const week = $derived(
		open.filter((x) => x.due && x.due > t && x.due <= addDays(7)).sort(taskSort)
	);
	const overdue = $derived(today.filter((x) => x.due < t).length);
	const projects = $derived(
		arr('projects')
			.filter((p) => p.status === 'active')
			.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
	);
	const total = $derived(Object.values(app.data).reduce((n, c) => n + Object.keys(c).length, 0));
	const sub = $derived(
		today.length
			? `${today.length} ${plural(today.length, 'zadanie', 'zadania', 'zadań')} na dziś${overdue ? `, w tym ${overdue} ${plural(overdue, 'zaległe', 'zaległe', 'zaległych')}` : ''}.`
			: 'Na dziś nic nie zaplanowano.'
	);
</script>

<div class="page">
	<header class="page-head">
		<span class="eyebrow">{date}</span>
		<h1>{greet}</h1>
		<span class="muted">{sub}</span>
	</header>

	{#if total === 0}
		<div class="empty">
			<b>Pusta przestrzeń</b>
			<span>Wczytaj kopię JSON z Pracowni na claude.ai, żeby przenieść swoje dane.</span>
			<a class="btn sm" href="/ustawienia">Przejdź do importu</a>
		</div>
	{/if}

	<div class="grid2">
		<section class="panel">
			<div class="panel-h">
				<h2>Na dziś</h2>
				<span class="count">{today.length}</span>
				<a class="more" href="/zadania?filtr=today">Wszystkie</a>
			</div>
			<div class="tlist">
				{#each today as x (x.id)}<TaskRow t={x} />{/each}
				{#if doing.length}
					<div class="tgroup-h" style="margin-top:10px">
						<span class="eyebrow">{L().task.doing}</span>
					</div>
					{#each doing as x (x.id)}<TaskRow t={x} />{/each}
				{/if}
			</div>
			{#if !today.length && !doing.length}
				<div class="muted" style="font-size:14px; padding:4px 8px">Dodaj zadanie poniżej.</div>
			{/if}
			<AddLine placeholder="Dodaj zadanie na dziś" defaults={{ due: t }} />
		</section>
		<section class="panel">
			<div class="panel-h">
				<h2>Najbliższe 7 dni</h2>
				<span class="count">{week.length}</span>
				<a class="more" href="/zadania?filtr=week">Plan</a>
			</div>
			<div class="tlist">
				{#each week as x (x.id)}
					<TaskRow t={x} />
				{:else}
					<div class="muted" style="font-size:14px; padding:4px 8px">
						Brak zadań z terminem w tym tygodniu.
					</div>
				{/each}
			</div>
		</section>
	</div>

	<section class="sec">
		<div class="sec-h">
			<h2>Aktywne projekty</h2>
			<a class="more" href="/projekty">Wszystkie projekty</a>
		</div>
		<div class="pgridc">
			{#each projects.slice(0, 6) as p (p.id)}
				<a class="pcard" href="/projekty/{p.id}" style="--pc:{p.color}">
					<div class="pcard-top">
						<span class="ptile">{p.icon || (p.name || '?').trim().charAt(0).toUpperCase()}</span>
						<span class="pill ps-{p.status}">{L().project[p.status]}</span>
					</div>
					<div class="pcard-name">{p.name || 'Bez nazwy'}</div>
				</a>
			{/each}
		</div>
	</section>
</div>

<style>
	a.more,
	a.pcard {
		text-decoration: none;
	}
	a.pcard {
		color: inherit;
	}
</style>
