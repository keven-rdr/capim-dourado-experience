import { Icon } from '@cde/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface ScreenProps {
  /** Rótulo pequeno acima do título, em mono. */
  kicker?: string;
  title: string;
  /** Rota do botão voltar. */
  back?: string;
  /** Conteúdo à direita do título (ex.: saldo). */
  right?: ReactNode;
  children: ReactNode;
}

/** Moldura comum das telas: cabeçalho com título expressivo e conteúdo com respiro lateral. */
export function Screen({ kicker, title, back, right, children }: ScreenProps) {
  return (
    <div className="flex flex-1 flex-col px-4 pb-8">
      <header className="flex items-end justify-between gap-3 pb-4 pt-5">
        <div className="flex min-w-0 items-end gap-2">
          {back && (
            <Link
              to={back}
              aria-label="Voltar"
              className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-sm bg-surface chunk-thin focus-ring"
            >
              <Icon name="chevronLeft" size={22} />
            </Link>
          )}
          <div className="min-w-0">
            {kicker && (
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
                {kicker}
              </p>
            )}
            <h1 className="font-display text-3xl font-extrabold leading-[0.95] tracking-tight">
              {title}
            </h1>
          </div>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

/** Título de seção dentro de uma tela. */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-baseline justify-between gap-2">
      <h2 className="font-display text-xl font-extrabold tracking-tight">{children}</h2>
      {aside && <span className="font-mono text-xs font-bold text-ink-soft">{aside}</span>}
    </div>
  );
}
