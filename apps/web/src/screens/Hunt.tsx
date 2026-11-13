import { CURRENT_SEASON, FLOOR_LABEL, type HuntState } from '@cde/shared';
import {
  Button,
  Capi,
  Card,
  Icon,
  PuzzleMap,
  SpeechBubble,
  SystemNote,
  Tag,
  useSeason,
} from '@cde/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, useGameQuery } from '../data/GameProvider';
import { Capi3D } from '../layout/Capi3D';
import { Screen, SectionTitle } from '../layout/Screen';
import { HUNT_NOUN, lookOf, rewardLine, seasonInfo, stickerName } from '../lib/content';

export function Hunt() {
  const { profile } = useGame();
  const { season } = useSeason();
  const navigate = useNavigate();
  const [hintOpen, setHintOpen] = useState(false);
  const query = useGameQuery(
    async (api): Promise<{ state: HuntState; fallback: boolean }> => {
      try {
        return { state: await api.getHunt(season), fallback: false };
      } catch {
        return { state: await api.getHunt(CURRENT_SEASON), fallback: season !== CURRENT_SEASON };
      }
    },
    [season],
  );

  const noun = HUNT_NOUN[season];
  if (!query.data) {
    return (
      <Screen kicker="caça ao tesouro" title="Carregando..." back="/missoes">
        {query.error && <p>{query.error.message}</p>}
      </Screen>
    );
  }
  const { state, fallback } = query.data;
  const { hunt, solved, completed } = state;
  const clue = hunt.clues.find((c) => c.order === solved + 1);
  const look = lookOf(profile?.character);
  const huntLine =
    solved === 0
      ? 'A primeira é fácil. Confia.'
      : `Já foram ${solved}. Faltam ${hunt.clues.length - solved}, bora!`;

  return (
    <Screen kicker={`caça · ${seasonInfo(hunt.seasonId).name}`} title={hunt.title} back="/missoes">
      {fallback && (
        <SystemNote className="mb-4" label="no protótipo">
          só a caça de Natal tem pistas cadastradas no seed; o visual segue a temporada escolhida.
        </SystemNote>
      )}

      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-bold">
          {solved} de {hunt.clues.length} {noun.many}
        </p>
        <p className="font-mono text-xs font-bold text-ink-soft">cada pista: +40 XP · +10 moedas</p>
      </div>
      <PuzzleMap
        className="mt-2"
        total={hunt.clues.length}
        collected={solved}
        labels={hunt.clues.map((c) => c.locationLabel || undefined)}
      />

      {!completed && clue ? (
        <>
          <Card tone="paper" tilt="left" shape="blob" elevation="lg" className="mt-7 p-5">
            <div className="flex items-center justify-between">
              <Tag tone="primary">pista {String(clue.order).padStart(2, '0')}</Tag>
              <span className="flex items-center gap-1 font-mono text-xs font-bold">
                <Icon name="layers" size={16} /> {FLOOR_LABEL[clue.floor]}
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold leading-[1.1]">
              “{clue.riddle}”
            </p>
            {hintOpen ? (
              <p className="mt-4 rounded-sm border-2 border-dashed border-on-paper/40 px-3 py-2 text-sm font-semibold">
                Dica: {clue.hint}
              </p>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon="info"
                className="mt-3 -ml-2"
                onClick={() => setHintOpen(true)}
              >
                Ver dica (grátis no protótipo)
              </Button>
            )}
          </Card>
          <Button size="lg" block icon="qr" className="mt-6" onClick={() => navigate('/scanner')}>
            Achei! Ler o QR
          </Button>
          {look === 'capi' ? (
            <Capi3D className="mt-6" size={90} intro="AcenoLeve" say={huntLine} />
          ) : (
            <div className="mt-6 flex items-end gap-2">
              <Capi size={72} look={look} expression="curiosa" />
              <SpeechBubble className="mb-6 flex-1">{huntLine}</SpeechBubble>
            </div>
          )}
        </>
      ) : (
        <Card tone="gold" tilt="right" className="mt-7 p-5 text-center">
          {look === 'capi' ? (
            <Capi3D size={130} intro="Festa" className="justify-center" />
          ) : (
            <Capi size={120} look={look} expression="comemorando" className="mx-auto" />
          )}
          <h2 className="mt-2 font-display text-3xl font-extrabold leading-none">
            Baú final aberto!
          </h2>
          <p className="mt-2 font-mono text-sm font-bold">{rewardLine(hunt.finalReward)}</p>
          {hunt.finalReward.stickerId && (
            <p className="mt-1 text-sm font-semibold">
              Figurinha rara: {stickerName(hunt.finalReward.stickerId)}
            </p>
          )}
          <Button
            variant="secondary"
            icon="album"
            className="mt-4"
            onClick={() => navigate('/album')}
          >
            Ver no álbum
          </Button>
        </Card>
      )}

      {solved > 0 && (
        <>
          <SectionTitle aside="locais revelados">Já encontrados</SectionTitle>
          <ol className="flex flex-col gap-2">
            {hunt.clues
              .filter((c) => c.order <= solved)
              .map((c) => (
                <li
                  key={c.order}
                  className="flex items-center gap-3 rounded-md bg-surface px-3 py-2 chunk-thin"
                >
                  <span className="grid size-8 place-items-center rounded-sm bg-success text-on-success">
                    <Icon name="check" size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-display font-bold leading-tight">
                      {c.locationLabel}
                    </span>
                    <span className="block text-xs text-ink-soft">{FLOOR_LABEL[c.floor]}</span>
                  </span>
                  <span className="font-mono text-xs font-bold">
                    {String(c.order).padStart(2, '0')}
                  </span>
                </li>
              ))}
          </ol>
        </>
      )}

      <SystemNote className="mt-6">
        as pistas são cumpridas em ordem (RN05); ler um QR fora da vez não pontua e avisa sem
        bronca.
      </SystemNote>
    </Screen>
  );
}
