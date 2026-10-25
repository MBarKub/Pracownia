<script lang="ts">
	let { title, items }: { title: string; items: string } = $props();
</script>

<div class="page">
	<header class="page-head"><h1>{title}</h1></header>
	<div class="empty">
		<b>Ten widok przenoszę w następnym kroku</b>
		<span>Dane są już w bazie: {items}.</span>
	</div>
</div>
