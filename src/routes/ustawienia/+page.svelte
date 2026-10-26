<script lang="ts">
	import { app, save, signOut, toast } from '#lib/store.svelte.ts';
	import { PRESETS, applySkin, resolvedPalette, FONTS } from '#lib/skins.ts';
	import { exportObj, importBackup } from '#lib/backup.ts';
	import { downloadFile, plural, todayISO } from '#lib/util.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Skin } from '#lib/model.ts';

	let progress = $state('');
	let busy = $state(false);

	const skins = $derived([...PRESETS, ...app.settings.customSkins]);
	const counts = $derived({
		p: Object.keys(app.data.projects).length,
		t: Object.keys(app.data.tasks).length,
		n: Object.keys(app.data.notes).length,
		e: Object.keys(app.data.time).length
	});

	function pick(s: Skin) {
		app.settings.skinId = s.id;
		applySkin(app.settings);
		save('settings', 'app');
	}

	async function onImport(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		busy = true;
		progress = 'Czytam plik…';
		try {
			const obj = JSON.parse(await file.text());
			const r = await importBackup(obj, (m) => (progress = m));
			const n = Object.values(r.counts).reduce((a, b) => a + b, 0);
			toast(`Wczytano ${n} ${plural(n, 'element', 'elementy', 'elementów')}.`);
			progress = `Gotowe: ${r.counts.projects} projektów, ${r.counts.tasks} zadań, ${r.counts.notes} notatek, ${r.counts.time} wpisów czasu.${r.fixed ? ` Poprawiono ${r.fixed} odwołań do usuniętych projektów lub zadań.` : ''}`;
		} catch (err) {
			progress =
				err instanceof SyntaxError ? 'Nie udało się odczytać pliku JSON.' : (err as Error).message;
		} finally {
			busy = false;
			input.value = '';
		}
	}
</script>

<div class="page narrow">
	<header class="page-head">
		<h1>Ustawienia</h1>
		<span class="muted">{app.session?.user.email} · {app.workspaceName}</span>
	</header>

	<section class="sec">
		<span class="eyebrow">Skórka</span>
		<div class="skins">
			{#each skins as s (s.id)}
				{@const c = resolvedPalette(s)}
				<button
					class="skin"
					class:on={app.settings.skinId === s.id}
					onclick={() => pick(s)}
					style="--sb:{c.bg};--ss:{c.surface};--st:{c.text};--sm:{c.muted};--sa:{c.accent};--sf:{FONTS[
						s.display
					] || FONTS.Figtree}"
				>
					<div class="skin-prev">
						<div class="s1"><i></i><i></i><i></i><i></i></div>
						<div class="s2"><b>Aa</b><i></i><i style="width:60%"></i></div>
					</div>
					<div class="skin-name">
						<span>{s.name}</span>{#if app.settings.skinId === s.id}<Icon
								name="check"
								size={14}
							/>{/if}
					</div>
				</button>
			{/each}
		</div>
		<p class="note-s">
			Edytor własnych skórek, kroje i gęstość przeniosę razem z resztą okna Wygląd.
		</p>
	</section>

	<section class="sec" style="border-top:1px solid var(--border); padding-top:16px">
		<span class="eyebrow">Czas pracy i raporty</span>
		<div class="fgrid">
			<div class="field" style="grid-row:span 2">
				<label for="ts-me">Twoje dane w nagłówku raportu</label>
				<textarea
					class="in"
					id="ts-me"
					rows="4"
					placeholder="Imię i nazwisko&#10;Nazwa firmy&#10;NIP lub e-mail"
					value={app.settings.time.me || ''}
					oninput={(e) => {
						app.settings.time.me = e.currentTarget.value;
						save('settings', 'app', 600);
					}}></textarea>
				<span class="note-s">Do 4 linii. Pierwsza jest pogrubiona.</span>
			</div>
			<div class="field">
				<label for="ts-r">Domyślna stawka (gdy projekt nie ma własnej)</label>
				<div style="display:flex; gap:8px; align-items:center">
					<input
						class="in"
						type="number"
						min="0"
						id="ts-r"
						placeholder="brak"
						style="max-width:130px"
						value={app.settings.time.defaultRate || ''}
						oninput={(e) => {
							app.settings.time.defaultRate = Math.max(0, parseFloat(e.currentTarget.value) || 0);
							save('settings', 'app', 600);
						}}
					/>
					<input
						class="in"
						style="max-width:70px"
						aria-label="Waluta"
						value={app.settings.time.currency || 'zł'}
						oninput={(e) => {
							app.settings.time.currency = e.currentTarget.value;
							save('settings', 'app', 600);
						}}
					/>
					<span class="muted">/h</span>
				</div>
			</div>
			<div class="field">
				<label for="ts-z">Domyślne zaokrąglanie w raportach</label>
				<select
					class="in"
					id="ts-z"
					value={Number(app.settings.time.rounding) || 0}
					onchange={(e) => {
						app.settings.time.rounding = Number(e.currentTarget.value) || 0;
						save('settings', 'app');
					}}
				>
					{#each [[0, 'bez zaokrąglania'], [5, 'w górę do 5 min'], [15, 'w górę do 15 min'], [30, 'w górę do 30 min'], [60, 'w górę do godziny']] as const as [v, l] (v)}
						<option value={v}>{l}</option>
					{/each}
				</select>
			</div>
		</div>
		{#if app.role !== 'owner'}
			<p class="note-s" style="margin:0">
				Stawkę, walutę i zaokrąglanie ustawia właściciel przestrzeni.
			</p>
		{/if}
	</section>

	<section class="sec" style="border-top:1px solid var(--border); padding-top:16px">
		<span class="eyebrow">Dane</span>
		<p class="note-s" style="margin:0">
			Teraz: {counts.p}
			{plural(counts.p, 'projekt', 'projekty', 'projektów')}, {counts.t}
			{plural(counts.t, 'zadanie', 'zadania', 'zadań')}, {counts.n}
			{plural(counts.n, 'notatka', 'notatki', 'notatek')},
			{counts.e}
			{plural(counts.e, 'wpis czasu', 'wpisy czasu', 'wpisów czasu')}.
		</p>
		<p class="note-s" style="margin:0">
			Przeniesienie z Pracowni na claude.ai: tam Ustawienia → Kopia zapasowa (JSON), tutaj Wczytaj
			kopię. Elementy o tych samych identyfikatorach zostaną nadpisane, więc import można
			bezpiecznie powtórzyć.
		</p>
		<div class="btnrow">
			<button
				class="btn sm"
				onclick={() =>
					downloadFile(
						`pracownia-kopia-${todayISO()}.json`,
						JSON.stringify(exportObj(), null, 2),
						'application/json'
					)}
			>
				<Icon name="down" size={15} />Kopia zapasowa (JSON)
			</button>
			<label class="btn sm" style="cursor:pointer" aria-disabled={busy}>
				<Icon name="up" size={15} />Wczytaj kopię (JSON)
				<input
					type="file"
					accept="application/json,.json"
					hidden
					disabled={busy}
					onchange={onImport}
				/>
			</label>
		</div>
		{#if progress}<p class="note-s" style="margin:0" role="status">{progress}</p>{/if}
	</section>

	<section class="sec" style="border-top:1px solid var(--border); padding-top:16px">
		<span class="eyebrow">Konto</span>
		<div class="btnrow"><button class="btn sm" onclick={signOut}>Wyloguj</button></div>
	</section>
</div>
