import { ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser } from '../../shared/http.js';
import type { MissionsService } from './service.js';

export function missionsController(service: MissionsService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.listMissions.path, async (c) =>
    c.json(await service.listMissions(currentUser(c))),
  );

  return app;
}
