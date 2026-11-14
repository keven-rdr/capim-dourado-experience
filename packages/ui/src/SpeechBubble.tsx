import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SpeechBubbleProps {
  /** Lado de onde sai o rabinho do balão (onde está quem fala). */
  from?: 'left' | 'right' | 'bottom' | 'bottom-center';
  className?: string;
  children: ReactNode;
}

/** Balão de fala da Capi: texto curto, em tom de conversa. */
export function SpeechBubble({ from = 'left', className, children }: SpeechBubbleProps) {
  return (
    <div
      className={cx(
        'relative rounded-md bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink chunk shadow-hard-sm',
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cx(
          'absolute size-3.5 rotate-45 bg-surface',
          from === 'left' && '-left-[9px] top-4 border-b-[3px] border-l-[3px] border-line',
          from === 'right' && '-right-[9px] top-4 border-r-[3px] border-t-[3px] border-line',
          from === 'bottom' && '-bottom-[9px] left-8 border-b-[3px] border-r-[3px] border-line',
          from === 'bottom-center' &&
            '-bottom-[9px] left-1/2 -translate-x-1/2 border-b-[3px] border-r-[3px] border-line',
        )}
      />
    </div>
  );
}
