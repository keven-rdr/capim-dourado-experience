import type { ReactNode } from 'react';
import { Capi, type CapiLook } from './Capi';
import { cx } from './cx';

export interface SeasonBannerProps {
  /** Nome da temporada (ex.: "Natal"). */
  name: string;
  /** Tema da caça (ex.: "Fábrica de Presentes"). */
  theme: string;
  tagline: string;
  /** Visual da Capi que aparece na faixa. */
  look?: CapiLook;
  /** Ação à direita (ex.: link para a caça). */
  action?: ReactNode;
  className?: string;
}

/** Faixa da temporada: padrão e cores vêm dos tokens; a Capi veste a fantasia do tema. */
export function SeasonBanner({ name, theme, tagline, look, action, className }: SeasonBannerProps) {
  return (
    <section
      aria-label={`Temporada ${name}`}
      className={cx(
        'banner-pattern relative overflow-hidden rounded-lg text-on-banner chunk shadow-hard',
        className,
      )}
    >
      <div className="relative z-10 max-w-[64%] p-4">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">Temporada · {name}</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold leading-[1.02]">{theme}</h2>
        <p className="mt-1.5 text-sm font-semibold leading-snug">{tagline}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="absolute -bottom-6 -right-3 rotate-6">
        <Capi size={132} expression="animada" look={look} />
      </div>
    </section>
  );
}
