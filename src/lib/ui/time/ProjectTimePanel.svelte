<script lang="ts">
	import { app } from '#lib/store.svelte.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import {
		clock,
		fmtClock,
		fmtDur,
		fmtHM,
		money,
		rangeFor,
		rateFor,
		runningEntry,
		startTimer,
		stopTimer,
		timeEntries,
		useClock
	} from '#lib/time.svelte.ts';
	import { fmtShort } from '#lib/util.ts';
	import Icon from '../Icon.svelte';

	let { id }: { id: string } = $props();
	const ent = $derived(timeEntries((t) => t.projectId === id));
	const total = $derived(ent.reduce((s, t) => s + t.minutes, 0));
	const month = $derived.by(() => {
		const [a, b] = rangeFor('month');
		return ent.filter((t) => t.date >= a && t.date <= b).reduce((s, t) => s + t.minutes, 0);
	});
	const run = $derived(runningEntry());
	const mine = $derived(run && run.projectId === id ? run : undefined);
	const r = $derived(rateFor(id));
	const recent = $derived(
		[...ent]
			.sort(
				(x, y) =>
					(y.date || '').localeCompare(x.date || '') || (y.createdAt || 0) - (x.createdAt || 0)
			)
			.slice(0, 4)
	);
	$effect(() => (mine ? useClock() : undefined));
</script>

<section class="panel">
	<div class="panel-h">
		<h2>Czas pracy</h2>
		<span class="count">{fmtHM(total)} łącznie</span>
		<a class="more" href="/czas?projekt={id}">Wpisy</a>
	</div>
	<div class="muted" style="font-size:13.5px">
		W tym miesiącu: <b style="color:var(--text)">{fmtDur(month)}</b>{r
			? ` · ${money((month / 60) * r)}`
			: ''}
	</div>
	<div class="btnrow">
		{#if mine}
			<button
				class="btn sm stop"
				onclick={() => stopTimer(mine.id, false, (tid) => (ui.modal = { kind: 'time', id: tid }))}
				><Icon name="stop" size={13} />Zatrzymaj
				<span style="font-family:var(--f-mono)"
					>{fmtClock(clock.now - (mine.start || clock.now))}</span
				></button
			>
		{:else}
			<button class="btn sm primary" onclick={() => startTimer({ projectId: id })}
				><Icon name="play" size={13} />Start</button
			>
		{/if}
		<button class="btn sm" onclick={() => (ui.modal = { kind: 'time', projectId: id })}
			><Icon name="plus" size={13} />Wpis</button
		>
		<button class="btn sm" onclick={() => (ui.modal = { kind: 'report', projectId: id })}
			><Icon name="pdf" size={13} />Raport PDF</button
		>
	</div>
	{#each recent as t (t.id)}
		<div
			class="nrow"
			role="button"
			tabindex="0"
			onclick={() => (ui.modal = { kind: 'time', id: t.id })}
			onkeydown={(e) => e.key === 'Enter' && (ui.modal = { kind: 'time', id: t.id })}
		>
			<Icon name="clock" size={14} /><span
				>{t.note || (t.taskId && app.data.tasks[t.taskId]?.title) || 'Bez opisu'}</span
			><span class="date">{fmtShort(t.date)} · {fmtHM(t.minutes)}</span>
		</div>
	{/each}
</section>

<style>
	a.more {
		text-decoration: none;
	}
</style>
