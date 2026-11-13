import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente do Supabase com a chave secreta (`sb_secret_...`, antiga `service_role`).
 * Ignora o RLS: só a API usa, nunca o app.
 */
export function createSupabaseAdmin(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export interface PgError {
  code?: string;
  message: string;
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_CHECK_VIOLATION = '23514';

/** Converte erro inesperado do banco em exceção (vira `internal` no handler HTTP). */
export function fail(operation: string, error: PgError): never {
  throw new Error(`Supabase: falha em ${operation}: ${error.code ?? ''} ${error.message}`.trim());
}

/** Cache curto para catálogos, que mudam pouco e são lidos em toda requisição. */
export class CachedLoader<T> {
  private value: T | null = null;
  private loadedAt = 0;

  constructor(
    private readonly load: () => Promise<T>,
    private readonly ttlMs = 60_000,
  ) {}

  async get(): Promise<T> {
    if (this.value === null || Date.now() - this.loadedAt > this.ttlMs) {
      this.value = await this.load();
      this.loadedAt = Date.now();
    }
    return this.value;
  }
}
