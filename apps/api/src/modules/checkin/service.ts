import {
  type CheckInInput,
  type CheckInResult,
  distanceM,
  type LatLng,
  localDate,
  MALL_AREA_APPROX,
  MAX_GPS_ACCURACY_M,
  POINT_RULES,
  type PointsResult,
  pointInPolygon,
  polygonCenter,
  type Reward,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { OpeningHours } from '../../shared/opening-hours.js';
import type { Rewarder } from '../points/rewarder.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import type { CheckinMethod, CheckinRepository } from './repository.js';

/** Fonte da figurinha comum entregue no check-in (implementada pelo álbum). */
export interface CommonStickerSource {
  nextCommonSticker(userId: string): Promise<string | null>;
}

export interface CheckinServiceDeps {
  checkins: CheckinRepository;
  users: UsersRepository;
  rewarder: Rewarder;
  stickers: CommonStickerSource;
  hours: OpeningHours;
  clock: Clock;
  /** Polígono de `MALL_AREA_JSON`; tem prioridade sobre o armazenamento. */
  areaOverride: readonly LatLng[] | null;
}

/** Check-in "Cheguei!" (RF04, RN01, RN02) e o plano B por QR da entrada (RF05). */
export class CheckinService {
  constructor(private readonly deps: CheckinServiceDeps) {}

  async mallArea(): Promise<readonly LatLng[]> {
    if (this.deps.areaOverride) return this.deps.areaOverride;
    return (await this.deps.checkins.getMallArea()) ?? MALL_AREA_APPROX;
  }

  async checkIn(userId: string, input: CheckInInput): Promise<CheckInResult> {
    const profile = await requireProfile(this.deps.users, userId);
    if (!profile.locationConsent) {
      throw new AppError(
        'validation',
        'Autorize o uso da localização no perfil ou use o QR da entrada.',
      );
    }
    if (input.accuracy > MAX_GPS_ACCURACY_M) {
      throw new AppError('low_accuracy', undefined, { maxAccuracyM: MAX_GPS_ACCURACY_M });
    }
    const area = await this.mallArea();
    const point = { lat: input.lat, lng: input.lng };
    const inside = pointInPolygon(point, area);
    const distance = Math.round(distanceM(point, polygonCenter(area)));
    const now = this.deps.clock.now();
    if (!inside) {
      await this.deps.checkins.record({
        userId,
        localDate: localDate(now),
        method: 'gps',
        inside: false,
        at: now.toISOString(),
      });
      throw new AppError('outside_area');
    }
    if (!this.deps.hours.isOpen(now)) throw new AppError('mall_closed');
    const result = await this.register(userId, 'gps');
    return { ...result, distanceM: distance };
  }

  /**
   * Registra a presença válida do dia e credita o check-in.
   * Usado pelo GPS e pelo QR de entrada; o horário já foi conferido por quem chama.
   */
  async register(userId: string, method: CheckinMethod): Promise<PointsResult> {
    const now = this.deps.clock.now();
    const today = localDate(now);
    if (await this.deps.checkins.hasCheckedIn(userId, today)) {
      throw new AppError('already_checked_in');
    }
    const recorded = await this.deps.checkins.record({
      userId,
      localDate: today,
      method,
      inside: true,
      at: now.toISOString(),
    });
    if (!recorded) throw new AppError('already_checked_in');

    const rule = POINT_RULES.checkin;
    const reward: Reward = { xp: rule.xp, coins: rule.coins, tickets: rule.tickets };
    const stickerId = await this.deps.stickers.nextCommonSticker(userId);
    if (stickerId) reward.stickerId = stickerId;
    const outcome = await this.deps.rewarder.reward(userId, rule.label, [
      { action: 'checkin', label: rule.label, reward, dedupeKey: `checkin:${today}` },
    ]);
    return outcome.result;
  }

  hasCheckedIn(userId: string, date: string): Promise<boolean> {
    return this.deps.checkins.hasCheckedIn(userId, date);
  }
}
