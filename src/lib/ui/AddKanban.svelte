<script lang="ts">
	import type { TaskStatus } from '#lib/model.ts';
	import { createTask, L } from '#lib/ops.ts';

	let { status, projectId = '' }: { status: TaskStatus; projectId?: string } = $props();
	let value = $state('');
</script>

<input
	class="kadd"
	bind:value
	placeholder="+ Dodaj zadanie"
	aria-label="Dodaj zadanie: {L().task[status]}"
	onkeydown={(e) => {
		if (e.key !== 'Enter' || e.isComposing) return;
		e.preventDefault();
		const title = value.trim();
		if (!title) return;
		createTask({ title, status, projectId, doneAt: status === 'done' ? Date.now() : null });
		value = '';
	}}
/>
