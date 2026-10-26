// Przybliżanie i przesuwanie podglądu Mermaid (kółko z Ctrl/⌘, przeciąganie, szczypanie).
// Akcja Svelte: <div use:panzoom={{ full }} bind:this={el}> zawiera element `.mm-stage`.

export interface PanZoomApi {
	zoom(factor: number): void;
	reset(): void;
}
export interface PanZoomOpts {
	/** w pełnym ekranie kółko przybliża bez klawisza i przesuwanie działa od razu */
	full: boolean;
	onchange?: (zoomed: boolean) => void;
}

export function panzoom(node: HTMLElement, opts: PanZoomOpts) {
	let o = opts;
	let v = { s: 1, x: 0, y: 0 };
	const pts = new Map<number, { x: number; y: number }>();
	const stage = () => node.querySelector<HTMLElement>('.mm-stage');
	const zoomed = () => v.s !== 1 || v.x !== 0 || v.y !== 0;
	const apply = () => {
		const st = stage();
		if (st) st.style.transform = zoomed() ? `translate(${v.x}px, ${v.y}px) scale(${v.s})` : '';
		node.classList.toggle('zoomed', zoomed());
		o.onchange?.(zoomed());
	};
	const zoomAt = (factor: number, cx?: number, cy?: number) => {
		if (cx == null || cy == null) {
			const r = node.getBoundingClientRect();
			cx = r.width / 2;
			cy = r.height / 2;
		}
		const ns = Math.min(6, Math.max(0.3, v.s * factor));
		v = { s: ns, x: cx - ((cx - v.x) * ns) / v.s, y: cy - ((cy - v.y) * ns) / v.s };
		apply();
	};
	const onWheel = (e: WheelEvent) => {
		if (!node.querySelector('svg')) return;
		if (!o.full && !e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		const r = node.getBoundingClientRect();
		zoomAt(
			Math.exp(-e.deltaY * (e.ctrlKey && !o.full ? 0.01 : 0.0015)),
			e.clientX - r.left,
			e.clientY - r.top
		);
	};
	const onDown = (e: PointerEvent) => {
		if ((e.target as HTMLElement).closest('button')) return;
		if (!zoomed() && !o.full) return;
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		node.setPointerCapture?.(e.pointerId);
		node.classList.add('panning');
	};
	const onMove = (e: PointerEvent) => {
		const old = pts.get(e.pointerId);
		if (!old) return;
		if (pts.size === 1) {
			v = { ...v, x: v.x + e.clientX - old.x, y: v.y + e.clientY - old.y };
			apply();
		} else if (pts.size === 2) {
			const other = [...pts.entries()].find(([id]) => id !== e.pointerId)![1];
			const d0 = Math.hypot(old.x - other.x, old.y - other.y),
				d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
			const r = node.getBoundingClientRect();
			if (d0 > 0)
				zoomAt(d1 / d0, (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top);
		}
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
	};
	const onUp = (e: PointerEvent) => {
		pts.delete(e.pointerId);
		if (!pts.size) node.classList.remove('panning');
	};
	node.addEventListener('wheel', onWheel, { passive: false });
	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerup', onUp);
	node.addEventListener('pointercancel', onUp);
	const api: PanZoomApi = {
		zoom: (f) => zoomAt(f),
		reset: () => {
			v = { s: 1, x: 0, y: 0 };
			apply();
		}
	};
	(node as HTMLElement & { _pz?: PanZoomApi })._pz = api;
	return {
		update(next: PanZoomOpts) {
			const wasFull = o.full;
			o = next;
			if (wasFull !== next.full) api.reset();
		},
		destroy() {
			node.removeEventListener('wheel', onWheel);
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onUp);
		}
	};
}

export const pzApi = (el: HTMLElement | undefined) =>
	(el as (HTMLElement & { _pz?: PanZoomApi }) | undefined)?._pz;
