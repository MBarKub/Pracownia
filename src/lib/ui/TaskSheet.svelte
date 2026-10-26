<script lang="ts">
	import { app, save } from '#lib/store.svelte.ts';
	import { delTask, L, projectsSorted, setTaskStatus } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { addDays, fmtTs, todayISO, uid } from '#lib/util.ts';
	import { TASK_STATUSES } from '#lib/model.ts';
	import Icon from './Icon.svelte';
	import {
		clock,
		fmtClock,
		fmtDur,
		runningEntry,
		startTimer,
		stopTimer,
		timeEntries,
		useClock
	} from '#lib/time.svelte.ts';
	import { plural } from '#lib/util.ts';

	const id = $derived(ui.taskOpen);
	const t = $derived(id ? app.data.tasks[id] : undefined);
	const project = $derived(t?.projectId ? app.data.projects[t.projectId] : undefined);

	// zadanie usunięte w innym oknie → zamykamy panel
	$effect(() => {
		if (id && !t) ui.taskOpen = null;
	});

	const close = () => (ui.taskOpen = null);
	const touch = (delay = 0) => id && save('tasks', id, delay);
	const dueChips = $derived([
		['Dziś', todayISO()],
		['Jutro', addDays(1)],
		['Za tydzień', addDays(7)]
	]);
	const projects = $derived(
		projectsSorted().filter((p) => p.status !== 'done' || p.id === t?.projectId)
	);

	let newSub = $state('');

	const tEnt = $derived(id ? timeEntries((e) => e.taskId === id) : []);
	const tTot = $derived(tEnt.reduce((s, e) => s + e.minutes, 0));
	const tRun = $derived.by(() => {
		const r = runningEntry();
		return r && r.taskId === id ? r : undefined;
	});
	$effect(() => (tRun ? useClock() : undefined));

	function autosize(el: HTMLTextAreaElement) {
		const fit = () => {
			el.style.height = 'auto';
			el.style.height = el.scrollHeight + 'px';
		};
		// pierwszy pomiar po ułożeniu panelu (w trakcie wjazdu szerokość jeszcze się zmienia)
		const raf = requestAnimationFrame(fit);
		const ro = new ResizeObserver(fit);
		ro.observe(el.parentElement || el);
		el.addEventListener('input', fit);
		return {
			destroy: () => {
				cancelAnimationFrame(raf);
				ro.disconnect();
				el.removeEventListener('input', fit);
			}
		};
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && t) close();
	}}
/>

{#if t && id}
	<div class="scrim" role="presentation" onclick={close}></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-label="Zadanie">
		<div class="sheet-h">
			<div class="seg" style="flex-wrap:wrap">
				{#each TASK_STATUSES as s (s)}
					<button class:on={t.status === s} onclick={() => setTaskStatus(id, s)}
						>{L().task[s]}</button
					>
				{/each}
			</div>
			<span class="spacer"></span>
			<button
				class="iconbtn"
				aria-label="Usuń zadanie"
				title="Usuń zadanie"
				onclick={() => delTask(id)}><Icon name="trash" size={17} /></button
			>
			<button class="iconbtn" aria-label="Zamknij" onclick={close}
				><Icon name="x" size={18} /></button
			>
		</div>

		<div class="sheet-b">
			{#key id}
				<textarea
					class="title-in"
					rows="1"
					placeholder="Co trzeba zrobić?"
					value={t.title}
					use:autosize
					oninput={(e) => {
						t.title = e.currentTarget.value;
						touch(600);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							e.currentTarget.blur();
						}
					}}></textarea>
			{/key}

			<div class="fgrid">
				<div class="field">
					<label for="tp">Projekt</label>
					<select
						class="in"
						id="tp"
						value={t.projectId}
						onchange={(e) => {
							t.projectId = e.currentTarget.value;
							touch();
						}}
					>
						<option value="">Bez projektu</option>
						{#each projects as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label for="td">Termin</label>
					<input
						class="in"
						type="date"
						id="td"
						value={t.due}
						onchange={(e) => {
							t.due = e.currentTarget.value;
							touch();
						}}
					/>
					<div class="quick">
						{#each dueChips as [l, d] (l)}
							<button
								class="chip"
								class:on={t.due === d}
								onclick={() => {
									t.due = d;
									touch();
								}}>{l}</button
							>
						{/each}
						{#if t.due}
							<button
								class="chip"
								onclick={() => {
									t.due = '';
									touch();
								}}>Bez terminu</button
							>
						{/if}
					</div>
				</div>
			</div>

			<div class="field">
				<span class="lbl">Priorytet</span>
				<div class="seg" style="align-self:flex-start">
					{#each L().priority as l, i (i)}
						<button
							class:on={(t.priority || 0) === i}
							onclick={() => {
								t.priority = i;
								touch();
							}}
						>
							{#if i}<span class="prio p{i}"><Icon name="flag" size={13} /></span>{/if}{l}
						</button>
					{/each}
				</div>
			</div>

			<div class="field">
				<span class="lbl"
					>Podzadania {#if t.subtasks.length}· {t.subtasks.filter((s) => s.done).length}/{t.subtasks
							.length}{/if}</span
				>
				<div class="subs">
					{#each t.subtasks as s (s.id)}
						<div class="sub" class:done={s.done}>
							<button
								class="check"
								class:st-done={s.done}
								aria-label="Przełącz podzadanie"
								onclick={() => {
									s.done = !s.done;
									touch();
								}}><Icon name="check" size={11} /></button
							>
							<input
								type="text"
								value={s.text}
								aria-label="Podzadanie"
								oninput={(e) => {
									s.text = e.currentTarget.value;
									touch(600);
								}}
							/>
							<button
								class="x iconbtn"
								style="width:26px;height:26px"
								aria-label="Usuń podzadanie"
								onclick={() => {
									t.subtasks = t.subtasks.filter((x) => x.id !== s.id);
									touch();
								}}><Icon name="x" size={14} /></button
							>
						</div>
					{/each}
					<label class="addline" style="padding-left:4px">
						<Icon name="plus" size={15} />
						<input
							bind:value={newSub}
							placeholder="Dodaj podzadanie"
							enterkeyhint="done"
							aria-label="Dodaj podzadanie"
							onkeydown={(e) => {
								if (e.key !== 'Enter' || e.isComposing) return;
								e.preventDefault();
								const text = newSub.trim();
								if (!text) return;
								t.subtasks.push({ id: uid(), text, done: false });
								newSub = '';
								touch();
							}}
						/>
					</label>
				</div>
			</div>

			<div class="field">
				<span class="lbl"
					>Czas pracy{#if tTot}
						· {fmtDur(tTot)} w {tEnt.length}
						{plural(tEnt.length, 'wpisie', 'wpisach', 'wpisach')}{/if}</span
				>
				<div class="btnrow">
					{#if tRun}
						<button
							class="btn sm stop"
							onclick={() =>
								stopTimer(tRun.id, false, (eid) => (ui.modal = { kind: 'time', id: eid }))}
							><Icon name="stop" size={13} />Zatrzymaj
							<span style="font-family:var(--f-mono)"
								>{fmtClock(clock.now - (tRun.start || clock.now))}</span
							></button
						>
					{:else}
						<button class="btn sm primary" onclick={() => startTimer({ taskId: id })}
							><Icon name="play" size={13} />Start</button
						>
					{/if}
					<button
						class="btn sm"
						onclick={() => (ui.modal = { kind: 'time', taskId: id, projectId: t.projectId || '' })}
						><Icon name="plus" size={13} />Dodaj wpis</button
					>
				</div>
			</div>

			<div class="field">
				<label for="tn">Notatka</label>
				<textarea
					class="in"
					id="tn"
					placeholder="Szczegóły, linki, ustalenia"
					value={t.notes}
					oninput={(e) => {
						t.notes = e.currentTarget.value;
						touch(600);
					}}></textarea>
			</div>
		</div>

		<div class="sheet-f">
			<span
				>Utworzono {fmtTs(t.createdAt)}{#if t.doneAt}&nbsp;· zrobione {fmtTs(t.doneAt)}{/if}</span
			>
			{#if project}
				<a class="btn sm ghost" href="/projekty/{t.projectId}" onclick={close}
					>Otwórz projekt <Icon name="arrow" size={13} /></a
				>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* .title-in ma flex:1 (nagłówki stron); w kolumnie panelu nie może się rozciągać */
	textarea.title-in {
		flex: none;
	}
	.sheet-f a {
		color: inherit;
		text-decoration: none;
	}
</style>
