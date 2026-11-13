import { checkInSchema, ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { CheckinService } from './service.js';

export function checkinController(service: CheckinService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.post(ROUTES.checkIn.path, validate('json', checkInSchema), async (c) =>
    c.json(await service.checkIn(currentUser(c), c.req.valid('json'))),
  );

  return app;
}
