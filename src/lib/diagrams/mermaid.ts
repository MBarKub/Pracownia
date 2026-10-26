// Renderowanie bloków Mermaid: biblioteka i układ ELK ładowane leniwie (osobne paczki),
// motyw ze skórki, opcjonalny wygląd „szkic”, pamięć podręczna wyników.
import type { Block } from '../model';
import { mermaidThemeVars, signature } from './theme.svelte';

type MermaidAPI = typeof import('mermaid').default;

let lib: MermaidAPI | null = null;
let loading: Promise<MermaidAPI> | null = null;
let sig = '';
let elkReady = false;
const cache = new Map<string, string>();

/** Typy diagramów, dla których działa układ ELK i wygląd „szkic”. */
export const LAYOUT_RE = /^\s*(flowchart|graph|stateDiagram|classDiagram|erDiagram)\b/;
export const LOOK_RE = /^\s*(flowchart|graph|stateDiagram)\b/;

function init(m: MermaidAPI) {
	const tv = mermaidThemeVars();
	sig = signature();
	const shadow = tv.darkMode ? 'rgba(0,0,0,.45)' : 'rgba(20,30,25,.13)';
	m.initialize({
		startOnLoad: false,
		securityLevel: 'strict',
		theme: 'base',
		themeVariables: tv,
		fontFamily: String(tv.fontFamily),
		htmlLabels: false,
		flowchart: {
			htmlLabels: false,
			curve: 'basis',
			padding: 16,
			nodeSpacing: 48,
			rankSpacing: 58,
			diagramPadding: 12
		},
		state: { padding: 12 },
		sequence: { useMaxWidth: true, actorMargin: 56, boxMargin: 12, messageMargin: 40 },
		gantt: {
			useMaxWidth: true,
			useWidth: 720,
			barHeight: 26,
			barGap: 6,
			fontSize: 13,
			sectionFontSize: 13,
			leftPadding: 100,
			topPadding: 44,
			gridLineStartPadding: 36
		},
		timeline: { useMaxWidth: true },
		themeCSS: `
      .node rect, .node polygon, .node circle, .node ellipse, .node path, .actor, .statediagram-state rect, rect.task { filter: drop-shadow(0 1px 2px ${shadow}); }
      .node rect, .statediagram-state rect, .cluster rect { rx: 10px; ry: 10px; }
      .flowchart-link, .edgePath .path, .transition { stroke-width: 1.7px !important; }
      .edgeLabel, .edgeLabel rect { font-size: 13px; }
      .nodeLabel, .label text, .node text { font-weight: 500; }
      .cluster-label text, .titleText, .sectionTitle { font-weight: 600; }`
	} as Parameters<MermaidAPI['initialize']>[0]);
}

export function loadMermaid(): Promise<MermaidAPI> {
	if (lib) return Promise.resolve(lib);
	if (!loading)
		loading = (async () => {
			const m = (await import('mermaid')).default;
			init(m);
			try {
				const elk = (await import('@mermaid-js/layout-elk')).default;
				m.registerLayoutLoaders(elk);
				elkReady = true;
			} catch {
				elkReady = false; // zostaje standardowy układ dagre
			}
			lib = m;
			return m;
		})().catch((e) => {
			loading = null;
			throw e;
		});
	return loading;
}

/** Wywołaj po zmianie skórki: ponowna inicjalizacja motywu i wyczyszczenie pamięci. */
export function refreshMermaidTheme() {
	if (!lib || signature() === sig) return false;
	init(lib);
	cache.clear();
	return true;
}

/** Kod z dopisanym nagłówkiem konfiguracji (układ ELK, wygląd szkicu). */
export function effectiveCode(b: Pick<Block, 'text' | 'layout' | 'look'>) {
	const code = b.text || '';
	if (/^\s*---/.test(code)) return code;
	const lines: string[] = [];
	if (LAYOUT_RE.test(code) && (b.layout || 'elk') === 'elk' && elkReady)
		lines.push('  layout: elk');
	if (LOOK_RE.test(code) && b.look === 'handDrawn') lines.push('  look: handDrawn');
	return lines.length ? `---\nconfig:\n${lines.join('\n')}\n---\n${code}` : code;
}

export const isElkReady = () => elkReady;

export type RenderResult = { svg: string } | { error: string };

let seq = 0;
export async function renderMermaid(
	b: Pick<Block, 'text' | 'layout' | 'look'>
): Promise<RenderResult> {
	const m = await loadMermaid();
	const eff = effectiveCode(b);
	const key = sig + '§' + eff;
	const hit = cache.get(key);
	if (hit) return { svg: hit };
	const id = 'mmd' + Date.now().toString(36) + seq++;
	try {
		await m.parse(eff);
		const { svg } = await m.render(id, eff);
		cache.set(key, svg);
		if (cache.size > 120) cache.delete(cache.keys().next().value!);
		return { svg };
	} catch (e) {
		document.getElementById('d' + id)?.remove();
		document.getElementById(id)?.remove();
		const err = e as { message?: string; str?: string };
		const raw = String(err?.message || err?.str || e || 'Nieznany błąd')
			.split('\n')
			.filter((l) => l.trim())
			.slice(0, 3)
			.join('\n');
		return { error: 'Błąd w kodzie schematu: ' + raw };
	} finally {
		document.getElementById('d' + id)?.remove();
	}
}
