<script lang="ts">
	// Duży tytuł dokumentu: textarea, która rośnie z treścią; Enter kończy edycję.
	let {
		value,
		placeholder,
		oninput
	}: { value: string; placeholder: string; oninput: (v: string) => void } = $props();

	function autosize(el: HTMLTextAreaElement) {
		const fit = () => {
			el.style.height = 'auto';
			el.style.height = el.scrollHeight + 'px';
		};
		const raf = requestAnimationFrame(fit);
		const ro = new ResizeObserver(fit);
		ro.observe(el.parentElement || el);
		el.addEventListener('input', fit);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			el.removeEventListener('input', fit);
		};
	}
</script>

<textarea
	class="title-in"
	rows="1"
	{placeholder}
	{value}
	{@attach autosize}
	oninput={(e) => oninput(e.currentTarget.value)}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const bt = document.querySelector<HTMLElement>('.editor .bt');
			if (bt) bt.focus();
			else e.currentTarget.blur();
		}
	}}></textarea>

<style>
	/* w kolumnie strony (.page) tytuł nie może rosnąć w pionie; w nagłówku projektu wypełnia wiersz */
	textarea.title-in {
		flex: none;
		width: 100%;
	}
	:global(.phead) > textarea.title-in {
		flex: 1 1 0;
		width: auto;
	}
</style>
