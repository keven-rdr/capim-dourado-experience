import type { GrantItem, GrantOutcome, PointsService } from './service.js';

/** Porta para as missões: devolve as recompensas de missões recém-concluídas. */
export interface MissionRewardSource {
  collect(userId: string, today: string): Promise<GrantItem[]>;
}

/** Porta para o álbum: entrega as figurinhas das recompensas. */
export interface StickerGranter {
  grantStickers(userId: string, stickerIds: string[]): Promise<void>;
}

/**
 * Fluxo comum de toda ação que pontua: credita a ação, as missões concluídas
 * por ela e o baú da sequência, e entrega as figurinhas.
 * As dependências entram por interface (inversão de dependência), sem ciclo entre módulos.
 */
export class Rewarder {
  constructor(
    private readonly points: PointsService,
    private readonly missions: MissionRewardSource,
    private readonly stickers: StickerGranter,
  ) {}

  async reward(userId: string, label: string, items: GrantItem[]): Promise<GrantOutcome> {
    const missionItems = await this.missions.collect(userId, this.points.today());
    const outcome = await this.points.grant(userId, label, [...items, ...missionItems]);
    if (outcome.stickerIds.length > 0) {
      await this.stickers.grantStickers(userId, outcome.stickerIds);
    }
    return outcome;
  }
}
