import { ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import type { StoresService } from './service.js';

export function storesController(service: StoresService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.listStores.path, async (c) => c.json(await service.list()));

  return app;
}
