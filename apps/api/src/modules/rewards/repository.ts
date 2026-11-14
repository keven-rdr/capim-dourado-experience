import type { Coupon, Redemption } from '@cde/shared';

export interface RewardsRepository {
  /** Catálogo de cupons ativos (leitura pública). */
  listCoupons(): Promise<Coupon[]>;
  findCoupon(id: string): Promise<Coupon | null>;
  /** Grava o resgate. Devolve `false` se o código já existe (colisão rara; gerar outro). */
  insertRedemption(userId: string, redemption: Redemption): Promise<boolean>;
  /** Resgates do usuário, mais recentes primeiro. */
  listRedemptions(userId: string): Promise<Redemption[]>;
  /** Resgate pelo código impresso (o caixa da loja não sabe de quem é). */
  findRedemptionByCode(code: string): Promise<Redemption | null>;
  /** Marca o uso. Devolve `false` se o cupom já estava usado (duas baixas ao mesmo tempo). */
  markRedemptionUsed(id: string, at: string): Promise<boolean>;
  /** Quantos resgates já tiveram baixa, entre os cupons indicados. */
  countUsedRedemptions(couponIds: readonly string[]): Promise<number>;
}
