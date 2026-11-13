import { ROUTES, seasonSchema } from '@cde/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { AlbumService } from './service.js';

const paramsSchema = z.object({ seasonId: seasonSchema });

export function albumController(service: AlbumService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.getAlbum.path, validate('param', paramsSchema), async (c) =>
    c.json(await service.getAlbum(currentUser(c), c.req.valid('param').seasonId)),
  );

  return app;
}
