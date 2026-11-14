import { markCouponUsedSchema, ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppConfig } from '../../config/env.js';
import type { AppEnv } from '../../shared/env-types.js';
import { validate } from '../../shared/http.js';
import { storeKeyMiddleware } from './auth.js';
import type { StorePanelService } from './service.js';

/** Rotas do painel da loja. Têm autenticação própria (chave da loja), separada do login do visitante. */
export function panelController(
  service: StorePanelService,
  config: Pick<AppConfig, 'storeKeys' | 'demoStoreKey'>,
): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('/v1/panel/stores/:storeId/*', storeKeyMiddleware(config));

  app.get(ROUTES.getStoreStats.path, async (c) =>
    c.json(await service.stats(c.req.param('storeId') ?? '')),
  );

  app.post(ROUTES.markCouponUsed.path, validate('json', markCouponUsedSchema), async (c) =>
    c.json(await service.markUsed(c.req.param('storeId') ?? '', c.req.valid('json'))),
  );

  return app;
}
