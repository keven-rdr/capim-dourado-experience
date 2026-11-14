import { type CheckInResult, MAX_GPS_ACCURACY_M } from '@cde/shared';
import {
  Button,
  Capi,
  CountUp,
  StatusRing,
  type StatusRingState,
  StreakChip,
  SystemNote,
  XpBar,
} from '@cde/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendlyError, isGameApiError } from '../data/errors';
import { useGame, useGameQuery } from '../data/GameProvider';
import { demoNow } from '../demo/demoStore';
import { Capi3D } from '../layout/Capi3D';
import { Screen } from '../layout/Screen';
import { levelInfo, lookOf, stickerName } from '../lib/content';
import { GeoError, getPosition } from '../lib/geo';
import { formatDuration, msUntilLocalMidnight } from '../lib/time';

type Phase =
  | { kind: 'before' }
  | { kind: 'checking' }
  | { kind: 'success'; result: CheckInResult; xpBefore: number; streakBefore: number }
  | { kind: 'outside'; distanceM?: number }
  | { kind: 'gps'; reason: 'imprecise' | 'denied' | 'unavailable' }
  | { kind: 'done' }
  | { kind: 'closed' };

const NOTE: Record<Phase['kind'], string> = {
  before: 'o app só lê a localização quando você toca, com o app aberto.',
  checking:
    'compara um ponto do GPS com a área desenhada do shopping (prédio e estacionamento externo).',
  success: 'guarda só o resultado "dentro", nunca o trajeto. Um check-in por dia (RN01).',
  outside: 'o ponto ficou fora da área; a distância é só para orientar e não é guardada.',
  gps: `precisão acima de ${MAX_GPS_ACCURACY_M} m ou sem permissão: o QR da entrada vale como plano B.`,
  done: 'limite de 1 check-in por dia; a sequência conta dias com atividade.',
  closed: 'check-in e QR valem no horário das lojas (RN02).',
};

export function CheckIn() {
  const { api, profile, today, refresh, celebrate, mode } = useGame();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(() =>
    today?.checkInDone ? { kind: 'done' } : { kind: 'before' },
  );

  async function start() {
    if (!profile) return;
    const xpBefore = profile.wallet.xp;
    const streakBefore = profile.streak.days;
    setPhase({ kind: 'checking' });
    try {
      const [position] = await Promise.all([
        getPosition(mode === 'local'),
        new Promise((r) => setTimeout(r, 600)),
      ]);
      const result = await api.checkIn(position);
      setPhase({ kind: 'success', result, xpBefore, streakBefore });
      celebrate(result);
      await refresh();
    } catch (error) {
      if (error instanceof GeoError) {
        setPhase({ kind: 'gps', reason: error.kind === 'denied' ? 'denied' : 'unavailable' });
        return;
      }
      const code = isGameApiError(error) ? error.code : friendlyError(error).code;
      if (code === 'outside_area') {
        const details = isGameApiError(error)
          ? (error.details as { distanceM?: number } | undefined)
          : undefined;
        setPhase({ kind: 'outside', distanceM: details?.distanceM });
      } else if (code === 'low_accuracy') setPhase({ kind: 'gps', reason: 'imprecise' });
      else if (code === 'already_checked_in') setPhase({ kind: 'done' });
      else if (code === 'mall_closed') setPhase({ kind: 'closed' });
      else setPhase({ kind: 'gps', reason: 'unavailable' });
    }
  }

  const ring: StatusRingState =
    phase.kind === 'checking'
      ? 'busy'
      : phase.kind === 'success'
        ? 'success'
        : phase.kind === 'done'
          ? 'done'
          : phase.kind === 'before'
            ? 'idle'
            : 'warning';

  const look = lookOf(profile?.character);
  const expression =
    phase.kind === 'success'
      ? 'comemorando'
      : phase.kind === 'checking' || phase.kind === 'outside' || phase.kind === 'gps'
        ? 'curiosa'
        : phase.kind === 'done' || phase.kind === 'closed'
          ? 'dormindo'
          : 'animada';

  return (
    <Screen kicker="check-in" title="Cheguei!" back="/">
      <div className="flex flex-col items-center pt-2 text-center">
        <StatusRing state={ring} size={210}>
          {look === 'capi' ? (
            <Capi3D
              size={130}
              intro="AcenoLeve"
              rest={phase.kind === 'done' || phase.kind === 'closed' ? 'Dormindo' : 'Parado'}
              cue={phase.kind === 'success' ? { clip: 'Festa', id: 1 } : null}
              className="mt-6 justify-center"
            />
          ) : (
            <Capi size={150} look={look} expression={expression} className="mt-8" />
          )}
        </StatusRing>

        <div className="mt-6 min-h-40 w-full" aria-live="polite">
          {phase.kind === 'before' && (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Você está no Capim Dourado Shopping?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Toque e a Capi confere. Vale +30 XP e +10 moedas hoje.
              </p>
              <Button size="lg" block icon="location" className="mt-5" onClick={start}>
                Cheguei!
              </Button>
            </>
          )}

          {phase.kind === 'checking' && (
            <>
              <h2 className="font-display text-2xl font-extrabold">Procurando o shopping...</h2>
              <p className="mt-1 text-sm text-ink-soft">Leva só uns segundos.</p>
            </>
          )}

          {phase.kind === 'success' && <Success phase={phase} />}

          {phase.kind === 'outside' && (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Ainda não te vimos por aqui.
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Chegando, é só tocar de novo.</p>
              {phase.distanceM !== undefined && (
                <p className="mt-3 inline-block rounded-sm bg-surface px-3 py-1 font-mono text-sm font-bold chunk-thin">
                  ~
                  {phase.distanceM >= 1000
                    ? `${(phase.distanceM / 1000).toFixed(1).replace('.', ',')} km`
                    : `${phase.distanceM} m`}{' '}
                  do shopping
                </p>
              )}
              <Button
                size="lg"
                block
                variant="secondary"
                icon="refresh"
                className="mt-5"
                onClick={start}
              >
                Tentar de novo
              </Button>
            </>
          )}

          {phase.kind === 'gps' && (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                {phase.reason === 'denied'
                  ? 'Sem localização, sem problema.'
                  : 'O GPS está tímido aqui dentro.'}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {phase.reason === 'denied'
                  ? 'Leia o QR da entrada e o check-in vale do mesmo jeito.'
                  : 'No Subsolo 1 e em alguns cantos o sinal oscila. O QR da entrada resolve.'}
              </p>
              <Button
                size="lg"
                block
                icon="qr"
                className="mt-5"
                onClick={() => navigate('/scanner?modo=entrada')}
              >
                Ler o QR da entrada
              </Button>
              <Button block variant="ghost" className="mt-2" onClick={start}>
                Tentar o GPS de novo
              </Button>
            </>
          )}

          {phase.kind === 'done' && <Done />}

          {phase.kind === 'closed' && (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                O shopping está fechado agora.
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Check-in vale no horário das lojas: seg. a sáb. 10h–22h, dom. 14h–20h.
              </p>
            </>
          )}
        </div>

        <SystemNote className="mt-6 w-full text-left">{NOTE[phase.kind]}</SystemNote>
      </div>
    </Screen>
  );
}

function Success({ phase }: { phase: Extract<Phase, { kind: 'success' }> }) {
  const navigate = useNavigate();
  const roulette = useGameQuery((api) => api.getRoulette());
  const { result, xpBefore } = phase;
  const { level, next, number } = levelInfo(result.wallet.xp);
  const sticker = stickerName(result.reward.stickerId);
  return (
    <>
      <h2 className="font-display text-3xl font-extrabold leading-none">Chegou! Bem na hora.</h2>
      <p className="mt-3 flex justify-center gap-2 font-mono text-xl font-extrabold">
        <span className="rounded-sm bg-accent px-2 py-0.5 text-on-accent chunk-thin">
          <CountUp to={result.reward.xp} prefix="+" suffix=" XP" />
        </span>
        <span className="rounded-sm bg-gold px-2 py-0.5 text-on-gold chunk-thin">
          <CountUp to={result.reward.coins} prefix="+" suffix=" moedas" />
        </span>
      </p>
      {sticker && <p className="mt-2 text-sm font-bold">Figurinha nova no álbum: {sticker}</p>}
      <div className="mt-5 rounded-lg bg-surface p-4 text-left chunk shadow-hard">
        <XpBar
          xp={result.wallet.xp}
          fromXp={xpBefore}
          levelMinXp={level.minXp}
          nextLevelXp={next?.minXp ?? null}
          levelName={level.name}
          levelNumber={number}
          nextLevelName={next?.name}
        />
        <StreakChip days={result.streakDays} className="mt-3" />
      </div>
      {roulette.data && roulette.data.spinsLeft > 0 && (
        <div className="mt-5 rounded-lg bg-gold p-4 text-left text-on-gold chunk shadow-hard">
          <p className="font-mono text-xs font-bold uppercase">
            {roulette.data.goldenCheckIn ? 'hora dourada: giros em dobro' : 'check-in vale giro'}
          </p>
          <p className="font-display text-xl font-extrabold leading-tight">
            Você ganhou {roulette.data.spinsLeft} {roulette.data.spinsLeft === 1 ? 'giro' : 'giros'}{' '}
            na roleta
          </p>
          <Button
            block
            variant="secondary"
            icon="gift"
            className="mt-3"
            onClick={() => navigate('/roleta')}
          >
            Girar a roleta
          </Button>
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => navigate('/missoes')}>
          Missões
        </Button>
        <Button icon="qr" onClick={() => navigate('/caca')}>
          Caçar
        </Button>
      </div>
    </>
  );
}

function Done() {
  const [left, setLeft] = useState(() => msUntilLocalMidnight(demoNow()));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(msUntilLocalMidnight(demoNow())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <h2 className="font-display text-2xl font-extrabold leading-tight">
        Check-in de hoje feito.
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Volte amanhã e mantenha a sequência!</p>
      <p className="mt-4 font-mono text-4xl font-extrabold tabular-nums">{formatDuration(left)}</p>
      <p className="font-mono text-xs text-ink-soft">até o próximo check-in</p>
    </>
  );
}
