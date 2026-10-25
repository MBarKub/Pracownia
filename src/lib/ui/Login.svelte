<script lang="ts">
	import { supabase } from '#lib/supabase.ts';

	let email = $state('');
	let phase = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let message = $state('');

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		phase = 'sending';
		const { error } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			// konta tylko na zaproszenie: link dostaje wyłącznie ktoś, kto już ma konto
			options: { emailRedirectTo: location.origin, shouldCreateUser: false }
		});
		if (error) {
			phase = 'error';
			const code = (error as { code?: string }).code || '';
			message =
				code === 'over_email_send_rate_limit' || error.status === 429
					? 'Wysłano już za dużo e-maili. Supabase bez własnego serwera poczty pozwala na kilka na godzinę. Spróbuj później.'
					: code === 'otp_disabled' || /signups not allowed|not found/i.test(error.message)
						? 'Ten adres nie ma konta. Poproś właściciela przestrzeni o zaproszenie.'
						: `Nie udało się wysłać linku (${error.message}).`;
		} else phase = 'sent';
	}
</script>

<div class="login">
	<form class="panel" onsubmit={send}>
		<div class="brand"><span class="brand-mark"><i></i><i></i><i></i><i></i></span>Pracownia</div>
		{#if phase === 'sent'}
			<h2>Sprawdź skrzynkę</h2>
			<p class="muted">Wysłaliśmy link logowania na <b>{email}</b>. Otwórz go na tym urządzeniu.</p>
			<button type="button" class="btn ghost sm" onclick={() => (phase = 'idle')}>Inny adres</button
			>
		{:else}
			<h2>Zaloguj się</h2>
			<p class="muted">Podaj e-mail, a wyślemy link do logowania. Bez hasła.</p>
			<div class="field">
				<label for="em">E-mail</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class="in"
					id="em"
					type="email"
					autocomplete="email"
					required
					bind:value={email}
					autofocus
				/>
			</div>
			{#if phase === 'error'}<p class="err">{message}</p>{/if}
			<button class="btn primary" disabled={phase === 'sending'}>
				{phase === 'sending' ? 'Wysyłam…' : 'Wyślij link'}
			</button>
		{/if}
	</form>
</div>

<style>
	.login {
		min-height: 100%;
		display: grid;
		place-items: center;
		padding: 16px;
		overflow-y: auto;
	}
	.panel {
		width: min(400px, 100%);
		gap: 14px;
		padding: 26px;
		box-shadow: var(--shadow);
	}
	.brand {
		padding: 0 0 6px;
	}
	p {
		margin: 0;
	}
	.err {
		color: var(--bad);
		font-size: 14px;
	}
	.btn.primary {
		justify-content: center;
	}
</style>
