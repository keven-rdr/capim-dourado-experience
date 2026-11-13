import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SystemNoteProps {
  /** Rótulo da nota. Padrão: "o que o sistema faz". */
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Anotação de uma linha explicando o que o sistema está fazendo.
 * Pensada para a apresentação: fica discreta, em fonte mono e borda tracejada.
 */
export function SystemNote({ label = 'o que o sistema faz', className, children }: SystemNoteProps) {
  return (
    <p
      className={cx(
        'rounded-sm border-2 border-dashed border-ink-soft/60 px-2.5 py-1.5 font-mono text-xs leading-snug text-ink-soft',
        className,
      )}
    >
      <span className="font-bold uppercase">{label}:</span> {children}
    </p>
  );
}
