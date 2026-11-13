import { type ApiErrorBody, demoQr, type Profile, ROUTES } from '@cde/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { supabaseAuthVerifier } from '../src/infra/supabase/auth.js';
import { INSIDE, OUTSIDE, PROFILE, setup } from './helpers.js';

const json = (body: unknown, user = 'u1') => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-demo-user': user },
  body: JSON.stringify(body),
});
const as = (user = 'u1', method = 'GET') => ({ method, headers: { 'x-demo-user': user } });

function expectErrorBody(body: unknown, code: string) {
  const error = (body as ApiErrorBody).error;
  expect(error.code).toBe(code);
  expect(typeof error.message).toBe('string');
  expect(error.message.length).toBeGreaterThan(0);
}

describe('rotas HTTP', () => {
  it('health não exige autenticação', async () => {
    const { app } = setup();
    const res = await app.request(ROUTES.health.path);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', storage: 'memory', authMode: 'dev' });
  });

  it('rotas /v1 exigem usuário e respondem no formato ApiErrorBody', async () => {
    const { app } = setup();
    const res = await app.request(ROUTES.getMe.path);
    expect(res.status).toBe(401);
    expectErrorBody(await res.json(), 'unauthorized');
    const bad = await app.request(ROUTES.getMe.path, as('com espaço'));
    expect(bad.status).toBe(401);
  });

  it('ciclo do perfil: null, cria, atualiza, apaga', async () => {
    const { app } = setup();
    expect(await (await app.request(ROUTES.getMe.path, as())).json()).toBeNull();

    const created = await app.request(ROUTES.createProfile.path, json(PROFILE));
    expect(created.status).toBe(200);
    const profile = (await created.json()) as Profile;
    expect(profile).toMatchObject({
      id: 'u1',
      name: 'Ana',
      wallet: { xp: 50, coins: 0, tickets: 0 },
    });

    const again = await app.request(ROUTES.createProfile.path, json({ ...PROFILE, name: 'Outra' }));
    expect(((await again.json()) as Profile).wallet.xp).toBe(50);

    const patched = await app.request(ROUTES.updateProfile.path, {
      ...json({ name: 'Bia' }),
      method: 'PATCH',
    });
    expect(((await patched.json()) as Profile).name).toBe('Bia');

    const deleted = await app.request(ROUTES.deleteAccount.path, as('u1', 'DELETE'));
    expect(deleted.status).toBe(204);
    expect(await (await app.request(ROUTES.getMe.path, as())).json()).toBeNull();
    const events = await app.request(ROUTES.listEvents.path, as());
    expect(events.status).toBe(404);
    expectErrorBody(await events.json(), 'profile_not_found');
  });

  it('validação: corpo inválido e JSON malformado', async () => {
    const { app } = setup();
    const invalid = await app.request(ROUTES.createProfile.path, json({ name: '', trail: 'x' }));
    expect(invalid.status).toBe(400);
    const body = (await invalid.json()) as ApiErrorBody;
    expectErrorBody(body, 'validation');
    expect(Array.isArray(body.error.details)).toBe(true);

    const malformed = await app.request(ROUTES.createProfile.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-user': 'u1' },
      body: '{ nada',
    });
    expect(malformed.status).toBe(400);
    expectErrorBody(await malformed.json(), 'validation');

    const query = await app.request(`${ROUTES.listCoupons.path}?trail=xyz`, as());
    expect(query.status).toBe(400);
    const season = await app.request('/v1/album/carnaval', as());
    expect(season.status).toBe(400);
  });

  it('erros de regra viram status e código do contrato', async () => {
    const { app } = setup({ env: { ALLOW_DEMO_QR: 'true' } });
    await app.request(ROUTES.createProfile.path, json(PROFILE));

    const outside = await app.request(ROUTES.checkIn.path, json(OUTSIDE));
    expect(outside.status).toBe(422);
    expectErrorBody(await outside.json(), 'outside_area');

    const ok = await app.request(ROUTES.checkIn.path, json(INSIDE));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toHaveProperty('distanceM');
    const repeated = await app.request(ROUTES.checkIn.path, json(INSIDE));
    expect(repeated.status).toBe(409);
    expectErrorBody(await repeated.json(), 'already_checked_in');

    const clue = await app.request(
      ROUTES.scanQr.path,
      json({ token: demoQr('clue', 'natal-2026:3') }),
    );
    expect(clue.status).toBe(409);
    expectErrorBody(await clue.json(), 'clue_out_of_order');

    const poor = await app.request(ROUTES.redeemCoupon.path, json({ couponId: 'c-pipoca' }));
    expect(poor.status).toBe(422);
    expectErrorBody(await poor.json(), 'insufficient_coins');
  });

  it('fluxo de leitura: hoje, missões, caça, lojas, cupons, álbum, bilhete', async () => {
    const { app } = setup({ env: { ALLOW_DEMO_QR: 'true' } });
    await app.request(ROUTES.createProfile.path, json(PROFILE));
    const today = await (await app.request(ROUTES.getToday.path, as())).json();
    expect(today).toMatchObject({ date: '2026-11-13', dailyOpenDone: false, mallOpen: true });
    const open = await app.request(ROUTES.dailyOpen.path, { ...as('u1', 'POST') });
    expect(await open.json()).toMatchObject({ streakDays: 1 });
    expect(await (await app.request(ROUTES.dailyOpen.path, as('u1', 'POST'))).json()).toBeNull();

    for (const path of [
      ROUTES.listMissions.path,
      '/v1/hunts/natal',
      ROUTES.listStores.path,
      `${ROUTES.listCoupons.path}?trail=kids`,
      ROUTES.listRedemptions.path,
      '/v1/album/natal',
      ROUTES.listEvents.path,
    ]) {
      const res = await app.request(path, as());
      expect(res.status, path).toBe(200);
    }
    const hunt = await app.request('/v1/hunts/pascoa', as());
    expect(hunt.status).toBe(404);
    expectErrorBody(await hunt.json(), 'not_found');

    const ticket = await app.request(ROUTES.buyTicket.path, as('u1', 'POST'));
    expect(ticket.status).toBe(422);
  });

  it('rota desconhecida e CORS', async () => {
    const { app } = setup({ env: { CORS_ORIGIN: 'http://localhost:5173' } });
    const missing = await app.request('/v1/nada', as());
    expect(missing.status).toBe(404);
    expectErrorBody(await missing.json(), 'not_found');

    const preflight = await app.request(ROUTES.checkIn.path, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});

describe('autenticação Supabase', () => {
  const fakeClient = (validToken: string, userId: string) =>
    ({
      auth: {
        getUser: async (token: string) =>
          token === validToken
            ? { data: { user: { id: userId } }, error: null }
            : { data: { user: null }, error: { message: 'invalid' } },
      },
    }) as unknown as SupabaseClient;

  it('aceita Bearer válido e recusa ausente ou inválido', async () => {
    const verifier = supabaseAuthVerifier(fakeClient('jwt-bom', 'uuid-1'));
    await expect(verifier.verify({ authorization: 'Bearer jwt-bom' })).resolves.toBe('uuid-1');
    await expect(verifier.verify({ authorization: 'Bearer jwt-ruim' })).rejects.toMatchObject({
      code: 'unauthorized',
    });
    await expect(verifier.verify({})).rejects.toMatchObject({ code: 'unauthorized' });
    // x-demo-user é ignorado fora do modo dev.
    await expect(verifier.verify({ demoUser: 'u1' })).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});
