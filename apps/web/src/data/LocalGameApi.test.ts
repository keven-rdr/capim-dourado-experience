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
