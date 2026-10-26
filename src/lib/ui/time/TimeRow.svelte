<script lang="ts">
	import { app } from '#lib/store.svelte.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { delTime, fmtHM, fmtTime, money, rateFor, type Entry } from '#lib/time.svelte.ts';
	import Icon from '../Icon.svelte';
	import ProjChip from '../ProjChip.svelte';

	let { t }: { t: Entry } = $props();
	const p = $derived(t.projectId ? app.data.projects[t.projectId] : undefined);
	const task = $derived(t.taskId ? app.data.tasks[t.taskId] : undefined);
	const r = $derived(rateFor(t.projectId));
	const open = () => (ui.modal = { kind: 'time', id: t.id });
</script>

<div
	class="erow"
	role="button"
	tabindex="0"
	onclick={open}
	onkeydown={(e) => e.key === 'Enter' && e.target === e.currentTarget && open()}
>
	<span class="tm">{t.start && t.end ? `${fmtTime(t.start)}–${fmtTime(t.end)}` : 'ręcznie'}</span>
	<div class="e-main">
		<div>{t.note || task?.title || 'Bez opisu'}</div>
		<div class="t-meta">
			{#if p}<ProjChip {p} />{/if}
			{#if task && t.note}<span>{task.title}</span>{/if}
			{#if t.billable === false}<span>nierozliczalne</span>{/if}
		</div>
	</div>
	<span class="ds">{fmtHM(t.minutes)}</span>
	<span class="am">{r && t.billable !== false ? money((t.minutes / 60) * r) : ''}</span>
	<button
		class="iconbtn x"
		aria-label="Usuń wpis"
		style="width:30px;height:30px"
		onclick={(e) => {
			e.stopPropagation();
			delTime(t.id);
		}}><Icon name="trash" size={15} /></button
	>
</div>
