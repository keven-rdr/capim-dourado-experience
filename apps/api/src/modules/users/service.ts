import {
  type CreateProfileInput,
  EMPTY_STREAK,
  EMPTY_WALLET,
  POINT_RULES,
  type PointEvent,
  type PointsResult,
  type Profile,
  type TodayStatus,
  type UpdateProfileInput,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { OpeningHours } from '../../shared/opening-hours.js';
import type { Rewarder } from '../points/rewarder.js';
import type { PointsService } from '../points/service.js';
import type { UsersRepository } from './repository.js';

/** O que o status do dia precisa saber de outros módulos. */
export interface DailyActivityReader {
  hasCheckedIn(userId: string, localDate: string): Promise<boolean>;
  storesVisitedOn(userId: string, localDate: string): Promise<number>;
}

export interface UsersServiceDeps {
  users: UsersRepository;
  points: PointsService;
  rewarder: Rewarder;
  activity: DailyActivityReader;
  hours: OpeningHours;
  clock: Clock;
}

export async function requireProfile(users: UsersRepository, userId: string): Promise<Profile> {
  const profile = await users.findById(userId);
  if (!profile) throw new AppError('profile_not_found');
  return profile;
}

/** Perfil, status do dia, primeiro acesso do dia, histórico e exclusão da conta. */
export class UsersService {
  constructor(private readonly deps: UsersServiceDeps) {}

  getMe(userId: string): Promise<Profile | null> {
    return this.deps.users.findById(userId);
  }

  /**
   * Cria o perfil e credita as boas-vindas uma única vez.
   * Se o perfil já existe, devolve o perfil atual sem alterar nada (idempotente).
   */
  async createProfile(userId: string, input: CreateProfileInput): Promise<Profile> {
    const existing = await this.deps.users.findById(userId);
    if (existing) return existing;
    const profile: Profile = {
      id: userId,
      name: input.name,
      trail: input.trail,
      character: input.character,
      locationConsent: input.locationConsent,
      wallet: { ...EMPTY_WALLET },
      streak: { ...EMPTY_STREAK },
      createdAt: this.deps.clock.now().toISOString(),
    };
    await this.deps.users.insert(profile);
    const welcome = POINT_RULES.welcome;
    await this.deps.rewarder.reward(userId, welcome.label, [
      {
        action: 'welcome',
        label: welcome.label,
        reward: { xp: welcome.xp, coins: welcome.coins, tickets: welcome.tickets },
        dedupeKey: 'welcome',
      },
    ]);
    return requireProfile(this.deps.users, userId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    await requireProfile(this.deps.users, userId);
    const updated = await this.deps.users.update(userId, input);
    if (!updated) throw new AppError('profile_not_found');
    return updated;
  }

  async deleteAccount(userId: string): Promise<void> {
    await requireProfile(this.deps.users, userId);
    await this.deps.users.deleteAccount(userId);
  }

  async getToday(userId: string): Promise<TodayStatus> {
    await requireProfile(this.deps.users, userId);
    const now = this.deps.clock.now();
    const date = this.deps.points.today();
    const [dailyOpenDone, checkInDone, storesVisited] = await Promise.all([
      this.deps.points.hasEvent(userId, dailyOpenKey(date)),
      this.deps.activity.hasCheckedIn(userId, date),
      this.deps.activity.storesVisitedOn(userId, date),
    ]);
    return {
      date,
      dailyOpenDone,
      checkInDone,
      storesVisited,
      mallOpen: this.deps.hours.isOpen(now),
    };
  }

  /** Pontua o primeiro acesso do dia e atualiza a sequência. Repetido no mesmo dia: `null`. */
  async dailyOpen(userId: string): Promise<PointsResult | null> {
    await requireProfile(this.deps.users, userId);
    const key = dailyOpenKey(this.deps.points.today());
    if (await this.deps.points.hasEvent(userId, key)) return null;
    const rule = POINT_RULES.daily_open;
    const outcome = await this.deps.rewarder.reward(userId, rule.label, [
      {
        action: 'daily_open',
        label: rule.label,
        reward: { xp: rule.xp, coins: rule.coins, tickets: rule.tickets },
        dedupeKey: key,
      },
    ]);
    return outcome.appliedKeys.has(key) ? outcome.result : null;
  }

  listEvents(userId: string): Promise<PointEvent[]> {
    return this.deps.points.listEvents(userId);
  }
}

function dailyOpenKey(date: string): string {
  return `daily_open:${date}`;
}
