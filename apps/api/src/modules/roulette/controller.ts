import { ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser } from '../../shared/http.js';
import type { RouletteService } from './service.js';

export function rouletteController(service: RouletteService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.getRoulette.path, async (c) => c.json(await service.status(currentUser(c))));
  app.post(ROUTES.spinRoulette.path, async (c) => c.json(await service.spin(currentUser(c))));

  return app;
}
