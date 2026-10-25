<script lang="ts">
	import type { Task } from '#lib/model.ts';
	import { app } from '#lib/store.svelte.ts';
	import { dueInfo, L, toggleTask, type WithId } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { fmtShort } from '#lib/util.ts';
	import Icon from './Icon.svelte';
	import ProjChip from './ProjChip.svelte';

	let { t, noProject = false }: { t: WithId<Task>; noProject?: boolean } = $props();

	const p = $derived(!noProject && t.projectId ? app.data.projects[t.projectId] : null);
	const di = $derived(t.status !== 'done' ? dueInfo(t.due) : null);
	const subs = $derived(t.subtasks || []);
	const subsDone = $derived(subs.filter((s) => s.done).length);

	function open() {
		ui.taskOpen = t.id;
	}
</script>

<div
	class="trow"
	class:is-done={t.status === 'done'}
	class:sel={ui.taskOpen === t.id}
	role="button"
	tabindex="0"
	onclick={open}
	onkeydown={(e) => {
		if (e.key === 'Enter' && e.target === e.currentTarget) open();
	}}
>
	<button
		class="check st-{t.status}"
		aria-label={t.status === 'done' ? 'Przywróć zadanie' : 'Oznacz jako zrobione'}
		onclick={(e) => {
			e.stopPropagation();
			toggleTask(t.id);
		}}><Icon name="check" size={12} /></button
	>
	<div class="t-main">
		<div class="t-title">{t.title || 'Bez tytułu'}</div>
		<div class="t-meta">
			{#if p}<ProjChip {p} />{/if}
			{#if t.status === 'doing'}<span class="pill pill-doing">{L().task.doing}</span>{/if}
			{#if subs.length}<span class="meta-i"
					><Icon name="check" size={12} />{subsDone}/{subs.length}</span
				>{/if}
			{#if t.notes}<span class="meta-i" title="Ma notatkę"><Icon name="note" size={12} /></span
				>{/if}
		</div>
	</div>
	<div class="t-side">
		{#if t.priority > 0}
			<span class="prio p{t.priority}" title="Priorytet: {L().priority[t.priority]}"
				><Icon name="flag" size={14} /></span
			>
		{/if}
		{#if t.due}<span class="due {di?.cls || ''}">{di ? di.label : fmtShort(t.due)}</span>{/if}
	</div>
</div>
