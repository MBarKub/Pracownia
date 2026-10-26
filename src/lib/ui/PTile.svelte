<script lang="ts">
	import type { Project } from '#lib/model.ts';
	let { p, big = false }: { p: Project; big?: boolean } = $props();
	const letter = $derived(p.icon || (p.name || '?').trim().charAt(0).toUpperCase() || '?');
</script>

<span class="ptile" class:big style="--pc:{p.color}">{letter}</span>
