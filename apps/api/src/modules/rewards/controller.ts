import { ROUTES, redeemSchema, trailSchema } from '@cde/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../shared/env-types.js';
import { currentUser, validate } from '../../shared/http.js';
import type { RewardsService } from './service.js';

const couponsQuerySchema = z.object({ trail: trailSchema.optional() });

export function rewardsController(service: RewardsService): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get(ROUTES.listCoupons.path, validate('query', couponsQuerySchema), async (c) =>
    c.json(await service.listCoupons(c.req.valid('query').trail)),
  );

  app.post(ROUTES.redeemCoupon.path, validate('json', redeemSchema), async (c) =>
    c.json(await service.redeem(currentUser(c), c.req.valid('json'))),
  );

  app.get(ROUTES.listRedemptions.path, async (c) =>
    c.json(await service.listRedemptions(currentUser(c))),
  );

  return app;
}
