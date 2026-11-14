import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { cx } from './cx';

/** Temporadas suportadas pelos temas. Mesmo formato de `SeasonId` em `@cde/shared`. */
export type Season = 'natal' | 'pascoa' | 'halloween';
/** Temas que aparecem para escolher. `pascoa` segue no tipo só para os dados antigos. */
export const SEASON_IDS: readonly Season[] = ['natal', 'halloween'];

/** Metadados visuais de cada tema (rótulo curto e se é escuro). */
export const SEASON_THEME: Record<Season, { label: string; dark: boolean }> = {
  natal: { label: 'Natal', dark: false },
  pascoa: { label: 'Páscoa', dark: false },
  halloween: { label: 'Black Friday', dark: true },
};

interface SeasonContextValue {
  season: Season;
  setSeason: (season: Season) => void;
}

const SeasonContext = createContext<SeasonContextValue>({
  season: 'natal',
  setSeason: () => {},
});

export interface SeasonProviderProps {
  /** Temporada inicial (modo não controlado). */
  defaultSeason?: Season;
  /** Temporada controlada. Use junto com `onSeasonChange`. */
  season?: Season;
  onSeasonChange?: (season: Season) => void;
  /** Aplica `data-season` no `<html>`, para que fundo e portais herdem o tema. Padrão: true. */
  applyToDocument?: boolean;
  children: ReactNode;
}

/**
 * Fornece a temporada ativa. Trocar a temporada troca SÓ os tokens CSS
 * (via atributo `data-season`); os componentes continuam os mesmos.
 */
export function SeasonProvider({
  defaultSeason = 'natal',
  season: controlled,
  onSeasonChange,
  applyToDocument = true,
  children,
}: SeasonProviderProps) {
  const [inner, setInner] = useState<Season>(defaultSeason);
  const season = controlled ?? inner;
  const setSeason = useCallback(
    (next: Season) => {
      if (controlled === undefined) setInner(next);
      onSeasonChange?.(next);
    },
    [controlled, onSeasonChange],
  );

  useEffect(() => {
    if (!applyToDocument || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.season = season;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const color = getComputedStyle(root).getPropertyValue('--cde-bg').trim();
      if (color) meta.setAttribute('content', color);
    }
  }, [season, applyToDocument]);

  const value = useMemo(() => ({ season, setSeason }), [season, setSeason]);
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

/** Lê e troca a temporada ativa. */
export function useSeason(): SeasonContextValue {
  return useContext(SeasonContext);
}

export interface SeasonScopeProps {
  season: Season;
  className?: string;
  children: ReactNode;
}

/**
 * Aplica uma temporada só a um trecho da tela (ex.: o mesmo componente em três temas lado a lado).
 * Os componentes dentro dele, inclusive a Capi, enxergam esta temporada.
 */
export function SeasonScope({ season, className, children }: SeasonScopeProps) {
  const parent = useSeason();
  const value = useMemo(() => ({ season, setSeason: parent.setSeason }), [season, parent]);
  return (
    <SeasonContext.Provider value={value}>
      <div data-season={season} className={cx('bg-bg text-ink', className)}>
        {children}
      </div>
    </SeasonContext.Provider>
  );
}
