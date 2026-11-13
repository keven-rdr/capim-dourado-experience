import type { SupabaseClient } from '@supabase/supabase-js';

let client: Promise<SupabaseClient | null> | null = null;

/** Cliente do Supabase, criado sob demanda só quando as variáveis existem. */
function getClient(): Promise<SupabaseClient | null> {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    client =
      url && key
        ? import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key))
        : Promise.resolve(null);
  }
  return client;
}

/**
 * Devolve o JWT da sessão. Sem sessão, entra como anônimo (login anônimo do Supabase).
 * Sem Supabase configurado, devolve `null` e a API decide.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return signed.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  const supabase = await getClient();
  await supabase?.auth.signOut();
}
