import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './env-types.js';
import { AppError } from './errors.js';

/** Verifica as credenciais da requisição e devolve o id do usuário. */
export interface AuthVerifier {
  readonly mode: 'dev' | 'supabase';
  verify(headers: { authorization?: string; demoUser?: string }): Promise<string>;
}

const DEMO_USER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Modo de desenvolvimento: o usuário vem do cabeçalho `x-demo-user`.
 * Sem senha e sem verificação: só para demonstração local.
 */
export const devAuthVerifier: AuthVerifier = {
  mode: 'dev',
  async verify({ demoUser }) {
    const id = demoUser?.trim();
    if (!id) throw new AppError('unauthorized', 'Envie o cabeçalho x-demo-user (modo dev).');
    if (!DEMO_USER_PATTERN.test(id)) {
      throw new AppError('unauthorized', 'x-demo-user deve ter de 1 a 64 letras, números, - ou _.');
    }
    return id;
  },
};

export function bearerToken(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function authMiddleware(verifier: AuthVerifier): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const headers: { authorization?: string; demoUser?: string } = {};
    const authorization = c.req.header('authorization');
    const demoUser = c.req.header('x-demo-user');
    if (authorization) headers.authorization = authorization;
    if (demoUser) headers.demoUser = demoUser;
    const userId = await verifier.verify(headers);
    c.set('userId', userId);
    await next();
  };
}
