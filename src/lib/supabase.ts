import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = !!(url && key);

// Klucz anon jest publiczny z założenia; dostęp do danych ogranicza RLS w bazie.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
	auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
