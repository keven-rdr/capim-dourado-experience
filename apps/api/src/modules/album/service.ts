import { type AlbumState, COMMON_STICKER_POOL, CURRENT_SEASON, type SeasonId } from '@cde/shared';
import type { Clock } from '../../shared/clock.js';
import type { CommonStickerSource } from '../checkin/service.js';
import type { StickerGranter } from '../points/rewarder.js';
import type { UsersRepository } from '../users/repository.js';
import { requireProfile } from '../users/service.js';
import type { AlbumRepository } from './repository.js';

/** Álbum de figurinhas por temporada (RF14). */
export class AlbumService implements StickerGranter, CommonStickerSource {
  constructor(
    private readonly album: AlbumRepository,
    private readonly users: UsersRepository,
    private readonly clock: Clock,
    private readonly season: SeasonId = CURRENT_SEASON,
  ) {}

  async getAlbum(userId: string, seasonId: SeasonId): Promise<AlbumState> {
    await requireProfile(this.users, userId);
    const [stickers, owned] = await Promise.all([
      this.album.listStickers(seasonId),
      this.album.listOwned(userId),
    ]);
    return {
      seasonId,
      stickers: stickers.map((sticker) => ({ ...sticker, owned: owned.has(sticker.id) })),
    };
  }

  async grantStickers(userId: string, stickerIds: string[]): Promise<void> {
    const at = this.clock.now().toISOString();
    for (const id of new Set(stickerIds)) await this.album.grant(userId, id, at);
  }

  /** Rodízio simples: a primeira figurinha comum da temporada que o usuário ainda não tem. */
  async nextCommonSticker(userId: string): Promise<string | null> {
    const owned = await this.album.listOwned(userId);
    return COMMON_STICKER_POOL[this.season].find((id) => !owned.has(id)) ?? null;
  }
}
