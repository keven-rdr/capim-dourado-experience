import { TICKET_COST } from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { REDEMPTION_CODE_PATTERN } from '../src/shared/ids.js';
import { createUser, expectCode, giveCoins, setup } from './helpers.js';

describe('recompensas', () => {
  it('filtra cupons por trilha, sempre com os de "todos"', async () => {
    const { services } = setup();
    const kids = await services.rewards.listCoupons('kids');
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((c) => c.trail === 'kids' || c.trail === 'todos')).toBe(true);
    expect(kids.some((c) => c.trail === 'todos')).toBe(true);
    expect((await services.rewards.listCoupons()).length).toBeGreaterThan(kids.length);
  });

  it('recusa resgate sem saldo', async () => {
    const { services } = setup();
    await createUser(services);
    await expectCode(services.rewards.redeem('u1', { couponId: 'c-pipoca' }), 'insufficient_coins');
    expect(await services.rewards.listRedemptions('u1')).toEqual([]);
  });

  it('debita as moedas e gera código único com validade', async () => {
    const { services, clock } = setup();
    await createUser(services);
    await giveCoins(services, 'u1', 200);
    const { redemption, wallet } = await services.rewards.redeem('u1', { couponId: 'c-pipoca' });

    expect(wallet.coins).toBe(80);
    expect(redemption.code).toMatch(REDEMPTION_CODE_PATTERN);
    expect(redemption.usedAt).toBeNull();
    expect(redemption.redeemedAt).toBe(clock.now().toISOString());
    const days =
      (Date.parse(redemption.expiresAt) - Date.parse(redemption.redeemedAt)) / 86_400_000;
    expect(days).toBe(7);
    expect(await services.rewards.listRedemptions('u1')).toEqual([redemption]);

    const second = await services.rewards.redeem('u1', { couponId: 'c-sorvete' });
    expect(second.redemption.code).not.toBe(redemption.code);
    expect(second.wallet.coins).toBe(20);

    const events = await services.users.listEvents('u1');
    expect(events[0]).toMatchObject({ action: 'coupon_redeem', coins: -60, xp: 0 });
  });

  it('cupom inexistente', async () => {
    const { services } = setup();
    await createUser(services);
    await expectCode(services.rewards.redeem('u1', { couponId: 'nao-existe' }), 'coupon_not_found');
  });
});

describe('bilhetes de sorteio', () => {
  it(`custa ${TICKET_COST} moedas e soma um bilhete`, async () => {
    const { services } = setup();
    await createUser(services);
    await giveCoins(services, 'u1', 100);
    const wallet = await services.raffles.buyTicket('u1');
    expect(wallet).toMatchObject({ coins: 100 - TICKET_COST, tickets: 1 });
    await expectCode(services.raffles.buyTicket('u1'), 'insufficient_coins');
  });
});
