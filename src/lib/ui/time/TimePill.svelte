<script lang="ts">
	// Biegnący stoper w panelu bocznym i na górnym pasku (telefon)
	import { app } from '#lib/store.svelte.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { clock, fmtClock, runningEntry, stopTimer, useClock } from '#lib/time.svelte.ts';
	import Icon from '../Icon.svelte';

	let { where = 'side' }: { where?: 'side' | 'top' } = $props();
	const r = $derived(runningEntry());
	const name = $derived.by(() => {
		if (!r) return '';
		const task = r.taskId ? app.data.tasks[r.taskId] : undefined;
		const p = r.projectId ? app.data.projects[r.projectId] : undefined;
		return task?.title || p?.name || r.note || 'Bez projektu';
	});
	$effect(() => (r ? useClock() : undefined));
</script>

{#if r}
	<div class="tpill" role="group" aria-label="Mierzony czas">
		<span class="dot"></span>
		<a class="clk" href="/czas">{fmtClock(clock.now - (r.start || clock.now))}</a>
		{#if where === 'side'}<a class="nm" href="/czas">{name}</a>{/if}
		<button
			class="stop"
			aria-label="Zatrzymaj pomiar czasu"
			title="Zatrzymaj"
			onclick={() => stopTimer(r.id, false, (id) => (ui.modal = { kind: 'time', id }))}
			><Icon name="stop" size={12} /></button
		>
	</div>
{/if}

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
</style>
