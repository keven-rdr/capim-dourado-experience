import { createHash, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { type AppConfig, DEMO_STORE_KEY } from '../../config/env.js';
import type { AppEnv } from '../../shared/env-types.js';
import { AppError } from '../../shared/errors.js';

/** Compara em tempo constante, sem vazar o tamanho da chave certa. */
function sameKey(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Autentica o painel da loja pela chave da loja (cabeçalho `x-store-key`).
 * A chave de uma loja só abre o painel dela. Em demonstração (`demoStoreKey`), vale a chave `demo`.
 */
export function storeKeyMiddleware(
  config: Pick<AppConfig, 'storeKeys' | 'demoStoreKey'>,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const given = c.req.header('x-store-key')?.trim();
    if (!given) {
      throw new AppError('unauthorized', 'Envie a chave da loja no cabeçalho x-store-key.');
    }
    const storeId = c.req.param('storeId') ?? '';
    const expected = Object.hasOwn(config.storeKeys, storeId)
      ? config.storeKeys[storeId]
      : undefined;
    const valid =
      (expected !== undefined && sameKey(given, expected)) ||
      (config.demoStoreKey && sameKey(given, DEMO_STORE_KEY));
    if (!valid) throw new AppError('forbidden');
    await next();
  };
}
