<script lang="ts">
	import { goto } from '$app/navigation';
	import { arr } from '#lib/store.svelte.ts';
	import { createProject, L } from '#lib/ops.ts';
	import { ui, persistUi } from '#lib/ui.svelte.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import ProjCard from '#lib/ui/ProjCard.svelte';

	const all = $derived(arr('projects'));
	const F = $derived([
		['active', L().project.active],
		['idea', L().project.idea],
		['paused', L().project.paused],
		['done', L().project.done],
		['all', 'Wszystkie']
	]);
	const list = $derived(
		all
			.filter((p) => ui.projFilter === 'all' || p.status === ui.projFilter)
			.sort(
				(a, b) =>
					(a.due || '9999').localeCompare(b.due || '9999') ||
					(b.createdAt || 0) - (a.createdAt || 0)
			)
	);
	const count = (k: string) =>
		k === 'all' ? all.length : all.filter((p) => p.status === k).length;

	async function newProject() {
		const id = createProject({ name: '' });
		await goto(`/projekty/${id}`);
		setTimeout(() => document.querySelector<HTMLTextAreaElement>('.title-in')?.focus(), 30);
	}
</script>

<div class="page">
	<header class="page-head">
		<div class="head-row">
			<h1>Projekty</h1>
			<button class="btn primary" onclick={newProject}
				><Icon name="plus" size={16} />Nowy projekt</button
			>
		</div>
	</header>
	<div class="chips">
		{#each F as [k, l] (k)}
			<button
				class="chip"
				class:on={ui.projFilter === k}
				onclick={() => {
					ui.projFilter = k;
					persistUi();
				}}>{l}<span class="n">{count(k)}</span></button
			>
		{/each}
	</div>
	{#if list.length}
		<div class="pgridc">
			{#each list as p (p.id)}<ProjCard {p} />{/each}
		</div>
	{:else}
		<div class="empty">
			<b>{all.length ? 'Nic w tej grupie' : 'Pierwszy projekt'}</b>
			<span
				>{#if all.length}Zmień filtr powyżej.{:else}Projekt to miejsce na opis, zadania i notatki
					jednej sprawy. <button class="btn sm" onclick={newProject}>Nowy projekt</button
					>{/if}</span
			>
		</div>
	{/if}
</div>
