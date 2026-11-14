import { Capi, type Season, SpeechBubble, usePortalTarget, useSeason } from '@cde/ui';
import { motion, useReducedMotion } from 'motion/react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Animações que existem em public/models/capi.glb (nomes gravados no arquivo). */
export type CapiClip =
  | 'Parado'
  | 'Acenar'
  | 'AcenoLeve'
  | 'Festa'
  | 'Comemorar'
  | 'Emburrado'
  | 'Dormindo'
  | 'Espreguica'
  | 'Triste'
  | 'Gritando'
  | 'Acordar';

type Mood = 'normal' | 'emburrado' | 'dormindo';

/** Roupa da Capi em cada tema. 10 toques seguidos irritam a Capi e trocam o tema. */
const MODEL_BY_SEASON: Record<Season, string> = {
  natal: '/models/capi-natal.glb',
  pascoa: '/models/capi.glb',
  halloween: '/models/capi-bf.glb',
};
const RAGE_TAPS = 10;
const RAGE_RESET_MS = 3000;
const RAGE_LINES: Record<number, string> = {
  3: 'Ei!',
  5: 'Para com isso!',
  7: 'Tô ficando bravo...',
  9: 'Última chance!',
};
const GRUMPY_AFTER_MS = 30_000;
const SLEEP_AFTER_MS = 60_000;
const TAP_CLIPS: Array<[CapiClip, number]> = [
  ['Festa', 1],
  ['Comemorar', 1],
  ['Acenar', 4],
];
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

interface ModelViewerElement extends HTMLElement {
  animationName: string | undefined;
  timeScale: number;
  play(options?: { repetitions?: number }): void;
  pause(): void;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt: string;
        'camera-orbit'?: string;
        'disable-zoom'?: boolean;
        'disable-pan'?: boolean;
        'disable-tap'?: boolean;
        'interaction-prompt'?: string;
        'shadow-intensity'?: string;
        'animation-crossfade-duration'?: string;
        'animation-name'?: string;
        autoplay?: boolean;
      };
    }
  }
}

export interface Capi3DProps {
  /** Largura em px. A altura acompanha. */
  size?: number;
  /** Animação tocada uma vez quando o modelo carrega. `null`: começa direto no repouso. */
  intro?: CapiClip | null;
  /** Animação em loop entre um gesto e outro. Padrão: Parado. */
  rest?: CapiClip;
  /** Gesto disparado de fora (ex.: comemorar um QR). Toca de novo a cada `id` novo. */
  cue?: CapiCue | null;
  /** Fala da Capi. Sem valor, não mostra balão (a não ser emburrada ou dormindo). */
  say?: string;
  /** Lado da Capi em relação ao balão, de onde sai o rabinho. Use `right` se ela estiver à direita. */
  bubbleFrom?: 'left' | 'right';
  /** Fica emburrada após 30 s sem toque e dorme após 1 min. Acorda com qualquer toque. */
  idleReactions?: boolean;
  /** Chamado quando tocam na Capi (além do gesto aleatório). */
  onTap?: () => void;
  /** Parada na pose de repouso: sem animação, nem ao toque. */
  still?: boolean;
  className?: string;
}

export interface CapiCue {
  clip: CapiClip;
  times?: number;
  id: number;
}

/**
 * A Capi em 3D (modelo animado do Meshy). Carrega a biblioteca 3D só quando aparece.
 * Sem WebGL, durante o carregamento ou com "reduzir movimento", mostra a Capi 2D.
 */
export function Capi3D({
  size = 170,
  intro = 'Acenar',
  rest = 'Parado',
  cue = null,
  say,
  bubbleFrom = 'left',
  idleReactions = false,
  onTap: onTapProp,
  still = false,
  className,
}: Capi3DProps) {
  const reduce = useReducedMotion();
  const ref = useRef<ModelViewerElement>(null);
  const loadedRef = useRef(false);
  const moodRef = useRef<Mood>('normal');
  const [mood, setMood] = useState<Mood>('normal');
  const [libReady, setLibReady] = useState(false);
  const { season } = useSeason();
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const [raging, setRaging] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: zera a contagem a cada troca de tema
  useEffect(() => setTaps(0), [season]);

  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  useEffect(() => {
    if (reduce) return;
    let alive = true;
    import('@google/model-viewer').then(() => alive && setLibReady(true)).catch(() => {}); // sem a biblioteca, fica a Capi 2D
    return () => {
      alive = false;
    };
  }, [reduce]);

  const loop = useCallback((clip: CapiClip, speed = 1) => {
    const el = ref.current;
    if (!el) return;
    el.animationName = clip;
    el.timeScale = speed;
    el.play();
  }, []);

  const once = useCallback((clip: CapiClip, times = 1) => {
    const el = ref.current;
    if (!el) return;
    el.animationName = clip;
    el.timeScale = 1;
    el.play({ repetitions: times });
  }, []);

  const backToMood = useCallback(() => {
    if (moodRef.current === 'dormindo') loop('Dormindo', 0.5);
    else if (moodRef.current === 'emburrado') loop('Emburrado');
    else loop(rest, rest === 'Dormindo' ? 0.5 : 1);
  }, [loop, rest]);

  const changeMood = useCallback(
    (next: Mood) => {
      moodRef.current = next;
      setMood(next);
      backToMood();
    },
    [backToMood],
  );

  // liga os eventos do model-viewer: intro ao carregar, volta ao humor quando um gesto termina
  useEffect(() => {
    const el = ref.current;
    if (!libReady || !el) return;
    const onLoad = () => {
      loadedRef.current = true;
      if (still) {
        el.animationName = rest;
        el.pause();
      } else if (intro) once(intro, intro === 'Acenar' ? 4 : 1);
      else backToMood();
    };
    el.addEventListener('load', onLoad);
    el.addEventListener('finished', backToMood);
    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('finished', backToMood);
    };
  }, [libReady, intro, once, backToMood, still, rest]);

  // gesto pedido de fora, uma vez por id; antes do modelo carregar, a intro cuida da entrada
  const cueRef = useRef(cue);
  cueRef.current = cue;
  const cueId = cue?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara só quando o id do gesto muda
  useEffect(() => {
    const c = cueRef.current;
    if (c && loadedRef.current && moodRef.current === 'normal') once(c.clip, c.times ?? 1);
  }, [cueId, once]);

  // emburrada e dormindo quando a pessoa fica parada
  useEffect(() => {
    if (!libReady || !idleReactions) return;
    let grumpy: number;
    let sleep: number;
    const arm = () => {
      window.clearTimeout(grumpy);
      window.clearTimeout(sleep);
      grumpy = window.setTimeout(() => changeMood('emburrado'), GRUMPY_AFTER_MS);
      sleep = window.setTimeout(() => changeMood('dormindo'), SLEEP_AFTER_MS);
    };
    const onActivity = () => {
      const was = moodRef.current;
      if (was !== 'normal') {
        moodRef.current = 'normal';
        setMood('normal');
        if (was === 'dormindo') once('Espreguica');
        else backToMood();
      }
      arm();
    };
    arm();
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true });
    return () => {
      window.clearTimeout(grumpy);
      window.clearTimeout(sleep);
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
    };
  }, [libReady, idleReactions, changeMood, once, backToMood]);

  const onTap = () => {
    onTapProp?.();
    if (still || moodRef.current !== 'normal') return; // o toque já acorda pelo evento de atividade
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTaps(0), RAGE_RESET_MS);
    const next = taps + 1;
    setTaps(next);
    if (next >= RAGE_TAPS) {
      window.clearTimeout(tapTimer.current);
      setTaps(0);
      setRaging(true); // a Capi vai ao centro, brilha e troca o tema
      return;
    }
    const [clip, times] = TAP_CLIPS[Math.floor(Math.random() * TAP_CLIPS.length)] ?? ['Acenar', 4];
    once(clip, times);
  };

  const asleep = mood === 'dormindo' || rest === 'Dormindo';
  const fallback = <Capi size={size} expression={asleep ? 'dormindo' : 'animada'} />;
  const line =
    RAGE_LINES[taps] ??
    (mood === 'emburrado'
      ? 'Ei! Tem oferta te esperando.'
      : mood === 'dormindo'
        ? 'Zzz… me cutuca quando voltar.'
        : say);

  return (
    <div className={`flex items-end gap-2 ${className ?? ''}`}>
      {reduce || !libReady ? (
        fallback
      ) : (
        <button
          type="button"
          onClick={onTap}
          aria-label="Tocar na Capi"
          className="pointer-events-auto relative shrink-0 rounded-blob focus-ring"
          style={{ width: size, height: size * 1.2, visibility: raging ? 'hidden' : undefined }}
        >
          <model-viewer
            ref={ref}
            src={MODEL_BY_SEASON[season]}
            alt="Capi, a capivara mascote do Capim Dourado"
            camera-orbit="0deg 82deg auto"
            disable-zoom
            disable-pan
            disable-tap
            interaction-prompt="none"
            shadow-intensity="0.8"
            animation-crossfade-duration="250"
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            <div slot="poster" className="grid size-full place-items-end">
              {fallback}
            </div>
          </model-viewer>
          {mood === 'dormindo' && (
            <span
              aria-hidden
              className="absolute right-1 top-1 font-display text-xl font-extrabold text-ink-soft motion-safe:animate-pulse"
            >
              z Z
            </span>
          )}
        </button>
      )}
      {line && !raging && (
        <SpeechBubble from={bubbleFrom} className="mb-6 flex-1">
          {line}
        </SpeechBubble>
      )}
      {raging && <CapiRage from={season} onDone={() => setRaging(false)} />}
    </div>
  );
}

type RagePhase = 'bravo' | 'brilho' | 'novo';
/** Linha do tempo da fúria, em ms: começa o brilho, troca o tema (tela coberta), some. */
const RAGE_TIMES = { brilho: 2400, troca: 2950, fim: 5400 };

/** A Capi irritada vai ao centro da tela, brilha (preto rumo ao Black Friday, branco rumo ao Natal) e troca o tema. */
function CapiRage({ from, onDone }: { from: Season; onDone: () => void }) {
  const target = usePortalTarget();
  const { setSeason } = useSeason();
  // congela a origem: `from` muda assim que o tema troca no meio da animação
  const [[start, to]] = useState<[Season, Season]>(() => [
    from,
    from === 'halloween' ? 'natal' : 'halloween',
  ]);
  const [phase, setPhase] = useState<RagePhase>('bravo');
  const done = useRef(onDone);
  done.current = onDone;

  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por fúria
  useEffect(() => {
    const ts = [
      window.setTimeout(() => setPhase('brilho'), RAGE_TIMES.brilho),
      window.setTimeout(() => {
        setSeason(to);
        setPhase('novo');
      }, RAGE_TIMES.troca),
      window.setTimeout(() => done.current(), RAGE_TIMES.fim),
    ];
    return () => {
      for (const t of ts) window.clearTimeout(t);
    };
  }, []);

  if (!target) return null;
  const angry = phase !== 'novo';
  const glow = to === 'halloween' ? '#000' : '#fff';
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden" role="status">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: angry ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ scale: 0.4, y: 160, opacity: 0 }}
        animate={
          angry
            ? { scale: 1, y: 0, opacity: 1, x: [0, -7, 7, -7, 7, 0] }
            : { scale: 1, y: 0, opacity: 1, x: 0 }
        }
        transition={{
          duration: 0.5,
          x: { duration: 0.4, repeat: angry ? Number.POSITIVE_INFINITY : 0, delay: 0.6 },
        }}
      >
        <SpeechBubble from="bottom-center">
          {angry
            ? 'CHEGA!!!'
            : to === 'halloween'
              ? 'Modo Black Friday ativado.'
              : 'Ho ho ho! O Natal voltou.'}
        </SpeechBubble>
        <model-viewer
          src={MODEL_BY_SEASON[angry ? start : to]}
          alt={angry ? 'Capi irritada' : 'Capi com a roupa do novo tema'}
          camera-orbit="0deg 82deg auto"
          disable-zoom
          disable-pan
          disable-tap
          interaction-prompt="none"
          shadow-intensity="0.8"
          autoplay
          animation-name={angry ? 'Gritando' : 'Festa'}
          style={{
            width: 240,
            height: 290,
            background: 'transparent',
            // aura vermelha de raiva, sem apagar a roupa
            filter: angry
              ? 'sepia(0.4) saturate(2.2) hue-rotate(-20deg) drop-shadow(0 0 6px #ff2020) drop-shadow(0 0 22px #ff2020)'
              : 'none',
            transition: 'filter 0.5s',
          }}
        />
      </motion.div>
      {phase !== 'bravo' && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${glow} 55%, transparent 70%)` }}
          initial={{ scale: 0, opacity: 1 }}
          animate={phase === 'brilho' ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 0 }}
          transition={{ duration: phase === 'brilho' ? 0.5 : 0.8, ease: 'easeOut' }}
        />
      )}
    </div>,
    target,
  );
}
