import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capi, type CapiLook } from './Capi';
import { CountUp } from './CountUp';
import { Icon } from './Icon';
import { usePortalTarget } from './PhoneFrame';
import { PuzzleMap } from './PuzzleMap';
import { type Season, useSeason } from './season';
import { SpeechBubble } from './SpeechBubble';

type Phase = 'shake' | 'open' | 'piece' | 'done';

export interface TreasureRevealProps {
  open: boolean;
  /** Título grande do resultado (ex.: "Presente 3 de 5!"). */
  title: string;
  /** Linha de apoio (ex.: onde estava o QR). */
  subtitle?: string;
  reward: { xp: number; coins: number; tickets?: number };
  /** Quebra-cabeça do mapa. `collected` já inclui a peça nova. */
  puzzle?: { total: number; collected: number; labels?: ReadonlyArray<string | undefined> };
  /** Nome da figurinha ganha, se houver. */
  stickerName?: string;
  capiLook?: CapiLook;
  /** Fala da Capi no final. */
  capiLine?: string;
  /** Botões do final (ex.: "Próxima pista"). */
  actions?: ReactNode;
  onClose: () => void;
}

const COINS = Array.from({ length: 14 }, (_, i) => {
  const angle = (-160 + (140 / 13) * i) * (Math.PI / 180);
  const dist = 90 + ((i * 37) % 60);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, spin: (i % 2 ? 1 : -1) * (180 + i * 20) };
});

/**
 * Revelação do QR: o presente treme, abre, solta moedas, a peça do mapa encaixa e a Capi comemora.
 * Dura cerca de 3 s, pode ser pulada e, com "reduzir movimento", mostra direto o resultado.
 * O recipiente muda com a temporada: presente (Natal), ovo (Páscoa), abóbora (Halloween).
 */
export function TreasureReveal({
  open,
  title,
  subtitle,
  reward,
  puzzle,
  stickerName,
  capiLook,
  capiLine = 'Achou! Bora pra próxima?',
  actions,
  onClose,
}: TreasureRevealProps) {
  const target = usePortalTarget();
  const reduce = useReducedMotion();
  const { season } = useSeason();
  const [phase, setPhase] = useState<Phase>('shake');
  const titleId = useId();
  const hasPuzzle = Boolean(puzzle);

  useEffect(() => {
    if (!open) return;
    if (reduce) {
      setPhase('done');
      return;
    }
    setPhase('shake');
    const timers = [
      window.setTimeout(() => setPhase('open'), 900),
      window.setTimeout(() => setPhase(hasPuzzle ? 'piece' : 'done'), 1750),
      window.setTimeout(() => setPhase('done'), hasPuzzle ? 2700 : 1750),
    ];
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [open, reduce, hasPuzzle]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (phase === 'done') onClose();
        else setPhase('done');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, phase, onClose]);

  if (!target) return null;
  const opened = phase !== 'shake';
  const done = phase === 'done';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-banner text-on-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden="true" className="banner-pattern absolute inset-0 opacity-70" />
          {/* raios de sol atrás do presente */}
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-[30%] size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 [background:repeating-conic-gradient(var(--cde-gold)_0_10deg,transparent_10deg_24deg)]"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 24, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          />

          <div className="relative z-10 flex justify-end p-3 pt-10">
            {!done ? (
              <button
                type="button"
                onClick={() => setPhase('done')}
                className="min-h-11 cursor-pointer rounded-full bg-surface px-4 font-display text-sm font-bold text-ink chunk-thin focus-ring"
              >
                Pular
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="grid size-11 cursor-pointer place-items-center rounded-full bg-surface text-ink chunk-thin focus-ring"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center px-5">
            {/* recipiente + moedas */}
            <div className="relative mt-2 grid h-52 w-full place-items-center">
              <motion.div
                initial={reduce ? false : { scale: 0.3, y: 60 }}
                animate={
                  phase === 'shake'
                    ? { scale: 1, y: 0, rotate: [0, -9, 9, -11, 11, -7, 7, 0] }
                    : done
                      ? { scale: 0.72, y: -6, rotate: 0 }
                      : { scale: 1.06, y: 0, rotate: 0 }
                }
                transition={
                  phase === 'shake'
                    ? { scale: { type: 'spring', stiffness: 300, damping: 15 }, rotate: { duration: 0.6, delay: 0.25 } }
                    : { type: 'spring', stiffness: 260, damping: 18 }
                }
              >
                <Container season={season} opened={opened} reduce={!!reduce} />
              </motion.div>

              {!reduce && phase !== 'shake' &&
                COINS.map((coin, i) => (
                  <motion.span
                    // biome-ignore lint/suspicious/noArrayIndexKey: moedas decorativas
                    key={i}
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 grid size-7 place-items-center rounded-full bg-gold text-on-gold chunk-thin"
                    initial={{ x: -14, y: -14, scale: 0.4, opacity: 0 }}
                    animate={{
                      x: [-14, coin.x - 14, coin.x * 1.15 - 14],
                      y: [-14, coin.y - 14, coin.y + 190],
                      scale: [0.4, 1, 0.9],
                      opacity: [0, 1, 0],
                      rotate: coin.spin,
                    }}
                    transition={{ duration: 1.5, delay: 0.05 + i * 0.025, ease: 'easeOut', times: [0, 0.38, 1] }}
                  >
                    <Icon name="coin" size={16} strokeWidth={2.6} />
                  </motion.span>
                ))}
            </div>

            <motion.div
              className="w-full text-center"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={opened ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
              aria-live="polite"
            >
              <h2 id={titleId} className="font-display text-3xl font-extrabold leading-none">
                {title}
              </h2>
              {subtitle && <p className="mt-1.5 text-sm font-semibold">{subtitle}</p>}
              <p className="mt-3 inline-flex flex-wrap justify-center gap-2 font-mono text-lg font-extrabold">
                <span className="rounded-sm bg-accent px-2 py-0.5 text-on-accent chunk-thin">
                  {opened ? <CountUp to={reward.xp} prefix="+" suffix=" XP" /> : '+0 XP'}
                </span>
                <span className="rounded-sm bg-gold px-2 py-0.5 text-on-gold chunk-thin">
                  {opened ? <CountUp to={reward.coins} prefix="+" suffix=" moedas" /> : '+0 moedas'}
                </span>
                {reward.tickets ? (
                  <span className="rounded-sm bg-primary px-2 py-0.5 text-on-primary chunk-thin">
                    +{reward.tickets} bilhete
                  </span>
                ) : null}
              </p>
              {stickerName && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm font-bold text-ink chunk-thin">
                  <Icon name="sparkle" size={16} /> Figurinha nova: {stickerName}
                </p>
              )}
            </motion.div>

            {puzzle && (phase === 'piece' || done) && (
              <motion.div
                className="mt-4 w-full"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PuzzleMap
                  total={puzzle.total}
                  collected={puzzle.collected}
                  highlight={reduce ? undefined : puzzle.collected - 1}
                  labels={puzzle.labels}
                />
              </motion.div>
            )}

            <div className="flex-1" />

            {done && (
              <motion.div
                className="mb-6 w-full"
                initial={reduce ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <div className="mb-3 flex items-end gap-1">
                  <motion.div
                    initial={reduce ? false : { x: -80, rotate: -20 }}
                    animate={{ x: 0, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                  >
                    <Capi size={96} expression="comemorando" look={capiLook} season={season} />
                  </motion.div>
                  <SpeechBubble className="mb-10 flex-1">{capiLine}</SpeechBubble>
                </div>
                <div className="flex flex-col gap-3">{actions}</div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    target,
  );
}

function Container({ season, opened, reduce }: { season: Season; opened: boolean; reduce: boolean }) {
  const lid = {
    initial: false as const,
    animate: opened ? { y: -110, x: 40, rotate: 38, opacity: reduce ? 0 : [1, 1, 0] } : { y: 0, x: 0, rotate: 0, opacity: 1 },
    transition: { duration: 0.75, ease: 'easeOut' as const },
    style: { transformBox: 'fill-box' as const, transformOrigin: 'center' },
  };
  return (
    <svg viewBox="0 0 160 160" width={176} height={176} aria-hidden="true" className="overflow-visible">
      <g stroke="var(--cde-line)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {opened && (
          <motion.circle
            cx="80"
            cy="70"
            r="20"
            fill="var(--cde-gold)"
            strokeWidth="0"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
        {season === 'natal' && (
          <>
            <rect x="26" y="70" width="108" height="78" rx="6" fill="var(--cde-primary)" />
            <path d="M80 70v78" stroke="var(--cde-gold)" strokeWidth="14" />
            <path d="M80 70v78" fill="none" strokeWidth="3" />
            <motion.g {...lid}>
              <rect x="18" y="50" width="124" height="24" rx="5" fill="var(--cde-primary)" />
              <path d="M80 50v24" stroke="var(--cde-gold)" strokeWidth="14" />
              <path d="M80 50c-16-30-44-22-34-6 6 9 34 6 34 6Zm0 0c16-30 44-22 34-6-6 9-34 6-34 6Z" fill="var(--cde-gold)" />
            </motion.g>
          </>
        )}
        {season === 'pascoa' && (
          <>
            <path d="M28 88c0 36 22 60 52 60s52-24 52-60l-14 8-12-12-13 12-13-12-13 12-13-12-12 12z" fill="var(--cde-secondary)" />
            <path d="M40 120c14-8 26 8 40 0s26-8 40 0" fill="none" stroke="var(--cde-accent)" strokeWidth="8" />
            <motion.g {...lid}>
              <path d="M28 88C28 50 52 12 80 12s52 38 52 76l-14 8-12-12-13 12-13-12-13 12-13-12-12 12z" fill="var(--cde-primary)" />
              <circle cx="64" cy="54" r="7" fill="var(--cde-secondary)" />
              <circle cx="96" cy="44" r="6" fill="var(--cde-accent)" />
            </motion.g>
          </>
        )}
        {season === 'halloween' && (
          <>
            <ellipse cx="80" cy="104" rx="66" ry="46" fill="var(--cde-primary)" />
            <path d="M80 60c-18 12-18 76 0 90M80 60c18 12 18 76 0 90" fill="none" />
            <path d="M50 96l10-12 10 12zM90 96l10-12 10 12zM54 118q26 16 52 0l-8 6-8-6-9 7-9-7-9 7z" fill="var(--cde-line)" />
            <motion.g {...lid}>
              <path d="M52 66c8-10 48-10 56 0-8 6-48 6-56 0Z" fill="var(--cde-primary)" />
              <path d="M78 62c0-14 4-22 14-26" fill="none" stroke="var(--cde-secondary)" strokeWidth="8" />
              <path d="M78 62c0-14 4-22 14-26" fill="none" strokeWidth="3" />
            </motion.g>
          </>
        )}
      </g>
    </svg>
  );
}
