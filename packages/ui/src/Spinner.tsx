import { cx } from './cx';

export interface SpinnerProps {
  /** Tamanho em px. Padrão: 20. */
  size?: number;
  /** Texto lido por leitores de tela. Padrão: "Carregando". */
  label?: string;
  className?: string;
}

/** Indicador de carregamento: um anel grosso com um gomo que gira. */
export function Spinner({ size = 20, label = 'Carregando', className }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cx('inline-flex', className)}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="animate-spin-slow"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
