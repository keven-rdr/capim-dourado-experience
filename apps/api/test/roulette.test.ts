import {
  BASE_SPINS,
  GOLDEN_SPIN_FACTOR,
  MALL_DESK_ID,
  ROULETTE_COUPON_VALID_DAYS,
  ROULETTE_SLICES,
} from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { buildDeps } from '../src/container.js';
import { createMemoryRepositories } from '../src/infra/index.js';
import { MemoryDb } from '../src/infra/memory/db.js';
import { ManualClock } from '../src/shared/clock.js';
import { cryptoIds, REDEMPTION_CODE_PATTERN } from '../src/shared/ids.js';
import { silentLogger } from '../src/shared/logger.js';
import { createUser, expectCode, OPEN_TIME, setup, TEST_SECRET } from './helpers.js';

/** Quinta-feira, 12/11/2026, 12h em Palmas: aberto, fora da hora dourada. */
const NORMAL = '2026-11-12T15:00:00Z';
/** Terça-feira, 17/11/2026, 15h em Palmas: hora dourada (seg. a qui., 14h às 17h). */
const GOLDEN = '2026-11-17T18:00:00Z';

/** Monta a API com sorteio fixo, para saber qual fatia cai. */
function setupFixed(now: string, random: () => number, env: Record<string, string> = {}) {
  const clock = new ManualClock(now);
  const config = loadConfig({ NODE_ENV: 'test', QR_SECRET: TEST_SECRET, ...env });
  const db = new MemoryDb();
  const deps = buildDeps(config, {
    clock,
    random,
    logger: silentLogger,
    repositories: createMemoryRepositories(cryptoIds, db),
  });
  return { clock, db, config, services: deps.services, app: createApp(deps) };
}

const checkInNow = (services: ReturnType<typeof setup>['services'], userId = 'u1') =>
  services.checkin.register(userId, 'qr');

describe('roleta: giros', () => {
  it('sem check-in não há giro', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    const status = await services.roulette.status('u1');
    expect(status).toMatchObject({ checkedIn: false, spinsGranted: 0, spinsLeft: 0 });
    await expectCode(services.roulette.spin('u1'), 'no_spins');
  });

  it('fora da hora dourada, o check-in rende 1 giro', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    const status = await services.roulette.status('u1');
    expect(status).toMatchObject({
      checkedIn: true,
      goldenCheckIn: false,
      goldenNow: false,
      spinsGranted: BASE_SPINS,
      spinsLeft: BASE_SPINS,
    });
  });

  it('na hora dourada, o check-in rende giros em dobro', async () => {
    const { services } = setupFixed(GOLDEN, () => 0);
    await createUser(services);
    await checkInNow(services);
    const status = await services.roulette.status('u1');
    expect(status).toMatchObject({
      goldenNow: true,
      goldenCheckIn: true,
      spinsGranted: BASE_SPINS * GOLDEN_SPIN_FACTOR,
      spinsLeft: BASE_SPINS * GOLDEN_SPIN_FACTOR,
    });
  });

  it('o que vale é a hora do check-in, não a hora de girar', async () => {
    const { services, clock } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    // depois, já na hora dourada, o dia continua valendo 1 giro
    clock.set('2026-11-12T18:00:00Z');
    const status = await services.roulette.status('u1');
    expect(status).toMatchObject({ goldenNow: true, goldenCheckIn: false, spinsGranted: 1 });
  });

  it('a lista de fatias vem do catálogo, na ordem do desenho', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    const { slices } = await services.roulette.status('u1');
    expect(slices).toHaveLength(ROULETTE_SLICES.length);
    expect(slices[0]).toMatchObject({ index: 0, label: 'Cinemark', title: 'Pipoca média' });
  });
});

describe('roleta: girar', () => {
  it('gasta o giro e entrega um cupom de uso único com validade curta', async () => {
    const { services, clock } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    const result = await services.roulette.spin('u1');

    expect(result.sliceIndex).toBe(0);
    expect(result.redemption).toMatchObject({
      couponId: 'c-pipoca',
      storeName: 'Cinemark',
      usedAt: null,
    });
    expect(result.redemption.code).toMatch(REDEMPTION_CODE_PATTERN);
    const days =
      (Date.parse(result.redemption.expiresAt) - Date.parse(result.redemption.redeemedAt)) /
      86_400_000;
    expect(days).toBe(ROULETTE_COUPON_VALID_DAYS);
    expect(result.redemption.redeemedAt).toBe(clock.now().toISOString());
    expect(result.status).toMatchObject({ spinsUsed: 1, spinsLeft: 0 });

    // o cupom aparece em "Meus cupons", e girar não cobra moedas
    expect(await services.rewards.listRedemptions('u1')).toEqual([result.redemption]);
    const events = await services.users.listEvents('u1');
    expect(events.some((event) => event.action === 'coupon_redeem')).toBe(false);
  });

  it('recusa girar sem giros restantes', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    await services.roulette.spin('u1');
    await expectCode(services.roulette.spin('u1'), 'no_spins');
    expect((await services.rewards.listRedemptions('u1')).length).toBe(1);
  });

  it('na hora dourada dá para girar duas vezes, e a terceira é recusada', async () => {
    const { services } = setupFixed(GOLDEN, () => 0.5);
    await createUser(services);
    await checkInNow(services);
    const first = await services.roulette.spin('u1');
    const second = await services.roulette.spin('u1');
    expect(first.redemption.code).not.toBe(second.redemption.code);
    expect(second.status.spinsLeft).toBe(0);
    await expectCode(services.roulette.spin('u1'), 'no_spins');
  });

  it('o giro volta no dia seguinte, com novo check-in', async () => {
    const { services, clock } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    await services.roulette.spin('u1');
    clock.advanceDays(1);
    await expectCode(services.roulette.spin('u1'), 'no_spins');
    await checkInNow(services);
    await services.roulette.spin('u1');
  });

  it('o sorteio segue o número aleatório injetado', async () => {
    const lastSlice = ROULETTE_SLICES.length - 1;
    const { services } = setupFixed(NORMAL, () => 0.999999);
    await createUser(services);
    await checkInNow(services);
    const result = await services.roulette.spin('u1');
    expect(result.sliceIndex).toBe(lastSlice);
    expect(result.redemption.couponId).toBe(ROULETTE_SLICES[lastSlice]?.couponId);
  });

  it('duas requisições juntas gastam um giro só', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    const results = await Promise.allSettled([
      services.roulette.spin('u1'),
      services.roulette.spin('u1'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await services.rewards.listRedemptions('u1')).length).toBe(1);
  });

  it('exige perfil', async () => {
    const { services } = setupFixed(NORMAL, () => 0);
    await expectCode(services.roulette.spin('ninguem'), 'profile_not_found');
  });
});

describe('painel da loja', () => {
  /** Cria um visitante que já girou e caiu na fatia pedida. */
  async function userWithCoupon(couponSlice: number) {
    // aponta para o meio do intervalo da fatia desejada, em pesos
    const total = ROULETTE_SLICES.reduce((sum, s) => sum + s.weight, 0);
    const before = ROULETTE_SLICES.slice(0, couponSlice).reduce((sum, s) => sum + s.weight, 0);
    const weight = ROULETTE_SLICES[couponSlice]?.weight ?? 0;
    const ctx = setupFixed(NORMAL, () => (before + weight / 2) / total, { ALLOW_DEMO_QR: 'true' });
    await createUser(ctx.services);
    await checkInNow(ctx.services);
    const { redemption } = await ctx.services.roulette.spin('u1');
    return { ...ctx, redemption };
  }

  it('mostra os três números da loja', async () => {
    const { services } = await userWithCoupon(1); // Centauro
    expect(await services.panel.stats('centauro')).toEqual({
      storeId: 'centauro',
      storeName: 'Centauro',
      spinsLanded: 1,
      visits: 0,
      couponsUsed: 0,
    });
    expect(await services.panel.stats('cinemark')).toMatchObject({ spinsLanded: 0 });
  });

  it('dá baixa no cupom da própria loja e conta como usado', async () => {
    const { services, redemption, clock } = await userWithCoupon(1);
    const result = await services.panel.markUsed('centauro', { code: redemption.code });
    expect(result.redemption.usedAt).toBe(clock.now().toISOString());
    expect(result.stats).toMatchObject({ spinsLanded: 1, couponsUsed: 1 });
    // o visitante vê o cupom como usado
    const mine = await services.rewards.listRedemptions('u1');
    expect(mine[0]?.usedAt).toBe(result.redemption.usedAt);
  });

  it('aceita o código em minúsculas e com espaços', async () => {
    const { services, redemption } = await userWithCoupon(1);
    await services.panel.markUsed('centauro', { code: `  ${redemption.code.toLowerCase()} ` });
  });

  it('recusa o segundo uso do mesmo cupom', async () => {
    const { services, redemption } = await userWithCoupon(1);
    await services.panel.markUsed('centauro', { code: redemption.code });
    await expectCode(services.panel.markUsed('centauro', { code: redemption.code }), 'coupon_used');
    expect((await services.panel.stats('centauro')).couponsUsed).toBe(1);
  });

  it('recusa cupom de outra loja, dizendo onde vale', async () => {
    const { services, redemption } = await userWithCoupon(1);
    const error = await expectCode(
      services.panel.markUsed('cinemark', { code: redemption.code }),
      'coupon_wrong_store',
    );
    expect(error.message).toContain('Centauro');
    expect((await services.panel.stats('centauro')).couponsUsed).toBe(0);
  });

  it('recusa cupom vencido', async () => {
    const { services, redemption, clock } = await userWithCoupon(1);
    clock.advanceDays(ROULETTE_COUPON_VALID_DAYS);
    await expectCode(
      services.panel.markUsed('centauro', { code: redemption.code }),
      'coupon_expired',
    );
  });

  it('recusa código que não existe e loja que não existe', async () => {
    const { services } = await userWithCoupon(1);
    await expectCode(
      services.panel.markUsed('centauro', { code: 'CDE-XXXX-YYYY' }),
      'coupon_not_found',
    );
    await expectCode(services.panel.stats('loja-fantasma'), 'not_found');
  });

  it('cupom sem loja (estacionamento) é conferido no balcão do shopping', async () => {
    const { services, redemption } = await userWithCoupon(ROULETTE_SLICES.length - 1);
    expect(redemption.couponId).toBe('c-estac');
    expect(await services.panel.stats(MALL_DESK_ID)).toMatchObject({
      spinsLanded: 1,
      visits: null,
    });
    await expectCode(
      services.panel.markUsed('centauro', { code: redemption.code }),
      'coupon_wrong_store',
    );
    await services.panel.markUsed(MALL_DESK_ID, { code: redemption.code });
  });

  it('conta as visitas por QR na loja', async () => {
    const { services } = await userWithCoupon(1);
    expect((await services.panel.stats('centauro')).visits).toBe(0);
    await services.qr.scan('u1', { token: 'cde:store:centauro' });
    expect((await services.panel.stats('centauro')).visits).toBe(1);
    expect((await services.panel.stats('cinemark')).visits).toBe(0);
  });
});

describe('rotas HTTP', () => {
  const json = { 'content-type': 'application/json' };

  it('GET /v1/roulette e POST /v1/roulette/spin usam o login do visitante', async () => {
    const { app, services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);

    expect((await app.request('/v1/roulette')).status).toBe(401);
    const headers = { 'x-demo-user': 'u1' };
    const status = await app.request('/v1/roulette', { headers });
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ spinsLeft: 1 });

    const spin = await app.request('/v1/roulette/spin', { method: 'POST', headers });
    expect(spin.status).toBe(200);
    expect(await spin.json()).toMatchObject({ sliceIndex: 0 });

    const again = await app.request('/v1/roulette/spin', { method: 'POST', headers });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: 'no_spins' } });
  });

  it('o painel usa a chave da loja, sem login de visitante', async () => {
    const { app, services } = setupFixed(NORMAL, () => 0);
    await createUser(services);
    await checkInNow(services);
    const spin = await app.request('/v1/roulette/spin', {
      method: 'POST',
      headers: { 'x-demo-user': 'u1' },
    });
    const { redemption } = (await spin.json()) as { redemption: { code: string } };

    const url = '/v1/panel/stores/cinemark';
    expect((await app.request(`${url}/stats`)).status).toBe(401);
    expect(
      (await app.request(`${url}/stats`, { headers: { 'x-store-key': 'errada' } })).status,
    ).toBe(403);

    const headers = { 'x-store-key': 'demo' };
    const stats = await app.request(`${url}/stats`, { headers });
    expect(stats.status).toBe(200);
    expect(await stats.json()).toMatchObject({ storeId: 'cinemark', spinsLanded: 1 });

    const bad = await app.request(`${url}/coupons/use`, {
      method: 'POST',
      headers: { ...headers, ...json },
      body: JSON.stringify({ code: 'x' }),
    });
    expect(bad.status).toBe(400);

    const use = await app.request(`${url}/coupons/use`, {
      method: 'POST',
      headers: { ...headers, ...json },
      body: JSON.stringify({ code: redemption.code }),
    });
    expect(use.status).toBe(200);
    expect(await use.json()).toMatchObject({ stats: { couponsUsed: 1 } });

    const twice = await app.request(`${url}/coupons/use`, {
      method: 'POST',
      headers: { ...headers, ...json },
      body: JSON.stringify({ code: redemption.code }),
    });
    expect(twice.status).toBe(409);
    expect(await twice.json()).toMatchObject({ error: { code: 'coupon_used' } });
  });

  it('com STORE_KEYS_JSON, cada loja só abre com a própria chave e a chave demo deixa de valer', async () => {
    const keys = JSON.stringify({ cinemark: 'chave-do-cinemark', centauro: 'chave-da-centauro' });
    const { app } = setup({ env: { STORE_KEYS_JSON: keys } });
    const get = (store: string, key: string) =>
      app.request(`/v1/panel/stores/${store}/stats`, { headers: { 'x-store-key': key } });

    expect((await get('cinemark', 'chave-do-cinemark')).status).toBe(200);
    expect((await get('cinemark', 'chave-da-centauro')).status).toBe(403);
    expect((await get('cinemark', 'demo')).status).toBe(403);
    expect((await get('riachuelo', 'chave-do-cinemark')).status).toBe(403);
  });

  it('sem chaves em produção (Supabase), não existe chave demo e o painel fica desligado', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      QR_SECRET: 'x'.repeat(32),
      CORS_ORIGIN: 'https://app.exemplo',
      SUPABASE_URL: 'https://exemplo.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_exemplo',
    });
    expect(config).toMatchObject({ demoStoreKey: false, storeKeys: {} });
    expect(config.warnings.join(' ')).toContain('STORE_KEYS_JSON');
  });

  it('recusa STORE_KEYS_JSON com chave curta ou formato errado', () => {
    for (const bad of ['não é json', '["a"]', '{"cinemark":"curta"}', '{"cinemark":123}']) {
      expect(() => loadConfig({ STORE_KEYS_JSON: bad })).toThrow(/STORE_KEYS_JSON/);
    }
  });
});

describe('configuração da hora dourada', () => {
  it('lê GOLDEN_HOURS_JSON', () => {
    const windows = [{ days: [6], from: '10:00', to: '12:00' }];
    const config = loadConfig({ GOLDEN_HOURS_JSON: JSON.stringify(windows) });
    expect(config.goldenWindows).toEqual(windows);
  });

  it('recusa janela inválida', () => {
    for (const bad of [
      'não é json',
      '[{"days":[7],"from":"10:00","to":"12:00"}]',
      '[{"days":[1],"from":"10h","to":"12:00"}]',
      '[{"days":[1],"from":"12:00","to":"10:00"}]',
      '{"days":[1]}',
    ]) {
      expect(() => loadConfig({ GOLDEN_HOURS_JSON: bad })).toThrow(/GOLDEN_HOURS_JSON/);
    }
  });

  it('a hora dourada configurada vale no lugar da padrão', async () => {
    const windows = [{ days: [4], from: '12:00', to: '13:00' }];
    const { services } = setup({
      now: NORMAL,
      env: { GOLDEN_HOURS_JSON: JSON.stringify(windows) },
    });
    await createUser(services);
    await services.checkin.register('u1', 'qr');
    expect((await services.roulette.status('u1')).spinsGranted).toBe(2);
  });
});

it('OPEN_TIME continua fora da hora dourada (sexta-feira)', async () => {
  const { services } = setup({ now: OPEN_TIME });
  await createUser(services);
  await services.checkin.register('u1', 'qr');
  expect((await services.roulette.status('u1')).spinsGranted).toBe(1);
});
