import type { SeasonId, Sticker } from '@cde/shared';

export interface AlbumRepository {
  /** Catálogo de figurinhas (leitura pública). */
  listStickers(seasonId: SeasonId): Promise<Sticker[]>;
  listOwned(userId: string): Promise<Set<string>>;
  /** Entrega a figurinha. Devolve `false` se o usuário já a tinha. */
  grant(userId: string, stickerId: string, at: string): Promise<boolean>;
}
