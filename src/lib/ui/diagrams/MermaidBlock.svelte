<script lang="ts">
	import { untrack } from 'svelte';
	// Blok schematu Mermaid: tryby podgląd / obok / kod, szablony, styl (ELK, szkic),
	// przybliżanie, pełny ekran, eksport SVG i PNG. Blok jest obiektem z magazynu ($state),
	// więc zmiany pól są reaktywne; `onchange` wywołuje zapis dokumentu.
	import type { Block } from '#lib/model.ts';
	import { toast } from '#lib/store.svelte.ts';
	import Icon from '../Icon.svelte';
	import DiagramControls from './DiagramControls.svelte';
	import {
		isElkReady,
		LAYOUT_RE,
		LOOK_RE,
		refreshMermaidTheme,
		renderMermaid
	} from '#lib/diagrams/mermaid.ts';
	import { MERMAID_TEMPLATES, MINDMAP_TEMPLATE } from '#lib/diagrams/outline.ts';
	import { themeSig, watchTheme } from '#lib/diagrams/theme.svelte.ts';
	import { panzoom, pzApi } from '#lib/diagrams/panzoom.ts';
	import { exportDiagram } from '#lib/diagrams/export.ts';

	let {
		block,
		title = '',
		onchange
	}: { block: Block; title?: string; onchange: () => void } = $props();

	const wide = () => typeof window !== 'undefined' && innerWidth > 820;
	// tryb początkowy z treści przy pierwszym wyświetleniu (później wybiera użytkownik)
	let mode = $state<'prev' | 'split' | 'code'>(
		untrack(() => (block.text?.trim() ? 'prev' : wide() ? 'split' : 'prev'))
	);
	let svg = $state('');
	let error = $state('');
	let busy = $state(false);
	let full = $state(false);
	let menu = $state<'' | 'tpl' | 'style'>('');
	let prevEl = $state<HTMLDivElement>();

	const has = $derived(!!block.text?.trim());
	const canLayout = $derived(LAYOUT_RE.test(block.text || ''));
	const canLook = $derived(LOOK_RE.test(block.text || ''));

	watchTheme();

	// przerysowanie po zmianie kodu, stylu albo skórki (z krótkim opóźnieniem przy pisaniu)
	$effect(() => {
		const b = { text: block.text, layout: block.layout, look: block.look };
		void themeSig.v;
		if (!b.text?.trim()) {
			svg = '';
			error = '';
			return;
		}
		let alive = true;
		const timer = setTimeout(
			async () => {
				busy = true;
				refreshMermaidTheme();
				const r = await renderMermaid(b).catch(() => ({
					error: 'Nie udało się wczytać modułu schematów.'
				}));
				if (!alive) return;
				busy = false;
				if ('svg' in r) {
					svg = r.svg;
					error = '';
				} else error = r.error;
			},
			svg ? 400 : 0
		);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	});

	$effect(() => {
		document.body.classList.toggle('mm-fs', full);
		return () => document.body.classList.remove('mm-fs');
	});

	function setText(v: string) {
		block.text = v;
		onchange();
	}
	function pickTemplate(key: string) {
		menu = '';
		const t = MERMAID_TEMPLATES.find((x) => x.key === key);
		if (!t) return;
		const old = block.text;
		if (t.code === null) {
			// mapa myśli to osobny typ bloku (Markmap) z konspektem
			block.type = 'mindmap';
			block.text = MINDMAP_TEMPLATE;
			delete block.layout;
			delete block.look;
			onchange();
			return;
		}
		block.text = t.code;
		mode = wide() ? 'split' : 'prev';
		onchange();
		if (old?.trim())
			toast('Wstawiono szablon', 'Cofnij', () => {
				block.text = old;
				onchange();
			});
	}
	function setStyle(k: 'layout' | 'look', v: string) {
		menu = '';
		if (k === 'layout') block.layout = v as Block['layout'];
		else block.look = v as Block['look'];
		onchange();
	}
	async function exp(fmt: 'svg' | 'png') {
		const el = prevEl?.querySelector('.mm-stage > svg') as SVGSVGElement | null;
		if (!el) return toast('Najpierw popraw schemat, żeby był widoczny podgląd.');
		if (!(await exportDiagram(el, false, fmt, title)))
			toast('Nie udało się utworzyć PNG. Zapisz jako SVG.');
	}
	function onKey(e: KeyboardEvent) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		if (e.key === 'Tab') {
			e.preventDefault();
			const a = ta.selectionStart,
				z = ta.selectionEnd;
			setText(ta.value.slice(0, a) + '  ' + ta.value.slice(z));
			requestAnimationFrame(() => ta.setSelectionRange(a + 2, a + 2));
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && (full || menu)) {
			if (menu) menu = '';
			else full = false;
		}
	}}
	onclick={(e) => {
		if (menu && !(e.target as HTMLElement).closest('.mm-menu')) menu = '';
	}}
/>

<div class="mm" class:full>
	<div class="mm-bar">
		<span class="tag-l"><Icon name="board" size={13} />Schemat</span>
		<div class="seg">
			{#each [['prev', 'Podgląd'], ['split', 'Obok'], ['code', 'Kod']] as const as [k, l] (k)}
				<button class:on={mode === k} onclick={() => (mode = k)}>{l}</button>
			{/each}
		</div>
		<span class="spacer"></span>
		<div class="mm-menu">
			<button class="btn sm ghost" onclick={() => (menu = menu === 'tpl' ? '' : 'tpl')}
				>Szablony</button
			>
			{#if menu === 'tpl'}
				<div class="pop" role="menu">
					<div class="pop-l eyebrow">Szablon schematu</div>
					{#each MERMAID_TEMPLATES as t (t.key)}
						<button class="pop-i" role="menuitem" onclick={() => pickTemplate(t.key)}
							>{t.label}</button
						>
					{/each}
				</div>
			{/if}
		</div>
		{#if has && (canLayout || canLook)}
			<div class="mm-menu">
				<button class="btn sm ghost" onclick={() => (menu = menu === 'style' ? '' : 'style')}
					>Styl</button
				>
				{#if menu === 'style'}
					<div class="pop" role="menu">
						{#if canLayout}
							<div class="pop-l eyebrow">Układ</div>
							{#each [['elk', 'Uporządkowany (ELK)', isElkReady() ? 'mniej krzyżujących się linii' : 'wczytuje się przy pierwszym użyciu'], ['dagre', 'Standardowy', 'klasyczny układ Mermaid']] as [v, l, h] (v)}
								<button
									class="pop-i"
									class:on={(block.layout || 'elk') === v}
									onclick={() => setStyle('layout', v)}
									>{#if (block.layout || 'elk') === v}<Icon name="check" size={15} />{:else}<span
											style="width:15px"
										></span>{/if}<span
										><span style="display:block">{l}</span><span
											class="muted"
											style="font-size:12px">{h}</span
										></span
									></button
								>
							{/each}
						{/if}
						{#if canLook}
							<div class="pop-sep"></div>
							<div class="pop-l eyebrow">Wygląd</div>
							{#each [['classic', 'Klasyczny', 'czyste linie i zaokrąglenia'], ['handDrawn', 'Szkic', 'odręczny styl, dobry do koncepcji']] as [v, l, h] (v)}
								<button
									class="pop-i"
									class:on={(block.look || 'classic') === v}
									onclick={() => setStyle('look', v)}
									>{#if (block.look || 'classic') === v}<Icon name="check" size={15} />{:else}<span
											style="width:15px"
										></span>{/if}<span
										><span style="display:block">{l}</span><span
											class="muted"
											style="font-size:12px">{h}</span
										></span
									></button
								>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
		{#if has}
			<button class="btn sm ghost" title="Zapisz jako SVG" onclick={() => exp('svg')}>SVG</button>
			<button class="btn sm ghost" title="Zapisz jako PNG" onclick={() => exp('png')}>PNG</button>
		{/if}
	</div>

	<div class="mm-body mode-{mode}">
		<div class="mm-code">
			<textarea
				class="mm-src"
				spellcheck="false"
				placeholder="Kod Mermaid, np. flowchart TD"
				aria-label="Kod schematu"
				value={block.text}
				oninput={(e) => setText(e.currentTarget.value)}
				onkeydown={onKey}></textarea>
		</div>
		<div class="mm-prev" bind:this={prevEl} use:panzoom={{ full }}>
			<div class="mm-stage">
				{#if !has}
					<div class="mm-tpls">
						<p>Wybierz szablon albo wpisz kod.</p>
						<div class="chips">
							{#each MERMAID_TEMPLATES as t (t.key)}
								<button class="chip" onclick={() => pickTemplate(t.key)}>{t.label}</button>
							{/each}
						</div>
						<div class="chips">
							<button class="btn sm" onclick={() => (mode = wide() ? 'split' : 'code')}
								>Pisz kod</button
							>
						</div>
					</div>
				{:else if svg}
					<!-- SVG z Mermaid w trybie securityLevel: 'strict' (oczyszczony) -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html svg}
				{:else if error}
					<span class="mm-wait">Popraw kod, a podgląd pojawi się tutaj.</span>
				{:else}
					<span class="mm-wait">{busy ? 'Rysuję schemat…' : ''}</span>
				{/if}
			</div>
			{#if has}
				<DiagramControls
					{full}
					onzoom={(f) => pzApi(prevEl)?.zoom(f)}
					onfit={() => pzApi(prevEl)?.reset()}
					onfull={() => (full = !full)}
				/>
			{/if}
		</div>
	</div>

	{#if error && has}
		<div class="mm-err"><code>{error}</code></div>
	{/if}
</div>
