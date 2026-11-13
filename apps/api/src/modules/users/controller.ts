import { createProfileSchema, ROUTES, updateProfileSchema } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { UsersService } from './service.js';

export function usersController(service: UsersService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.getMe.path, async (c) => c.json(await service.getMe(currentUser(c))));

  app.post(ROUTES.createProfile.path, validate('json', createProfileSchema), async (c) =>
    c.json(await service.createProfile(currentUser(c), c.req.valid('json'))),
  );

  app.patch(ROUTES.updateProfile.path, validate('json', updateProfileSchema), async (c) =>
    c.json(await service.updateProfile(currentUser(c), c.req.valid('json'))),
  );

  app.delete(ROUTES.deleteAccount.path, async (c) => {
    await service.deleteAccount(currentUser(c));
    return c.body(null, 204);
  });

  app.get(ROUTES.getToday.path, async (c) => c.json(await service.getToday(currentUser(c))));

  app.post(ROUTES.dailyOpen.path, async (c) => c.json(await service.dailyOpen(currentUser(c))));

  app.get(ROUTES.listEvents.path, async (c) => c.json(await service.listEvents(currentUser(c))));

  return app;
}
