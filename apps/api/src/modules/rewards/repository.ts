import type { Coupon, Redemption } from '@cde/shared';

export interface RewardsRepository {
  /** Catálogo de cupons ativos (leitura pública). */
  listCoupons(): Promise<Coupon[]>;
  findCoupon(id: string): Promise<Coupon | null>;
  /** Grava o resgate. Devolve `false` se o código já existe (colisão rara; gerar outro). */
  insertRedemption(userId: string, redemption: Redemption): Promise<boolean>;
  /** Resgates do usuário, mais recentes primeiro. */
  listRedemptions(userId: string): Promise<Redemption[]>;
}
