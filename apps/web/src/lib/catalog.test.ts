import { STORES } from '@cde/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { discountPct, PRODUCTS, priceHistory, productsFor } from './catalog';
import { simulatePriceDrop, wishStatus } from './wishlist';

const first = PRODUCTS[0] as (typeof PRODUCTS)[number];

describe('catálogo de exemplo', () => {
  it('só usa lojas que existem no shopping', () => {
    const ids = new Set(STORES.map((s) => s.id));
    for (const p of PRODUCTS) expect(ids.has(p.storeId)).toBe(true);
  });

  it('cada trilha tem vitrine', () => {
    for (const t of ['ele', 'ela', 'kids', 'todos'] as const) {
      expect(productsFor(t).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('histórico tem 30 dias e termina no preço de hoje', () => {
    const p = PRODUCTS[0];
    if (!p) throw new Error('sem produtos');
    const h = priceHistory(p, 350);
    expect(h).toHaveLength(30);
    expect(h.at(-1)).toBe(350);
  });

  it('calcula o desconto só quando há preço "de" maior', () => {
    expect(discountPct({ ...first, price: 400, oldPrice: 500 })).toBe(20);
    expect(discountPct({ ...first, price: 400, oldPrice: undefined })).toBeNull();
  });
});

describe('lista de desejos', () => {
  beforeEach(() => localStorage.clear());

  it('mostra quanto baixou e se chegou no preço desejado', () => {
    expect(wishStatus({ target: 300, savedPrice: 400 }, 350)).toEqual({
      dropped: 50,
      reached: false,
    });
    expect(wishStatus({ target: 300, savedPrice: 400 }, 299.9)).toEqual({
      dropped: 100.1,
      reached: true,
    });
    expect(wishStatus({ target: 300, savedPrice: 400 }, 420)).toEqual({
      dropped: 0,
      reached: false,
    });
  });

  it('a queda simulada termina em ,90 e nunca passa do alvo', () => {
    const p = first;
    localStorage.setItem(
      'cde-desejos',
      JSON.stringify({ wishes: { [p.id]: { target: 359, savedPrice: p.price } }, drops: {} }),
    );
    const r = simulatePriceDrop();
    expect(r?.product.id).toBe(p.id);
    expect(r?.to).toBeLessThanOrEqual(359);
    expect(r?.to).toBe(358.9);
  });
});
