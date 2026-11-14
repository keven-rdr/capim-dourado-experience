import { Icon, type ToastVariant, usePortalTarget } from '@cde/ui';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import { Capi3D, type CapiClip, type CapiCue } from './Capi3D';

/** Telas que já mostram a Capi 3D grande: lá a companheira some para não ficar repetida. */
const OWN_CAPI = ['/', '/bem-vindo', '/caca', '/checkin', '/perfil', '/album'];

const TIPS: Record<string, string> = {
  '/missoes': 'Missão de loja vale +15 XP cada. Bora?',
  '/mapa': 'Toque num pino pra ver a loja.',
  '/recompensas': 'Junta moedas e troca por cupom aqui.',
  '/scanner': 'Procura o QR com o selo da capivara.',
};

const REACTION: Record<ToastVariant, [CapiClip, number]> = {
  success: ['Comemorar', 1],
  chest: ['Festa', 1],
  sticker: ['Festa', 1],
  info: ['AcenoLeve', 1],
  warning: ['Triste', 1],
};

const BALL_SIZE = 56;
const BALL_KEY = 'cde-capi-bola';
type BallPos = { side: 'left' | 'right'; top: number };
interface BallState {
  min: boolean;
  pos: BallPos;
}

export function loadBall(): BallState {
  try {
    const v = JSON.parse(localStorage.getItem(BALL_KEY) ?? 'null') as Partial<BallState> | null;
    const side = v?.pos?.side;
    const top = v?.pos?.top;
    if ((side === 'left' || side === 'right') && typeof top === 'number') {
      return { min: !!v?.min, pos: { side, top: Math.min(1, Math.max(0, top)) } };
    }
  } catch {
    // dado inválido ou armazenamento bloqueado: posição padrão
  }
  return { min: false, pos: { side: 'right', top: 0.75 } };
}

function saveBall(state: BallState) {
  try {
    localStorage.setItem(BALL_KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

/**
 * Capi minimizada, como o toque assistivo do iPhone: bolinha semitransparente que se arrasta
 * e gruda na borda mais próxima. Um toque traz a Capi de volta.
 */
function CapiBall({
  pos,
  onMove,
  onOpen,
}: {
  pos: BallPos;
  onMove: (pos: BallPos) => void;
  onOpen: () => void;
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  // posição mais recente do arraste: o estado pode estar um quadro atrasado ao soltar
  const last = useRef<{ x: number; y: number } | null>(null);

  const area = (el: HTMLElement) => (el.parentElement as HTMLElement).getBoundingClientRect();
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const finish = (el: HTMLElement) => {
    start.current = null;
    const p = last.current;
    last.current = null;
    setDrag(null);
    if (!moved.current || !p) return;
    const r = area(el);
    onMove({
      side: p.x + BALL_SIZE / 2 < r.width / 2 ? 'left' : 'right',
      top: r.height > BALL_SIZE ? p.y / (r.height - BALL_SIZE) : 0,
    });
  };

  return (
    <button
      type="button"
      aria-label="Mostrar a Capi"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        if (!moved.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
        moved.current = true;
        const r = area(e.currentTarget);
        last.current = {
          x: clamp(e.clientX - r.left - BALL_SIZE / 2, r.width - BALL_SIZE),
          y: clamp(e.clientY - r.top - BALL_SIZE / 2, r.height - BALL_SIZE),
        };
        setDrag(last.current);
      }}
      onPointerUp={(e) => finish(e.currentTarget)}
      onPointerCancel={(e) => finish(e.currentTarget)}
      onClick={() => {
        if (moved.current) {
          moved.current = false; // terminou um arraste: não abre
          return;
        }
        onOpen();
      }}
      style={
        drag
          ? { left: drag.x, top: drag.y }
          : { top: `calc((100% - ${BALL_SIZE}px) * ${pos.top})`, [pos.side]: 8 }
      }
      className={`pointer-events-auto absolute grid size-14 touch-none place-items-center rounded-full bg-surface/70 shadow-hard-sm backdrop-blur-sm chunk-thin focus-ring transition-opacity hover:opacity-100 focus-visible:opacity-100 ${
        drag ? 'opacity-100' : 'opacity-60'
      }`}
    >
      <img
        src="/capi-rosto.webp"
        alt=""
        className="size-11 rounded-full object-cover"
        draggable={false}
      />
    </button>
  );
}

/**
 * A Capi 3D que acompanha a pessoa pelo app: canto de baixo, acima da navegação.
 * Comemora conquistas, fica triste com avisos, acena ao trocar de tela e dá uma dica ao toque.
 */
export function CapiCompanion() {
  const { profile, toasts, reveal } = useGame();
  const { pathname } = useLocation();
  const target = usePortalTarget();
  const [ball, setBall] = useState(loadBall);
  const [cue, setCue] = useState<CapiCue | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const lastToast = useRef(0);
  const cueId = useRef(0);

  // reage a cada aviso novo do jogo (conquista, baú, figurinha, erro)
  useEffect(() => {
    const latest = toasts.at(-1);
    if (!latest || latest.id <= lastToast.current) return;
    lastToast.current = latest.id;
    const [clip, times] = REACTION[latest.variant];
    cueId.current += 1;
    setCue({ clip, times, id: cueId.current });
  }, [toasts]);

  // festa quando fecha a revelação do QR (presente, segredo ou figurinha achada)
  const revealOpen = !!reveal;
  const wasRevealOpen = useRef(false);
  useEffect(() => {
    if (wasRevealOpen.current && !revealOpen) {
      cueId.current += 1;
      setCue({ clip: 'Festa', id: cueId.current });
    }
    wasRevealOpen.current = revealOpen;
  }, [revealOpen]);

  // acena ao chegar numa tela nova e fecha a dica antiga
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara a cada troca de rota
  useEffect(() => {
    setTip(null);
    cueId.current += 1;
    setCue({ clip: 'AcenoLeve', id: cueId.current });
  }, [pathname]);

  useEffect(() => {
    if (!tip) return;
    const t = window.setTimeout(() => setTip(null), 4000);
    return () => window.clearTimeout(t);
  }, [tip]);

  const show = profile && !OWN_CAPI.includes(pathname);
  if (!show || !target) return null;

  const updateBall = (next: BallState) => {
    setBall(next);
    saveBall(next);
  };

  if (ball.min) {
    return createPortal(
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60]">
        <CapiBall
          pos={ball.pos}
          onMove={(pos) => updateBall({ min: true, pos })}
          onOpen={() => updateBall({ ...ball, min: false })}
        />
      </div>,
      target,
    );
  }

  return createPortal(
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-2 z-[60] flex w-[min(20rem,calc(100%-1rem))] items-end justify-end gap-1">
      <Capi3D
        size={76}
        intro="AcenoLeve"
        cue={cue}
        say={tip ?? undefined}
        idleReactions
        onTap={() => setTip(TIPS[pathname] ?? 'Tô por aqui se precisar.')}
        className="pointer-events-none flex-1 flex-row-reverse"
      />
      <button
        type="button"
        onClick={() => updateBall({ ...ball, min: true })}
        aria-label="Minimizar a Capi"
        className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full bg-surface/90 text-ink-soft chunk focus-ring"
      >
        <Icon name="close" size={18} />
      </button>
    </div>,
    target,
  );
}
