import type { SupabaseClient } from '@supabase/supabase-js';
import { type AuthVerifier, bearerToken } from '../../shared/auth.js';
import { AppError } from '../../shared/errors.js';

/** Valida o JWT do Supabase Auth (`Authorization: Bearer <token>`) consultando o próprio Supabase. */
export function supabaseAuthVerifier(client: SupabaseClient): AuthVerifier {
  return {
    mode: 'supabase',
    async verify({ authorization }) {
      const token = bearerToken(authorization);
      if (!token) throw new AppError('unauthorized', 'Envie Authorization: Bearer <token>.');
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) throw new AppError('unauthorized', 'Sessão inválida ou expirada.');
      return data.user.id;
    },
  };
}
