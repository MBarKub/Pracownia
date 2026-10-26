<script lang="ts">
	import type { Note } from '#lib/model.ts';
	import type { WithId } from '#lib/ops.ts';
	import { app } from '#lib/store.svelte.ts';
	import { blocksText } from '#lib/editor/blocks.ts';
	import { fmtTs } from '#lib/util.ts';
	import Icon from './Icon.svelte';
	import ProjChip from './ProjChip.svelte';

	let { n, row = false }: { n: WithId<Note>; row?: boolean } = $props();
	const p = $derived(n.projectId ? app.data.projects[n.projectId] : undefined);
	const excerpt = $derived(blocksText(n.blocks).slice(0, 220));
</script>

{#if row}
	<a class="nrow" href="/notatki/{n.id}"
		><Icon name={n.pinned ? 'pin' : 'note'} size={15} /><span>{n.title || 'Bez tytułu'}</span><span
			class="date">{fmtTs(n.updatedAt)}</span
		></a
	>
{:else}
	<a class="ncard" href="/notatki/{n.id}">
		<div class="ncard-t">
			{#if n.pinned}<Icon name="pin" size={14} />{/if}<span>{n.title || 'Bez tytułu'}</span>
		</div>
		<div class="ncard-x">
			{#if excerpt}{excerpt}{:else}<span class="muted">Pusta notatka</span>{/if}
		</div>
		<div class="ncard-f">
			{#if p}<ProjChip {p} />{/if}
			{#each (n.tags || []).slice(0, 3) as t (t)}<span class="tag">#{t}</span>{/each}
			<span class="date">{fmtTs(n.updatedAt)}</span>
		</div>
	</a>
{/if}

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
</style>
