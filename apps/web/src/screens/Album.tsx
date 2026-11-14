import { CURRENT_SEASON, SEASON_INFO, type SeasonId } from '@cde/shared';
import { FilterChips, SEASON_IDS, StickerCard, SystemNote, useSeason } from '@cde/ui';
import { useState } from 'react';
import { useGameQuery } from '../data/GameProvider';
import { Capi3D } from '../layout/Capi3D';
import { Screen } from '../layout/Screen';
import { STICKER_MOTIF, stickerHint } from '../lib/content';

const TILTS = [-2.2, 1.4, -0.6, 2, -1.4, 0.8, 1.8, -1.8, 0.4, -2.4, 1.2, -0.8];

export function Album() {
  const { season: theme } = useSeason();
  const [season, setSeason] = useState<SeasonId>(theme);
  const album = useGameQuery((api) => api.getAlbum(season), [season]);
  const stickers = album.data?.stickers ?? [];
  const owned = stickers.filter((s) => s.owned).length;
  const nextLocked = stickers.find((s) => !s.owned);
  const past = season !== CURRENT_SEASON;
  const nextLine = past
    ? 'Essa temporada volta no ano que vem. Guarda o lugar!'
    : nextLocked && `A próxima, "${nextLocked.name}", sai em: ${stickerHint(nextLocked.id)}.`;

  return (
    <Screen kicker="coleção" title="Álbum" back="/">
      <FilterChips<SeasonId>
        label="Temporada do álbum"
        value={season}
        onChange={setSeason}
        options={SEASON_IDS.map((id) => ({
          value: id,
          label: SEASON_INFO[id].name,
        }))}
      />
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="font-display text-lg font-bold">{SEASON_INFO[season].theme}</p>
          {past && (
            <p className="font-mono text-xs font-bold text-ink-soft">
              temporada fora do calendário atual
            </p>
          )}
        </div>
        <p className="font-mono text-3xl font-extrabold tabular-nums">
          {owned}
          <span className="text-lg text-ink-soft"> de {stickers.length}</span>
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4">
        {stickers.map((s, i) => (
          <StickerCard
            key={s.id}
            name={s.name}
            rarity={s.rarity}
            locked={!s.owned}
            motif={STICKER_MOTIF[s.id] ?? 'star'}
            number={s.id.slice(-2)}
            hint={stickerHint(s.id)}
            tiltDeg={TILTS[i % TILTS.length]}
          />
        ))}
      </div>

      {nextLocked && <Capi3D className="mt-6" size={80} intro="AcenoLeve" say={nextLine} />}
      <SystemNote className="mt-4">
        raras têm brilho; trancadas mostram só a silhueta e onde ganhar.
      </SystemNote>
    </Screen>
  );
}
