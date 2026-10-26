<script lang="ts">
	// Punkt wpięcia dla edytora blokowego: dla bloku `mermaid` albo `mindmap` wybiera właściwy
	// komponent. Stare mapy zapisane jako Mermaid `mindmap` zamienia na konspekt przy pierwszym
	// wyświetleniu (i zapisuje dokument).
	import type { Block } from '#lib/model.ts';
	import { mermaidMindmapToOutline } from '#lib/diagrams/outline.ts';
	import MermaidBlock from './MermaidBlock.svelte';
	import MindmapBlock from './MindmapBlock.svelte';

	let {
		block,
		title = '',
		onchange
	}: { block: Block; title?: string; onchange: () => void } = $props();

	$effect(() => {
		if (block.type === 'mermaid' && /^\s*mindmap\b/.test(block.text || '')) {
			block.type = 'mindmap';
			block.text = mermaidMindmapToOutline(block.text);
			onchange();
		}
	});
</script>

{#if block.type === 'mindmap'}
	<MindmapBlock {block} {title} {onchange} />
{:else}
	<MermaidBlock {block} {title} {onchange} />
{/if}
