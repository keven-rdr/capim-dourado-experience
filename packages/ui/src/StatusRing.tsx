import type { ReactNode } from 'react';
import { cx } from './cx';

export type StatusRingState = 'idle' | 'busy' | 'success' | 'warning' | 'done';

export interface StatusRingProps {
  state?: StatusRingState;
  /** Diâmetro em px. Padrão: 220. */
  size?: number;
  /** Conteúdo no centro (ex.: a Capi ou um número). */
  children?: ReactNode;
  className?: string;
}

const TONE: Record<StatusRingState, string> = {
  idle: 'bg-accent',
  busy: 'bg-gold',
  success: 'bg-success',
  warning: 'bg-surface-2',
  done: 'bg-secondary',
};

/** Anel de status do check-in: pulsa enquanto espera, gira enquanto verifica. */
export function StatusRing({ state = 'idle', size = 220, children, className }: StatusRingProps) {
  return (
    <div
      className={cx('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {(state === 'idle' || state === 'success') && (
        <>
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 animate-pulse-ring rounded-full opacity-60',
              TONE[state],
            )}
          />
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 animate-pulse-ring rounded-full opacity-60 [animation-delay:0.9s]',
              TONE[state],
            )}
          />
        </>
      )}
      {state === 'busy' && (
        <span
          aria-hidden="true"
          className="absolute -inset-2 animate-spin-slow rounded-full border-[6px] border-transparent border-t-line border-r-line"
        />
      )}
      <div
        className={cx(
          'relative grid size-full place-items-center overflow-hidden rounded-full chunk-thick shadow-hard-lg',
          state === 'warning' ? 'bg-surface-2' : 'bg-surface',
        )}
      >
        {children}
      </div>
    </div>
  );
}
