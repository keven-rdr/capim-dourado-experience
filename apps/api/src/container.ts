import { randomInt } from 'node:crypto';
import type { AppConfig } from './config/env.js';
import { createMemoryRepositories, createSupabaseRepositories } from './infra/index.js';
import { supabaseAuthVerifier } from './infra/supabase/auth.js';
import { createSupabaseAdmin } from './infra/supabase/client.js';
import type { AlbumRepository } from './modules/album/repository.js';
import { AlbumService } from './modules/album/service.js';
import type { CheckinRepository } from './modules/checkin/repository.js';
import { CheckinService } from './modules/checkin/service.js';
import type { HuntsRepository } from './modules/hunts/repository.js';
import { HuntsService } from './modules/hunts/service.js';
import type { MissionsRepository } from './modules/missions/repository.js';
import { MissionsService } from './modules/missions/service.js';
import { StorePanelService } from './modules/panel/service.js';
import type { PointsRepository } from './modules/points/repository.js';
import { Rewarder } from './modules/points/rewarder.js';
import { PointsService } from './modules/points/service.js';
import type { QrRepository } from './modules/qr/repository.js';
import { QrService } from './modules/qr/service.js';
import { RafflesService } from './modules/raffles/service.js';
import type { RewardsRepository } from './modules/rewards/repository.js';
import { RewardsService } from './modules/rewards/service.js';
import type { RouletteRepository } from './modules/roulette/repository.js';
import { RouletteService } from './modules/roulette/service.js';
import type { StoresRepository } from './modules/stores/repository.js';
import { StoresService } from './modules/stores/service.js';
import type { UsersRepository } from './modules/users/repository.js';
import { UsersService } from './modules/users/service.js';
import { type AuthVerifier, devAuthVerifier } from './shared/auth.js';
import { type Clock, systemClock } from './shared/clock.js';
import { cryptoIds, type IdGenerator } from './shared/ids.js';
import { consoleLogger, type Logger } from './shared/logger.js';
import { createOpeningHours } from './shared/opening-hours.js';

export interface Repositories {
  users: UsersRepository;
  points: PointsRepository;
  checkins: CheckinRepository;
  qr: QrRepository;
  stores: StoresRepository;
  hunts: HuntsRepository;
  missions: MissionsRepository;
  rewards: RewardsRepository;
  album: AlbumRepository;
  roulette: RouletteRepository;
}

export interface Services {
  users: UsersService;
  points: PointsService;
  checkin: CheckinService;
  qr: QrService;
  missions: MissionsService;
  hunts: HuntsService;
  stores: StoresService;
  rewards: RewardsService;
  raffles: RafflesService;
  album: AlbumService;
  roulette: RouletteService;
  panel: StorePanelService;
}

export interface AppDeps {
  config: AppConfig;
  services: Services;
  auth: AuthVerifier;
  logger: Logger;
}

export interface Runtime {
  clock: Clock;
  ids: IdGenerator;
  /** Número em [0, 1) para sortear a roleta. Troca-se nos testes por um valor fixo. */
  random: () => number;
}

/** Sorteio imprevisível (crypto), para ninguém adivinhar a próxima fatia. */
export const cryptoRandom = (): number => randomInt(0, 2 ** 32) / 2 ** 32;

/** Monta os services sobre qualquer conjunto de repositórios (memória ou Supabase). */
export function createServices(repos: Repositories, config: AppConfig, runtime: Runtime): Services {
  const { clock, ids, random } = runtime;
  const hours = createOpeningHours(config.skipOpeningHours);

  const points = new PointsService(repos.points, clock);
  const album = new AlbumService(repos.album, repos.users, clock);
  const stores = new StoresService(repos.stores);
  const hunts = new HuntsService(repos.hunts, repos.users, clock);
  const missions = new MissionsService({
    missions: repos.missions,
    users: repos.users,
    checkins: repos.checkins,
    qr: repos.qr,
    hunts: repos.hunts,
    stores: repos.stores,
    points,
    clock,
  });
  const rewarder = new Rewarder(points, missions, album);
  const checkin = new CheckinService({
    checkins: repos.checkins,
    users: repos.users,
    rewarder,
    stickers: album,
    hours,
    clock,
    areaOverride: config.mallAreaOverride,
  });
  const qr = new QrService({
    qr: repos.qr,
    users: repos.users,
    stores,
    hunts,
    checkin,
    rewarder,
    hours,
    clock,
    qrSecret: config.qrSecret,
    allowDemoQr: config.allowDemoQr,
  });
  const users = new UsersService({
    users: repos.users,
    points,
    rewarder,
    activity: {
      hasCheckedIn: (userId, date) => checkin.hasCheckedIn(userId, date),
      storesVisitedOn: (userId, date) => qr.storesVisitedOn(userId, date),
    },
    hours,
    clock,
  });
  const rewards = new RewardsService(repos.rewards, points, ids, clock);
  const raffles = new RafflesService(points);
  const roulette = new RouletteService({
    roulette: repos.roulette,
    checkins: repos.checkins,
    users: repos.users,
    rewards,
    clock,
    random,
    goldenWindows: config.goldenWindows,
  });
  const panel = new StorePanelService({
    stores: repos.stores,
    rewards: repos.rewards,
    roulette: repos.roulette,
    qr: repos.qr,
    clock,
  });

  return {
    users,
    points,
    checkin,
    qr,
    missions,
    hunts,
    stores,
    rewards,
    raffles,
    album,
    roulette,
    panel,
  };
}

export interface BuildOptions {
  clock?: Clock;
  ids?: IdGenerator;
  random?: () => number;
  logger?: Logger;
  /** Substitui os repositórios (usado nos testes). */
  repositories?: Repositories;
}

/** Raiz de composição: escolhe memória ou Supabase e o modo de autenticação pela configuração. */
export function buildDeps(config: AppConfig, options: BuildOptions = {}): AppDeps {
  const runtime: Runtime = {
    clock: options.clock ?? systemClock,
    ids: options.ids ?? cryptoIds,
    random: options.random ?? cryptoRandom,
  };
  const logger = options.logger ?? consoleLogger;
  const client = config.supabase
    ? createSupabaseAdmin(config.supabase.url, config.supabase.serviceRoleKey)
    : null;

  const repositories =
    options.repositories ??
    (client ? createSupabaseRepositories(client, logger) : createMemoryRepositories(runtime.ids));

  let auth: AuthVerifier = devAuthVerifier;
  if (config.authMode === 'supabase') {
    if (!client) throw new Error('AUTH_MODE=supabase sem cliente do Supabase.');
    auth = supabaseAuthVerifier(client);
  }

  return { config, services: createServices(repositories, config, runtime), auth, logger };
}
