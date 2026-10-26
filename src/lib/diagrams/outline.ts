// Mapy myśli: konspekt Markdown ⇄ drzewo Markmap ⇄ Mermaid `mindmap`, szablony schematów.
import type { Block } from '../model';

export const MINDMAP_TEMPLATE = `# Projekt
## Ludzie
- Reżyser
- Operator
  - Ostrość
  - Światło
## Miejsca
- Studio
- Plener
## Budżet
- Sprzęt
- Honoraria
## Terminy
- Zdjęcia
- Montaż`;

/** Szablony Mermaid; `mind` tworzy blok mapy myśli (konspekt), nie kod Mermaid. */
export const MERMAID_TEMPLATES: { key: string; label: string; code: string | null }[] = [
	{
		key: 'flow',
		label: 'Schemat blokowy',
		code: `flowchart TD
  A["Pomysł"] --> B{"Akceptacja klienta?"}
  B -- "tak" --> C["Scenariusz"]
  B -- "nie" --> A
  C --> D["Zdjęcia"]
  D --> E["Montaż"]
  E --> F["Oddanie"]`
	},
	{
		key: 'seq',
		label: 'Sekwencja',
		code: `sequenceDiagram
  participant K as Klient
  participant S as Studio
  K->>S: Brief
  S->>K: Propozycje kreacji
  K->>S: Uwagi
  S->>K: Wersja finalna`
	},
	{
		key: 'timeline',
		label: 'Oś czasu',
		code: `timeline
  title Harmonogram produkcji
  Październik : Brief : Kreacja
  Listopad : Zdjęcia : Montaż
  Grudzień : Kolor i dźwięk : Emisja`
	},
	{
		key: 'gantt',
		label: 'Harmonogram',
		code: `gantt
  title Produkcja spotu
  dateFormat YYYY-MM-DD
  section Przygotowanie
  Scenariusz :a1, 2026-11-02, 5d
  Casting :a2, after a1, 3d
  section Realizacja
  Zdjęcia :b1, after a2, 2d
  Montaż :b2, after b1, 6d`
	},
	{ key: 'mind', label: 'Mapa myśli', code: null },
	{
		key: 'state',
		label: 'Diagram stanów',
		code: `stateDiagram-v2
  [*] --> Pomysł
  Pomysł --> W_toku: start
  W_toku --> Wstrzymany: brak budżetu
  Wstrzymany --> W_toku: wznowienie
  W_toku --> Gotowe
  Gotowe --> [*]`
	},
	{
		key: 'rel',
		label: 'Relacje postaci',
		code: `flowchart LR
  A(["Bohater"]) -- "kocha" --> B(["Ona"])
  C(["Rywal"]) -- "zazdrości" --> A
  B -- "ukrywa sekret przed" --> A
  D(["Mentor"]) -. "chroni" .-> A`
	}
];

export interface OutlineNode {
	content: string;
	raw: string;
	children: OutlineNode[];
	payload: { branch?: number | null; depth?: number; fold?: number };
}

const esc = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
const mdInline = (s: string) =>
	esc(s)
		.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
		.replace(/`([^`]+)`/g, '<code>$1</code>');
const stripMd = (s: string) =>
	String(s)
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1');

/** Konspekt → płaska lista (poziom, tekst). Nagłówki ustalają poziom, wcięcia list schodzą niżej. */
export function outlineItems(text: string) {
	const items: { L: number; t: string }[] = [];
	let headL = 0;
	for (const raw of String(text || '')
		.replace(/\t/g, '  ')
		.split('\n')) {
		if (!raw.trim()) continue;
		let m = raw.match(/^\s*(#{1,6})\s+(.*)$/);
		if (m) {
			headL = m[1].length;
			items.push({ L: headL, t: m[2].trim() });
			continue;
		}
		const ind = raw.match(/^\s*/)![0].length;
		m = raw.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/);
		const t = (m ? m[1] : raw.trim()).trim();
		if (t) items.push({ L: headL + 1 + Math.floor(ind / 2), t });
	}
	return items;
}

/** Konspekt → drzewo w formacie Markmap (gałęzie główne numerowane do kolorowania). */
export function outlineTree(text: string, fallbackTitle?: string): OutlineNode | null {
	const items = outlineItems(text);
	if (!items.length) return null;
	const root: OutlineNode = { content: '', raw: '', children: [], payload: {} };
	const stack: { L: number; node: OutlineNode }[] = [{ L: 0, node: root }];
	for (const it of items) {
		const node: OutlineNode = { content: '', raw: it.t, children: [], payload: {} };
		while (stack.length > 1 && stack[stack.length - 1].L >= it.L) stack.pop();
		stack[stack.length - 1].node.children.push(node);
		stack.push({ L: it.L, node });
	}
	const top =
		root.children.length === 1
			? root.children[0]
			: Object.assign(root, { raw: fallbackTitle || 'Mapa myśli' });
	const tag = (n: OutlineNode, d: number, br: number | null) => {
		n.payload.branch = br;
		n.payload.depth = d;
		const html = mdInline(n.raw);
		n.content =
			d === 0
				? `<span style="font-weight:700;font-size:1.22em;letter-spacing:-.01em">${html}</span>`
				: d === 1
					? `<span style="font-weight:600">${html}</span>`
					: html;
		n.children.forEach((c, i) => tag(c, d + 1, d === 0 ? i : br));
	};
	tag(top, 0, null);
	return top;
}

/** Stary blok Mermaid `mindmap` → konspekt (konwersja przy otwarciu notatki). */
export function mermaidMindmapToOutline(code: string) {
	const lines = String(code)
		.split('\n')
		.slice(1)
		.filter((l) => l.trim() && !/^\s*(::icon|%%)/.test(l));
	if (!lines.length) return '';
	const indOf = (l: string) => l.match(/^\s*/)![0].replace(/\t/g, '  ').length;
	const inds = [...new Set(lines.map(indOf))].sort((a, b) => a - b);
	return lines
		.map((l) => {
			let t = l
				.trim()
				.replace(/:::.*$/, '')
				.trim();
			const m = t.match(
				/^[^\s()[\]{}]*\s*(\(\(|\)\)|\{\{|\(|\)|\[)([\s\S]*?)(\)\)|\(\(|\}\}|\)|\(|\])$/
			);
			if (m) t = m[2];
			t = t.replace(/^["'`]+|["'`]+$/g, '').trim();
			const L = inds.indexOf(indOf(l));
			return L === 0 ? '# ' + t : '  '.repeat(L - 1) + '- ' + t;
		})
		.join('\n');
}

/** Konspekt → Mermaid `mindmap` (eksport Markdown, Obsidian). */
export function outlineToMermaid(text: string, title?: string) {
	const tree = outlineTree(text, title);
	if (!tree) return 'mindmap';
	const clean = (s: string) =>
		stripMd(s)
			.replace(/[()[\]{}]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim() || '…';
	const out = ['mindmap', `  root((${clean(tree.raw)}))`];
	const walk = (n: OutlineNode, d: number) =>
		n.children.forEach((c) => {
			out.push('  '.repeat(d + 2) + clean(c.raw));
			walk(c, d + 1);
		});
	walk(tree, 0);
	return out.join('\n');
}

/** Nagłówki i listy notatki → konspekt mapy myśli (przycisk „Mapa z notatki”). */
export function blocksToOutline(title: string, blocks: Block[]) {
	const lines = ['# ' + (title || 'Notatka').trim()];
	let n = 0;
	for (const b of blocks || []) {
		const t = (b.text || '').replace(/\n+/g, ' ').trim();
		if (!t) continue;
		if (b.type === 'h1' || b.type === 'h2') lines.push('## ' + t);
		else if (b.type === 'h3') lines.push('### ' + t);
		else if (['ul', 'ol', 'todo', 'callout', 'quote'].includes(b.type))
			lines.push('- ' + t.slice(0, 120));
		else if (b.type === 'p' && t.length <= 90) lines.push('- ' + t);
		else continue;
		n++;
	}
	return n ? lines.join('\n') : null;
}

/**
 * Migracja przy otwarciu dokumentu: bloki `mermaid` z diagramem `mindmap` stają się blokami
 * `mindmap` z konspektem. Zwraca true, gdy coś zmieniono (wtedy zapisz dokument).
 */
export function migrateMindmapBlocks(blocks: Block[]) {
	let changed = false;
	for (const b of blocks || [])
		if (b.type === 'mermaid' && /^\s*mindmap\b/.test(b.text || '')) {
			b.type = 'mindmap';
			b.text = mermaidMindmapToOutline(b.text);
			changed = true;
		}
	return changed;
}

/** Blok → Markdown (do eksportu notatek). */
export function diagramBlockToMarkdown(b: Block) {
	if (b.type === 'mermaid') return '```mermaid\n' + b.text + '\n```';
	if (b.type === 'mindmap') return '```mermaid\n' + outlineToMermaid(b.text) + '\n```';
	return null;
}
