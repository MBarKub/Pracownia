// Skórki i ustawienia — przeniesione z Pracowni v4
import type { Settings, Skin, SkinPalette } from './model';

export const FONTS: Record<string, string> = {
	Figtree: "'Figtree', system-ui, sans-serif",
	'IBM Plex Sans': "'IBM Plex Sans', system-ui, sans-serif",
	'Atkinson Hyperlegible': "'Atkinson Hyperlegible', system-ui, sans-serif",
	Literata: "'Literata', Georgia, serif",
	'Bricolage Grotesque': "'Bricolage Grotesque Variable', system-ui, sans-serif",
	Systemowy: "system-ui, -apple-system, 'Segoe UI', sans-serif"
};

const ATR_L: SkinPalette = {
	bg: '#ECEEEA',
	surface: '#FAFBF8',
	surface2: '#E3E6E0',
	text: '#1A1F1C',
	muted: '#636B66',
	border: '#D2D7D0',
	accent: '#2E55D4',
	accentText: '#FFFFFF'
};
const ATR_D: SkinPalette = {
	bg: '#121614',
	surface: '#1A1F1C',
	surface2: '#242A26',
	text: '#E5E9E4',
	muted: '#939B95',
	border: '#2E3530',
	accent: '#7E9BFF',
	accentText: '#0D1330'
};

export const PRESETS: Skin[] = [
	{
		id: 'atrament',
		name: 'Atrament',
		auto: true,
		font: 'Figtree',
		display: 'Bricolage Grotesque',
		c: ATR_L,
		cd: ATR_D,
		hint: 'Jasny lub ciemny, jak system'
	},
	{
		id: 'papier',
		name: 'Papier',
		font: 'Literata',
		display: 'Literata',
		c: {
			bg: '#EFEAE1',
			surface: '#FBF8F2',
			surface2: '#E6DFD2',
			text: '#2A2520',
			muted: '#776C60',
			border: '#DAD1C2',
			accent: '#8E3B2C',
			accentText: '#FFFFFF'
		}
	},
	{
		id: 'mgla',
		name: 'Mgła',
		font: 'Figtree',
		display: 'Bricolage Grotesque',
		c: {
			bg: '#ECEBF3',
			surface: '#FAF9FD',
			surface2: '#E0DEEB',
			text: '#23212E',
			muted: '#6B6780',
			border: '#D4D1E2',
			accent: '#6248CC',
			accentText: '#FFFFFF'
		}
	},
	{
		id: 'morze',
		name: 'Morze',
		font: 'IBM Plex Sans',
		display: 'IBM Plex Sans',
		c: {
			bg: '#E6EFF0',
			surface: '#F8FBFB',
			surface2: '#D9E6E8',
			text: '#13282C',
			muted: '#587074',
			border: '#C9DADD',
			accent: '#0B7380',
			accentText: '#FFFFFF'
		}
	},
	{
		id: 'noc',
		name: 'Noc',
		font: 'Figtree',
		display: 'Bricolage Grotesque',
		c: {
			bg: '#0E131E',
			surface: '#151C2A',
			surface2: '#1E2738',
			text: '#E2E7F1',
			muted: '#8A95AA',
			border: '#273145',
			accent: '#F0B64A',
			accentText: '#1A1406'
		}
	},
	{
		id: 'las',
		name: 'Las',
		font: 'IBM Plex Sans',
		display: 'Bricolage Grotesque',
		c: {
			bg: '#111D16',
			surface: '#17261D',
			surface2: '#203327',
			text: '#E0EBE2',
			muted: '#8DA393',
			border: '#283D30',
			accent: '#8CCF87',
			accentText: '#0E1F11'
		}
	},
	{
		id: 'kontrast',
		name: 'Kontrast',
		font: 'Atkinson Hyperlegible',
		display: 'Atkinson Hyperlegible',
		c: {
			bg: '#FFFFFF',
			surface: '#FFFFFF',
			surface2: '#EBEBEB',
			text: '#000000',
			muted: '#383838',
			border: '#1A1A1A',
			accent: '#0036C4',
			accentText: '#FFFFFF'
		}
	}
];

export const COLOR_FIELDS: [keyof SkinPalette, string][] = [
	['bg', 'Tło'],
	['surface', 'Arkusz'],
	['surface2', 'Pola i kolumny'],
	['text', 'Tekst'],
	['muted', 'Tekst drugorzędny'],
	['border', 'Linie'],
	['accent', 'Akcent'],
	['accentText', 'Tekst na akcencie']
];
export const PCOLORS = [
	'#3B6FE0',
	'#D2553F',
	'#2F9A6A',
	'#C9902A',
	'#8A58D6',
	'#D04F8C',
	'#2496AB',
	'#6B7280'
];

export function defaultSettings(): Settings {
	return {
		skinId: 'atrament',
		customSkins: [],
		radius: 10,
		density: 'normal',
		labels: {
			task: { todo: 'Do zrobienia', doing: 'W toku', done: 'Zrobione' },
			project: { idea: 'Pomysł', active: 'W toku', paused: 'Wstrzymany', done: 'Zakończony' },
			priority: ['Brak', 'Niski', 'Średni', 'Wysoki']
		},
		time: { currency: 'zł', defaultRate: 0, rounding: 0, me: '' }
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeSettings(d: any): Settings {
	const def = defaultSettings();
	d = d || {};
	return {
		...def,
		...d,
		customSkins: Array.isArray(d.customSkins) ? d.customSkins : [],
		time: { ...def.time, ...(d.time || {}) },
		labels: {
			task: { ...def.labels.task, ...(d.labels?.task || {}) },
			project: { ...def.labels.project, ...(d.labels?.project || {}) },
			priority:
				Array.isArray(d.labels?.priority) && d.labels.priority.length === 4
					? d.labels.priority
					: def.labels.priority
		}
	};
}

/** Podział ustawień: osobiste (user_settings) i wspólne dla przestrzeni (workspaces.settings) */
export function splitSettings(s: Settings) {
	return {
		personal: {
			skinId: s.skinId,
			customSkins: s.customSkins,
			radius: s.radius,
			density: s.density,
			time: { me: s.time.me }
		},
		workspace: {
			labels: s.labels,
			time: {
				currency: s.time.currency,
				defaultRate: s.time.defaultRate,
				rounding: s.time.rounding
			}
		}
	};
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function joinSettings(personal: any, workspace: any): Settings {
	return mergeSettings({
		...(workspace || {}),
		...(personal || {}),
		labels: workspace?.labels,
		time: { ...(workspace?.time || {}), ...(personal?.time || {}) }
	});
}

export const allSkins = (s: Settings) => [...PRESETS, ...s.customSkins];
export const curSkin = (s: Settings) => allSkins(s).find((k) => k.id === s.skinId) || PRESETS[0];

export const lum = (hex: string) => {
	const h = hex.replace('#', '');
	const n = parseInt(
		h.length === 3
			? h
					.split('')
					.map((x) => x + x)
					.join('')
			: h,
		16
	);
	const r = ((n >> 16) & 255) / 255,
		g = ((n >> 8) & 255) / 255,
		b = (n & 255) / 255;
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const sysDark = () => {
	const t = document.documentElement.dataset.theme;
	if (t === 'dark') return true;
	if (t === 'light') return false;
	return matchMedia('(prefers-color-scheme: dark)').matches;
};
export const resolvedPalette = (sk: Skin) => (sk.auto ? (sysDark() ? sk.cd! : sk.c) : sk.c);

const VARMAP: Record<keyof SkinPalette, string> = {
	bg: '--bg',
	surface: '--surface',
	surface2: '--surface-2',
	text: '--text',
	muted: '--muted',
	border: '--border',
	accent: '--accent',
	accentText: '--accent-text'
};

export function applySkin(s: Settings) {
	const sk = curSkin(s),
		r = document.documentElement.style;
	for (const v of [...Object.values(VARMAP), '--ok', '--warn', '--bad']) r.removeProperty(v);
	r.removeProperty('color-scheme');
	if (!sk.auto) {
		for (const [k, v] of Object.entries(VARMAP)) {
			const val = sk.c[k as keyof SkinPalette];
			if (val) r.setProperty(v, val);
		}
		const dark = lum(sk.c.bg) < 0.4;
		r.setProperty('color-scheme', dark ? 'dark' : 'light');
		r.setProperty('--ok', dark ? '#5DBE88' : '#2C8553');
		r.setProperty('--warn', dark ? '#E2A447' : '#B8730F');
		r.setProperty('--bad', dark ? '#EF7A71' : '#C23F38');
	}
	r.setProperty('--f-body', FONTS[sk.font] || FONTS.Figtree);
	r.setProperty('--f-display', FONTS[sk.display] || FONTS['Bricolage Grotesque']);
	r.setProperty('--radius', (s.radius ?? 10) + 'px');
	r.setProperty('--d', String({ compact: 0.7, normal: 1, comfy: 1.35 }[s.density] || 1));
}
