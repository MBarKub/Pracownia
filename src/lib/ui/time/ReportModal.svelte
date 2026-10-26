<script lang="ts">
	// Raport czasu pracy: zakres (projekt / klient / wszystko), okres, opcje, podgląd i PDF
	import { app, arr } from '#lib/store.svelte.ts';
	import { clients } from '#lib/ops.ts';
	import { ui } from '#lib/ui.svelte.ts';
	import {
		fmtHM,
		fmtRange,
		money,
		rangeFor,
		reportData,
		type ReportOpts
	} from '#lib/time.svelte.ts';
	import { downloadFile, plural } from '#lib/util.ts';
	import { untrack } from 'svelte';
	import Icon from '../Icon.svelte';

	let { projectId = '', client = '' }: { projectId?: string; client?: string } = $props();

	const init = untrack(() => ({ projectId, client }));
	const cl = clients();
	const [f, t] = rangeFor('month');
	const m = $state<ReportOpts>({
		scope: init.projectId ? 'project' : init.client ? 'client' : 'project',
		projectId:
			init.projectId ||
			arr('projects').find((p) => p.status === 'active')?.id ||
			arr('projects')[0]?.id ||
			'',
		client: init.client || cl[0] || '',
		from: f,
		to: t,
		details: true,
		amounts: true,
		rounding: Number(app.settings.time.rounding) || 0
	});
	let preset = $state('month');
	let status = $state('');
	let busy = $state(false);

	const d = $derived(reportData(m));
	const projects = $derived(
		arr('projects').sort((x, y) => (x.name || '').localeCompare(y.name || '', 'pl'))
	);
	const P = [
		['month', 'Ten miesiąc'],
		['lastmonth', 'Poprzedni miesiąc'],
		['week', 'Ten tydzień'],
		['lastweek', 'Poprzedni tydzień'],
		['year', 'Ten rok'],
		['all', 'Cały okres']
	];

	const close = () => (ui.modal = null);
	function setPreset(k: string) {
		preset = k;
		[m.from, m.to] = rangeFor(k);
	}

	async function pdf() {
		if (!d.rows.length) return;
		busy = true;
		status = 'Tworzę PDF…';
		try {
			const { buildPdf, reportFilename } = await import('#lib/pdf/report.ts');
			const blob = await buildPdf(d);
			downloadFile(reportFilename(d), blob, 'application/pdf');
			status = '';
		} catch (e) {
			console.error(e);
			status = 'Nie udało się utworzyć PDF. Spróbuj ponownie.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="scrim" role="presentation" onclick={close}></div>
<div class="modal wide" role="dialog" aria-label="Raport czasu pracy">
	<div class="modal-h">
		<h2>Raport czasu pracy</h2>
		<button class="iconbtn" aria-label="Zamknij" onclick={close}><Icon name="x" size={18} /></button
		>
	</div>
	<div class="modal-b">
		<div class="field">
			<span class="lbl">Raport dla</span>
			<div class="seg" style="align-self:flex-start">
				{#each [['project', 'Projektu'], ['client', 'Klienta'], ['all', 'Wszystkiego']] as const as [k, l] (k)}
					<button class:on={m.scope === k} onclick={() => (m.scope = k)}>{l}</button>
				{/each}
			</div>
		</div>
		{#if m.scope === 'project'}
			<div class="field">
				<label for="rp-p">Projekt</label>
				<select class="in" id="rp-p" bind:value={m.projectId}>
					{#each projects as p (p.id)}<option value={p.id}
							>{p.name || 'Bez nazwy'}{p.client ? ` · ${p.client}` : ''}</option
						>{/each}
				</select>
			</div>
		{:else if m.scope === 'client'}
			{#if cl.length}
				<div class="field">
					<label for="rp-c">Klient</label>
					<select class="in" id="rp-c" bind:value={m.client}>
						{#each cl as c (c)}<option>{c}</option>{/each}
					</select>
				</div>
			{:else}
				<p class="note-s" style="margin:0">
					Żaden projekt nie ma jeszcze przypisanego klienta. Dodasz go na stronie projektu, w polu
					„Klient”.
				</p>
			{/if}
		{/if}
		<div class="field">
			<span class="lbl">Okres</span>
			<div class="chips">
				{#each P as [k, l] (k)}
					<button class="chip" class:on={preset === k} onclick={() => setPreset(k)}>{l}</button>
				{/each}
			</div>
			<div style="display:flex; gap:8px; align-items:center; margin-top:6px; flex-wrap:wrap">
				<input
					type="date"
					class="in"
					style="width:auto"
					aria-label="Od"
					value={m.from.startsWith('0000') ? '' : m.from}
					onchange={(e) => {
						m.from = e.currentTarget.value || '0000-01-01';
						preset = '';
					}}
				/>
				<span class="muted">–</span>
				<input
					type="date"
					class="in"
					style="width:auto"
					aria-label="Do"
					value={m.to.startsWith('9999') ? '' : m.to}
					onchange={(e) => {
						m.to = e.currentTarget.value || '9999-12-31';
						preset = '';
					}}
				/>
			</div>
		</div>
		<div style="display:flex; gap:18px; flex-wrap:wrap; align-items:center">
			<label class="chk"
				><input type="checkbox" bind:checked={m.details} />Lista wszystkich wpisów</label
			>
			<label class="chk"
				><input type="checkbox" bind:checked={m.amounts} />Kwoty według stawek</label
			>
			<label class="chk"
				>Zaokrąglaj w górę
				<select class="in" style="width:auto; padding:4px 8px" bind:value={m.rounding}>
					{#each [[0, 'bez'], [5, 'do 5 min'], [15, 'do 15 min'], [30, 'do 30 min'], [60, 'do godziny']] as const as [v, l] (v)}
						<option value={v}>{l}</option>
					{/each}
				</select></label
			>
		</div>
		<div class="rep-prev">
			<div class="head-row">
				<div>
					<div class="eyebrow">Podgląd</div>
					<h3 style="font-size:18px; margin-top:2px">{d.title}</h3>
					<span class="muted" style="font-size:13px"
						>{fmtRange(d.from, d.to)}{d.sub ? ' · ' + d.sub : ''}</span
					>
				</div>
				<div style="text-align:right">
					<b style="font-family:var(--f-display); font-size:22px">{fmtHM(d.total)}</b>
					<div class="muted" style="font-size:12.5px">
						{d.rows.length}
						{plural(d.rows.length, 'wpis', 'wpisy', 'wpisów')}{d.showAmounts
							? ' · ' + money(d.amount)
							: ''}
					</div>
				</div>
			</div>
			{#if d.rows.length}
				<table>
					<thead
						><tr
							><th>{d.groupLabel}</th><th class="r">Czas</th><th class="r">Udział</th
							>{#if d.showAmounts}<th class="r">Kwota</th>{/if}</tr
						></thead
					>
					<tbody>
						{#each d.groups.slice(0, 8) as g (g.name)}
							<tr
								><td>{g.name}</td><td class="r">{fmtHM(g.min)}</td><td class="r"
									>{Math.round((g.min / Math.max(1, d.total)) * 100)}%</td
								>{#if d.showAmounts}<td class="r">{money(g.amount)}</td>{/if}</tr
							>
						{/each}
					</tbody>
				</table>
				{#if d.groups.length > 8}<span class="note-s"
						>i {d.groups.length - 8} więcej w pliku PDF</span
					>{/if}
			{:else}
				<p class="muted" style="margin:0">
					Brak wpisów czasu dla tych ustawień. Zmień okres albo zakres raportu.
				</p>
			{/if}
			{#if m.amounts && !d.showAmounts && d.rows.length}
				<span class="note-s"
					>Kwoty pojawią się, gdy projekt ma stawkę (strona projektu) albo ustawisz domyślną stawkę
					w Ustawieniach.</span
				>
			{/if}
			{#if !app.settings.time.me}
				<span class="note-s"
					>Swoje dane do nagłówka raportu (imię, firma) wpiszesz w Ustawieniach.</span
				>
			{/if}
		</div>
	</div>
	<div class="modal-f">
		<span class="muted" style="font-size:12.5px; margin-right:auto; align-self:center" role="status"
			>{status}</span
		>
		<button class="btn" onclick={close}>Zamknij</button>
		<button class="btn primary" disabled={!d.rows.length || busy} onclick={pdf}
			><Icon name="down" size={15} />Pobierz PDF</button
		>
	</div>
</div>
