<script lang="ts">
	import type { Project } from '#lib/model.ts';
	let { p }: { p: Project } = $props();
</script>

<span class="pchip" style="--pc:{p.color}"><i></i><span>{p.name || 'Bez nazwy'}</span></span>
