import { ROUTES } from '@cde/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppDeps } from './container.js';
import { albumController } from './modules/album/controller.js';
import { checkinController } from './modules/checkin/controller.js';
import { huntsController } from './modules/hunts/controller.js';
import { missionsController } from './modules/missions/controller.js';
import { qrController } from './modules/qr/controller.js';
import { rafflesController } from './modules/raffles/controller.js';
import { rewardsController } from './modules/rewards/controller.js';
import { storesController } from './modules/stores/controller.js';
import { usersController } from './modules/users/controller.js';
import { authMiddleware } from './shared/auth.js';
import type { AppEnv } from './shared/env-types.js';
import { errorHandler, notFoundHandler, requestLogger } from './shared/http.js';

/** Cria o app Hono e monta os módulos. Sem efeitos colaterais: as dependências entram prontas. */
export function createApp(deps: AppDeps): Hono<AppEnv> {
  const { config, services, auth, logger } = deps;
  const app = new Hono<AppEnv>();

  app.use('*', requestLogger(logger));
  app.use(
    '*',
    cors({
      origin: config.corsOrigins,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'x-demo-user', 'x-request-id'],
      exposeHeaders: ['x-request-id'],
      maxAge: 600,
    }),
  );
  app.onError(errorHandler(logger));
  app.notFound(notFoundHandler);

  app.get(ROUTES.health.path, (c) =>
    c.json({
      status: 'ok',
      storage: config.storage,
      authMode: auth.mode,
      demoQr: config.allowDemoQr,
      skipOpeningHours: config.skipOpeningHours,
      time: new Date().toISOString(),
    }),
  );

  app.use('/v1/*', authMiddleware(auth));
  app.route('/', usersController(services.users));
  app.route('/', checkinController(services.checkin));
  app.route('/', qrController(services.qr));
  app.route('/', missionsController(services.missions));
  app.route('/', huntsController(services.hunts));
  app.route('/', storesController(services.stores));
  app.route('/', rewardsController(services.rewards));
  app.route('/', rafflesController(services.raffles));
  app.route('/', albumController(services.album));

  return app;
}
