import { demoQr, MALL_CENTER, POINT_RULES, TICKET_COST } from '@cde/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameApiError } from './errors';
import { type KeyValueStorage, LocalGameApi, parseDemoToken, weekStart } from './LocalGameApi';

function memory(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const INSIDE = { lat: MALL_CENTER.lat, lng: MALL_CENTER.lng, accuracy: 15 };
const DAY = 86_400_000;

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof GameApiError) return error.code;
    throw error;
  }
  return 'ok';
}

describe('LocalGameApi', () => {
  // sexta, 13/11/2026, 12h em Palmas (shopping aberto)
  let now = new Date('2026-11-13T15:00:00Z');
  let api: LocalGameApi;

  beforeEach(async () => {
    now = new Date('2026-11-13T15:00:00Z');
    api = new LocalGameApi({ storage: memory(), now: () => now });
    await api.createProfile({
      name: 'Marina',
      trail: 'kids',
      character: 'capi',
      locationConsent: true,
    });
  });

  it('dá boas-vindas e pontua a abertura do app uma vez por dia', async () => {
    expect((await api.getMe())?.wallet.xp).toBe(POINT_RULES.welcome.xp);
    const first = await api.dailyOpen();
    expect(first?.reward.xp).toBe(POINT_RULES.daily_open.xp);
    expect(await api.dailyOpen()).toBeNull();
  });

  it('aceita um check-in por dia dentro da área', async () => {
    const result = await api.checkIn(INSIDE);
    expect(result.reward.xp).toBe(POINT_RULES.checkin.xp);
    expect(result.reward.coins).toBe(POINT_RULES.checkin.coins);
    expect((await api.getToday()).checkInDone).toBe(true);
    expect(await codeOf(api.checkIn(INSIDE))).toBe('already_checked_in');
  });

  it('recusa check-in fora da área, com GPS impreciso e com o shopping fechado', async () => {
    expect(await codeOf(api.checkIn({ lat: -10.25, lng: -48.33, accuracy: 10 }))).toBe(
      'outside_area',
    );
    expect(await codeOf(api.checkIn({ ...INSIDE, accuracy: 600 }))).toBe('low_accuracy');
    now = new Date('2026-11-13T11:00:00Z'); // 8h em Palmas
    expect(await codeOf(api.checkIn(INSIDE))).toBe('mall_closed');
  });

  it('ignora o horário no modo demonstração', async () => {
    now = new Date('2026-11-13T11:00:00Z');
    const demo = new LocalGameApi({
      storage: memory(),
      now: () => now,
      ignoreMallHours: () => true,
    });
    await demo.createProfile({
      name: 'Ana',
      trail: 'todos',
      character: 'capi',
      locationConsent: true,
    });
    expect((await demo.checkIn(INSIDE)).reward.xp).toBe(POINT_RULES.checkin.xp);
  });

  it('exige as pistas da caça em ordem', async () => {
    expect(await codeOf(api.scanQr({ token: demoQr('clue', 'natal-2026:2') }))).toBe(
      'clue_out_of_order',
    );
    const first = await api.scanQr({ token: demoQr('clue', 'natal-2026:1') });
    expect(first.kind).toBe('clue');
    expect(first.hunt?.solved).toBe(1);
    expect(first.hunt?.hunt.clues[0]?.locationLabel).toBe('Praça de Eventos central');
    expect(first.hunt?.hunt.clues[1]?.locationLabel).toBe('');
    expect(await codeOf(api.scanQr({ token: demoQr('clue', 'natal-2026:1') }))).toBe(
      'qr_already_used',
    );
    expect((await api.scanQr({ token: demoQr('clue', 'natal-2026:2') })).hunt?.solved).toBe(2);
  });

  it('abre o baú final ao completar a caça', async () => {
    let last = await api.scanQr({ token: demoQr('clue', 'natal-2026:1') });
    for (let order = 2; order <= 5; order++) {
      last = await api.scanQr({ token: demoQr('clue', `natal-2026:${order}`) });
    }
    expect(last.hunt?.completed).toBe(true);
    expect(last.stickerId).toBe('natal-12');
    expect((await api.getAlbum('natal')).stickers.find((s) => s.id === 'natal-12')?.owned).toBe(
      true,
    );
  });

  it('não deixa resgatar sem saldo e informa quanto falta', async () => {
    const error = await api.redeemCoupon({ couponId: 'c-pipoca' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameApiError);
    expect((error as GameApiError).code).toBe('insufficient_coins');
    expect((error as GameApiError).details).toEqual({ missing: 120 });
    expect(await codeOf(api.buyTicket())).toBe('insufficient_coins');
  });

  it('resgate desconta moedas e gera código com validade', async () => {
    api.seedExample(); // 90 moedas
    const { redemption, wallet } = await api.redeemCoupon({ couponId: 'c-sorvete' });
    expect(wallet.coins).toBe(30);
    expect(redemption.code).toMatch(/^CDE-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
    expect(Date.parse(redemption.expiresAt) - Date.parse(redemption.redeemedAt)).toBe(7 * DAY);
    expect(await api.listRedemptions()).toHaveLength(1);
    expect(await codeOf(api.redeemCoupon({ couponId: 'nao-existe' }))).toBe('coupon_not_found');
  });

  it('troca moedas por bilhete', async () => {
    api.seedExample();
    const wallet = await api.buyTicket();
    expect(wallet.coins).toBe(90 - TICKET_COST);
    expect(wallet.tickets).toBe(1);
  });

  it('sobe a sequência em dias seguidos e abre o baú no 7º dia', async () => {
    let result = await api.dailyOpen();
    expect(result?.streakDays).toBe(1);
    for (let day = 2; day <= 7; day++) {
      now = new Date(now.getTime() + DAY);
      result = await api.dailyOpen();
    }
    expect(result?.streakDays).toBe(7);
    expect(result?.streakMilestone).toBe(true);
    expect(result?.reward.tickets).toBe(POINT_RULES.streak_7.tickets);
  });

  it('perdoa um dia perdido e zera depois de dois', async () => {
    await api.dailyOpen();
    now = new Date(now.getTime() + 2 * DAY);
    expect((await api.dailyOpen())?.streakDays).toBe(2);
    now = new Date(now.getTime() + 3 * DAY);
    expect((await api.dailyOpen())?.streakDays).toBe(1);
  });

  it('limita lojas a uma visita por dia e segredos a uma vez', async () => {
    await api.scanQr({ token: demoQr('store', 'leitura') });
    expect(await codeOf(api.scanQr({ token: demoQr('store', 'leitura') }))).toBe('qr_already_used');
    await api.scanQr({ token: demoQr('secret', 's1') });
    expect(await codeOf(api.scanQr({ token: demoQr('secret', 's1') }))).toBe('qr_already_used');
    expect(await codeOf(api.scanQr({ token: 'qualquer-coisa' }))).toBe('qr_invalid');
  });

  it('para no limite de 5 lojas por dia', async () => {
    for (const id of ['renner', 'cea', 'riachuelo', 'marisa', 'centauro']) {
      await api.scanQr({ token: demoQr('store', id) });
    }
    expect(await codeOf(api.scanQr({ token: demoQr('store', 'hering') }))).toBe('daily_limit');
    expect((await api.getToday()).storesVisited).toBe(5);
  });
});

describe('LocalGameApi: roleta e painel da loja', () => {
  /** Quinta, 12/11/2026, 12h em Palmas: aberto e fora da hora dourada. */
  const NORMAL = '2026-11-12T15:00:00Z';
  /** Terça, 17/11/2026, 15h em Palmas: hora dourada. */
  const GOLDEN = '2026-11-17T18:00:00Z';

  /**
   * Monta a API com relógio e sorteio controlados. `pick(x)` enfileira o próximo número do
   * sorteio da fatia; sem fila, o sorteio é aleatório (os códigos dos cupons usam o mesmo sorteio).
   */
  async function make(start: string, options: { golden?: boolean } = {}) {
    let now = new Date(start);
    const queue: number[] = [];
    const api = new LocalGameApi({
      storage: memory(),
      now: () => now,
      random: () => queue.shift() ?? Math.random(),
      forceGolden: () => options.golden ?? false,
    });
    await api.createProfile({
      name: 'Ana',
      trail: 'todos',
      character: 'capi',
      locationConsent: true,
    });
    return {
      api,
      pick: (value: number) => void queue.push(value),
      set: (iso: string) => {
        now = new Date(iso);
      },
    };
  }

  it('sem check-in não há giro', async () => {
    const { api } = await make(NORMAL);
    expect(await api.getRoulette()).toMatchObject({ checkedIn: false, spinsLeft: 0 });
    expect(await codeOf(api.spinRoulette())).toBe('no_spins');
  });

  it('1 giro fora da hora dourada e 2 dentro dela', async () => {
    const normal = await make(NORMAL);
    await normal.api.checkIn(INSIDE);
    expect(await normal.api.getRoulette()).toMatchObject({ spinsGranted: 1, goldenCheckIn: false });

    const golden = await make(GOLDEN);
    await golden.api.checkIn(INSIDE);
    expect(await golden.api.getRoulette()).toMatchObject({
      goldenNow: true,
      goldenCheckIn: true,
      spinsGranted: 2,
    });
  });

  it('a hora dourada forçada na demonstração vale como a real', async () => {
    const { api } = await make(NORMAL, { golden: true });
    await api.checkIn(INSIDE);
    expect(await api.getRoulette()).toMatchObject({ goldenNow: true, spinsGranted: 2 });
  });

  it('o check-in por QR da entrada também dá giros', async () => {
    const { api } = await make(GOLDEN);
    await api.scanQr({ token: demoQr('checkin', 'entrada') });
    expect((await api.getRoulette()).spinsGranted).toBe(2);
  });

  it('gira, entrega um cupom de 2 dias, e para quando os giros acabam', async () => {
    const { api, pick } = await make(NORMAL);
    await api.checkIn(INSIDE);
    pick(0);
    const result = await api.spinRoulette();
    expect(result.sliceIndex).toBe(0);
    expect(result.redemption).toMatchObject({ couponId: 'c-pipoca', usedAt: null });
    const days =
      (Date.parse(result.redemption.expiresAt) - Date.parse(result.redemption.redeemedAt)) / DAY;
    expect(days).toBe(2);
    expect(result.status).toMatchObject({ spinsUsed: 1, spinsLeft: 0 });
    expect(await api.listRedemptions()).toHaveLength(1);
    expect(await codeOf(api.spinRoulette())).toBe('no_spins');
  });

  it('o giro volta no dia seguinte, com novo check-in', async () => {
    const { api, set } = await make(NORMAL);
    await api.checkIn(INSIDE);
    await api.spinRoulette();
    set('2026-11-13T15:00:00Z');
    expect(await codeOf(api.spinRoulette())).toBe('no_spins');
    await api.checkIn(INSIDE);
    expect(await codeOf(api.spinRoulette())).toBe('ok');
  });

  it('o painel dá baixa uma vez, só na loja certa e dentro da validade', async () => {
    // fatia 1 = Centauro (peso 6 depois dos 14 da fatia 0, de um total de 100)
    const { api, set, pick } = await make(NORMAL);
    await api.checkIn(INSIDE);
    pick(0.17);
    const { redemption } = await api.spinRoulette();
    expect(redemption.storeName).toBe('Centauro');

    expect(await api.getStoreStats('centauro')).toMatchObject({ spinsLanded: 1, couponsUsed: 0 });
    expect(await codeOf(api.markCouponUsed('cinemark', { code: redemption.code }))).toBe(
      'coupon_wrong_store',
    );
    expect(await codeOf(api.markCouponUsed('centauro', { code: 'CDE-NADA-NADA' }))).toBe(
      'coupon_not_found',
    );
    expect(await codeOf(api.markCouponUsed('centauro', { code: '' }))).toBe('validation');

    const used = await api.markCouponUsed('centauro', {
      code: ` ${redemption.code.toLowerCase()} `,
    });
    expect(used.redemption.usedAt).not.toBeNull();
    expect(used.stats.couponsUsed).toBe(1);
    expect((await api.listRedemptions())[0]?.usedAt).toBe(used.redemption.usedAt);
    expect(await codeOf(api.markCouponUsed('centauro', { code: redemption.code }))).toBe(
      'coupon_used',
    );

    // outro cupom, só que vencido
    set('2026-11-13T15:00:00Z');
    await api.checkIn(INSIDE);
    pick(0.17);
    const second = await api.spinRoulette();
    set('2026-11-16T15:00:00Z');
    expect(await codeOf(api.markCouponUsed('centauro', { code: second.redemption.code }))).toBe(
      'coupon_expired',
    );
  });

  it('o estacionamento é conferido no balcão do shopping', async () => {
    const { api, pick } = await make(NORMAL);
    await api.checkIn(INSIDE);
    pick(0.999);
    const { redemption } = await api.spinRoulette();
    expect(redemption.couponId).toBe('c-estac');
    expect(await api.getStoreStats('shopping')).toMatchObject({ spinsLanded: 1, visits: null });
    await api.markCouponUsed('shopping', { code: redemption.code });
  });

  it('recusa loja que não existe', async () => {
    const { api } = await make(NORMAL);
    expect(await codeOf(api.getStoreStats('loja-fantasma'))).toBe('not_found');
  });
});

describe('helpers', () => {
  it('lê códigos de demonstração', () => {
    expect(parseDemoToken('cde:clue:natal-2026:3')).toEqual({ kind: 'clue', id: 'natal-2026:3' });
    expect(parseDemoToken('  CDE:SECRET:S2 ')).toEqual({ kind: 'secret', id: 's2' });
    expect(parseDemoToken('cde:outro:x')).toBeNull();
  });
  it('acha a segunda-feira da semana', () => {
    expect(weekStart('2026-11-13')).toBe('2026-11-09');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
  });
});
