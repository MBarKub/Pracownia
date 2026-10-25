// Pomocnicze funkcje przeniesione z Pracowni v4

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => iso(new Date());
export const addDays = (n: number) => {
	const d = new Date();
	d.setDate(d.getDate() + n);
	return iso(d);
};
export const dayDiff = (d: string) =>
	Math.round((+new Date(d + 'T00:00') - +new Date(todayISO() + 'T00:00')) / 864e5);

export const fmtShort = (d: string) =>
	new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(
		new Date(d + 'T00:00')
	);
export const fmtLong = (d: string) =>
	new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(
		new Date(d + 'T00:00')
	);
export const fmtWd = (d: string) =>
	new Intl.DateTimeFormat('pl-PL', { weekday: 'short' }).format(new Date(d + 'T00:00'));
export const fmtTs = (ts?: number | null) => {
	if (!ts) return '';
	const d = new Date(ts);
	const t = iso(d);
	if (t === todayISO())
		return new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(d);
	return fmtShort(t);
};

export const plural = (n: number, one: string, few: string, many: string) => {
	if (n === 1) return one;
	const m10 = n % 10,
		m100 = n % 100;
	return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

/** JSON z posortowanymi kluczami — do porównywania dokumentów */
export const stable = (v: unknown) =>
	JSON.stringify(v, (_k, x) =>
		x && typeof x === 'object' && !Array.isArray(x)
			? Object.keys(x)
					.sort()
					.reduce((o: Record<string, unknown>, key) => ((o[key] = x[key]), o), {})
			: x
	);

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export const lsGet = <T>(k: string): T | null => {
	try {
		return JSON.parse(localStorage.getItem(k) || 'null');
	} catch {
		return null;
	}
};
export const lsSet = (k: string, v: unknown) => {
	try {
		localStorage.setItem(k, JSON.stringify(v));
	} catch {
		/* brak dostępu do pamięci przeglądarki */
	}
};

export const norm = (s: string) =>
	s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

/** Zwykłe pobieranie pliku w przeglądarce (zastępuje claude.use('downloads')) */
export function downloadFile(filename: string, data: Blob | string, type: string) {
	const blob = data instanceof Blob ? data : new Blob([data], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
