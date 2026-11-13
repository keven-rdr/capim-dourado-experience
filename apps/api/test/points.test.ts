import { DAILY_LIMITS, demoQr, POINT_RULES, STORES } from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { createUser, giveCoins, INSIDE, setup } from './helpers.js';

describe('primeiro acesso do dia e sequência', () => {
  it('pontua uma vez por dia; repetido devolve null', async () => {
    const { services } = setup();
    await createUser(services);
    const first = await services.users.dailyOpen('u1');
    expect(first?.reward).toMatchObject({ xp: POINT_RULES.daily_open.xp, coins: 2 });
    expect(await services.users.dailyOpen('u1')).toBeNull();
    expect((await services.users.getToday('u1')).dailyOpenDone).toBe(true);
  });

  it('abre o baú no 7º dia seguido', async () => {
    const { services, clock } = setup();
    await createUser(services);
    const results = [];
    for (let day = 1; day <= 7; day++) {
      results.push(await services.users.dailyOpen('u1'));
      clock.advanceDays(1);
    }
    expect(results.map((r) => r?.streakDays)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(results.slice(0, 6).every((r) => r?.streakMilestone === false)).toBe(true);
    const seventh = results[6];
    expect(seventh?.streakMilestone).toBe(true);
    const chest = POINT_RULES.streak_7;
    expect(seventh?.reward).toMatchObject({
      xp: POINT_RULES.daily_open.xp + chest.xp,
      coins: POINT_RULES.daily_open.coins + chest.coins,
      tickets: chest.tickets,
    });
    const events = await services.users.listEvents('u1');
    expect(events.filter((e) => e.action === 'streak_7')).toHaveLength(1);
  });

  it('perdoa um dia perdido com a folga', async () => {
    const { services, clock } = setup();
    await createUser(services);
    await services.users.dailyOpen('u1');
    clock.advanceDays(2);
    expect((await services.users.dailyOpen('u1'))?.streakDays).toBe(2);
    clock.advanceDays(2);
    expect((await services.users.dailyOpen('u1'))?.streakDays).toBe(1);
  });
});

describe('carteira', () => {
  it(`respeita o teto diário de ${DAILY_LIMITS.xp} XP e volta no dia seguinte`, async () => {
    const { services, clock } = setup();
    await createUser(services);
    const big = { xp: 300, coins: 5, tickets: 0 };
    await services.points.grant('u1', 'a', [
      { action: 'x', label: 'x', reward: big, dedupeKey: null },
    ]);
    const capped = await services.points.grant('u1', 'b', [
      { action: 'x', label: 'x', reward: big, dedupeKey: null },
    ]);
    expect(capped.result.reward.xp).toBe(DAILY_LIMITS.xp - POINT_RULES.welcome.xp - 300);
    expect(capped.result.reward.coins).toBe(5);
    expect(capped.result.wallet.xp).toBe(DAILY_LIMITS.xp);
    const none = await services.points.grant('u1', 'c', [
      { action: 'x', label: 'x', reward: big, dedupeKey: null },
    ]);
    expect(none.result.reward.xp).toBe(0);
    expect(none.result.wallet.xp).toBe(DAILY_LIMITS.xp);

    clock.advanceDays(1);
    const next = await services.points.grant('u1', 'd', [
      { action: 'x', label: 'x', reward: big, dedupeKey: null },
    ]);
    expect(next.result.reward.xp).toBe(300);
  });

  it('XP nunca diminui ao gastar moedas, e todo lançamento entra no ledger', async () => {
    const { services } = setup();
    await createUser(services);
    await giveCoins(services, 'u1', 100);
    const before = (await services.users.getMe('u1'))?.wallet.xp;
    await services.raffles.buyTicket('u1');
    const after = await services.users.getMe('u1');
    expect(after?.wallet.xp).toBe(before);
    const events = await services.users.listEvents('u1');
    expect(events.map((e) => e.action)).toEqual(['raffle_ticket', 'test', 'welcome']);
    const sum = events.reduce((acc, e) => acc + e.coins, 0);
    expect(sum).toBe(after?.wallet.coins);
  });

  it('marca leveledUp ao cruzar um nível', async () => {
    const { services } = setup();
    await createUser(services);
    const reward = { xp: 260, coins: 0, tickets: 0 };
    const outcome = await services.points.grant('u1', 'x', [
      { action: 'x', label: 'x', reward, dedupeKey: null },
    ]);
    expect(outcome.result.leveledUp).toBe(true);
    expect(outcome.result.wallet.xp).toBe(310);
  });

  it('não repete crédito com a mesma chave de idempotência', async () => {
    const { services } = setup();
    await createUser(services);
    const item = {
      action: 'x',
      label: 'x',
      reward: { xp: 1, coins: 1, tickets: 0 },
      dedupeKey: 'k',
    };
    await services.points.grant('u1', 'x', [item]);
    const again = await services.points.grant('u1', 'x', [item]);
    expect(again.result.reward).toMatchObject({ xp: 0, coins: 0 });
  });
});

describe('missões', () => {
  it('progresso derivado dos eventos e recompensa creditada uma vez', async () => {
    const { services } = setup({ env: { ALLOW_DEMO_QR: 'true' } });
    await createUser(services);
    await services.checkin.checkIn('u1', INSIDE);
    for (const store of STORES.slice(0, 5)) {
      await services.qr.scan('u1', { token: demoQr('store', store.id) });
    }
    const missions = await services.missions.listMissions('u1');
    expect(missions.find((m) => m.id === 'm-checkin')).toMatchObject({
      current: 1,
      completed: true,
    });
    expect(missions.find((m) => m.id === 'm-lojas')).toMatchObject({ current: 5, completed: true });
    expect(missions.find((m) => m.id === 'm-segredos')).toMatchObject({
      current: 0,
      completed: false,
    });
    const events = await services.users.listEvents('u1');
    const credited = events.filter((e) => e.action === 'mission').map((e) => e.label);
    expect(credited).toEqual(['Missão concluída: Maratona de lojas', 'Missão concluída: Cheguei!']);
  });

  it('sobe pra comer: QR no térreo e na Praça de Alimentação', async () => {
    const { services } = setup({ env: { ALLOW_DEMO_QR: 'true' } });
    await createUser(services);
    await services.qr.scan('u1', { token: demoQr('store', 'renner') });
    let mission = (await services.missions.listMissions('u1')).find((m) => m.id === 'm-sobe');
    expect(mission?.current).toBe(1);
    await services.qr.scan('u1', { token: demoQr('store', 'mcdonalds') });
    mission = (await services.missions.listMissions('u1')).find((m) => m.id === 'm-sobe');
    expect(mission).toMatchObject({ current: 2, completed: true });
  });
});
