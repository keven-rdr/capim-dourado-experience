import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGame } from '../data/GameProvider';
import type { CapiClip, CapiCue } from '../layout/Capi3D';
import {
  AWAY_TITLE,
  createSequenceMatcher,
  createTapCounter,
  EGG_COUNT,
  type EggId,
  KONAMI,
  markEgg,
  normalizeKey,
  POKE_LAST,
  POKE_LINES,
} from './eggs';

/**
 * Marca o ovo como achado e, na primeira vez, avisa em voz baixa (sem entregar quais faltam).
 * Cosmético: não chama a API.
 */
export function useDiscover(): (id: EggId) => void {
  const { notify } = useGame();
  return useCallback(
    (id) => {
      const { isNew, count } = markEgg(id);
      if (isNew) {
        notify({
          variant: 'success',
          title: 'Segredo achado!',
          description: `${count} de ${EGG_COUNT}. Não conta pra ninguém.`,
        });
      }
    },
    [notify],
  );
}

/** Gesto da Capi 3D pedido pela tela: cada chamada vale um `id` novo, para tocar de novo. */
export function useCue(): { cue: CapiCue | null; fire: (clip: CapiClip, times?: number) => void } {
  const [cue, setCue] = useState<CapiCue | null>(null);
  const id = useRef(0);
  const fire = useCallback((clip: CapiClip, times = 1) => {
    id.current += 1;
    setCue({ clip, times, id: id.current });
  }, []);
  return { cue, fire };
}

/**
 * Cutucar a Capi 3, 6 e 10 vezes seguidas. `onTap` devolve `true` quando o toque rendeu uma fala
 * do ovo (quem usa pode, senão, mostrar a dica de sempre).
 */
export function usePokeEgg(fire: (clip: CapiClip, times?: number) => void) {
  const discover = useDiscover();
  const counter = useMemo(() => createTapCounter(), []);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!line) return;
    const timer = window.setTimeout(() => setLine(null), 4000);
    return () => window.clearTimeout(timer);
  }, [line]);

  const onTap = useCallback((): boolean => {
    const count = counter.tap();
    const text = POKE_LINES[count];
    if (!text) return false;
    setLine(text);
    if (count === POKE_LAST) {
      counter.reset();
      fire('Festa');
      discover('cutuque');
    } else {
      fire('Emburrado');
    }
    return true;
  }, [counter, fire, discover]);

  return { line, onTap };
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** ↑ ↑ ↓ ↓ ← → ← → B A no teclado (sem atrapalhar quem está digitando num campo). */
export function useKonami(onHit: () => void): void {
  const hit = useRef(onHit);
  hit.current = onHit;
  useEffect(() => {
    const matcher = createSequenceMatcher(KONAMI);
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (matcher.push(normalizeKey(event.key))) hit.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * Segurar o toque por `ms`. Devolve as props para espalhar no elemento. Se o elemento for um
 * link, o clique que vem logo depois de um toque longo é engolido (não navega).
 */
export function useLongPress(onHit: () => void, ms = 1500) {
  const hit = useRef(onHit);
  hit.current = onHit;
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);

  const clear = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => clear, [clear]);

  return {
    onPointerDown: () => {
      fired.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        hit.current();
      }, ms);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture: (event: ReactMouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onContextMenu: (event: ReactMouseEvent) => {
      if (fired.current) event.preventDefault();
    },
  };
}

/** Enquanto a pessoa está em outra aba, o título pede para ela voltar. */
export function useAwayTitle(): void {
  useEffect(() => {
    const original = document.title;
    const onChange = () => {
      document.title = document.hidden ? AWAY_TITLE : original;
    };
    document.addEventListener('visibilitychange', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      document.title = original;
    };
  }, []);
}
