import type { Coupon, RedeemInput, RedeemResult, Redemption, Trail } from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { IdGenerator } from '../../shared/ids.js';
import type { PointsService } from '../points/service.js';
import type { RewardsRepository } from './repository.js';

const MAX_CODE_ATTEMPTS = 5;

/** Loja de recompensas: cupons por trilha, resgate com código único e validade (RF12, RN07). */
export class RewardsService {
  constructor(
    private readonly rewards: RewardsRepository,
    private readonly points: PointsService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** Com trilha, devolve os cupons dela e os de `todos`. */
  async listCoupons(trail?: Trail): Promise<Coupon[]> {
    const coupons = await this.rewards.listCoupons();
    if (!trail) return coupons;
    return coupons.filter((coupon) => coupon.trail === trail || coupon.trail === 'todos');
  }

  async redeem(userId: string, input: RedeemInput): Promise<RedeemResult> {
    const coupon = await this.rewards.findCoupon(input.couponId);
    if (!coupon) throw new AppError('coupon_not_found');
    const wallet = await this.points.spend(userId, 'coupon_redeem', `Cupom: ${coupon.title}`, {
      coins: coupon.cost,
    });

    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + coupon.validDays * 86_400_000);
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const redemption: Redemption = {
        id: this.ids.id(),
        couponId: coupon.id,
        title: coupon.title,
        storeName: coupon.storeName,
        code: this.ids.redemptionCode(),
        redeemedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
      };
      if (await this.rewards.insertRedemption(userId, redemption)) return { redemption, wallet };
    }
    throw new Error('Não foi possível gerar um código de resgate único.');
  }

  async listRedemptions(userId: string): Promise<Redemption[]> {
    await this.points.requireState(userId);
    return this.rewards.listRedemptions(userId);
  }
}
