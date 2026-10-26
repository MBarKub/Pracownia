// Edytor blokowy: definicje bloków, skróty Markdown i obsługa kursora (port z Pracowni v6)
import type { Block, BlockType } from '../model';
import { uid } from '../util';

export const BT: [BlockType, string, string][] = [
	['p', 'Tekst', 'T'],
	['h1', 'Nagłówek 1', 'H1'],
	['h2', 'Nagłówek 2', 'H2'],
	['h3', 'Nagłówek 3', 'H3'],
	['ul', 'Lista', '•'],
	['ol', 'Lista numerowana', '1.'],
	['todo', 'Do zrobienia', '☐'],
	['quote', 'Cytat', '"'],
	['callout', 'Wyróżnienie', '!'],
	['code', 'Kod', '{}'],
	['mindmap', 'Mapa myśli', '✳'],
	['mermaid', 'Schemat (Mermaid)', '◇'],
	['hr', 'Separator', '—']
];

export const BT_ALIAS: Record<string, string> = {
	p: 'tekst akapit text',
	h1: 'naglowek h1 tytul heading',
	h2: 'naglowek h2 heading',
	h3: 'naglowek h3 heading',
	ul: 'lista punkty bullet',
	ol: 'numerowana lista numbered',
	todo: 'zadanie checklista todo check',
	quote: 'cytat quote',
	callout: 'wyroznienie uwaga callout',
	code: 'kod code',
	mermaid: 'schemat diagram mermaid wykres flowchart graf',
	mindmap: 'mapa mysli mindmap konspekt drzewo markmap',
	hr: 'separator linia divider'
};

export const PH: Record<string, string> = {
	p: 'Wpisz / aby wybrać blok',
	h1: 'Nagłówek 1',
	h2: 'Nagłówek 2',
	h3: 'Nagłówek 3',
	ul: 'Lista',
	ol: 'Lista',
	todo: 'Do zrobienia',
	quote: 'Cytat',
	callout: 'Wyróżnienie',
	code: 'Kod'
};

/** Bloki, w których Enter wstawia nową linię, a Tab wcięcie */
export const CODEISH: BlockType[] = ['code', 'mermaid', 'mindmap'];
export const DIAGRAM: BlockType[] = ['mermaid', 'mindmap'];
export const LIST: BlockType[] = ['ul', 'ol', 'todo'];

/** Skróty Markdown na początku bloku: [wzorzec, typ] */
export const SHORT: [RegExp, BlockType][] = [
	[/^```mermaid\s/, 'mermaid'],
	[/^#\s/, 'h1'],
	[/^##\s/, 'h2'],
	[/^###\s/, 'h3'],
	[/^[-*]\s/, 'ul'],
	[/^1[.)]\s/, 'ol'],
	[/^\[\s?\]\s/, 'todo'],
	[/^>\s/, 'quote'],
	[/^!\s/, 'callout'],
	[/^```\s/, 'code']
];

export const nb = (type: BlockType = 'p', text = ''): Block => ({ id: uid(), type, text });

export const blocksText = (blocks: Block[] | undefined) =>
	(blocks || [])
		.filter((b) => !['hr', 'mermaid', 'mindmap'].includes(b.type))
		.map((b) => b.text)
		.join(' ')
		.trim();

/* ---------- kursor w contenteditable ---------- */

const ZW = new RegExp('\\u200b', 'g');
export const readText = (el: HTMLElement) => (el.textContent || '').replace(ZW, '');

export function caretOffset(el: HTMLElement) {
	const s = getSelection();
	if (!s || !s.rangeCount) return 0;
	const r = s.getRangeAt(0);
	if (!el.contains(r.startContainer)) return 0;
	const pre = r.cloneRange();
	pre.selectNodeContents(el);
	pre.setEnd(r.startContainer, r.startOffset);
	return pre.toString().replace(ZW, '').length;
}

export function selCollapsed() {
	const s = getSelection();
	return !s || !s.rangeCount || s.getRangeAt(0).collapsed;
}

export function setCaret(el: HTMLElement, off: number) {
	el.focus({ preventScroll: false });
	const s = getSelection();
	if (!s) return;
	const r = document.createRange();
	const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	let rem = off;
	while ((node = w.nextNode())) {
		const len = (node as Text).length;
		if (rem <= len) {
			r.setStart(node, rem);
			r.collapse(true);
			s.removeAllRanges();
			s.addRange(r);
			return;
		}
		rem -= len;
	}
	r.selectNodeContents(el);
	r.collapse(false);
	s.removeAllRanges();
	s.addRange(r);
}

/** Tekst bloku do contenteditable: końcowy \n potrzebuje znaku zerowej szerokości, żeby był widoczny */
export const displayText = (t: string) => t + (t.endsWith('\n') ? String.fromCharCode(0x200b) : '');

/** Czy contenteditable obsługuje plaintext-only (Chrome, Safari; Firefox od 136) */
export const CE: 'plaintext-only' | 'true' = (() => {
	if (typeof document === 'undefined') return 'true';
	const d = document.createElement('div');
	try {
		d.contentEditable = 'plaintext-only';
	} catch {
		/* starsza przeglądarka */
	}
	return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
})();
