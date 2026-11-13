import { ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser } from '../../shared/http.js';
import type { RafflesService } from './service.js';

export function rafflesController(service: RafflesService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.post(ROUTES.buyTicket.path, async (c) => c.json(await service.buyTicket(currentUser(c))));

  return app;
}
