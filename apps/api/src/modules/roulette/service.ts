import {
  BASE_SPINS,
  GOLDEN_SPIN_FACTOR,
  type GoldenWindow,
  isGoldenHour,
  localDate,
  pickSlice,
  ROULETTE_COUPON_VALID_DAYS,
  ROULETTE_SLICES,
  type RouletteStatus,
  type SpinResult,
  sliceViews,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { CheckinRepository } from '../checkin/repository.js';
import type { RewardsService } from '../rewards/service.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import type { RouletteRepository } from './repository.js';

/** Quantas vezes tenta de novo se outro giro do mesmo usuário ocupar a vaga ao mesmo tempo. */
const MAX_SLOT_ATTEMPTS = 3;

export interface RouletteServiceDeps {
  roulette: RouletteRepository;
  checkins: CheckinRepository;
  users: UsersRepository;
  rewards: RewardsService;
  clock: Clock;
  /** Número em [0, 1). Injetável para os testes. */
  random: () => number;
  goldenWindows: readonly GoldenWindow[];
}

/**
 * Roleta de cupons. O check-in do dia dá os giros: 1 no horário normal, em dobro se o check-in
 * caiu na hora dourada. Cada giro vira um cupom de uso único com validade curta (RN07).
 * O servidor sorteia; o app só desenha o resultado.
 */
export class RouletteService {
  constructor(private readonly deps: RouletteServiceDeps) {}

  /** Giros que o check-in de `date` rendeu, e se ele caiu na hora dourada. */
  private async quota(
    userId: string,
    date: string,
  ): Promise<{ checkedIn: boolean; golden: boolean; granted: number }> {
    const at = await this.deps.checkins.getCheckinAt(userId, date);
    if (!at) return { checkedIn: false, golden: false, granted: 0 };
    const golden = isGoldenHour(new Date(at), this.deps.goldenWindows);
    return {
      checkedIn: true,
      golden,
      granted: golden ? BASE_SPINS * GOLDEN_SPIN_FACTOR : BASE_SPINS,
    };
  }

  async status(userId: string): Promise<RouletteStatus> {
    await requireProfile(this.deps.users, userId);
    const now = this.deps.clock.now();
    const date = localDate(now);
    const [quota, used, coupons] = await Promise.all([
      this.quota(userId, date),
      this.deps.roulette.countSpins(userId, date),
      this.deps.rewards.listCoupons(),
    ]);
    return {
      date,
      checkedIn: quota.checkedIn,
      goldenNow: isGoldenHour(now, this.deps.goldenWindows),
      goldenCheckIn: quota.golden,
      goldenWindows: this.deps.goldenWindows.map((window) => ({
        ...window,
        days: [...window.days],
      })),
      spinsGranted: quota.granted,
      spinsUsed: used,
      spinsLeft: Math.max(0, quota.granted - used),
      couponValidDays: ROULETTE_COUPON_VALID_DAYS,
      slices: sliceViews(coupons),
    };
  }

  async spin(userId: string): Promise<SpinResult> {
    await requireProfile(this.deps.users, userId);
    const now = this.deps.clock.now();
    const date = localDate(now);

    for (let attempt = 0; attempt < MAX_SLOT_ATTEMPTS; attempt++) {
      const quota = await this.quota(userId, date);
      if (!quota.checkedIn) {
        throw new AppError('no_spins', 'Faça o check-in de hoje para ganhar giros.');
      }
      const used = await this.deps.roulette.countSpins(userId, date);
      if (used >= quota.granted) {
        throw new AppError('no_spins', 'Seus giros de hoje acabaram. Volte amanhã.');
      }

      const sliceIndex = pickSlice(this.deps.random);
      const slice = ROULETTE_SLICES[sliceIndex];
      const coupon = slice
        ? (await this.deps.rewards.listCoupons()).find((item) => item.id === slice.couponId)
        : undefined;
      if (!coupon) throw new Error('Cupom da roleta fora do catálogo.');

      // Ocupa a vaga do giro antes de emitir o cupom: duas requisições juntas não gastam o mesmo giro.
      const claimed = await this.deps.roulette.recordSpin({
        userId,
        localDate: date,
        spinNo: used + 1,
        sliceIndex,
        couponId: coupon.id,
        at: now.toISOString(),
      });
      if (!claimed) continue;

      const redemption = await this.deps.rewards.issue(userId, coupon, ROULETTE_COUPON_VALID_DAYS);
      return { sliceIndex, redemption, status: await this.status(userId) };
    }
    throw new AppError('no_spins', 'Seus giros de hoje acabaram. Volte amanhã.');
  }
}
