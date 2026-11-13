import {
  DAILY_LIMITS,
  localDate,
  POINT_RULES,
  type QrPayload,
  type Reward,
  type ScanQrInput,
  type ScanResult,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { OpeningHours } from '../../shared/opening-hours.js';
import type { CheckinService } from '../checkin/service.js';
import type { HuntsService } from '../hunts/service.js';
import type { Rewarder } from '../points/rewarder.js';
import type { StoresService } from '../stores/service.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import type { QrRepository } from './repository.js';
import { decodeQr } from './token.js';

export interface QrServiceDeps {
  qr: QrRepository;
  users: UsersRepository;
  stores: StoresService;
  hunts: HuntsService;
  checkin: CheckinService;
  rewarder: Rewarder;
  hours: OpeningHours;
  clock: Clock;
  qrSecret: string;
  allowDemoQr: boolean;
}

const ONCE = 'once';

/** Leitura de QR: entrada (plano B do check-in), lojas, segredos e pistas (RF05, RF06, RF08, RF09). */
export class QrService {
  constructor(private readonly deps: QrServiceDeps) {}

  async scan(userId: string, input: ScanQrInput): Promise<ScanResult> {
    const now = this.deps.clock.now();
    const payload = decodeQr(input.token, {
      secret: this.deps.qrSecret,
      allowDemo: this.deps.allowDemoQr,
      now,
    });
    await requireProfile(this.deps.users, userId);
    if (!this.deps.hours.isOpen(now)) throw new AppError('mall_closed');

    switch (payload.k) {
      case 'checkin':
        return { ...(await this.deps.checkin.register(userId, 'qr')), kind: 'checkin' };
      case 'store':
        return this.scanStore(userId, payload, now);
      case 'secret':
        return this.scanSecret(userId, payload, now);
      case 'clue':
        return this.scanClue(userId, payload, now);
    }
  }

  storesVisitedOn(userId: string, date: string): Promise<number> {
    return this.deps.qr.countScans(userId, 'store', date);
  }

  private async scanStore(userId: string, payload: QrPayload, now: Date): Promise<ScanResult> {
    const store = await this.deps.stores.findById(payload.id);
    if (!store) throw new AppError('qr_invalid', 'Loja não encontrada.');
    const today = localDate(now);
    if (await this.deps.qr.hasScan(userId, 'store', store.id, today)) {
      throw new AppError('qr_already_used', 'Você já visitou esta loja hoje.');
    }
    const visited = await this.deps.qr.countScans(userId, 'store', today);
    if (visited >= DAILY_LIMITS.store_visit) {
      throw new AppError('daily_limit', 'Você já visitou 5 lojas hoje. Volte amanhã.', {
        limit: DAILY_LIMITS.store_visit,
      });
    }
    await this.record(userId, payload, today, today, now, 'Você já visitou esta loja hoje.');
    const rule = POINT_RULES.store_visit;
    const outcome = await this.deps.rewarder.reward(userId, `${rule.label}: ${store.name}`, [
      {
        action: 'store_visit',
        label: `${rule.label}: ${store.name}`,
        reward: { xp: rule.xp, coins: rule.coins, tickets: rule.tickets },
        dedupeKey: `store:${store.id}:${today}`,
      },
    ]);
    return withSticker({ ...outcome.result, kind: 'store', store });
  }

  private async scanSecret(userId: string, payload: QrPayload, now: Date): Promise<ScanResult> {
    const secret = await this.deps.qr.findSecret(payload.id);
    if (!secret) throw new AppError('qr_invalid', 'Segredo não encontrado.');
    const today = localDate(now);
    await this.record(userId, payload, ONCE, today, now, 'Você já encontrou este segredo.');
    const rule = POINT_RULES.secret_found;
    const reward: Reward = { xp: rule.xp, coins: rule.coins, tickets: rule.tickets };
    if (secret.stickerId) reward.stickerId = secret.stickerId;
    const outcome = await this.deps.rewarder.reward(userId, rule.label, [
      { action: 'secret_found', label: rule.label, reward, dedupeKey: `secret:${secret.id}` },
    ]);
    return withSticker({ ...outcome.result, kind: 'secret' });
  }

  private async scanClue(userId: string, payload: QrPayload, now: Date): Promise<ScanResult> {
    const separator = payload.id.lastIndexOf(':');
    const huntId = payload.id.slice(0, separator);
    const order = Number(payload.id.slice(separator + 1));
    if (separator <= 0 || !Number.isInteger(order) || order < 1) {
      throw new AppError('qr_invalid');
    }
    const solved = await this.deps.hunts.solveClue(userId, huntId, order);
    const today = localDate(now);
    await this.deps.qr.recordScan({
      userId,
      kind: 'clue',
      refId: payload.id,
      scopeKey: ONCE,
      localDate: today,
      at: now.toISOString(),
    });
    const label = solved.state.completed
      ? `Caça concluída: ${solved.state.hunt.title}`
      : `Pista ${order} de ${solved.state.hunt.clues.length}`;
    const outcome = await this.deps.rewarder.reward(userId, label, solved.items);
    return withSticker({ ...outcome.result, kind: 'clue', hunt: solved.state });
  }

  private async record(
    userId: string,
    payload: QrPayload,
    scopeKey: string,
    today: string,
    now: Date,
    duplicateMessage: string,
  ): Promise<void> {
    const recorded = await this.deps.qr.recordScan({
      userId,
      kind: payload.k,
      refId: payload.id,
      scopeKey,
      localDate: today,
      at: now.toISOString(),
    });
    if (!recorded) throw new AppError('qr_already_used', duplicateMessage);
  }
}

function withSticker(result: ScanResult): ScanResult {
  return result.reward.stickerId ? { ...result, stickerId: result.reward.stickerId } : result;
}
