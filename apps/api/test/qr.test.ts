import { demoQr, POINT_RULES, STORES } from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { decodeQr, parseDuration, signQr } from '../src/modules/qr/token.js';
import { CLOSED_TIME, createUser, expectCode, INSIDE, setup, TEST_SECRET } from './helpers.js';

const DEMO = { ALLOW_DEMO_QR: 'true' };

describe('token assinado', () => {
  const now = new Date('2026-11-13T15:00:00Z');

  it('ida e volta com o mesmo segredo', () => {
    const token = signQr({ k: 'secret', id: 's1' }, TEST_SECRET);
    expect(token).toMatch(/^cde1\.[\w-]+\.[\w-]{43}$/);
    expect(decodeQr(token, { secret: TEST_SECRET, allowDemo: false, now })).toEqual({
      k: 'secret',
      id: 's1',
    });
  });

  it('recusa assinatura de outro segredo e payload adulterado', () => {
    const forged = signQr({ k: 'secret', id: 's1' }, 'outro-segredo-qualquer-123');
    expect(() => decodeQr(forged, { secret: TEST_SECRET, allowDemo: false, now })).toThrow(
      expect.objectContaining({ code: 'qr_invalid' }),
    );
    const [version, , signature] = signQr({ k: 'secret', id: 's1' }, TEST_SECRET).split('.');
    const tampered = `${version}.${Buffer.from('{"k":"secret","id":"s2"}').toString('base64url')}.${signature}`;
    expect(() => decodeQr(tampered, { secret: TEST_SECRET, allowDemo: false, now })).toThrow(
      expect.objectContaining({ code: 'qr_invalid' }),
    );
    expect(() => decodeQr('lixo', { secret: TEST_SECRET, allowDemo: false, now })).toThrow(
      expect.objectContaining({ code: 'qr_invalid' }),
    );
  });

  it('recusa token expirado', () => {
    const exp = Math.floor(now.getTime() / 1000) - 1;
    const token = signQr({ k: 'secret', id: 's1', exp }, TEST_SECRET);
    expect(() => decodeQr(token, { secret: TEST_SECRET, allowDemo: false, now })).toThrow(
      expect.objectContaining({ code: 'qr_expired' }),
    );
  });

  it('código de demonstração só com ALLOW_DEMO_QR', () => {
    const options = { secret: TEST_SECRET, now };
    expect(() => decodeQr('cde:secret:s1', { ...options, allowDemo: false })).toThrow(
      expect.objectContaining({ code: 'qr_invalid' }),
    );
    expect(decodeQr('cde:clue:natal-2026:3', { ...options, allowDemo: true })).toEqual({
      k: 'clue',
      id: 'natal-2026:3',
    });
    expect(() => decodeQr('cde:foo:1', { ...options, allowDemo: true })).toThrow(
      expect.objectContaining({ code: 'qr_invalid' }),
    );
  });

  it('converte durações', () => {
    expect(parseDuration('30d')).toBe(30 * 86_400);
    expect(parseDuration('12h')).toBe(43_200);
    expect(parseDuration('90m')).toBe(5_400);
    expect(parseDuration('15')).toBe(15);
    expect(() => parseDuration('amanhã')).toThrow();
  });
});

describe('leitura de QR', () => {
  it('segredo assinado pontua uma vez e entrega figurinha', async () => {
    const { services } = setup();
    await createUser(services);
    const token = signQr({ k: 'secret', id: 's1' }, TEST_SECRET);
    const result = await services.qr.scan('u1', { token });
    expect(result.kind).toBe('secret');
    expect(result.reward.xp).toBe(POINT_RULES.secret_found.xp);
    expect(result.stickerId).toBe('natal-07');
    await expectCode(services.qr.scan('u1', { token }), 'qr_already_used');
  });

  it('recusa assinatura inválida e QR expirado na rota de serviço', async () => {
    const { services } = setup();
    await createUser(services);
    const forged = signQr({ k: 'secret', id: 's1' }, 'segredo-errado-0123456789');
    await expectCode(services.qr.scan('u1', { token: forged }), 'qr_invalid');
    const expired = signQr({ k: 'secret', id: 's1', exp: 1_700_000_000 }, TEST_SECRET);
    await expectCode(services.qr.scan('u1', { token: expired }), 'qr_expired');
  });

  it('recusa demo sem ALLOW_DEMO_QR e id desconhecido', async () => {
    const { services } = setup();
    await createUser(services);
    await expectCode(services.qr.scan('u1', { token: demoQr('secret', 's1') }), 'qr_invalid');
    const unknown = signQr({ k: 'store', id: 'nao-existe' }, TEST_SECRET);
    await expectCode(services.qr.scan('u1', { token: unknown }), 'qr_invalid');
  });

  it('recusa com o shopping fechado', async () => {
    const { services } = setup({ now: CLOSED_TIME, env: DEMO });
    await createUser(services);
    await expectCode(services.qr.scan('u1', { token: demoQr('secret', 's1') }), 'mall_closed');
  });

  it('lojas: uma vez por loja por dia e no máximo 5 por dia', async () => {
    const { services, clock } = setup({ env: DEMO });
    await createUser(services);
    const stores = STORES.slice(0, 6);
    for (const store of stores.slice(0, 5)) {
      const result = await services.qr.scan('u1', { token: demoQr('store', store.id) });
      expect(result.kind).toBe('store');
      expect(result.store?.id).toBe(store.id);
    }
    await expectCode(
      services.qr.scan('u1', { token: demoQr('store', stores[0]?.id ?? '') }),
      'qr_already_used',
    );
    await expectCode(
      services.qr.scan('u1', { token: demoQr('store', stores[5]?.id ?? '') }),
      'daily_limit',
    );
    expect((await services.users.getToday('u1')).storesVisited).toBe(5);

    clock.advanceDays(1);
    await expect(
      services.qr.scan('u1', { token: demoQr('store', stores[5]?.id ?? '') }),
    ).resolves.toBeTruthy();
  });

  it('pistas fora de ordem são recusadas', async () => {
    const { services } = setup({ env: DEMO });
    await createUser(services);
    const error = await expectCode(
      services.qr.scan('u1', { token: demoQr('clue', 'natal-2026:2') }),
      'clue_out_of_order',
    );
    expect(error.details).toEqual({ expected: 1, received: 2 });
  });

  it('concluir a caça credita a recompensa final e a figurinha uma vez', async () => {
    const { services } = setup({ env: DEMO });
    await createUser(services);
    let last: Awaited<ReturnType<typeof services.qr.scan>> | undefined;
    for (let order = 1; order <= 5; order++) {
      last = await services.qr.scan('u1', { token: demoQr('clue', `natal-2026:${order}`) });
      expect(last.hunt?.solved).toBe(order);
    }
    expect(last?.hunt?.completed).toBe(true);
    expect(last?.stickerId).toBe('natal-12');
    expect(last?.wallet.tickets).toBe(1);
    expect(last?.hunt?.hunt.clues.every((clue) => clue.locationLabel !== '')).toBe(true);

    await expectCode(
      services.qr.scan('u1', { token: demoQr('clue', 'natal-2026:5') }),
      'qr_already_used',
    );
    const hunt = await services.hunts.getHunt('u1', 'natal');
    expect(hunt).toMatchObject({ solved: 5, completed: true });
    const album = await services.album.getAlbum('u1', 'natal');
    expect(album.stickers.find((s) => s.id === 'natal-12')?.owned).toBe(true);

    const events = await services.users.listEvents('u1');
    expect(events.filter((e) => e.action === 'hunt_complete')).toHaveLength(1);
    const missions = await services.missions.listMissions('u1');
    expect(missions.find((m) => m.id === 'm-natal')).toMatchObject({ current: 5, completed: true });
    // A missão espelho da caça não paga a recompensa de novo.
    expect(
      events.some((e) => e.label.includes('A Fábrica de Presentes') && e.action === 'mission'),
    ).toBe(false);
  });

  it('caça mostra o local só das pistas encontradas', async () => {
    const { services } = setup({ env: DEMO });
    await createUser(services);
    await services.qr.scan('u1', { token: demoQr('clue', 'natal-2026:1') });
    const state = await services.hunts.getHunt('u1', 'natal');
    expect(state.hunt.clues[0]?.locationLabel).not.toBe('');
    expect(state.hunt.clues[1]?.locationLabel).toBe('');
  });

  it('QR de entrada é o plano B do check-in, com a mesma regra de um por dia', async () => {
    const { services } = setup({ env: DEMO });
    await createUser(services, 'u1', { locationConsent: false });
    const result = await services.qr.scan('u1', { token: demoQr('checkin', 'entrada-norte') });
    expect(result.kind).toBe('checkin');
    expect(result.reward.coins).toBeGreaterThan(0);
    await expectCode(
      services.qr.scan('u1', { token: demoQr('checkin', 'entrada-sul') }),
      'already_checked_in',
    );
    await services.users.updateProfile('u1', { locationConsent: true });
    await expectCode(services.checkin.checkIn('u1', INSIDE), 'already_checked_in');
  });
});
