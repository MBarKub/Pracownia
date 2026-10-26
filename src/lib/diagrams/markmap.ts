// Mapy myśli: Markmap (D3) ładowany leniwie, kolory gałęzi ze skórki.
import type { Markmap as MarkmapT, IMarkmapOptions } from 'markmap-view';
import type { INode } from 'markmap-common';
import { mindmapPalette } from './theme.svelte';

type MarkmapCtor = typeof import('markmap-view').Markmap;
let ctor: Promise<MarkmapCtor> | null = null;

export function loadMarkmap() {
	if (!ctor)
		ctor = import('markmap-view')
			.then((m) => m.Markmap)
			.catch((e) => {
				ctor = null;
				throw e;
			});
	return ctor;
}

/** Opcje Markmap. `level` = początkowy poziom rozwinięcia (-1 całość). Przybliżanie tylko w pełnym ekranie. */
export function markmapOptions(level: number, interactive: boolean): Partial<IMarkmapOptions> {
	const P = mindmapPalette();
	const branch = (n: INode) => (n.payload as { branch?: number | null } | undefined)?.branch;
	return {
		autoFit: false,
		duration: 380,
		maxWidth: 300,
		paddingX: 10,
		spacingHorizontal: 72,
		spacingVertical: 9,
		nodeMinHeight: 18,
		fitRatio: 0.92,
		maxInitialScale: 1.6,
		initialExpandLevel: level,
		zoom: interactive,
		pan: interactive,
		scrollForPan: false,
		toggleRecursively: false,
		color: (n: INode) => {
			const b = branch(n);
			return b == null ? P.root : P.pal[b % P.pal.length];
		},
		lineWidth: (n: INode) => Math.max(1.4, 4.4 - (n.state?.depth || 0) * 1)
	};
}

/** Typografia mapy ze skórki (zmienne CSS Markmap ustawione na samym SVG). */
export function styleMarkmapSvg(svg: SVGSVGElement) {
	const P = mindmapPalette();
	svg.style.setProperty('--markmap-font', `400 14.5px/20px ${P.font}`);
	svg.style.setProperty('--markmap-text-color', P.text);
	svg.style.setProperty('--markmap-circle-open-bg', P.surface);
	svg.style.setProperty('--markmap-code-bg', 'transparent');
	svg.style.setProperty('--markmap-code-color', P.text);
	svg.style.color = P.text;
}

export type { MarkmapT };
