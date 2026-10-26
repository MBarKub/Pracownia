// Kolory schematów i map myśli brane ze skórki (zmienne CSS ustawiane przez applySkin).
// `themeSig.v` rośnie przy każdej zmianie skórki lub motywu systemu, więc komponenty
// mogą od niego zależeć w $effect i przerysować się w nowych kolorach.
import { lum, PCOLORS } from '../skins';

export const themeSig = $state({ v: 0 });

let watching = false;
/** Uruchamia obserwację zmian skórki (idempotentne, wywoływane przez komponenty). */
export function watchTheme() {
	if (watching || typeof window === 'undefined') return;
	watching = true;
	let last = signature();
	const bump = () => {
		const s = signature();
		if (s !== last) {
			last = s;
			themeSig.v++;
		}
	};
	new MutationObserver(bump).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['style', 'data-theme', 'class']
	});
	matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', bump);
}

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function signature() {
	return ['--surface', '--surface-2', '--text', '--accent', '--muted', '--border', '--f-body']
		.map(cssVar)
		.join('|');
}

export function hexMix(a: string, b: string, t: number) {
	const p = (h: string) => {
		h = (h || '#888888').trim().replace('#', '');
		if (h.length === 3)
			h = h
				.split('')
				.map((x) => x + x)
				.join('');
		const n = parseInt(h.slice(0, 6), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	};
	const A = p(a),
		B = p(b);
	return (
		'#' +
		A.map((v, i) =>
			Math.round(v * (1 - t) + B[i] * t)
				.toString(16)
				.padStart(2, '0')
		).join('')
	);
}

/** Zmienne motywu `base` dla Mermaid wyliczone z bieżącej skórki. */
export function mermaidThemeVars() {
	const s = cssVar('--surface') || '#ffffff',
		s2 = cssVar('--surface-2'),
		tx = cssVar('--text'),
		mu = cssVar('--muted'),
		bo = cssVar('--border'),
		ac = cssVar('--accent'),
		at = cssVar('--accent-text'),
		bad = cssVar('--bad') || '#C23F38';
	const dark = lum(s) < 0.4;
	const tv: Record<string, string | boolean> = {
		darkMode: dark,
		background: s,
		fontFamily: cssVar('--f-body'),
		fontSize: '15px',
		primaryColor: s2,
		primaryTextColor: tx,
		primaryBorderColor: ac,
		secondaryColor: hexMix(ac, s, 0.8),
		secondaryTextColor: tx,
		secondaryBorderColor: mu,
		tertiaryColor: s,
		tertiaryTextColor: tx,
		tertiaryBorderColor: bo,
		mainBkg: s2,
		nodeBorder: ac,
		nodeTextColor: tx,
		lineColor: mu,
		textColor: tx,
		titleColor: tx,
		edgeLabelBackground: s,
		clusterBkg: hexMix(s2, s, 0.5),
		clusterBorder: bo,
		noteBkgColor: hexMix(ac, s, 0.85),
		noteTextColor: tx,
		noteBorderColor: ac,
		actorBkg: s2,
		actorBorder: ac,
		actorTextColor: tx,
		actorLineColor: mu,
		signalColor: tx,
		signalTextColor: tx,
		labelBoxBkgColor: s2,
		labelBoxBorderColor: ac,
		labelTextColor: tx,
		loopTextColor: tx,
		activationBkgColor: hexMix(ac, s, 0.7),
		sequenceNumberColor: at,
		sectionBkgColor: s2,
		altSectionBkgColor: s,
		sectionBkgColor2: hexMix(ac, s, 0.88),
		taskBkgColor: hexMix(ac, s, 0.55),
		taskBorderColor: ac,
		taskTextColor: tx,
		taskTextLightColor: tx,
		taskTextDarkColor: tx,
		taskTextOutsideColor: tx,
		taskTextClickableColor: ac,
		activeTaskBkgColor: hexMix(ac, s, 0.35),
		activeTaskBorderColor: ac,
		doneTaskBkgColor: hexMix(mu, s, 0.6),
		doneTaskBorderColor: mu,
		critBkgColor: hexMix(bad, s, 0.5),
		critBorderColor: bad,
		gridColor: bo,
		todayLineColor: bad,
		labelColor: tx,
		altBackground: s2,
		pie1: ac,
		pieTitleTextColor: tx,
		pieSectionTextColor: at,
		pieLegendTextColor: tx,
		pieStrokeColor: s,
		pieOuterStrokeColor: bo,
		stateBkg: s2,
		stateLabelColor: tx,
		compositeBackground: s,
		transitionColor: mu,
		transitionLabelColor: tx,
		specialStateColor: tx,
		innerEndBackground: tx
	};
	PCOLORS.forEach((c, i) => {
		tv['cScale' + i] = hexMix(c, s, dark ? 0.45 : 0.72);
		tv['cScaleLabel' + i] = tx;
		tv['cScalePeer' + i] = c;
		tv['pie' + (i + 2)] = c;
	});
	return tv;
}

/** Paleta gałęzi map myśli: akcent skórki + kolory projektów. */
export function mindmapPalette() {
	const s = cssVar('--surface') || '#ffffff';
	const dark = lum(s) < 0.4;
	const pal = [
		cssVar('--accent') || '#2E55D4',
		...PCOLORS.filter((c) => c !== '#6B7280' && c !== '#3B6FE0')
	].map((c) => (dark ? hexMix(c, '#ffffff', 0.18) : hexMix(c, '#000000', 0.05)));
	return {
		pal,
		root: cssVar('--muted') || '#666',
		text: cssVar('--text'),
		surface: s,
		font: cssVar('--f-body')
	};
}

export const surfaceColor = () => cssVar('--surface') || '#ffffff';
