<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		full,
		onzoom,
		onfit,
		onfull
	}: { full: boolean; onzoom: (factor: number) => void; onfit: () => void; onfull: () => void } =
		$props();
</script>

<div class="mm-ctrls" role="group" aria-label="Widok">
	<button aria-label="Pomniejsz" title="Pomniejsz" onclick={() => onzoom(0.8)}
		><Icon name="minus" size={15} /></button
	>
	<button aria-label="Powiększ" title="Powiększ" onclick={() => onzoom(1.25)}
		><Icon name="plus" size={15} /></button
	>
	<button aria-label="Dopasuj" title="Dopasuj do okna" onclick={onfit}
		><Icon name="target" size={15} /></button
	>
	<button
		aria-label={full ? 'Zamknij pełny ekran' : 'Pełny ekran'}
		title={full ? 'Zamknij pełny ekran (Esc)' : 'Pełny ekran (Esc zamyka)'}
		onclick={onfull}><Icon name={full ? 'shrink' : 'expand'} size={15} /></button
	>
</div>
