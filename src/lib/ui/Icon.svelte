<script lang="ts">
	import { PATHS, type IconName } from './icons';

	let { name, size = 18 }: { name: IconName; size?: number } = $props();
	const dots = $derived(name === 'grip' || name === 'more');
</script>

<svg
	class="ic"
	class:dots
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"><path d={PATHS[name]} /></svg
>
