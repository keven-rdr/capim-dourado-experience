import { type Clue, type Hunt, type HuntState, POINT_RULES, type SeasonId } from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import { AppError } from '../../shared/errors.js';
import type { GrantItem } from '../points/service.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import type { HuntsRepository } from './repository.js';

export interface SolvedClue {
  clue: Clue;
  state: HuntState;
  /** Recompensas da pista e, na última, a recompensa final da caça. */
  items: GrantItem[];
}

/** Caça ao tesouro com pistas em ordem (RF08, RN05). */
export class HuntsService {
  constructor(
    private readonly hunts: HuntsRepository,
    private readonly users: UsersRepository,
    private readonly clock: Clock,
  ) {}

  async getHunt(userId: string, seasonId: SeasonId): Promise<HuntState> {
    await requireProfile(this.users, userId);
    const hunt = await this.hunts.findBySeason(seasonId);
    if (!hunt) throw new AppError('not_found', 'Não há caça ao tesouro nesta temporada.');
    const progress = await this.hunts.getProgress(userId, hunt.id);
    return toState(hunt, progress.solved);
  }

  findHunt(huntId: string): Promise<Hunt | null> {
    return this.hunts.findById(huntId);
  }

  /** Resolve a pista `order` da caça. Lança `clue_out_of_order` ou `qr_already_used`. */
  async solveClue(userId: string, huntId: string, order: number): Promise<SolvedClue> {
    const hunt = await this.hunts.findById(huntId);
    const clue = hunt?.clues.find((item) => item.order === order);
    if (!hunt || !clue) throw new AppError('qr_invalid');

    const { solved } = await this.hunts.getProgress(userId, huntId);
    if (order <= solved) throw new AppError('qr_already_used', 'Você já resolveu esta pista.');
    if (order !== solved + 1) {
      throw new AppError('clue_out_of_order', undefined, { expected: solved + 1, received: order });
    }

    const lastOrder = Math.max(...hunt.clues.map((item) => item.order));
    const completed = order === lastOrder;
    const advanced = await this.hunts.advance(
      userId,
      huntId,
      solved,
      completed ? this.clock.now().toISOString() : null,
    );
    if (!advanced) throw new AppError('qr_already_used', 'Você já resolveu esta pista.');

    const rule = POINT_RULES.hunt_clue;
    const items: GrantItem[] = [
      {
        action: 'hunt_clue',
        label: `${rule.label} ${order}`,
        reward: { xp: rule.xp, coins: rule.coins, tickets: rule.tickets },
        dedupeKey: `clue:${huntId}:${order}`,
      },
    ];
    if (completed) {
      items.push({
        action: 'hunt_complete',
        label: `Caça concluída: ${hunt.title}`,
        reward: { ...hunt.finalReward },
        dedupeKey: `hunt:${huntId}`,
      });
    }
    return { clue, items, state: toState(hunt, order) };
  }
}

/** O local de cada pista só aparece depois de encontrada. */
function toState(hunt: Hunt, solved: number): HuntState {
  const lastOrder = Math.max(...hunt.clues.map((clue) => clue.order));
  return {
    hunt: {
      ...hunt,
      clues: hunt.clues.map((clue) =>
        clue.order <= solved ? { ...clue } : { ...clue, locationLabel: '' },
      ),
    },
    solved,
    completed: solved >= lastOrder,
  };
}
