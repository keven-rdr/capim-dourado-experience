import {
  couponStoreId,
  MALL_DESK_ID,
  MALL_DESK_NAME,
  type MarkCouponUsedInput,
  type StoreStats,
  type UseCouponResult,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { QrRepository } from '../qr/repository.js';
import type { RewardsRepository } from '../rewards/repository.js';
import type { RouletteRepository } from '../roulette/repository.js';
import type { StoresRepository } from '../stores/repository.js';

export interface StorePanelServiceDeps {
  stores: StoresRepository;
  rewards: RewardsRepository;
  roulette: RouletteRepository;
  qr: QrRepository;
  clock: Clock;
}

/**
 * Painel mínimo da loja: três números e a baixa do cupom no caixa.
 * Quem usa é o caixa da loja (chave da loja), não o visitante.
 */
export class StorePanelService {
  constructor(private readonly deps: StorePanelServiceDeps) {}

  private async resolveStore(storeId: string): Promise<{ id: string; name: string }> {
    if (storeId === MALL_DESK_ID) return { id: MALL_DESK_ID, name: MALL_DESK_NAME };
    const store = await this.deps.stores.findById(storeId);
    if (!store) throw new AppError('not_found', 'Loja não encontrada.');
    return { id: store.id, name: store.name };
  }

  /** Cupons do catálogo que esta loja confere no caixa. */
  private async couponIdsOf(storeId: string): Promise<string[]> {
    const coupons = await this.deps.rewards.listCoupons();
    return coupons.filter((coupon) => couponStoreId(coupon) === storeId).map((coupon) => coupon.id);
  }

  async stats(storeId: string): Promise<StoreStats> {
    const store = await this.resolveStore(storeId);
    const couponIds = await this.couponIdsOf(store.id);
    const [spinsLanded, couponsUsed, visits] = await Promise.all([
      this.deps.roulette.countSpinsByCoupons(couponIds),
      this.deps.rewards.countUsedRedemptions(couponIds),
      store.id === MALL_DESK_ID
        ? Promise.resolve(null)
        : this.deps.qr.countByRef('store', store.id),
    ]);
    return { storeId: store.id, storeName: store.name, spinsLanded, visits, couponsUsed };
  }

  /** Dá baixa no cupom pelo código impresso. Cada falha tem o seu código de erro. */
  async markUsed(storeId: string, input: MarkCouponUsedInput): Promise<UseCouponResult> {
    const store = await this.resolveStore(storeId);
    const code = input.code.trim().toUpperCase();
    const redemption = await this.deps.rewards.findRedemptionByCode(code);
    if (!redemption) throw new AppError('coupon_not_found', 'Código não encontrado.');

    const coupon = await this.deps.rewards.findCoupon(redemption.couponId);
    if (!coupon) throw new AppError('coupon_not_found', 'Cupom fora do catálogo.');
    if (couponStoreId(coupon) !== store.id) {
      throw new AppError('coupon_wrong_store', `Este cupom vale em: ${coupon.storeName}.`, {
        storeName: coupon.storeName,
      });
    }
    if (redemption.usedAt)
      throw new AppError('coupon_used', undefined, { usedAt: redemption.usedAt });

    const now = this.deps.clock.now();
    if (Date.parse(redemption.expiresAt) <= now.getTime()) {
      throw new AppError('coupon_expired', undefined, { expiresAt: redemption.expiresAt });
    }
    const usedAt = now.toISOString();
    if (!(await this.deps.rewards.markRedemptionUsed(redemption.id, usedAt))) {
      throw new AppError('coupon_used');
    }
    return { redemption: { ...redemption, usedAt }, stats: await this.stats(store.id) };
  }
}
