<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { app, save, toast } from '#lib/store.svelte.ts';
	import { delNote, projectsSorted } from '#lib/ops.ts';
	import { blocksToOutline } from '#lib/diagrams/outline.ts';
	import { fmtTs, uid } from '#lib/util.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import TitleInput from '#lib/ui/TitleInput.svelte';
	import Editor from '#lib/ui/editor/Editor.svelte';

	const id = $derived(page.params.id || '');
	const n = $derived(app.data.notes[id]);
	const back = $derived(n?.projectId ? app.data.projects[n.projectId] : undefined);
	const projects = $derived(
		projectsSorted().filter((p) => p.status !== 'done' || p.id === n?.projectId)
	);
	const touch = (delay = 0) => save('notes', id, delay);

	let tagIn = $state('');
	function addTag() {
		const t = tagIn.trim().replace(/^#/, '').replace(/\s+/g, '-');
		tagIn = '';
		if (!t || !n) return;
		if (!(n.tags || []).includes(t)) {
			n.tags = [...(n.tags || []), t];
			touch();
		}
	}

	function remove() {
		const nid = id;
		const pid = delNote(nid, () => goto(`/notatki/${nid}`));
		goto(pid && app.data.projects[pid] ? `/projekty/${pid}` : '/notatki');
	}

	async function mindmap() {
		if (!n) return;
		const outline = blocksToOutline(n.title || '', n.blocks || []);
		if (!outline) {
			toast('Notatka nie ma jeszcze nagłówków ani list, z których można zrobić mapę.');
			return;
		}
		const bid = uid();
		n.blocks.push({ id: bid, type: 'mindmap', text: outline });
		touch(300);
		toast('Dodano mapę myśli na końcu notatki');
		setTimeout(
			() =>
				document
					.querySelector(`.blk[data-bid="${bid}"]`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
			80
		);
	}
</script>

<div class="page narrow">
	<div class="crumbs">
		{#if back}
			<a href="/projekty/{n?.projectId}"><Icon name="left" size={16} />{back.name || 'Projekt'}</a>
		{:else}
			<a href="/notatki"><Icon name="left" size={16} />Notatki</a>
		{/if}
	</div>
	{#if !n}
		<div class="empty"><b>Nie ma takiej notatki</b><span>Mogła zostać usunięta.</span></div>
	{:else}
		<TitleInput
			value={n.title}
			placeholder="Tytuł notatki"
			oninput={(v) => {
				n.title = v;
				touch(600);
			}}
		/>
		<div class="props">
			<label class="prop"
				><span class="lbl">Projekt</span>
				<select
					value={n.projectId}
					onchange={(e) => {
						n.projectId = e.currentTarget.value;
						touch();
					}}
				>
					<option value="">Bez projektu</option>
					{#each projects as p (p.id)}<option value={p.id}>{p.name || 'Bez nazwy'}</option>{/each}
				</select></label
			>
			<div class="prop">
				<span class="lbl">Tagi</span>
				<div class="tagbox">
					{#each n.tags || [] as t (t)}
						<span class="tag"
							>#{t}<button
								aria-label="Usuń tag {t}"
								onclick={() => {
									n.tags = (n.tags || []).filter((x) => x !== t);
									touch();
								}}>×</button
							></span
						>
					{/each}
					<input
						bind:value={tagIn}
						placeholder="Dodaj tag"
						enterkeyhint="done"
						aria-label="Dodaj tag"
						onkeydown={(e) => {
							if ((e.key === 'Enter' || e.key === ',') && !e.isComposing) {
								e.preventDefault();
								addTag();
							} else if (e.key === 'Backspace' && !tagIn && n.tags?.length) {
								n.tags = n.tags.slice(0, -1);
								touch();
							}
						}}
						onblur={addTag}
					/>
				</div>
			</div>
			<span style="margin-left:auto; display:flex; gap:4px; align-items:center">
				<span class="muted" style="font-size:12px">Zmieniono {fmtTs(n.updatedAt)}</span>
				<button
					class="iconbtn"
					aria-label="Mapa myśli z notatki"
					title="Zrób mapę myśli z nagłówków i list"
					onclick={mindmap}><Icon name="mind" size={17} /></button
				>
				<button
					class="iconbtn"
					aria-label={n.pinned ? 'Odepnij' : 'Przypnij'}
					title={n.pinned ? 'Odepnij' : 'Przypnij'}
					style={n.pinned ? 'color:var(--accent)' : ''}
					onclick={() => {
						n.pinned = !n.pinned;
						touch();
					}}><Icon name="pin" size={17} /></button
				>
				<button class="iconbtn" aria-label="Usuń notatkę" title="Usuń notatkę" onclick={remove}
					><Icon name="trash" size={17} /></button
				>
			</span>
		</div>
		{#key id}<Editor c="notes" {id} doc={n} title={n.title} />{/key}
	{/if}
</div>

<style>
	.crumbs a {
		color: inherit;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
