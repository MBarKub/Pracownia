// Raport czasu pracy w PDF: jsPDF + autotable, krój Figtree z polskimi znakami (port z Pracowni v6).
// Biblioteki i czcionki ładują się dopiero przy pierwszym raporcie.
import { app } from '../store.svelte';
import { lum } from '../skins';
import { norm, plural } from '../util';
import { decH, fmtDur, fmtHM, fmtRange, money, type Report } from '../time.svelte';

const rgb = (h: string): [number, number, number] => {
	h = h.trim().replace('#', '');
	if (h.length === 3)
		h = h
			.split('')
			.map((x) => x + x)
			.join('');
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export async function buildPdf(d: Report): Promise<Blob> {
	const [{ jsPDF }, atMod, { PDF_FONTS: F }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable'),
		import('./fonts')
	]);
	// jspdf-autotable przez mapę „exports” wskazuje wersję CommonJS: po bundlowaniu domyślny eksport
	// bywa obiektem modułu z funkcją w `.default`
	type AT = typeof atMod.default;
	const m = atMod as unknown as { default: AT | { default: AT }; autoTable?: AT };
	const autoTable: AT =
		typeof m.default === 'function' ? m.default : (m.default?.default ?? (m.autoTable as AT));
	const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
	doc.addFileToVFS('Figtree-Regular.ttf', F.r);
	doc.addFont('Figtree-Regular.ttf', 'Figtree', 'normal');
	doc.addFileToVFS('Figtree-SemiBold.ttf', F.b);
	doc.addFont('Figtree-SemiBold.ttf', 'Figtree', 'bold');
	doc.setFont('Figtree', 'normal');

	const W = 210,
		H = 297,
		M = 18;
	const ink: [number, number, number] = [26, 31, 28],
		mute: [number, number, number] = [104, 112, 107],
		line: [number, number, number] = [214, 219, 212],
		soft: [number, number, number] = [244, 246, 242];
	let acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
	if (!/^#[0-9a-f]{6}$/i.test(acc) || lum(acc) > 0.5) acc = '#2E55D4';
	const A = rgb(acc);
	const today = new Intl.DateTimeFormat('pl-PL').format(new Date());

	// nagłówek
	doc.setFont('Figtree', 'bold');
	doc.setFontSize(8.5);
	doc.setTextColor(...A);
	doc.text('RAPORT CZASU PRACY', M, 22, { charSpace: 0.5 });
	const meLines = (app.settings.time.me || '')
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 4);
	doc.setFontSize(9);
	let ry = 22;
	meLines.forEach((l, i) => {
		doc.setFont('Figtree', i === 0 ? 'bold' : 'normal');
		doc.setTextColor(...(i === 0 ? ink : mute));
		doc.text(l, W - M, ry, { align: 'right' });
		ry += 4.6;
	});
	doc.setFont('Figtree', 'normal');
	doc.setTextColor(...mute);
	doc.text(`Data: ${today}`, W - M, ry + (meLines.length ? 1.5 : 0), { align: 'right' });
	doc.setFont('Figtree', 'bold');
	doc.setFontSize(21);
	doc.setTextColor(...ink);
	const tl = doc.splitTextToSize(d.title, 115) as string[];
	doc.text(tl, M, 32);
	let y = 32 + (tl.length - 1) * 8.5;
	doc.setFont('Figtree', 'normal');
	doc.setFontSize(10.5);
	doc.setTextColor(...mute);
	y += 7;
	doc.text(`${fmtRange(d.from, d.to)}${d.sub ? '  ·  ' + d.sub : ''}`, M, y);
	y = Math.max(y, ry + 4) + 9;
	doc.setDrawColor(...line);
	doc.setLineWidth(0.3);
	doc.line(M, y - 4, W - M, y - 4);

	// pola podsumowania
	const days = new Set(d.rows.map((r) => r.date)).size;
	const boxes: [string, string, string][] = [
		['ŁĄCZNY CZAS', fmtDur(d.total), `${decH(d.total)} h`],
		['WPISY', String(d.rows.length), `${days} ${plural(days, 'dzień', 'dni', 'dni')} pracy`]
	];
	if (d.showAmounts)
		boxes.push([
			'KWOTA',
			money(d.amount),
			d.rates.length === 1 ? `stawka ${money(d.rates[0])}/h` : 'stawki według projektów'
		]);
	const gap = 4,
		bw = (W - 2 * M - gap * (boxes.length - 1)) / boxes.length;
	boxes.forEach(([l, v, s], i) => {
		const x = M + i * (bw + gap);
		doc.setFillColor(...soft);
		doc.roundedRect(x, y, bw, 23, 2, 2, 'F');
		doc.setFont('Figtree', 'bold');
		doc.setFontSize(7.5);
		doc.setTextColor(...mute);
		doc.text(l, x + 5, y + 6.5, { charSpace: 0.4 });
		doc.setFontSize(15);
		doc.setTextColor(...ink);
		doc.text(v, x + 5, y + 14.5);
		doc.setFont('Figtree', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(...mute);
		doc.text(s, x + 5, y + 19.5);
	});
	y += 31;
	if (d.step) {
		doc.setFontSize(8.5);
		doc.setTextColor(...mute);
		doc.text(`Czas każdego wpisu zaokrąglono w górę do ${d.step} min.`, M, y - 3);
		y += 3;
	}

	const base = {
		theme: 'plain' as const,
		margin: { left: M, right: M, bottom: 20 },
		styles: {
			font: 'Figtree',
			fontSize: 9.5,
			textColor: ink,
			cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
			lineColor: line,
			overflow: 'linebreak' as const
		},
		headStyles: {
			font: 'Figtree',
			fontStyle: 'bold' as const,
			fontSize: 8,
			textColor: mute,
			lineWidth: { bottom: 0.3, top: 0, left: 0, right: 0 }
		},
		bodyStyles: { lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 } },
		footStyles: {
			font: 'Figtree',
			fontStyle: 'bold' as const,
			lineWidth: { top: 0.3, bottom: 0, left: 0, right: 0 }
		}
	};
	const section = (t: string) => {
		doc.setFont('Figtree', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(...ink);
		doc.text(t, M, y);
		y += 3;
	};
	const lastY = () =>
		(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

	section(d.multiProject ? 'Podsumowanie według projektów' : 'Podsumowanie według zadań');
	autoTable(doc, {
		...base,
		startY: y,
		head: [[d.groupLabel, 'Czas', 'Godziny', 'Udział', ...(d.showAmounts ? ['Kwota'] : [])]],
		body: d.groups.map((g) => [
			g.name,
			fmtHM(g.min),
			decH(g.min),
			`${Math.round((g.min / Math.max(1, d.total)) * 100)}%`,
			...(d.showAmounts ? [money(g.amount)] : [])
		]),
		foot: [
			['Razem', fmtHM(d.total), decH(d.total), '100%', ...(d.showAmounts ? [money(d.amount)] : [])]
		],
		columnStyles: {
			1: { halign: 'right', cellWidth: 20 },
			2: { halign: 'right', cellWidth: 22 },
			3: { halign: 'right', cellWidth: 18 },
			4: { halign: 'right', cellWidth: 32 }
		},
		didParseCell: (c) => {
			if (c.column.index > 0) c.cell.styles.halign = 'right';
		}
	});
	y = lastY() + 12;

	if (d.details) {
		if (y > H - 50) {
			doc.addPage();
			y = 22;
		}
		section('Szczegóły');
		const head = [
			'Data',
			...(d.multiProject ? ['Projekt'] : []),
			'Opis',
			'Czas',
			...(d.showAmounts ? ['Kwota'] : [])
		];
		const dfmt = new Intl.DateTimeFormat('pl-PL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
		const body = d.rows.map((r) => {
			const desc = [r.task, r.note].filter(Boolean).join(' — ') || '—';
			return [
				dfmt.format(new Date(r.date + 'T00:00')),
				...(d.multiProject ? [r.project] : []),
				desc + (r.bill ? '' : ' (nierozliczalne)'),
				fmtHM(r.min),
				...(d.showAmounts ? [r.bill ? money(r.amount) : '—'] : [])
			];
		});
		const ci = head.length;
		const first = ci - (d.showAmounts ? 2 : 1);
		const cs: Record<number, { cellWidth?: number; halign?: 'right' }> = { 0: { cellWidth: 22 } };
		if (d.multiProject) cs[1] = { cellWidth: 38 };
		cs[first] = { halign: 'right', cellWidth: 16 };
		if (d.showAmounts) cs[ci - 1] = { halign: 'right', cellWidth: 28 };
		autoTable(doc, {
			...base,
			startY: y,
			head: [head],
			body,
			columnStyles: cs,
			didParseCell: (c) => {
				if (c.section !== 'body' && c.column.index >= first) c.cell.styles.halign = 'right';
			}
		});
	}

	// stopka
	const pages = doc.getNumberOfPages();
	for (let i = 1; i <= pages; i++) {
		doc.setPage(i);
		doc.setDrawColor(...line);
		doc.setLineWidth(0.2);
		doc.line(M, H - 13, W - M, H - 13);
		doc.setFont('Figtree', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(...mute);
		doc.text(`${d.title} · ${fmtRange(d.from, d.to)}`, M, H - 8.5);
		doc.text(`Strona ${i} z ${pages}`, W - M, H - 8.5, { align: 'right' });
	}
	doc.setProperties({
		title: `Raport czasu pracy — ${d.title}`,
		subject: fmtRange(d.from, d.to),
		creator: 'Pracownia'
	});
	return doc.output('blob');
}

export function reportFilename(d: Report) {
	const slug =
		norm(d.title)
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'raport';
	return `raport-czasu-${slug}-${d.from.startsWith('0000') ? 'calosc' : d.from + '_' + d.to}.pdf`;
}
