import { ROUTES, scanQrSchema } from '@cde/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { QrService } from './service.js';

export function qrController(service: QrService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.post(ROUTES.scanQr.path, validate('json', scanQrSchema), async (c) =>
    c.json(await service.scan(currentUser(c), c.req.valid('json'))),
  );

  return app;
}
