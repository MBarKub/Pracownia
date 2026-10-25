<script lang="ts">
	import Pending from '#lib/ui/Pending.svelte';
	import { arr } from '#lib/store.svelte.ts';
</script>

<Pending title="Zadania" items={`${arr('tasks').length} zadań`} />
