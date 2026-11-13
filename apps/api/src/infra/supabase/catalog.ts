import type {
  Coupon,
  Floor,
  Hunt,
  Mission,
  MissionKind,
  Redemption,
  Reward,
  SeasonId,
  Sticker,
  StickerRarity,
  Store,
  Trail,
} from '@cde/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlbumRepository } from '../../modules/album/repository.js';
import type { HuntProgress, HuntsRepository } from '../../modules/hunts/repository.js';
import type { MissionsRepository } from '../../modules/missions/repository.js';
import type { RewardsRepository } from '../../modules/rewards/repository.js';
import type { StoresRepository } from '../../modules/stores/repository.js';
import { CachedLoader, fail, PG_UNIQUE_VIOLATION } from './client.js';

function reward(xp: number, coins: number, tickets: number, stickerId: string | null): Reward {
  return stickerId ? { xp, coins, tickets, stickerId } : { xp, coins, tickets };
}

export class SupabaseStoresRepository implements StoresRepository {
  private readonly stores: CachedLoader<Store[]>;

  constructor(db: SupabaseClient) {
    this.stores = new CachedLoader(async () => {
      const { data, error } = await db
        .from('stores')
        .select('id, name, floor, category, trails, map_x, map_y')
        .eq('active', true)
        .order('sort_order');
      if (error) fail('ler lojas', error);
      type Row = {
        id: string;
        name: string;
        floor: Floor;
        category: string;
        trails: Trail[];
        map_x: number;
        map_y: number;
      };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        name: row.name,
        floor: row.floor,
        category: row.category,
        trails: row.trails,
        map: { x: Number(row.map_x), y: Number(row.map_y) },
      }));
    });
  }

  list(): Promise<Store[]> {
    return this.stores.get();
  }

  async findById(id: string): Promise<Store | null> {
    return (await this.stores.get()).find((store) => store.id === id) ?? null;
  }
}

export class SupabaseHuntsRepository implements HuntsRepository {
  private readonly hunts: CachedLoader<Hunt[]>;

  constructor(private readonly db: SupabaseClient) {
    this.hunts = new CachedLoader(async () => {
      const { data, error } = await db
        .from('hunts')
        .select(
          'id, season_id, title, final_xp, final_coins, final_tickets, final_sticker_id, hunt_clues(clue_order, riddle, hint, location_label, floor)',
        )
        .eq('active', true);
      if (error) fail('ler caças', error);
      type Row = {
        id: string;
        season_id: SeasonId;
        title: string;
        final_xp: number;
        final_coins: number;
        final_tickets: number;
        final_sticker_id: string | null;
        hunt_clues: Array<{
          clue_order: number;
          riddle: string;
          hint: string;
          location_label: string;
          floor: Floor;
        }>;
      };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        seasonId: row.season_id,
        title: row.title,
        finalReward: reward(row.final_xp, row.final_coins, row.final_tickets, row.final_sticker_id),
        clues: [...row.hunt_clues]
          .sort((a, b) => a.clue_order - b.clue_order)
          .map((clue) => ({
            order: clue.clue_order,
            riddle: clue.riddle,
            hint: clue.hint,
            locationLabel: clue.location_label,
            floor: clue.floor,
          })),
      }));
    });
  }

  async findById(huntId: string): Promise<Hunt | null> {
    return (await this.hunts.get()).find((hunt) => hunt.id === huntId) ?? null;
  }

  async findBySeason(seasonId: SeasonId): Promise<Hunt | null> {
    return (await this.hunts.get()).find((hunt) => hunt.seasonId === seasonId) ?? null;
  }

  async getProgress(userId: string, huntId: string): Promise<HuntProgress> {
    const { data, error } = await this.db
      .from('hunt_progress')
      .select('solved, completed_at')
      .eq('user_id', userId)
      .eq('hunt_id', huntId)
      .maybeSingle();
    if (error) fail('ler progresso da caça', error);
    const row = data as { solved: number; completed_at: string | null } | null;
    return { solved: row?.solved ?? 0, completedAt: row?.completed_at ?? null };
  }

  async advance(
    userId: string,
    huntId: string,
    from: number,
    completedAt: string | null,
  ): Promise<boolean> {
    if (from === 0) {
      const { error } = await this.db
        .from('hunt_progress')
        .insert({ user_id: userId, hunt_id: huntId, solved: 1, completed_at: completedAt });
      if (error?.code === PG_UNIQUE_VIOLATION) return false;
      if (error) fail('avançar caça', error);
      return true;
    }
    const { data, error } = await this.db
      .from('hunt_progress')
      .update({ solved: from + 1, completed_at: completedAt, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('hunt_id', huntId)
      .eq('solved', from)
      .select('user_id');
    if (error) fail('avançar caça', error);
    return (data ?? []).length === 1;
  }
}

export class SupabaseMissionsRepository implements MissionsRepository {
  private readonly missions: CachedLoader<Mission[]>;

  constructor(private readonly db: SupabaseClient) {
    this.missions = new CachedLoader(async () => {
      const { data, error } = await db
        .from('missions')
        .select(
          'id, kind, title, description, season_id, target, reward_xp, reward_coins, reward_tickets, reward_sticker_id',
        )
        .eq('active', true)
        .order('sort_order');
      if (error) fail('ler missões', error);
      type Row = {
        id: string;
        kind: MissionKind;
        title: string;
        description: string;
        season_id: SeasonId | null;
        target: number;
        reward_xp: number;
        reward_coins: number;
        reward_tickets: number;
        reward_sticker_id: string | null;
      };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        description: row.description,
        ...(row.season_id ? { seasonId: row.season_id } : {}),
        target: row.target,
        reward: reward(row.reward_xp, row.reward_coins, row.reward_tickets, row.reward_sticker_id),
      }));
    });
  }

  list(): Promise<Mission[]> {
    return this.missions.get();
  }

  async isCompleted(userId: string, missionId: string, periodKey: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('mission_progress')
      .select('mission_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .eq('period_key', periodKey);
    if (error) fail('consultar missão', error);
    return (count ?? 0) > 0;
  }

  async tryComplete(
    userId: string,
    missionId: string,
    periodKey: string,
    at: string,
  ): Promise<boolean> {
    const { error } = await this.db.from('mission_progress').insert({
      user_id: userId,
      mission_id: missionId,
      period_key: periodKey,
      completed_at: at,
    });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('concluir missão', error);
    return true;
  }
}

export class SupabaseRewardsRepository implements RewardsRepository {
  private readonly coupons: CachedLoader<Coupon[]>;

  constructor(private readonly db: SupabaseClient) {
    this.coupons = new CachedLoader(async () => {
      const { data, error } = await db
        .from('coupons')
        .select('id, title, store_name, store_id, cost, trail, valid_days')
        .eq('active', true)
        .order('sort_order');
      if (error) fail('ler cupons', error);
      type Row = {
        id: string;
        title: string;
        store_name: string;
        store_id: string | null;
        cost: number;
        trail: Trail;
        valid_days: number;
      };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        title: row.title,
        storeName: row.store_name,
        ...(row.store_id ? { storeId: row.store_id } : {}),
        cost: row.cost,
        trail: row.trail,
        validDays: row.valid_days,
        example: true as const,
      }));
    });
  }

  listCoupons(): Promise<Coupon[]> {
    return this.coupons.get();
  }

  async findCoupon(id: string): Promise<Coupon | null> {
    return (await this.coupons.get()).find((coupon) => coupon.id === id) ?? null;
  }

  async insertRedemption(userId: string, redemption: Redemption): Promise<boolean> {
    const { error } = await this.db.from('redemptions').insert({
      id: redemption.id,
      user_id: userId,
      coupon_id: redemption.couponId,
      title: redemption.title,
      store_name: redemption.storeName,
      code: redemption.code,
      redeemed_at: redemption.redeemedAt,
      expires_at: redemption.expiresAt,
      used_at: redemption.usedAt,
    });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('gravar resgate', error);
    return true;
  }

  async listRedemptions(userId: string): Promise<Redemption[]> {
    const { data, error } = await this.db
      .from('redemptions')
      .select('id, coupon_id, title, store_name, code, redeemed_at, expires_at, used_at')
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });
    if (error) fail('listar resgates', error);
    type Row = {
      id: string;
      coupon_id: string;
      title: string;
      store_name: string;
      code: string;
      redeemed_at: string;
      expires_at: string;
      used_at: string | null;
    };
    return ((data ?? []) as Row[]).map((row) => ({
      id: row.id,
      couponId: row.coupon_id,
      title: row.title,
      storeName: row.store_name,
      code: row.code,
      redeemedAt: row.redeemed_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
    }));
  }
}

export class SupabaseAlbumRepository implements AlbumRepository {
  private readonly stickers: CachedLoader<Sticker[]>;

  constructor(private readonly db: SupabaseClient) {
    this.stickers = new CachedLoader(async () => {
      const { data, error } = await db
        .from('stickers')
        .select('id, season_id, name, rarity')
        .order('sort_order');
      if (error) fail('ler figurinhas', error);
      type Row = { id: string; season_id: SeasonId; name: string; rarity: StickerRarity };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        seasonId: row.season_id,
        name: row.name,
        rarity: row.rarity,
      }));
    });
  }

  async listStickers(seasonId: SeasonId): Promise<Sticker[]> {
    return (await this.stickers.get()).filter((sticker) => sticker.seasonId === seasonId);
  }

  async listOwned(userId: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('user_stickers')
      .select('sticker_id')
      .eq('user_id', userId);
    if (error) fail('ler figurinhas do usuário', error);
    return new Set(((data ?? []) as Array<{ sticker_id: string }>).map((row) => row.sticker_id));
  }

  async grant(userId: string, stickerId: string, at: string): Promise<boolean> {
    const { error } = await this.db
      .from('user_stickers')
      .insert({ user_id: userId, sticker_id: stickerId, obtained_at: at });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('entregar figurinha', error);
    return true;
  }
}
