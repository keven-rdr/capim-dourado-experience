import { ROUTES, seasonSchema } from '@cde/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { HuntsService } from './service.js';

const paramsSchema = z.object({ seasonId: seasonSchema });

export function huntsController(service: HuntsService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.getHunt.path, validate('param', paramsSchema), async (c) =>
    c.json(await service.getHunt(currentUser(c), c.req.valid('param').seasonId)),
  );

  return app;
}
