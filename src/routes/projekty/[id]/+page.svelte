<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { app, arr, save } from '#lib/store.svelte.ts';
	import { clients, createNote, delProject, L, progress, taskSort } from '#lib/ops.ts';
	import { PCOLORS } from '#lib/skins.ts';
	import type { ProjectStatus } from '#lib/model.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import PTile from '#lib/ui/PTile.svelte';
	import TaskRow from '#lib/ui/TaskRow.svelte';
	import AddLine from '#lib/ui/AddLine.svelte';
	import NoteCard from '#lib/ui/NoteCard.svelte';
	import TitleInput from '#lib/ui/TitleInput.svelte';
	import Editor from '#lib/ui/editor/Editor.svelte';
	import ProjectTimePanel from '#lib/ui/time/ProjectTimePanel.svelte';

	const id = $derived(page.params.id || '');
	const p = $derived(app.data.projects[id]);
	const pr = $derived(progress(id));
	const pct = $derived(pr.total ? Math.round((pr.done / pr.total) * 100) : 0);
	const ts = $derived(arr('tasks').filter((t) => t.projectId === id));
	const open = $derived(ts.filter((t) => t.status !== 'done').sort(taskSort));
	const fin = $derived(
		ts.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
	);
	const notes = $derived(
		arr('notes')
			.filter((n) => n.projectId === id)
			.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
	);

	const touch = (delay = 0) => save('projects', id, delay);
	let styleOpen = $state(false);

	async function newNote() {
		const nid = createNote({ projectId: id });
		await goto(`/notatki/${nid}`);
	}
	function remove() {
		const pid = id;
		delProject(pid, () => goto(`/projekty/${pid}`));
		goto('/projekty');
	}
</script>

<svelte:window
	onclick={(e) => {
		const t = e.target as HTMLElement;
		if (styleOpen && !t.closest('.pstyle')) styleOpen = false;
	}}
	onkeydown={(e) => e.key === 'Escape' && (styleOpen = false)}
/>

<div class="page">
	<div class="crumbs"><a href="/projekty"><Icon name="left" size={16} />Projekty</a></div>
	{#if !p}
		<div class="empty"><b>Nie ma takiego projektu</b><span>Mógł zostać usunięty.</span></div>
	{:else}
		<header class="phead">
			<div class="pstyle">
				<button
					class="ptile-btn"
					aria-label="Kolor i ikona projektu"
					aria-expanded={styleOpen}
					onclick={() => (styleOpen = !styleOpen)}><PTile {p} big /></button
				>
				{#if styleOpen}
					<div class="pop" role="dialog" aria-label="Kolor i ikona">
						<div class="pop-l eyebrow">Kolor</div>
						<div class="swatches">
							{#each PCOLORS as col (col)}
								<button
									class="sw"
									class:on={p.color === col}
									style="--pc:{col}"
									aria-label="Kolor {col}"
									onclick={() => {
										p.color = col;
										touch();
									}}
								></button>
							{/each}
						</div>
						<div class="pop-sep"></div>
						<div class="pop-l eyebrow">Ikona (znak lub emoji)</div>
						<div style="padding:4px 6px 6px; display:flex; gap:6px">
							<input
								class="in"
								maxlength="4"
								value={p.icon}
								placeholder="np. ✦ lub K"
								style="flex:1"
								aria-label="Ikona projektu"
								oninput={(e) => {
									p.icon = e.currentTarget.value.trim();
									touch(500);
								}}
							/>
							<button
								class="btn sm"
								onclick={() => {
									p.icon = '';
									touch();
									styleOpen = false;
								}}>Litera</button
							>
						</div>
					</div>
				{/if}
			</div>
			<TitleInput
				value={p.name}
				placeholder="Nazwa projektu"
				oninput={(v) => {
					p.name = v;
					touch(600);
				}}
			/>
		</header>

		<div class="props">
			<label class="prop"
				><span class="lbl">Status</span>
				<select
					value={p.status}
					onchange={(e) => {
						p.status = e.currentTarget.value as ProjectStatus;
						touch();
					}}
				>
					{#each Object.entries(L().project) as [k, v] (k)}<option value={k}>{v}</option>{/each}
				</select></label
			>
			<label class="prop"
				><span class="lbl">Termin</span>
				<input
					type="date"
					value={p.due}
					onchange={(e) => {
						p.due = e.currentTarget.value;
						touch();
					}}
				/></label
			>
			<label class="prop"
				><span class="lbl">Klient</span>
				<input
					type="text"
					list="clients-dl"
					value={p.client || ''}
					placeholder="Dodaj klienta"
					oninput={(e) => {
						p.client = e.currentTarget.value;
						touch(600);
					}}
				/>
				<datalist id="clients-dl">
					{#each clients() as cl (cl)}<option value={cl}></option>{/each}
				</datalist></label
			>
			<label class="prop"
				><span class="lbl">Stawka</span>
				<input
					type="number"
					min="0"
					step="1"
					value={p.rate || ''}
					placeholder={app.settings.time.defaultRate ? String(app.settings.time.defaultRate) : '—'}
					oninput={(e) => {
						p.rate = Math.max(0, Number(e.currentTarget.value) || 0);
						touch(600);
					}}
				/><span class="lbl">{app.settings.time.currency || 'zł'}/h</span></label
			>
			<div class="prop prog" style="--pc:{p.color}">
				<span class="lbl">Postęp</span>
				<div class="bar"><span style="width:{pct}%"></span></div>
				<span>{pr.done}/{pr.total}</span>
			</div>
			<button class="btn ghost sm danger" style="margin-left:auto" onclick={remove}
				><Icon name="trash" size={15} />Usuń</button
			>
		</div>

		<div class="pdetail">
			<section class="sec">
				<span class="eyebrow">Opis i notatki robocze</span>
				{#key id}<Editor c="projects" {id} doc={p} title={p.name} />{/key}
			</section>
			<aside>
				<section class="panel">
					<div class="panel-h">
						<h2>Zadania</h2>
						<span class="count">{open.length} otwarte</span>
						<a class="more" href="/zadania?projekt={id}">Kanban</a>
					</div>
					<div class="tlist">
						{#each open as t (t.id)}<TaskRow {t} noProject />{/each}
					</div>
					<AddLine placeholder="Dodaj zadanie do projektu" defaults={{ projectId: id }} />
					{#if fin.length}
						<details>
							<summary class="muted" style="font-size:13px; cursor:pointer; padding:4px 8px"
								>{L().task.done} ({fin.length})</summary
							>
							<div class="tlist">
								{#each fin as t (t.id)}<TaskRow {t} noProject />{/each}
							</div>
						</details>
					{/if}
				</section>
				<ProjectTimePanel {id} />
				<section class="panel">
					<div class="panel-h">
						<h2>Notatki</h2>
						<span class="count">{notes.length}</span>
						<button class="more" style="margin-left:auto" onclick={newNote}>+ Nowa</button>
					</div>
					{#each notes as n (n.id)}
						<NoteCard {n} row />
					{:else}
						<div class="muted" style="font-size:14px; padding:4px 8px">
							Brak notatek w tym projekcie.
						</div>
					{/each}
				</section>
			</aside>
		</div>
	{/if}
</div>

<style>
	.crumbs a,
	a.more {
		text-decoration: none;
	}
	.crumbs a {
		color: inherit;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.pstyle {
		position: relative;
	}
	.pstyle .pop {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
	}
</style>
