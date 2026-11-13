import {
  DAILY_LIMITS,
  hitStreakMilestone,
  levelFor,
  localDate,
  nextStreak,
  POINT_RULES,
  type PointEvent,
  type PointsResult,
  type Reward,
  type Wallet,
} from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { PointsRepository, PointsState } from './repository.js';

/** Item a creditar. `dedupeKey` garante que o mesmo crédito não entra duas vezes. */
export interface GrantItem {
  action: string;
  label: string;
  reward: Reward;
  dedupeKey: string | null;
}

export interface GrantOutcome {
  result: PointsResult;
  /** Figurinhas das recompensas efetivamente creditadas. */
  stickerIds: string[];
  /** Chaves de idempotência dos itens efetivamente creditados. */
  appliedKeys: Set<string>;
}

export interface GrantOptions {
  /** Atualiza a sequência de dias (padrão: sim). */
  touchStreak?: boolean;
}

/**
 * Regras da carteira: ledger imutável, XP que nunca diminui, teto diário de XP,
 * sequência de dias com baú a cada 7 dias e detecção de subida de nível.
 * Usado pelos services dos outros módulos.
 */
export class PointsService {
  constructor(
    private readonly repo: PointsRepository,
    private readonly clock: Clock,
  ) {}

  today(): string {
    return localDate(this.clock.now());
  }

  async requireState(userId: string): Promise<PointsState> {
    const state = await this.repo.getState(userId);
    if (!state) throw new AppError('profile_not_found');
    return state;
  }

  async hasEvent(userId: string, dedupeKey: string): Promise<boolean> {
    return this.repo.hasEvent(userId, dedupeKey);
  }

  async listEvents(userId: string, limit = 100): Promise<PointEvent[]> {
    await this.requireState(userId);
    return this.repo.listEvents(userId, limit);
  }

  /**
   * Credita uma ou mais recompensas como uma única ação do usuário.
   * O XP de cada item é cortado pelo teto diário; moedas e bilhetes não têm teto aqui.
   */
  async grant(
    userId: string,
    label: string,
    items: GrantItem[],
    options: GrantOptions = {},
  ): Promise<GrantOutcome> {
    const now = this.clock.now();
    const today = localDate(now);
    const state = await this.requireState(userId);
    const before = state.wallet;
    const queue = [...items];

    let streak = state.streak;
    let streakMilestone = false;
    if (options.touchStreak ?? true) {
      const next = nextStreak(streak, today);
      if (next !== streak) {
        await this.repo.saveStreak(userId, next);
        streakMilestone = hitStreakMilestone(streak, next);
        streak = next;
      }
      if (streakMilestone) {
        const chest = POINT_RULES.streak_7;
        queue.push({
          action: 'streak_7',
          label: chest.label,
          reward: { xp: chest.xp, coins: chest.coins, tickets: chest.tickets },
          dedupeKey: `streak_7:${today}`,
        });
      }
    }

    let remainingXp = Math.max(0, DAILY_LIMITS.xp - (await this.repo.xpOnDate(userId, today)));
    let wallet: Wallet = before;
    const total: Reward = { xp: 0, coins: 0, tickets: 0 };
    const stickerIds: string[] = [];
    const appliedKeys = new Set<string>();

    for (const item of queue) {
      const { reward } = item;
      if (reward.xp < 0 || reward.coins < 0 || reward.tickets < 0) {
        throw new Error('Recompensa não pode ser negativa; use spend() para gastos.');
      }
      const xp = Math.min(reward.xp, remainingXp);
      const applied = await this.repo.apply(userId, {
        action: item.action,
        label: item.label,
        xp,
        coins: reward.coins,
        tickets: reward.tickets,
        localDate: today,
        at: now.toISOString(),
        dedupeKey: item.dedupeKey,
      });
      if (!applied) continue;
      remainingXp -= xp;
      wallet = applied.wallet;
      total.xp += xp;
      total.coins += reward.coins;
      total.tickets += reward.tickets;
      if (reward.stickerId) stickerIds.push(reward.stickerId);
      if (item.dedupeKey) appliedKeys.add(item.dedupeKey);
    }

    const firstSticker = stickerIds[0];
    if (firstSticker) total.stickerId = firstSticker;

    return {
      result: {
        reward: total,
        wallet,
        label,
        leveledUp: levelFor(before.xp).id !== levelFor(wallet.xp).id,
        streakDays: streak.days,
        streakMilestone,
      },
      stickerIds,
      appliedKeys,
    };
  }

  /** Debita moedas (e, opcionalmente, credita bilhetes). Lança `insufficient_coins` sem saldo. */
  async spend(
    userId: string,
    action: string,
    label: string,
    cost: { coins: number; tickets?: number },
  ): Promise<Wallet> {
    const state = await this.requireState(userId);
    if (state.wallet.coins < cost.coins) throw new AppError('insufficient_coins');
    const now = this.clock.now();
    const applied = await this.repo.apply(userId, {
      action,
      label,
      xp: 0,
      coins: -cost.coins,
      tickets: cost.tickets ?? 0,
      localDate: localDate(now),
      at: now.toISOString(),
      dedupeKey: null,
    });
    if (!applied) throw new Error('Lançamento sem chave de idempotência não pode ser ignorado.');
    return applied.wallet;
  }
}
