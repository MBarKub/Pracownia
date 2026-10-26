<script lang="ts">
	import { goto } from '$app/navigation';
	import { arr } from '#lib/store.svelte.ts';
	import { createNote } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { blocksText } from '#lib/editor/blocks.ts';
	import { norm } from '#lib/util.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import NoteCard from '#lib/ui/NoteCard.svelte';

	const all = $derived(arr('notes'));
	const tags = $derived(
		[...new Set(all.flatMap((n) => n.tags || []))].sort((a, b) => a.localeCompare(b, 'pl'))
	);
	const list = $derived.by(() => {
		const q = norm(ui.noteQuery.trim());
		return all
			.filter(
				(n) =>
					(!ui.noteTag || (n.tags || []).includes(ui.noteTag)) &&
					(!q || norm(n.title || '').includes(q) || norm(blocksText(n.blocks)).includes(q))
			)
			.sort(
				(a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0)
			);
	});

	async function newNote() {
		const id = createNote();
		await goto(`/notatki/${id}`);
		setTimeout(() => document.querySelector<HTMLTextAreaElement>('.title-in')?.focus(), 30);
	}
</script>

<div class="page">
	<header class="page-head">
		<div class="head-row">
			<h1>Notatki</h1>
			<button class="btn primary" onclick={newNote}
				><Icon name="plus" size={16} />Nowa notatka</button
			>
		</div>
	</header>
	<div class="toolbar">
		<label class="search-in"
			><Icon name="search" size={16} /><input
				bind:value={ui.noteQuery}
				placeholder="Szukaj w notatkach"
				aria-label="Szukaj w notatkach"
			/></label
		>
		{#if tags.length}
			<div class="chips">
				<button class="chip" class:on={!ui.noteTag} onclick={() => (ui.noteTag = '')}
					>Wszystkie</button
				>
				{#each tags as t (t)}
					<button class="chip" class:on={ui.noteTag === t} onclick={() => (ui.noteTag = t)}
						>#{t}</button
					>
				{/each}
			</div>
		{/if}
	</div>
	{#if list.length}
		<div class="ngrid">
			{#each list as n (n.id)}<NoteCard {n} />{/each}
		</div>
	{:else}
		<div class="empty">
			<b>{all.length ? 'Nic nie pasuje' : 'Pierwsza notatka'}</b>
			<span
				>{#if all.length}Zmień wyszukiwanie lub tag.{:else}Notatki piszesz blokami: nagłówki, listy,
					checklisty, cytaty, kod, schematy.
					<button class="btn sm" onclick={newNote}>Nowa notatka</button>{/if}</span
			>
		</div>
	{/if}
</div>
