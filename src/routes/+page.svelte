<script lang="ts">
	import { app, arr } from '#lib/store.svelte.ts';
	import { addDays, plural, todayISO, fmtShort } from '#lib/util.ts';

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
	const open = $derived(arr('tasks').filter((x) => x.status !== 'done'));
	const today = $derived(
		open.filter((x) => x.due && x.due <= t).sort((a, b) => a.due.localeCompare(b.due))
	);
	const week = $derived(
		open
			.filter((x) => x.due && x.due > t && x.due <= addDays(7))
			.sort((a, b) => a.due.localeCompare(b.due))
	);
	const projects = $derived(arr('projects').filter((p) => p.status === 'active'));
	const total = $derived(Object.values(app.data).reduce((n, c) => n + Object.keys(c).length, 0));
</script>

<div class="page">
	<header class="page-head">
		<span class="eyebrow">{date}</span>
		<h1>{greet}</h1>
		<span class="muted">
			{today.length
				? `${today.length} ${plural(today.length, 'zadanie', 'zadania', 'zadań')} na dziś.`
				: 'Na dziś nic nie zaplanowano.'}
		</span>
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
			</div>
			{#each today as x (x.id)}
				<div class="trow" class:is-done={x.status === 'done'}>
					<span class="check st-{x.status}"></span>
					<div class="t-main"><div class="t-title">{x.title || 'Bez tytułu'}</div></div>
					<div class="t-side">
						<span class="due" class:over={x.due < t} class:today={x.due === t}
							>{fmtShort(x.due)}</span
						>
					</div>
				</div>
			{:else}
				<div class="muted" style="font-size:14px; padding:4px 8px">Brak zadań na dziś.</div>
			{/each}
		</section>
		<section class="panel">
			<div class="panel-h">
				<h2>Najbliższe 7 dni</h2>
				<span class="count">{week.length}</span>
			</div>
			{#each week as x (x.id)}
				<div class="trow">
					<span class="check st-{x.status}"></span>
					<div class="t-main"><div class="t-title">{x.title || 'Bez tytułu'}</div></div>
					<div class="t-side"><span class="due">{fmtShort(x.due)}</span></div>
				</div>
			{:else}
				<div class="muted" style="font-size:14px; padding:4px 8px">
					Brak zadań z terminem w tym tygodniu.
				</div>
			{/each}
		</section>
	</div>

	<section class="sec">
		<div class="sec-h">
			<h2>Aktywne projekty</h2>
			<span class="count muted">{projects.length}</span>
		</div>
		<div class="pgridc">
			{#each projects as p (p.id)}
				<a
					class="pcard"
					href="/projekty/{p.id}"
					style="--pc:{p.color}; color:inherit; text-decoration:none"
				>
					<div class="pcard-top">
						<span class="ptile">{p.icon || (p.name || '?').trim().charAt(0).toUpperCase()}</span>
						<span class="pill ps-{p.status}">{app.settings.labels.project[p.status]}</span>
					</div>
					<div class="pcard-name">{p.name || 'Bez nazwy'}</div>
				</a>
			{/each}
		</div>
	</section>
</div>
