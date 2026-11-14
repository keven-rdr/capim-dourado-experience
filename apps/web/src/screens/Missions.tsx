import { CURRENT_SEASON, DAILY_LIMITS, POINT_RULES, SECRETS } from '@cde/shared';
import { Button, MissionCard, useSeason, WalletBadge } from '@cde/ui';
import { useNavigate } from 'react-router-dom';
import { useGame, useGameQuery } from '../data/GameProvider';
import { Screen, SectionTitle } from '../layout/Screen';
import { HUNT_NOUN } from '../lib/content';

export function Missions() {
  const { profile, today } = useGame();
  const { season } = useSeason();
  const navigate = useNavigate();
  const missions = useGameQuery((api) => api.listMissions());
  const hunt = useGameQuery(
    (api) => api.getHunt(season).catch(() => api.getHunt(CURRENT_SEASON)),
    [season],
  );

  const list = missions.data ?? [];
  const secrets = list.find((m) => m.id === 'm-segredos');
  const weekly = list.filter((m) => m.kind === 'weekly');
  const daily = list.filter((m) => m.kind === 'daily');
  const noun = HUNT_NOUN[season];

  return (
    <Screen
      kicker="o que fazer hoje"
      title="Missões"
      right={profile && <WalletBadge kind="coins" value={profile.wallet.coins} />}
    >
      {hunt.data && (
        <MissionCard
          kind="season"
          size="featured"
          title={hunt.data.hunt.title}
          description={`Caça ao tesouro: ${hunt.data.solved} de ${hunt.data.hunt.clues.length} ${noun.many}. As pistas vão em ordem.`}
          current={hunt.data.solved}
          target={hunt.data.hunt.clues.length}
          reward={{ ...hunt.data.hunt.finalReward, sticker: true }}
          onClick={() => navigate('/caca')}
        />
      )}

      {secrets && (
        <div className="mt-6 grid grid-cols-[1fr_auto] items-stretch gap-3">
          <MissionCard
            kind={secrets.kind}
            title={secrets.title}
            description={`${secrets.description} Há ${SECRETS.length} escondidos em áreas públicas.`}
            current={secrets.current}
            target={secrets.target}
            reward={{ ...secrets.reward, sticker: !!secrets.reward.stickerId }}
          />
        </div>
      )}

      <SectionTitle aside={`+${POINT_RULES.store_visit.xp} XP cada`}>De loja</SectionTitle>
      <MissionCard
        kind="store"
        title="Leia o QR na vitrine"
        description={`Lojas parceiras de exemplo. Até ${DAILY_LIMITS.store_visit} lojas por dia, uma vez cada.`}
        current={today?.storesVisited ?? 0}
        target={DAILY_LIMITS.store_visit}
        reward={{ xp: POINT_RULES.store_visit.xp, coins: POINT_RULES.store_visit.coins }}
        action={
          <Button size="sm" variant="secondary" icon="map" onClick={() => navigate('/mapa')}>
            Ver lojas
          </Button>
        }
      />

      <SectionTitle aside="renova segunda">Da semana</SectionTitle>
      <div className="flex flex-col gap-3">
        {weekly.map((m) => (
          <MissionCard
            key={m.id}
            kind={m.kind}
            size="compact"
            title={m.title}
            current={m.current}
            target={m.target}
            reward={m.reward}
          />
        ))}
      </div>

      <SectionTitle aside="renova à meia-noite">Do dia</SectionTitle>
      <div className="flex flex-col gap-3">
        {daily.map((m) => (
          <MissionCard
            key={m.id}
            kind={m.kind}
            size="compact"
            title={m.title}
            current={m.current}
            target={m.target}
            reward={m.reward}
            onClick={m.completed ? undefined : () => navigate('/checkin')}
          />
        ))}
      </div>
      {missions.error && <p className="mt-4 text-sm">{missions.error.message}</p>}
    </Screen>
  );
}
