// Eksport schematów i map myśli do SVG i PNG (tło w kolorze arkusza skórki).
import { downloadFile, norm } from '../util';
import { surfaceColor } from './theme.svelte';

export const slug = (s: string) =>
	norm(s || 'schemat')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'schemat';

/** Kopia SVG gotowa do zapisu. Dla Markmap przycina do treści i zdejmuje bieżące przybliżenie. */
export function exportableSvg(svgEl: SVGSVGElement, isMindmap: boolean) {
	const clone = svgEl.cloneNode(true) as SVGSVGElement;
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	const bg = surfaceColor();
	if (isMindmap) {
		const g = svgEl.querySelector('g') as SVGGElement | null;
		if (g) {
			const bb = g.getBBox(),
				pad = 24;
			clone.querySelector('g')?.removeAttribute('transform');
			clone.setAttribute(
				'viewBox',
				`${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`
			);
			clone.setAttribute('width', String(Math.ceil(bb.width + pad * 2)));
			clone.setAttribute('height', String(Math.ceil(bb.height + pad * 2)));
		}
		clone.setAttribute('style', (svgEl.getAttribute('style') || '') + `;background:${bg}`);
	} else clone.setAttribute('style', `background:${bg}`);
	return clone;
}

export async function svgToPng(svg: SVGSVGElement): Promise<Blob | null> {
	const vb = svg.viewBox?.baseVal;
	const w = Math.ceil((vb && vb.width) || +(svg.getAttribute('width') || 0) || 800),
		h = Math.ceil((vb && vb.height) || +(svg.getAttribute('height') || 0) || 600);
	const c = svg.cloneNode(true) as SVGSVGElement;
	c.setAttribute('width', String(w));
	c.setAttribute('height', String(h));
	c.setAttribute('style', (c.getAttribute('style') || '').replace(/max-width:[^;]*;?/g, ''));
	const url = URL.createObjectURL(
		new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' })
	);
	try {
		const img = new Image();
		await new Promise((res, rej) => {
			img.onload = res;
			img.onerror = rej;
			img.src = url;
		});
		const s = Math.min(3, Math.max(1, 2400 / Math.max(w, h)));
		const cv = document.createElement('canvas');
		cv.width = Math.round(w * s);
		cv.height = Math.round(h * s);
		const g = cv.getContext('2d')!;
		g.fillStyle = surfaceColor();
		g.fillRect(0, 0, cv.width, cv.height);
		g.drawImage(img, 0, 0, cv.width, cv.height);
		return await new Promise((res) => cv.toBlob(res, 'image/png'));
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** Zapisuje SVG albo PNG. Zwraca false, gdy nie udało się utworzyć pliku. */
export async function exportDiagram(
	svgEl: SVGSVGElement,
	isMindmap: boolean,
	fmt: 'svg' | 'png',
	title: string
) {
	const clone = exportableSvg(svgEl, isMindmap);
	const name = `${slug(title)}-${isMindmap ? 'mapa' : 'schemat'}.${fmt}`;
	if (fmt === 'svg') {
		downloadFile(name, new XMLSerializer().serializeToString(clone), 'image/svg+xml');
		return true;
	}
	const blob = await svgToPng(clone).catch(() => null);
	if (!blob) return false;
	downloadFile(name, blob, 'image/png');
	return true;
}
