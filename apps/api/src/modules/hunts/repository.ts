import type { Hunt, SeasonId } from '@cde/shared';

export interface HuntProgress {
  /** Quantidade de pistas resolvidas, em ordem. */
  solved: number;
  completedAt: string | null;
}

export interface HuntsRepository {
  findById(huntId: string): Promise<Hunt | null>;
  findBySeason(seasonId: SeasonId): Promise<Hunt | null>;
  getProgress(userId: string, huntId: string): Promise<HuntProgress>;
  /**
   * Avança uma pista se o progresso ainda for `from` (compare-and-set).
   * Devolve `false` se outra leitura já mudou o progresso.
   */
  advance(
    userId: string,
    huntId: string,
    from: number,
    completedAt: string | null,
  ): Promise<boolean>;
}
