import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export type ScannerState = 'idle' | 'scanning' | 'error' | 'success';

export interface ScannerFrameProps {
  /** Aguardando (câmera desligada), lendo, erro ou sucesso. */
  state?: ScannerState;
  /** Mensagem de apoio abaixo da moldura. */
  message?: string;
  /** Conteúdo dentro da moldura (o vídeo da câmera). */
  children?: ReactNode;
  className?: string;
}

const MESSAGE: Record<ScannerState, string> = {
  idle: 'Ligue a câmera ou simule a leitura.',
  scanning: 'Aponte para o QR escondido.',
  error: 'Esse código não abriu nada. Tenta de novo?',
  success: 'Achou!',
};

/** Moldura do leitor de QR: cantoneiras grossas, linha de leitura e estado por cor. */
export function ScannerFrame({ state = 'idle', message, children, className }: ScannerFrameProps) {
  const corner =
    state === 'error' ? 'border-danger' : state === 'success' ? 'border-success' : 'border-gold';
  return (
    <div className={cx('flex flex-col items-center gap-3', className)}>
      <div
        className={cx(
          'relative aspect-square w-full max-w-[300px] overflow-hidden rounded-lg bg-[#0d0d10] chunk-thick shadow-hard-lg',
          state === 'error' && 'motion-safe:animate-shake',
        )}
      >
        <div className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover">{children}</div>
        {state === 'idle' && !children && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <Icon name="qr" size={72} strokeWidth={1.6} />
          </div>
        )}
        {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={cx(
              'absolute size-12 border-[6px]',
              corner,
              pos === 'tl' && 'left-4 top-4 rounded-tl-md border-b-0 border-r-0',
              pos === 'tr' && 'right-4 top-4 rounded-tr-md border-b-0 border-l-0',
              pos === 'bl' && 'bottom-4 left-4 rounded-bl-md border-r-0 border-t-0',
              pos === 'br' && 'bottom-4 right-4 rounded-br-md border-l-0 border-t-0',
            )}
          />
        ))}
        {state === 'scanning' && (
          <span
            aria-hidden="true"
            className="absolute inset-x-8 h-1 animate-scan-line rounded-full bg-gold shadow-[0_0_14px_2px_var(--cde-gold)]"
          />
        )}
        {state === 'success' && (
          <span className="absolute inset-0 grid place-items-center bg-success/30 text-white">
            <Icon name="check" size={80} strokeWidth={3.2} />
          </span>
        )}
      </div>
      <p
        aria-live="polite"
        className={cx(
          'text-center font-display text-base font-bold',
          state === 'error' ? 'text-danger' : 'text-ink',
        )}
      >
        {message ?? MESSAGE[state]}
      </p>
    </div>
  );
}
