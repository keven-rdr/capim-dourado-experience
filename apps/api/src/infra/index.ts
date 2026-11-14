import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repositories } from '../container.js';
import type { IdGenerator } from '../shared/ids.js';
import type { Logger } from '../shared/logger.js';
import { MemoryDb } from './memory/db.js';
import {
  MemoryAlbumRepository,
  MemoryCheckinRepository,
  MemoryHuntsRepository,
  MemoryMissionsRepository,
  MemoryPointsRepository,
  MemoryQrRepository,
  MemoryRewardsRepository,
  MemoryRouletteRepository,
  MemoryStoresRepository,
  MemoryUsersRepository,
} from './memory/repositories.js';
import { SupabaseCheckinRepository, SupabaseQrRepository } from './supabase/activity.js';
import {
  SupabaseAlbumRepository,
  SupabaseHuntsRepository,
  SupabaseMissionsRepository,
  SupabaseRewardsRepository,
  SupabaseStoresRepository,
} from './supabase/catalog.js';
import { SupabasePointsRepository } from './supabase/points.js';
import { SupabaseRouletteRepository } from './supabase/roulette.js';
import { SupabaseUsersRepository } from './supabase/users.js';

/** Repositórios em memória, com os catálogos do seed do `@cde/shared`. */
export function createMemoryRepositories(ids: IdGenerator, db = new MemoryDb()): Repositories {
  return {
    users: new MemoryUsersRepository(db),
    points: new MemoryPointsRepository(db, ids),
    checkins: new MemoryCheckinRepository(db),
    qr: new MemoryQrRepository(db),
    stores: new MemoryStoresRepository(),
    hunts: new MemoryHuntsRepository(db),
    missions: new MemoryMissionsRepository(db),
    rewards: new MemoryRewardsRepository(db),
    album: new MemoryAlbumRepository(db),
    roulette: new MemoryRouletteRepository(db),
  };
}

/** Repositórios sobre o Supabase (chave secreta). Não testados contra um projeto real. */
export function createSupabaseRepositories(client: SupabaseClient, logger: Logger): Repositories {
  return {
    users: new SupabaseUsersRepository(client, logger),
    points: new SupabasePointsRepository(client),
    checkins: new SupabaseCheckinRepository(client),
    qr: new SupabaseQrRepository(client),
    stores: new SupabaseStoresRepository(client),
    hunts: new SupabaseHuntsRepository(client),
    missions: new SupabaseMissionsRepository(client),
    rewards: new SupabaseRewardsRepository(client),
    album: new SupabaseAlbumRepository(client),
    roulette: new SupabaseRouletteRepository(client),
  };
}
