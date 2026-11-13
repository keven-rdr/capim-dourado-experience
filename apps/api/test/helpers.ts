import { type CreateProfileInput, MALL_CENTER, type Reward } from '@cde/shared';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { buildDeps, type Services } from '../src/container.js';
import { createMemoryRepositories } from '../src/infra/index.js';
import { MemoryDb } from '../src/infra/memory/db.js';
import { ManualClock } from '../src/shared/clock.js';
import { type ApiErrorCode, AppError } from '../src/shared/errors.js';
import { cryptoIds } from '../src/shared/ids.js';
import { silentLogger } from '../src/shared/logger.js';

export const TEST_SECRET = 'segredo-de-teste-com-mais-de-16';

/** Sexta-feira, 13/11/2026, 12h em Palmas (UTC-3): shopping aberto. */
export const OPEN_TIME = '2026-11-13T15:00:00Z';
/** Sexta-feira, 13/11/2026, 5h em Palmas: shopping fechado. */
export const CLOSED_TIME = '2026-11-13T08:00:00Z';

/** Centro do shopping (OpenStreetMap), dentro do polígono aproximado. */
export const INSIDE = { ...MALL_CENTER, accuracy: 20 };
/** Fora do polígono. */
export const OUTSIDE = { lat: -10.2, lng: -48.3, accuracy: 20 };

export const PROFILE: CreateProfileInput = {
  name: 'Ana',
  trail: 'todos',
  character: 'capi',
  locationConsent: true,
};

export function setup(options: { env?: Record<string, string>; now?: string } = {}) {
  const clock = new ManualClock(options.now ?? OPEN_TIME);
  const config = loadConfig({ NODE_ENV: 'test', QR_SECRET: TEST_SECRET, ...options.env });
  const db = new MemoryDb();
  const deps = buildDeps(config, {
    clock,
    logger: silentLogger,
    repositories: createMemoryRepositories(cryptoIds, db),
  });
  return { clock, config, db, services: deps.services, app: createApp(deps) };
}

export async function createUser(
  services: Services,
  id = 'u1',
  input: Partial<CreateProfileInput> = {},
) {
  return services.users.createProfile(id, { ...PROFILE, ...input });
}

/** Credita moedas direto pelo service de pontos (sem passar pelas regras de uma ação). */
export async function giveCoins(services: Services, userId: string, coins: number) {
  const reward: Reward = { xp: 0, coins, tickets: 0 };
  await services.points.grant(userId, 'Teste', [
    { action: 'test', label: 'Teste', reward, dedupeKey: null },
  ]);
}

/** Espera que a promessa falhe com o código de erro do contrato. */
export async function expectCode(promise: Promise<unknown>, code: ApiErrorCode): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError && error.code === code) return error;
    throw new Error(
      `Esperava ${code}, recebeu ${error instanceof AppError ? error.code : String(error)}`,
    );
  }
  throw new Error(`Esperava ${code}, mas a operação deu certo.`);
}
