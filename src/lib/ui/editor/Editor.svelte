<script lang="ts">
	// Edytor blokowy notatek i opisów projektów — port z Pracowni v6.
	// Bloki tekstowe to contenteditable (plaintext-only); stan trzyma tablica `doc.blocks`,
	// a każda zmiana zapisuje dokument z opóźnieniem (save → kolejka zapisu w store).
	import { tick } from 'svelte';
	import type { Block, BlockType, Note, Project } from '#lib/model.ts';
	import { app, save, toast } from '#lib/store.svelte.ts';
	import { createTask, toggleTask } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import { clone, norm, uid } from '#lib/util.ts';
	import {
		BT,
		BT_ALIAS,
		CE,
		CODEISH,
		DIAGRAM,
		LIST,
		PH,
		SHORT,
		caretOffset,
		displayText,
		nb,
		readText,
		selCollapsed,
		setCaret
	} from '#lib/editor/blocks.ts';
	import Icon from '../Icon.svelte';
	import DiagramBlock from '../diagrams/DiagramBlock.svelte';

	let {
		c,
		id,
		doc,
		title = ''
	}: { c: 'projects' | 'notes'; id: string; doc: Project | Note; title?: string } = $props();

	let root: HTMLDivElement | undefined = $state();

	// pusty dokument zawsze ma jeden akapit, w którym można pisać
	$effect.pre(() => {
		if (!Array.isArray(doc.blocks) || !doc.blocks.length) doc.blocks = [nb()];
	});

	const blocks = $derived(doc.blocks || []);
	const solo = $derived(blocks.length === 1 && blocks[0].type === 'p' && !blocks[0].text);
	const nums = $derived.by(() => {
		let n = 0;
		return blocks.map((b) => (n = b.type === 'ol' ? n + 1 : 0));
	});

	const touch = () => save(c, id, 700);
	const idx = (bid: string) => blocks.findIndex((b) => b.id === bid);
	const btOf = (bid: string) =>
		root?.querySelector<HTMLElement>(`.blk[data-bid="${bid}"] .bt`) || null;

	/** Po zmianie struktury: odśwież tekst w DOM i ustaw kursor */
	async function focusBlock(bid: string, off?: number) {
		await tick();
		const el = btOf(bid);
		const b = blocks[idx(bid)];
		if (!el || !b) return;
		if (readText(el) !== b.text) el.textContent = displayText(b.text);
		setCaret(el, off == null ? b.text.length : off);
	}

	/** Tekst z modelu do contenteditable, ale nie podczas pisania w tym bloku */
	function syncText(b: Block) {
		return (el: HTMLElement) => {
			const t = b.text;
			if (readText(el) !== t && document.activeElement !== el) el.textContent = displayText(t);
		};
	}

	/* ---------- menu „/” i menu bloku ---------- */
	type Pop = { kind: 'slash' | 'block'; bid: string; x: number; y: number };
	let pop = $state<Pop | null>(null);
	let slashQ = $state('');
	let slashIdx = $state(0);
	const slashItems = $derived.by(() => {
		const q = norm(slashQ);
		return BT.filter(([t, name]) => !q || norm(name).includes(q) || BT_ALIAS[t].includes(q));
	});

	function place(el: Element, kind: Pop['kind'], bid: string) {
		const r = el.getBoundingClientRect();
		const w = 260,
			h = kind === 'slash' ? 360 : 420;
		const x = Math.min(Math.max(8, r.left), innerWidth - w - 8);
		let y = r.bottom + 6;
		if (y + h > innerHeight - 8) y = Math.max(8, r.top - Math.min(h, innerHeight - 16) - 6);
		pop = { kind, bid, x, y };
	}
	function openSlash(el: HTMLElement, bid: string, q: string) {
		slashQ = q;
		if (!slashItems.length) return closePop();
		slashIdx = Math.min(slashIdx, slashItems.length - 1);
		place(el, 'slash', bid);
	}
	function closePop() {
		pop = null;
		slashIdx = 0;
	}
	function pickSlash(type: BlockType) {
		const bid = pop?.bid;
		closePop();
		if (!bid) return;
		const b = blocks[idx(bid)];
		if (!b) return;
		b.text = '';
		setType(b, type);
	}

	/* ---------- operacje na blokach ---------- */
	function setType(b: Block, type: BlockType) {
		const i = idx(b.id);
		if (type === 'hr') {
			if (!b.text) {
				b.type = 'hr';
				const nx = nb();
				blocks.splice(i + 1, 0, nx);
				touch();
				focusBlock(nx.id, 0);
				return;
			}
			const nx = nb();
			blocks.splice(i + 1, 0, { id: uid(), type: 'hr', text: '' }, nx);
			touch();
			focusBlock(nx.id, 0);
			return;
		}
		if (b.type === 'hr') b.text = '';
		b.type = type;
		if (type !== 'todo') delete b.taskId;
		touch();
		if (!DIAGRAM.includes(type)) focusBlock(b.id);
	}

	function blockToTask(b: Block) {
		if (!b.text.trim()) return;
		const projectId = c === 'projects' ? id : (doc as Note).projectId || '';
		const tid = createTask({
			title: b.text.trim().slice(0, 300),
			projectId,
			status: b.checked ? 'done' : 'todo',
			doneAt: b.checked ? Date.now() : null
		});
		b.type = 'todo';
		b.taskId = tid;
		touch();
		toast(
			'Utworzono zadanie' + (projectId ? ' w projekcie' : ''),
			'Otwórz',
			() => (ui.taskOpen = tid)
		);
	}

	function toggleCheck(b: Block) {
		if (b.taskId && app.data.tasks[b.taskId]) toggleTask(b.taskId);
		else {
			b.checked = !b.checked;
			touch();
		}
	}
	const isChecked = (b: Block) => {
		const t = b.taskId ? app.data.tasks[b.taskId] : undefined;
		return t ? t.status === 'done' : !!b.checked;
	};

	function move(b: Block, dir: number) {
		const i = idx(b.id),
			j = i + dir;
		if (j < 0 || j >= blocks.length) return;
		const [x] = blocks.splice(i, 1);
		blocks.splice(j, 0, x);
		touch();
	}
	function duplicate(b: Block) {
		const cp = { ...clone(b), id: uid() };
		delete cp.taskId;
		blocks.splice(idx(b.id) + 1, 0, cp);
		touch();
	}
	function remove(b: Block) {
		blocks.splice(idx(b.id), 1);
		if (!blocks.length) blocks.push(nb());
		touch();
	}

	function append() {
		const last = blocks[blocks.length - 1];
		if (last && last.type === 'p' && !last.text) return focusBlock(last.id, 0);
		const nx = nb();
		blocks.push(nx);
		touch();
		focusBlock(nx.id, 0);
	}

	function insertAtCaret(b: Block, el: HTMLElement, str: string) {
		const off = caretOffset(el);
		b.text = b.text.slice(0, off) + str + b.text.slice(off);
		el.textContent = displayText(b.text);
		setCaret(el, off + str.length);
		touch();
	}

	/* ---------- zdarzenia klawiatury i wklejania ---------- */
	function onInput(b: Block, el: HTMLElement) {
		b.text = readText(el);
		touch();
		if (b.text === '---' && b.type !== 'code') {
			b.type = 'hr';
			b.text = '';
			const nx = nb();
			blocks.splice(idx(b.id) + 1, 0, nx);
			focusBlock(nx.id, 0);
			return;
		}
		if (b.type !== 'code') {
			for (const [re, type] of SHORT) {
				const m = b.text.match(re);
				if (m && caretOffset(el) === m[0].length && (b.type === 'p' || type !== b.type)) {
					if (b.type !== 'p' && !['h1', 'h2', 'h3'].includes(type)) continue;
					b.type = type;
					b.text = b.text.slice(m[0].length);
					closePop();
					el.textContent = displayText(b.text);
					if (!DIAGRAM.includes(type)) focusBlock(b.id, 0);
					return;
				}
			}
		}
		if (b.text.startsWith('/') && !b.text.includes('\n') && b.text.length < 24)
			openSlash(el, b.id, b.text.slice(1));
		else if (pop?.kind === 'slash') closePop();
	}

	function onKeydown(e: KeyboardEvent, b: Block, el: HTMLElement) {
		if (pop?.kind === 'slash') {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				const n = slashItems.length;
				slashIdx = (slashIdx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				pickSlash(slashItems[slashIdx][0]);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				closePop();
				return;
			}
		}
		const i = idx(b.id);
		if (e.key === 'Enter' && !e.isComposing) {
			e.preventDefault();
			if (e.shiftKey || CODEISH.includes(b.type)) {
				insertAtCaret(b, el, '\n');
				return;
			}
			const off = caretOffset(el),
				text = b.text;
			if (!text && LIST.includes(b.type)) {
				b.type = 'p';
				delete b.taskId;
				touch();
				focusBlock(b.id, 0);
				return;
			}
			if (off === 0 && text) {
				blocks.splice(i, 0, nb());
				touch();
				focusBlock(b.id, 0);
				return;
			}
			b.text = text.slice(0, off);
			el.textContent = displayText(b.text);
			const nx = nb(LIST.includes(b.type) ? b.type : 'p', text.slice(off));
			blocks.splice(i + 1, 0, nx);
			touch();
			focusBlock(nx.id, 0);
			return;
		}
		if (e.key === 'Backspace' && selCollapsed() && caretOffset(el) === 0) {
			if (CODEISH.includes(b.type) && b.text) return;
			if (b.type !== 'p') {
				e.preventDefault();
				b.type = 'p';
				delete b.taskId;
				touch();
				focusBlock(b.id, 0);
				return;
			}
			if (i > 0) {
				e.preventDefault();
				const prev = blocks[i - 1];
				if (prev.type === 'hr') {
					blocks.splice(i - 1, 1);
					touch();
					focusBlock(b.id, 0);
					return;
				}
				if (DIAGRAM.includes(prev.type)) return;
				const off = prev.text.length;
				prev.text += b.text;
				blocks.splice(i, 1);
				touch();
				focusBlock(prev.id, off);
				return;
			}
		}
		if (
			e.key === 'Delete' &&
			selCollapsed() &&
			caretOffset(el) === b.text.length &&
			i < blocks.length - 1
		) {
			const nxt = blocks[i + 1];
			if (DIAGRAM.includes(nxt.type)) return;
			e.preventDefault();
			const off = b.text.length;
			if (nxt.type !== 'hr') b.text += nxt.text;
			blocks.splice(i + 1, 1);
			touch();
			focusBlock(b.id, off);
			return;
		}
		if (e.key === 'ArrowUp' && caretOffset(el) === 0) {
			const t = neighbour(el, -1);
			if (t) {
				e.preventDefault();
				setCaret(t, readText(t).length);
			}
			return;
		}
		if (e.key === 'ArrowDown' && caretOffset(el) === b.text.length) {
			const t = neighbour(el, 1);
			if (t) {
				e.preventDefault();
				setCaret(t, 0);
			}
			return;
		}
		if (e.key === 'Tab' && b.type === 'code') {
			e.preventDefault();
			insertAtCaret(b, el, '  ');
		}
	}
	function neighbour(el: HTMLElement, dir: number) {
		const all = [...(root?.querySelectorAll<HTMLElement>('.bt') || [])];
		return all[all.indexOf(el) + dir] || null;
	}

	function onPaste(e: ClipboardEvent, b: Block, el: HTMLElement) {
		e.preventDefault();
		const txt = (e.clipboardData?.getData('text/plain') || '').replace(/\r\n?/g, '\n');
		if (!txt) return;
		const lines = txt.split('\n');
		if (CODEISH.includes(b.type) || lines.length === 1) {
			insertAtCaret(b, el, txt);
			return;
		}
		const off = caretOffset(el),
			tail = b.text.slice(off);
		b.text = b.text.slice(0, off) + lines[0];
		el.textContent = displayText(b.text);
		const fresh = lines.slice(1).map((line) => {
			for (const [re, type] of SHORT) {
				const m = line.match(re);
				if (m) return nb(type, line.slice(m[0].length));
			}
			return nb('p', line);
		});
		const last = fresh[fresh.length - 1];
		const lastOff = last.text.length;
		last.text += tail;
		blocks.splice(idx(b.id) + 1, 0, ...fresh);
		touch();
		focusBlock(last.id, lastOff);
	}

	/* ---------- przeciąganie bloków ---------- */
	let dragBid = $state<string | null>(null);
	let drop = $state<{ bid: string; before: boolean } | null>(null);
	function onDragOver(e: DragEvent, b: Block) {
		if (!dragBid) return;
		e.preventDefault();
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		drop = { bid: b.id, before: e.clientY < r.top + r.height / 2 };
	}
	function onDrop(e: DragEvent) {
		if (!dragBid || !drop) return;
		e.preventDefault();
		if (drop.bid !== dragBid) {
			const from = idx(dragBid);
			const [x] = blocks.splice(from, 1);
			let to = idx(drop.bid);
			if (!drop.before) to++;
			blocks.splice(to, 0, x);
			touch();
		}
		dragBid = null;
		drop = null;
	}

	/* ---------- pasek typów nad klawiaturą (telefon) ---------- */
	const KB: [BlockType, string][] = [
		['p', 'T'],
		['h1', 'H1'],
		['h2', 'H2'],
		['ul', '•'],
		['ol', '1.'],
		['todo', '☐'],
		['quote', '„'],
		['callout', '!'],
		['code', '{}'],
		['mindmap', '✳'],
		['mermaid', '◇'],
		['hr', '—']
	];
	let editingBid = $state<string | null>(null);
	let blurT: ReturnType<typeof setTimeout> | undefined;
	function onFocus(b: Block) {
		clearTimeout(blurT);
		editingBid = b.id;
		document.body.classList.add('editing');
	}
	function onBlur() {
		blurT = setTimeout(() => {
			if (!(document.activeElement as HTMLElement | null)?.classList?.contains('bt')) {
				editingBid = null;
				document.body.classList.remove('editing');
				if (pop?.kind === 'slash') closePop();
			}
		}, 220);
	}
	function kbPick(type: BlockType | 'done') {
		const b = editingBid ? blocks[idx(editingBid)] : undefined;
		if (type === 'done') {
			(document.activeElement as HTMLElement | null)?.blur();
			document.body.classList.remove('editing');
			return;
		}
		if (b) setType(b, b.type === type && type !== 'hr' ? 'p' : type);
	}
	$effect(() => () => document.body.classList.remove('editing'));

	const popBlock = $derived(pop ? blocks[idx(pop.bid)] : undefined);
	/** Akcja z menu bloku: zapamiętaj blok, zamknij menu, wykonaj */
	function act(fn: (b: Block) => void) {
		const b = popBlock;
		closePop();
		if (b) fn(b);
	}
</script>

<svelte:window
	onclick={(e) => {
		const t = e.target as HTMLElement;
		if (pop && !t.closest('.ed-pop') && !t.closest('.blk-handle')) closePop();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && pop?.kind === 'block') closePop();
	}}
	onresize={() => pop && closePop()}
/>

<div class="editor" class:solo bind:this={root} data-c={c} data-id={id}>
	{#each blocks as b, i (b.id)}
		{@const chk = b.type === 'todo' && isChecked(b)}
		<div
			class="blk blk-{b.type}"
			class:is-checked={chk}
			class:drop-before={drop?.bid === b.id && drop.before}
			class:drop-after={drop?.bid === b.id && !drop.before}
			data-bid={b.id}
			role="group"
			ondragover={(e) => onDragOver(e, b)}
			ondrop={onDrop}
		>
			<button
				class="blk-handle"
				draggable="true"
				aria-label="Opcje bloku"
				tabindex="-1"
				onclick={(e) => {
					if (pop?.kind === 'block' && pop.bid === b.id) closePop();
					else place(e.currentTarget, 'block', b.id);
				}}
				ondragstart={(e) => {
					dragBid = b.id;
					if (e.dataTransfer) {
						e.dataTransfer.effectAllowed = 'move';
						e.dataTransfer.setData('text/plain', b.text || '');
						const blk = (e.currentTarget as HTMLElement).closest('.blk');
						if (blk) e.dataTransfer.setDragImage(blk, 10, 10);
					}
				}}
				ondragend={() => {
					dragBid = null;
					drop = null;
				}}><Icon name="grip" size={15} /></button
			>
			{#if b.type === 'hr'}
				<hr />
			{:else if DIAGRAM.includes(b.type)}
				<DiagramBlock block={b} title={title || 'schemat'} onchange={touch} />
			{:else}
				{#if b.type === 'ul'}<span class="blk-pre bullet"></span>
				{:else if b.type === 'ol'}<span class="blk-pre">{nums[i]}.</span>
				{:else if b.type === 'callout'}<span class="blk-pre"><Icon name="bulb" size={17} /></span>
				{:else if b.type === 'todo'}
					<button
						class="blk-check"
						class:on={chk}
						aria-label={chk ? 'Odznacz' : 'Zaznacz'}
						tabindex="-1"
						onclick={() => toggleCheck(b)}
						>{#if chk}<Icon name="check" size={12} />{/if}</button
					>
				{/if}
				<div
					class="bt"
					contenteditable={CE}
					spellcheck="true"
					role="textbox"
					aria-multiline="true"
					tabindex="0"
					data-ph={PH[b.type] || ''}
					{@attach syncText(b)}
					oninput={(e) => onInput(b, e.currentTarget)}
					onkeydown={(e) => onKeydown(e, b, e.currentTarget)}
					onpaste={(e) => onPaste(e, b, e.currentTarget)}
					onfocus={() => onFocus(b)}
					onblur={onBlur}
				></div>
				{#if b.type === 'todo'}
					{#if b.taskId && app.data.tasks[b.taskId]}
						<button class="blk-link" tabindex="-1" onclick={() => (ui.taskOpen = b.taskId!)}
							>zadanie <Icon name="arrow" size={11} /></button
						>
					{:else if b.text.trim()}
						<button
							class="blk-totask"
							tabindex="-1"
							title="Utwórz zadanie z tego punktu"
							onclick={() => blockToTask(b)}>→ Zadanie</button
						>
					{/if}
				{/if}
			{/if}
		</div>
	{/each}
	<div
		class="ed-tail"
		role="button"
		tabindex="-1"
		aria-label="Dodaj blok na końcu"
		onclick={append}
		onkeydown={() => {}}
	></div>
</div>

{#if pop}
	<div
		class="pop ed-pop"
		role="menu"
		tabindex="-1"
		style="left:{pop.x}px; top:{pop.y}px"
		onmousedown={(e) => pop?.kind === 'slash' && e.preventDefault()}
	>
		{#if pop.kind === 'slash'}
			<div class="pop-l eyebrow">Bloki</div>
			{#each slashItems as [t, name, k], j (t)}
				<button class="pop-i" class:on={j === slashIdx} role="menuitem" onclick={() => pickSlash(t)}
					><span class="k">{k}</span>{name}</button
				>
			{/each}
		{:else if popBlock}
			{@const b = popBlock}
			<div class="pop-l eyebrow">Zamień na</div>
			{#each BT.filter(([t]) => t !== 'hr') as [t, name, k] (t)}
				<button
					class="pop-i"
					class:on={b.type === t}
					role="menuitem"
					onclick={() => act((x) => setType(x, t))}><span class="k">{k}</span>{name}</button
				>
			{/each}
			<div class="pop-sep"></div>
			{#if b.text?.trim() && !DIAGRAM.includes(b.type) && !b.taskId}
				<button class="pop-i" role="menuitem" onclick={() => act((x) => blockToTask(x))}
					><Icon name="tasks" size={16} />Utwórz zadanie</button
				>
			{/if}
			<button class="pop-i" role="menuitem" onclick={() => act((x) => move(x, -1))}
				><Icon name="up" size={16} />Przenieś wyżej</button
			>
			<button class="pop-i" role="menuitem" onclick={() => act((x) => move(x, 1))}
				><Icon name="down" size={16} />Przenieś niżej</button
			>
			<button class="pop-i" role="menuitem" onclick={() => act((x) => duplicate(x))}
				><Icon name="plus" size={16} />Duplikuj</button
			>
			<button class="pop-i danger" role="menuitem" onclick={() => act((x) => remove(x))}
				><Icon name="trash" size={16} />Usuń blok</button
			>
		{/if}
	</div>
{/if}

<div
	id="kbbar"
	role="toolbar"
	aria-label="Typ bloku"
	tabindex="-1"
	onmousedown={(e) => e.preventDefault()}
>
	{#each KB as [t, l] (t)}
		<button
			aria-label={BT.find((x) => x[0] === t)?.[1]}
			onpointerdown={(e) => e.pointerType !== 'mouse' && e.preventDefault()}
			onclick={() => kbPick(t)}>{l}</button
		>
	{/each}
	<button class="done" onclick={() => kbPick('done')}>Gotowe</button>
</div>
