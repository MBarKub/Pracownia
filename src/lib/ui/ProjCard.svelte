<script lang="ts">
	import type { Project } from '#lib/model.ts';
	import { activeTasks, L, progress, taskSort, type WithId } from '#lib/ops.ts';
	import { fmtLong, plural } from '#lib/util.ts';
	import Icon from './Icon.svelte';
	import PTile from './PTile.svelte';

	let { p }: { p: WithId<Project> } = $props();
	const pr = $derived(progress(p.id));
	const pct = $derived(pr.total ? Math.round((pr.done / pr.total) * 100) : 0);
	const next = $derived(
		activeTasks()
			.filter((t) => t.projectId === p.id)
			.sort(taskSort)[0]
	);
</script>

<a class="pcard" href="/projekty/{p.id}" style="--pc:{p.color}">
	<div class="pcard-top">
		<PTile {p} />
		<span class="pill ps-{p.status}">{L().project[p.status] || p.status}</span>
	</div>
	<div class="pcard-name">{p.name || 'Bez nazwy'}</div>
	{#if p.due}<div class="pcard-due"><Icon name="calendar" size={13} /> {fmtLong(p.due)}</div>{/if}
	<div class="bar"><span style="width:{pct}%"></span></div>
	<div class="pcard-foot">
		<span>{pr.done}/{pr.total} {plural(pr.total, 'zadanie', 'zadania', 'zadań')}</span><span
			>{pct}%</span
		>
	</div>
	{#if next}<div class="pcard-next">Następne: <b>{next.title || 'Bez tytułu'}</b></div>{/if}
</a>

<style>
	a.pcard {
		color: inherit;
		text-decoration: none;
	}
</style>
