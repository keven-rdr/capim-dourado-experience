import { POINT_RULES } from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { CLOSED_TIME, createUser, expectCode, INSIDE, OUTSIDE, setup } from './helpers.js';

describe('check-in por localização', () => {
  it('pontua dentro da área, no horário, e entrega figurinha comum', async () => {
    const { services, db } = setup();
    await createUser(services);
    const result = await services.checkin.checkIn('u1', INSIDE);

    // Check-in (30 XP, 10 moedas) + missão diária "Cheguei!" (30 XP, 10 moedas).
    expect(result.reward.xp).toBe(POINT_RULES.checkin.xp + 30);
    expect(result.reward.coins).toBe(POINT_RULES.checkin.coins + 10);
    expect(result.reward.stickerId).toBe('natal-01');
    expect(result.wallet.xp).toBe(POINT_RULES.welcome.xp + 60);
    expect(result.distanceM).toBeGreaterThanOrEqual(0);
    expect(result.streakDays).toBe(1);

    // Só o resultado é guardado, nunca a coordenada.
    expect(db.checkins).toHaveLength(1);
    expect(Object.keys(db.checkins[0] ?? {}).sort()).toEqual(
      ['at', 'inside', 'localDate', 'method', 'userId'].sort(),
    );
    const album = await services.album.getAlbum('u1', 'natal');
    expect(album.stickers.find((s) => s.id === 'natal-01')?.owned).toBe(true);
  });

  it('recusa fora da área e guarda só o resultado "fora"', async () => {
    const { services, db } = setup();
    await createUser(services);
    await expectCode(services.checkin.checkIn('u1', OUTSIDE), 'outside_area');
    expect(db.checkins).toEqual([expect.objectContaining({ inside: false, method: 'gps' })]);
  });

  it('recusa precisão ruim do GPS', async () => {
    const { services } = setup();
    await createUser(services);
    await expectCode(services.checkin.checkIn('u1', { ...INSIDE, accuracy: 500 }), 'low_accuracy');
  });

  it('recusa com o shopping fechado', async () => {
    const { services } = setup({ now: CLOSED_TIME });
    await createUser(services);
    await expectCode(services.checkin.checkIn('u1', INSIDE), 'mall_closed');
  });

  it('SKIP_OPENING_HOURS=true libera fora do horário (demonstração)', async () => {
    const { services } = setup({ now: CLOSED_TIME, env: { SKIP_OPENING_HOURS: 'true' } });
    await createUser(services);
    await expect(services.checkin.checkIn('u1', INSIDE)).resolves.toBeTruthy();
  });

  it('aceita só um check-in por dia e libera no dia seguinte', async () => {
    const { services, clock } = setup();
    await createUser(services);
    await services.checkin.checkIn('u1', INSIDE);
    await expectCode(services.checkin.checkIn('u1', INSIDE), 'already_checked_in');
    clock.advanceDays(1);
    const next = await services.checkin.checkIn('u1', INSIDE);
    expect(next.streakDays).toBe(2);
  });

  it('exige consentimento de localização', async () => {
    const { services } = setup();
    await createUser(services, 'u1', { locationConsent: false });
    await expectCode(services.checkin.checkIn('u1', INSIDE), 'validation');
  });

  it('usa o polígono de MALL_AREA_JSON quando configurado', async () => {
    const area = [
      { lat: -10.19, lng: -48.31 },
      { lat: -10.19, lng: -48.29 },
      { lat: -10.21, lng: -48.29 },
      { lat: -10.21, lng: -48.31 },
    ];
    const { services } = setup({ env: { MALL_AREA_JSON: JSON.stringify(area) } });
    await createUser(services);
    await expectCode(services.checkin.checkIn('u1', INSIDE), 'outside_area');
    await expect(services.checkin.checkIn('u1', OUTSIDE)).resolves.toBeTruthy();
  });

  it('exige perfil criado', async () => {
    const { services } = setup();
    await expectCode(services.checkin.checkIn('ninguem', INSIDE), 'profile_not_found');
  });
});
