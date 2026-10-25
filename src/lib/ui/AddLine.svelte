<script lang="ts">
	import type { Task } from '#lib/model.ts';
	import { createTask } from '#lib/ops.ts';
	import Icon from './Icon.svelte';

	let { placeholder, defaults = {} }: { placeholder: string; defaults?: Partial<Task> } = $props();
	let value = $state('');

	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.isComposing) return;
		e.preventDefault();
		const title = value.trim();
		if (!title) return;
		createTask({ ...defaults, title, doneAt: defaults.status === 'done' ? Date.now() : null });
		value = '';
	}
</script>

<label class="addline">
	<Icon name="plus" size={16} />
	<input bind:value {onkeydown} {placeholder} enterkeyhint="done" aria-label={placeholder} />
</label>
