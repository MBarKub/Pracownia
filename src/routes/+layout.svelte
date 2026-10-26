<script lang="ts">
	import '@fontsource/figtree/400.css';
	import '@fontsource/figtree/500.css';
	import '@fontsource/figtree/600.css';
	import '@fontsource/figtree/700.css';
	import '@fontsource-variable/bricolage-grotesque/index.css';
	import '@fontsource/literata/400.css';
	import '@fontsource/literata/600.css';
	import '@fontsource/ibm-plex-sans/400.css';
	import '@fontsource/ibm-plex-sans/500.css';
	import '@fontsource/ibm-plex-sans/600.css';
	import '@fontsource/atkinson-hyperlegible/400.css';
	import '@fontsource/atkinson-hyperlegible/700.css';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/500.css';
	import '#lib/styles/app.css';

	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';
	import { app, arr, hasPending, initAuth, startLocal } from '#lib/store.svelte.ts';
	import { configured } from '#lib/supabase.ts';
	import { applySkin } from '#lib/skins.ts';
	import { todayISO } from '#lib/util.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import Login from '#lib/ui/Login.svelte';
	import TaskSheet from '#lib/ui/TaskSheet.svelte';
	import TimePill from '#lib/ui/time/TimePill.svelte';
	import TimeModal from '#lib/ui/time/TimeModal.svelte';
	import ReportModal from '#lib/ui/time/ReportModal.svelte';
	import { ui } from '#lib/ui.svelte.ts';
	import { runningEntry } from '#lib/time.svelte.ts';
	import type { IconName } from '#lib/ui/icons.ts';

	let { children }: LayoutProps = $props();

	onMount(() => {
		applySkin(app.settings);
		initAuth();
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onScheme = () => applySkin(app.settings);
		mq.addEventListener('change', onScheme);
		const beforeUnload = (e: BeforeUnloadEvent) => {
			if (hasPending()) e.preventDefault();
		};
		addEventListener('beforeunload', beforeUnload);
		return () => {
			mq.removeEventListener('change', onScheme);
			removeEventListener('beforeunload', beforeUnload);
		};
	});

	const NAV: [string, string, IconName][] = [
		['/', 'Start', 'home'],
		['/zadania', 'Zadania', 'tasks'],
		['/projekty', 'Projekty', 'folder'],
		['/notatki', 'Notatki', 'note'],
		['/czas', 'Czas pracy', 'clock']
	];
	const TABS: [string, string, IconName][] = [NAV[0], NAV[1], NAV[2], NAV[3]];

	const isOn = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	const counts = $derived.by(() => {
		const t = todayISO();
		const open = arr('tasks').filter((x) => x.status !== 'done' && x.status !== 'paused');
		return {
			today: open.filter((x) => x.due && x.due <= t).length,
			over: open.filter((x) => x.due && x.due < t).length
		};
	});
	const activeProjects = $derived(
		arr('projects')
			.filter((p) => p.status === 'active')
			.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
	);
	const title = $derived(
		NAV.find(([h]) => isOn(h))?.[1] || (isOn('/ustawienia') ? 'Ustawienia' : 'Pracownia')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{title} · Pracownia</title>
</svelte:head>

{#if !configured && !app.local}
	<div class="setup">
		<div class="panel">
			<h2>Brak konfiguracji Supabase</h2>
			<p class="muted">
				Skopiuj <code>.env.example</code> do <code>.env</code> i wpisz adres projektu oraz klucz anon.
				Szczegóły w README.
			</p>
			<button class="btn" onclick={startLocal}>Wypróbuj bez logowania</button>
			<p class="note-s">
				W trybie próbnym nic się nie zapisuje. Dane znikną po odświeżeniu strony.
			</p>
		</div>
	</div>
{:else if !app.authReady && !app.local}
	<div class="setup"><span class="muted">Ładuję…</span></div>
{:else if !app.session && !app.local}
	<Login />
{:else}
	<div class="app">
		<aside class="side">
			<div class="brand"><span class="brand-mark"><i></i><i></i><i></i><i></i></span>Pracownia</div>
			<nav class="nav">
				{#each NAV as [href, label, icon] (href)}
					<a class="nav-i" class:on={isOn(href)} {href}>
						<Icon name={icon} />{label}
						{#if href === '/zadania' && counts.today}
							<span class="count" class:hot={counts.over}>{counts.today}</span>
						{/if}
					</a>
				{/each}
			</nav>
			{#if activeProjects.length}
				<div class="side-sec">
					<span class="eyebrow">Projekty w toku</span>
					{#each activeProjects as p (p.id)}
						<a class="side-proj" href="/projekty/{p.id}" style="--pc:{p.color}"
							><span class="dot"></span><span>{p.name || 'Bez nazwy'}</span></a
						>
					{/each}
				</div>
			{/if}
			<TimePill where="side" />
			<div class="side-foot">
				<a class="nav-i" class:on={isOn('/ustawienia')} href="/ustawienia"
					><Icon name="sliders" />Ustawienia</a
				>
				<div class="sync" class:off={app.dbState !== 'on'}>
					<i></i>{app.local
						? 'Tryb próbny, bez zapisu'
						: app.dbState === 'on'
							? 'Zapis włączony'
							: app.dbState === 'off'
								? 'Brak połączenia z bazą'
								: 'Łączę z zapisem…'}
				</div>
			</div>
		</aside>
		<header class="topbar">
			<div class="t">
				<span class="brand-mark"><i></i><i></i><i></i><i></i></span>{#if runningEntry()}<TimePill
						where="top"
					/>{:else}{title}{/if}
			</div>
			<a class="iconbtn" href="/czas" aria-label="Czas pracy"><Icon name="clock" size={20} /></a>
			<a class="iconbtn" href="/ustawienia" aria-label="Ustawienia"
				><Icon name="sliders" size={20} /></a
			>
		</header>
		<div class="main-wrap">
			<main class="main">
				{#if app.loaded}
					{@render children()}
				{:else}
					<div class="page"><span class="muted">Wczytuję dane…</span></div>
				{/if}
			</main>
		</div>
		<nav class="tabbar">
			{#each TABS as [href, label, icon] (href)}
				<a class="tab" class:on={isOn(href)} {href}><Icon name={icon} size={21} />{label}</a>
			{/each}
			<a class="tab" class:on={isOn('/czas')} href="/czas"><Icon name="clock" size={21} />Czas</a>
		</nav>
	</div>
	<TaskSheet />
	{#if ui.modal?.kind === 'time'}
		{#key ui.modal}<TimeModal
				id={ui.modal.id}
				projectId={ui.modal.projectId}
				taskId={ui.modal.taskId}
			/>{/key}
	{:else if ui.modal?.kind === 'report'}
		{#key ui.modal}<ReportModal projectId={ui.modal.projectId} client={ui.modal.client} />{/key}
	{/if}
{/if}

{#if app.toastMsg}
	<div class="toast" role="status">
		<span>{app.toastMsg.msg}</span>
		{#if app.toastMsg.action}
			<button
				onclick={() => {
					const fn = app.toastMsg?.fn;
					app.toastMsg = null;
					fn?.();
				}}>{app.toastMsg.action}</button
			>
		{/if}
	</div>
{/if}

<style>
	.setup {
		min-height: 100%;
		display: grid;
		place-items: center;
		padding: 16px;
	}
	.setup .panel {
		max-width: 460px;
	}
	.setup p {
		margin: 0;
	}
	.setup .btn {
		align-self: flex-start;
	}
	:global(a.nav-i),
	:global(a.side-proj),
	:global(a.tab),
	:global(a.iconbtn) {
		color: inherit;
		text-decoration: none;
	}
	:global(a.tab.on) {
		color: var(--accent);
	}
	@media (max-width: 820px) {
		/* pięć zakładek bez środkowego przycisku „+” (szybkie dodawanie przyjdzie z widokami) */
		.tabbar {
			grid-template-columns: repeat(5, 1fr);
		}
	}
</style>
