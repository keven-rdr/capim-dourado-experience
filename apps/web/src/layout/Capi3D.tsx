import { Capi, SpeechBubble } from '@cde/ui';
import { useReducedMotion } from 'motion/react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  | 'Acordar';

type Mood = 'normal' | 'emburrado' | 'dormindo';

const MODEL_URL = '/models/capi.glb';
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
    const [clip, times] = TAP_CLIPS[Math.floor(Math.random() * TAP_CLIPS.length)] ?? ['Acenar', 4];
    once(clip, times);
  };

  const asleep = mood === 'dormindo' || rest === 'Dormindo';
  const fallback = <Capi size={size} expression={asleep ? 'dormindo' : 'animada'} />;
  const line =
    mood === 'emburrado'
      ? 'Ei! Tem oferta te esperando.'
      : mood === 'dormindo'
        ? 'Zzz… me cutuca quando voltar.'
        : say;

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
          style={{ width: size, height: size * 1.2 }}
        >
          <model-viewer
            ref={ref}
            src={MODEL_URL}
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
      {line && <SpeechBubble className="mb-6 flex-1">{line}</SpeechBubble>}
    </div>
  );
}
