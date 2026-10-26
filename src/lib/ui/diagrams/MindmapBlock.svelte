<script lang="ts">
	import { untrack } from 'svelte';
	// Blok mapy myśli (Markmap). Treść to konspekt Markdown: `# temat`, `## gałęzie`, `- punkty`
	// (wcięcie o 2 spacje = poziom niżej). Zwijanie gałęzi kliknięciem, poziomy, pełny ekran, eksport.
	import type { Block } from '#lib/model.ts';
	import { toast } from '#lib/store.svelte.ts';
	import Icon from '../Icon.svelte';
	import DiagramControls from './DiagramControls.svelte';
	import { MINDMAP_TEMPLATE, outlineTree } from '#lib/diagrams/outline.ts';
	import {
		loadMarkmap,
		markmapOptions,
		styleMarkmapSvg,
		type MarkmapT
	} from '#lib/diagrams/markmap.ts';
	import { themeSig, watchTheme } from '#lib/diagrams/theme.svelte.ts';
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
	let level = $state(-1);
	let full = $state(false);
	let failed = $state(false);
	let svgEl = $state<SVGSVGElement>();
	let boxEl = $state<HTMLDivElement>();
	let mm: MarkmapT | null = null;

	const PLACEHOLDER = ['# Temat', '## Gałąź', '- punkt', '  - szczegół'].join('\n');
	const has = $derived(!!block.text?.trim());
	watchTheme();

	async function draw(fit: boolean) {
		if (!svgEl || !boxEl?.offsetWidth) return;
		const tree = outlineTree(block.text, title);
		if (!tree) return;
		let Markmap;
		try {
			Markmap = await loadMarkmap();
		} catch {
			failed = true;
			return;
		}
		if (!svgEl?.isConnected) return;
		styleMarkmapSvg(svgEl);
		const opts = markmapOptions(level, full);
		try {
			if (!mm) mm = Markmap.create(svgEl, opts);
			else mm.setOptions(opts);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await mm.setData(tree as any);
			if (fit && boxEl?.offsetWidth) await mm.fit();
		} catch {
			/* element zniknął w trakcie animacji */
		}
	}

	// przerysowanie po zmianie konspektu, poziomu, trybu albo skórki
	$effect(() => {
		void block.text;
		void themeSig.v;
		void mode;
		void level;
		void full;
		if (!has) return;
		const timer = setTimeout(() => draw(true), mm ? 300 : 0);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		document.body.classList.toggle('mm-fs', full);
		return () => document.body.classList.remove('mm-fs');
	});
	$effect(() => () => {
		mm?.destroy();
		mm = null;
	});

	function setText(v: string) {
		block.text = v;
		onchange();
	}
	function zoom(f: number) {
		if (!mm) return;
		const k = (svgEl as SVGSVGElement & { __zoom?: { k: number } })?.__zoom?.k || 1;
		mm.rescale(k * f);
	}
	async function exp(fmt: 'svg' | 'png') {
		if (!svgEl || !mm) return toast('Najpierw dodaj treść mapy.');
		if (!(await exportDiagram(svgEl, true, fmt, title)))
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
		if (e.key === 'Escape' && full) full = false;
	}}
/>

<div class="mm" class:full>
	<div class="mm-bar">
		<span class="tag-l"><Icon name="mind" size={13} />Mapa myśli</span>
		<div class="seg">
			{#each [['prev', 'Podgląd'], ['split', 'Obok'], ['code', 'Kod']] as const as [k, l] (k)}
				<button class:on={mode === k} onclick={() => (mode = k)}>{l}</button>
			{/each}
		</div>
		<span class="spacer"></span>
		{#if has}
			<div class="seg">
				{#each [[1, 'Zwiń'], [2, '2 poziomy'], [-1, 'Całość']] as const as [v, l] (v)}
					<button class:on={level === v} onclick={() => (level = v)}>{l}</button>
				{/each}
			</div>
			<button class="btn sm ghost" title="Zapisz jako SVG" onclick={() => exp('svg')}>SVG</button>
			<button class="btn sm ghost" title="Zapisz jako PNG" onclick={() => exp('png')}>PNG</button>
		{/if}
	</div>

	<div class="mm-body mode-{mode}">
		<div class="mm-code">
			<textarea
				class="mm-src"
				spellcheck="false"
				placeholder={PLACEHOLDER}
				aria-label="Konspekt mapy myśli"
				value={block.text}
				oninput={(e) => setText(e.currentTarget.value)}
				onkeydown={onKey}></textarea>
		</div>
		<div class="mk-prev" bind:this={boxEl}>
			{#if failed}
				<span class="mm-wait" style="display:block; padding:16px"
					>Nie udało się wczytać modułu map myśli. Odśwież stronę.</span
				>
			{:else if has}
				<svg class="mk-svg" bind:this={svgEl} aria-label="Mapa myśli"></svg>
				<DiagramControls
					{full}
					onzoom={zoom}
					onfit={() => mm?.fit()}
					onfull={() => (full = !full)}
				/>
			{:else}
				<div class="mm-tpls" style="padding:16px; margin:auto">
					<p>
						Napisz konspekt: <code># temat</code>, <code>## gałęzie</code>, <code>- punkty</code> (wcięcie
						= poziom niżej).
					</p>
					<div class="chips">
						<button class="chip" onclick={() => setText(MINDMAP_TEMPLATE)}>Przykładowa mapa</button>
						<button class="btn sm" onclick={() => (mode = wide() ? 'split' : 'code')}
							>Pisz konspekt</button
						>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
