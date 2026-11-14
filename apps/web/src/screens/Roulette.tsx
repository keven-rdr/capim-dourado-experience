import { BASE_SPINS, describeGoldenWindow, GOLDEN_SPIN_FACTOR, type SpinResult } from '@cde/shared';
import { Button, Card, RouletteWheel, rotationFor, Sheet, SystemNote, Tag } from '@cde/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendlyError } from '../data/errors';
import { useGame, useGameQuery } from '../data/GameProvider';
import { demoNow } from '../demo/demoStore';
import { Screen, SectionTitle } from '../layout/Screen';
import { createTapCounter } from '../lib/eggs';
import { deadlineLabel } from '../lib/time';
import { useDiscover } from '../lib/useEggs';

const SPIN_MS = 3200;

/** Roda sem texto enquanto a lista de fatias não chegou. */
const PLACEHOLDER = Array.from({ length: 8 }, (_, i) => ({ id: `vazia-${i}`, label: '' }));

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Roleta de cupons. O check-in do dia dá os giros (em dobro na hora dourada).
 * Quem sorteia é a API; esta tela só gira a roda até a fatia que veio e mostra o cupom.
 */
export function Roulette() {
  const { api, notify, refresh } = useGame();
  const navigate = useNavigate();
  const query = useGameQuery((a) => a.getRoulette());
  const [rotation, setRotation] = useState(0);
  const [durationMs, setDurationMs] = useState(SPIN_MS);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // ovo escondido: 3 toques no miolo giram a roda "no vazio" (não gasta giro nem sorteia nada)
  const hubTaps = useMemo(() => createTapCounter(), []);
  const discover = useDiscover();
  function pokeHub() {
    if (spinning || (query.data?.slices.length ?? 0) === 0) return;
    if (hubTaps.tap() < 3) return;
    hubTaps.reset();
    const total = query.data?.slices.length ?? 1;
    const duration = reducedMotion() ? 0 : SPIN_MS;
    setSpinning(true);
    setDurationMs(duration);
    setRotation((current) => rotationFor(current, Math.floor(Math.random() * total), total, 3));
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      notify({ variant: 'info', title: 'Treino', description: 'Pra valer, só com check-in.' });
      discover('roleta');
    }, duration + 150);
  }

  const status = query.data;
  const slices = status?.slices ?? [];
  const left = status?.spinsLeft ?? 0;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    try {
      const outcome = await api.spinRoulette();
      const duration = reducedMotion() ? 0 : SPIN_MS;
      setDurationMs(duration);
      setRotation((current) =>
        rotationFor(current, outcome.sliceIndex, outcome.status.slices.length),
      );
      timer.current = window.setTimeout(async () => {
        setResult(outcome);
        setSpinning(false);
        await refresh();
      }, duration + 150);
    } catch (error) {
      const f = friendlyError(error);
      notify({ variant: 'warning', title: f.title, description: f.message });
      setSpinning(false);
      await refresh();
    }
  }

  const now = demoNow();

  return (
    <Screen kicker="cupons surpresa" title="Roleta" back="/recompensas">
      {status?.goldenNow && (
        <Card tone="gold" tilt="left" className="mb-4 flex items-center gap-3 p-3">
          <Tag tone="ink" icon="sparkle">
            hora dourada
          </Tag>
          <p className="text-sm font-bold">
            {status.checkedIn
              ? status.goldenCheckIn
                ? 'Seu check-in valeu giros em dobro.'
                : 'Seu check-in de hoje foi fora da hora dourada.'
              : 'Faça o check-in agora e ganhe giros em dobro.'}
          </p>
        </Card>
      )}

      <RouletteWheel
        slices={
          slices.length > 0
            ? slices.map((slice) => ({
                id: `${slice.storeName}:${slice.title}`,
                label: slice.label,
              }))
            : PLACEHOLDER
        }
        rotation={rotation}
        durationMs={durationMs}
        onHubPress={pokeHub}
      />

      <div className="mt-5 flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-sm font-bold" aria-live="polite">
          {status
            ? `${left} ${left === 1 ? 'giro disponível' : 'giros disponíveis'}`
            : 'Carregando a roleta...'}
        </p>
        {status && !status.checkedIn ? (
          <>
            <Button size="lg" icon="location" onClick={() => navigate('/checkin')}>
              Fazer check-in
            </Button>
            <p className="text-sm text-ink-soft">Os giros vêm do check-in de hoje.</p>
          </>
        ) : (
          <>
            <Button
              size="lg"
              icon="gift"
              loading={spinning}
              loadingLabel="Girando"
              disabled={left < 1}
              onClick={spin}
            >
              Girar
            </Button>
            {status && left < 1 && (
              <p className="text-sm text-ink-soft">
                Seus giros de hoje acabaram. Os cupons estão em Prêmios.
              </p>
            )}
          </>
        )}
      </div>

      <SectionTitle>Como funciona</SectionTitle>
      <ul className="flex flex-col gap-2 text-sm">
        <li>
          O check-in do dia rende {BASE_SPINS} giro. Na hora dourada, rende{' '}
          {BASE_SPINS * GOLDEN_SPIN_FACTOR}.
        </li>
        <li>
          Cada giro é um cupom de uma loja. Ele vale por {status?.couponValidDays ?? 2} dias e só
          pode ser usado uma vez.
        </li>
        <li>Mostre o código no caixa e a loja dá baixa.</li>
      </ul>

      {status && status.goldenWindows.length > 0 && (
        <>
          <SectionTitle aside="exemplo">Hora dourada</SectionTitle>
          <ul className="flex flex-col gap-1 font-mono text-sm font-bold">
            {status.goldenWindows.map((window) => (
              <li key={`${window.days.join('')}-${window.from}`}>{describeGoldenWindow(window)}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">
            Horários de baixo movimento. Quem faz o check-in neles ganha giros em dobro.
          </p>
        </>
      )}

      <SystemNote className="mt-6">
        o servidor sorteia (RN09) e cada giro vira um cupom de uso único com validade curta (RN07).
        Prêmios, pesos e horários são exemplos.
      </SystemNote>

      <Sheet
        open={!!result}
        onClose={() => setResult(null)}
        title="Você ganhou!"
        description={result ? `${result.redemption.storeName} · cupom de exemplo` : undefined}
        footer={
          <>
            <Button block size="lg" iconRight="arrowRight" onClick={() => navigate('/recompensas')}>
              Ver em Prêmios
            </Button>
            <Button block variant="secondary" onClick={() => setResult(null)}>
              {left > 0 ? 'Girar de novo' : 'Fechar'}
            </Button>
          </>
        }
      >
        {result && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-display text-2xl font-extrabold leading-tight">
              {result.redemption.title}
            </p>
            <p className="w-full rounded-md bg-paper px-3 py-4 font-mono whitespace-nowrap text-2xl font-extrabold tracking-[0.08em] text-on-paper chunk">
              {result.redemption.code}
            </p>
            <p className="font-mono text-sm font-bold">
              {deadlineLabel(result.redemption.expiresAt, now)}
            </p>
            <p className="text-sm text-ink-soft">Uso único. Mostre o código no caixa da loja.</p>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
