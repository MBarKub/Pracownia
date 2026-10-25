<script lang="ts">
	import Pending from '#lib/ui/Pending.svelte';
	import { arr } from '#lib/store.svelte.ts';
</script>

<Pending title="Projekty" items={`${arr('projects').length} projektów`} />
