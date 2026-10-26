<script lang="ts">
	// Okno wpisu czasu: nowy wpis ręczny albo edycja istniejącego
	import { app, save, toast } from '#lib/store.svelte.ts';
	import { projectsSorted, taskSort } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { arr } from '#lib/store.svelte.ts';
	import { delTime, fmtDur, fmtHM, fmtTime, parseDur } from '#lib/time.svelte.ts';
	import { todayISO, uid } from '#lib/util.ts';
	import { untrack } from 'svelte';
	import Icon from '../Icon.svelte';

	let {
		id,
		projectId = '',
		taskId = ''
	}: { id?: string; projectId?: string; taskId?: string } = $props();

	// okno tworzy się od nowa przy każdym otwarciu, więc bierzemy wartości początkowe
	const init = untrack(() => ({ id, projectId, taskId }));
	const t = init.id ? app.data.time[init.id] : undefined;
	let date = $state(t?.date || todayISO());
	let dur = $state(t ? fmtHM(t.minutes) : '');
	let pid = $state(t ? t.projectId || '' : init.projectId);
	let tid = $state(t ? t.taskId || '' : init.taskId);
	let note = $state(t?.note || '');
	let billable = $state(t ? t.billable !== false : true);
	const mins = $derived(parseDur(dur));

	const projects = $derived(projectsSorted().filter((p) => p.status !== 'done' || p.id === pid));
	const tasks = $derived(
		arr('tasks')
			.filter((x) => (!pid || x.projectId === pid) && (x.status !== 'done' || x.id === tid))
			.sort(taskSort)
	);

	const close = () => (ui.modal = null);
	function submit(e?: Event) {
		e?.preventDefault();
		if (!mins) {
			toast('Wpisz czas trwania, np. 1:30 albo 45m.');
			return;
		}
		const data = {
			date: date || todayISO(),
			minutes: mins,
			projectId: pid,
			taskId: tid,
			note: note.trim(),
			billable
		};
		if (id && app.data.time[id]) {
			Object.assign(app.data.time[id], data);
			save('time', id);
			toast('Zapisano zmiany');
		} else {
			const nid = uid();
			const now = Date.now();
			app.data.time[nid] = {
				...data,
				userId: app.local ? undefined : app.userId,
				start: null,
				end: null,
				running: false,
				createdAt: now,
				updatedAt: now
			};
			save('time', nid);
			toast(`Dodano ${fmtDur(mins)}`);
		}
		close();
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="scrim" role="presentation" onclick={close}></div>
<div
	class="modal"
	role="dialog"
	aria-label={id ? 'Edytuj wpis czasu' : 'Nowy wpis czasu'}
	tabindex="-1"
>
	<form onsubmit={submit} style="display:contents">
		<div class="modal-h">
			<h2>{id ? 'Wpis czasu' : 'Nowy wpis czasu'}</h2>
			<button type="button" class="iconbtn" aria-label="Zamknij" onclick={close}
				><Icon name="x" size={18} /></button
			>
		</div>
		<div class="modal-b">
			<div class="fgrid">
				<div class="field">
					<label for="te-d">Data</label>
					<input class="in" type="date" id="te-d" bind:value={date} />
				</div>
				<div class="field">
					<label for="te-u">Czas trwania</label>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						class="in"
						id="te-u"
						bind:value={dur}
						placeholder="np. 1:30, 1,5h, 45m"
						autofocus={!id}
						autocomplete="off"
					/>
					<span class="note-s"
						>{#if mins}= {fmtDur(mins)}{:else if dur}Nie rozpoznaję formatu. Wpisz np. 1:30 albo
							90m.{/if}{#if t?.start && t?.end}
							· ze stopera {fmtTime(t.start)}–{fmtTime(t.end)}{/if}</span
					>
				</div>
				<div class="field">
					<label for="te-p">Projekt</label>
					<select
						class="in"
						id="te-p"
						bind:value={pid}
						onchange={() => {
							if (tid && app.data.tasks[tid]?.projectId !== pid) tid = '';
						}}
					>
						<option value="">Bez projektu</option>
						{#each projects as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label for="te-t">Zadanie</label>
					<select
						class="in"
						id="te-t"
						bind:value={tid}
						onchange={() => {
							if (tid && !pid) pid = app.data.tasks[tid]?.projectId || '';
						}}
					>
						<option value="">Bez zadania</option>
						{#each tasks as x (x.id)}<option value={x.id}
								>{(x.title || 'Bez tytułu').slice(0, 70)}</option
							>{/each}
					</select>
				</div>
			</div>
			<div class="field">
				<label for="te-n">Opis</label>
				<input
					class="in"
					id="te-n"
					bind:value={note}
					placeholder="Co zostało zrobione"
					enterkeyhint="done"
				/>
			</div>
			<label class="chk"
				><input type="checkbox" bind:checked={billable} />Rozliczalne (wliczane do kwot w raportach)</label
			>
		</div>
		<div class="modal-f">
			{#if id}
				<button
					type="button"
					class="btn ghost danger"
					style="margin-right:auto"
					onclick={() => {
						delTime(id);
						close();
					}}><Icon name="trash" size={15} />Usuń</button
				>
			{/if}
			<button type="button" class="btn" onclick={close}>Anuluj</button>
			<button class="btn primary">Zapisz</button>
		</div>
	</form>
</div>
