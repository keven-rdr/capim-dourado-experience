import {
  COUPONS,
  type Coupon,
  HUNTS,
  type Hunt,
  type LatLng,
  MISSIONS,
  type Mission,
  type PointEvent,
  type Profile,
  type QrKind,
  type Redemption,
  SECRETS,
  type SeasonId,
  STICKERS,
  STORES,
  type Sticker,
  type Store,
  type Streak,
  type UpdateProfileInput,
} from '@cde/shared';
import type { AlbumRepository } from '../../modules/album/repository.js';
import type { CheckinRecord, CheckinRepository } from '../../modules/checkin/repository.js';
import type { HuntProgress, HuntsRepository } from '../../modules/hunts/repository.js';
import type { MissionsRepository } from '../../modules/missions/repository.js';
import type {
  AppliedEntry,
  LedgerEntry,
  PointsRepository,
  PointsState,
} from '../../modules/points/repository.js';
import type { QrRepository, ScanRecord, Secret } from '../../modules/qr/repository.js';
import type { RewardsRepository } from '../../modules/rewards/repository.js';
import type { StoresRepository } from '../../modules/stores/repository.js';
import type { UsersRepository } from '../../modules/users/repository.js';
import { AppError } from '../../shared/errors.js';
import type { IdGenerator } from '../../shared/ids.js';
import { clone, type MemoryDb } from './db.js';

export class MemoryUsersRepository implements UsersRepository {
  constructor(private readonly db: MemoryDb) {}

  async findById(id: string): Promise<Profile | null> {
    const profile = this.db.profiles.get(id);
    return profile ? clone(profile) : null;
  }

  async insert(profile: Profile): Promise<void> {
    if (!this.db.profiles.has(profile.id)) this.db.profiles.set(profile.id, clone(profile));
  }

  async update(id: string, patch: UpdateProfileInput): Promise<Profile | null> {
    const profile = this.db.profiles.get(id);
    if (!profile) return null;
    if (patch.name !== undefined) profile.name = patch.name;
    if (patch.trail !== undefined) profile.trail = patch.trail;
    if (patch.character !== undefined) profile.character = patch.character;
    if (patch.locationConsent !== undefined) profile.locationConsent = patch.locationConsent;
    return clone(profile);
  }

  async deleteAccount(id: string): Promise<void> {
    this.db.deleteUser(id);
  }
}

export class MemoryPointsRepository implements PointsRepository {
  constructor(
    private readonly db: MemoryDb,
    private readonly ids: IdGenerator,
  ) {}

  async getState(userId: string): Promise<PointsState | null> {
    const profile = this.db.profiles.get(userId);
    return profile ? clone({ wallet: profile.wallet, streak: profile.streak }) : null;
  }

  async saveStreak(userId: string, streak: Streak): Promise<void> {
    const profile = this.db.profiles.get(userId);
    if (profile) profile.streak = clone(streak);
  }

  async apply(userId: string, entry: LedgerEntry): Promise<AppliedEntry | null> {
    const profile = this.db.profiles.get(userId);
    if (!profile) throw new AppError('profile_not_found');
    const events = this.db.events.get(userId) ?? [];
    if (entry.dedupeKey && events.some((event) => event.dedupeKey === entry.dedupeKey)) {
      return null;
    }
    if (entry.xp < 0) throw new Error('XP não pode diminuir.');
    if (profile.wallet.coins + entry.coins < 0) throw new AppError('insufficient_coins');
    const event = {
      id: this.ids.id(),
      action: entry.action,
      label: entry.label,
      xp: entry.xp,
      coins: entry.coins,
      tickets: entry.tickets,
      at: entry.at,
      localDate: entry.localDate,
      dedupeKey: entry.dedupeKey,
    };
    events.push(event);
    this.db.events.set(userId, events);
    profile.wallet = {
      xp: profile.wallet.xp + entry.xp,
      coins: profile.wallet.coins + entry.coins,
      tickets: profile.wallet.tickets + entry.tickets,
    };
    return { event: toPointEvent(event), wallet: clone(profile.wallet) };
  }

  async xpOnDate(userId: string, localDate: string): Promise<number> {
    return (this.db.events.get(userId) ?? [])
      .filter((event) => event.localDate === localDate)
      .reduce((sum, event) => sum + event.xp, 0);
  }

  async hasEvent(userId: string, dedupeKey: string): Promise<boolean> {
    return (this.db.events.get(userId) ?? []).some((event) => event.dedupeKey === dedupeKey);
  }

  async listEvents(userId: string, limit: number): Promise<PointEvent[]> {
    return [...(this.db.events.get(userId) ?? [])].reverse().slice(0, limit).map(toPointEvent);
  }
}

function toPointEvent(event: PointEvent): PointEvent {
  const { id, action, label, xp, coins, tickets, at } = event;
  return { id, action, label, xp, coins, tickets, at };
}

export class MemoryCheckinRepository implements CheckinRepository {
  constructor(private readonly db: MemoryDb) {}

  async hasCheckedIn(userId: string, localDate: string): Promise<boolean> {
    return this.db.checkins.some(
      (row) => row.userId === userId && row.localDate === localDate && row.inside,
    );
  }

  async record(entry: CheckinRecord): Promise<boolean> {
    if (entry.inside && (await this.hasCheckedIn(entry.userId, entry.localDate))) return false;
    this.db.checkins.push({ ...entry });
    return true;
  }

  async getMallArea(): Promise<LatLng[] | null> {
    return null;
  }
}

export class MemoryQrRepository implements QrRepository {
  constructor(private readonly db: MemoryDb) {}

  async recordScan(entry: ScanRecord): Promise<boolean> {
    if (await this.hasScan(entry.userId, entry.kind, entry.refId, entry.scopeKey)) return false;
    this.db.scans.push({ ...entry });
    return true;
  }

  async hasScan(userId: string, kind: QrKind, refId: string, scopeKey: string): Promise<boolean> {
    return this.db.scans.some(
      (row) =>
        row.userId === userId &&
        row.kind === kind &&
        row.refId === refId &&
        row.scopeKey === scopeKey,
    );
  }

  async countScans(userId: string, kind: QrKind, localDate: string): Promise<number> {
    return this.db.scans.filter(
      (row) => row.userId === userId && row.kind === kind && row.localDate === localDate,
    ).length;
  }

  async countAllScans(userId: string, kind: QrKind): Promise<number> {
    return this.db.scans.filter((row) => row.userId === userId && row.kind === kind).length;
  }

  async listScansSince(userId: string, sinceDate: string): Promise<ScanRecord[]> {
    return this.db.scans
      .filter((row) => row.userId === userId && row.localDate >= sinceDate)
      .map((row) => ({ ...row }));
  }

  async findSecret(id: string): Promise<Secret | null> {
    const secret = SECRETS.find((item) => item.id === id);
    return secret ? clone(secret) : null;
  }
}

export class MemoryStoresRepository implements StoresRepository {
  async list(): Promise<Store[]> {
    return clone([...STORES]);
  }

  async findById(id: string): Promise<Store | null> {
    const store = STORES.find((item) => item.id === id);
    return store ? clone(store) : null;
  }
}

export class MemoryHuntsRepository implements HuntsRepository {
  constructor(private readonly db: MemoryDb) {}

  async findById(huntId: string): Promise<Hunt | null> {
    const hunt = HUNTS.find((item) => item.id === huntId);
    return hunt ? clone(hunt) : null;
  }

  async findBySeason(seasonId: SeasonId): Promise<Hunt | null> {
    const hunt = HUNTS.find((item) => item.seasonId === seasonId);
    return hunt ? clone(hunt) : null;
  }

  async getProgress(userId: string, huntId: string): Promise<HuntProgress> {
    return clone(
      this.db.huntProgress.get(`${userId}|${huntId}`) ?? { solved: 0, completedAt: null },
    );
  }

  async advance(
    userId: string,
    huntId: string,
    from: number,
    completedAt: string | null,
  ): Promise<boolean> {
    const key = `${userId}|${huntId}`;
    const current = this.db.huntProgress.get(key)?.solved ?? 0;
    if (current !== from) return false;
    this.db.huntProgress.set(key, { solved: from + 1, completedAt });
    return true;
  }
}

export class MemoryMissionsRepository implements MissionsRepository {
  constructor(private readonly db: MemoryDb) {}

  async list(): Promise<Mission[]> {
    return clone([...MISSIONS]);
  }

  async isCompleted(userId: string, missionId: string, periodKey: string): Promise<boolean> {
    return this.db.missionCompletions.has(`${userId}|${missionId}|${periodKey}`);
  }

  async tryComplete(userId: string, missionId: string, periodKey: string): Promise<boolean> {
    const key = `${userId}|${missionId}|${periodKey}`;
    if (this.db.missionCompletions.has(key)) return false;
    this.db.missionCompletions.add(key);
    return true;
  }
}

export class MemoryRewardsRepository implements RewardsRepository {
  constructor(private readonly db: MemoryDb) {}

  async listCoupons(): Promise<Coupon[]> {
    return clone([...COUPONS]);
  }

  async findCoupon(id: string): Promise<Coupon | null> {
    const coupon = COUPONS.find((item) => item.id === id);
    return coupon ? clone(coupon) : null;
  }

  async insertRedemption(userId: string, redemption: Redemption): Promise<boolean> {
    for (const rows of this.db.redemptions.values()) {
      if (rows.some((row) => row.code === redemption.code)) return false;
    }
    const rows = this.db.redemptions.get(userId) ?? [];
    rows.push({ ...redemption, userId });
    this.db.redemptions.set(userId, rows);
    return true;
  }

  async listRedemptions(userId: string): Promise<Redemption[]> {
    return [...(this.db.redemptions.get(userId) ?? [])]
      .reverse()
      .map(({ userId: _owner, ...redemption }) => redemption);
  }
}

export class MemoryAlbumRepository implements AlbumRepository {
  constructor(private readonly db: MemoryDb) {}

  async listStickers(seasonId: SeasonId): Promise<Sticker[]> {
    return clone(STICKERS.filter((sticker) => sticker.seasonId === seasonId));
  }

  async listOwned(userId: string): Promise<Set<string>> {
    return new Set(this.db.userStickers.get(userId)?.keys() ?? []);
  }

  async grant(userId: string, stickerId: string, at: string): Promise<boolean> {
    const owned = this.db.userStickers.get(userId) ?? new Map<string, string>();
    if (owned.has(stickerId)) return false;
    owned.set(stickerId, at);
    this.db.userStickers.set(userId, owned);
    return true;
  }
}
