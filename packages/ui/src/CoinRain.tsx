import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { Icon } from './Icon';
import { usePortalTarget } from './PhoneFrame';

export interface CoinRainProps {
  /** Quantas moedas caem. Padrão: 24. */
  count?: number;
  /** Quanto tempo a chuva dura, em ms. Depois, chama `onDone`. Padrão: 3000. */
  durationMs?: number;
  /** Chamado quando a chuva acaba: quem usa tira o componente da tela. */
  onDone?: () => void;
  className?: string;
}

/**
 * Chuva de moedas só para enfeitar: não é lida por leitor de tela, não recebe toque e não
 * mexe em saldo nenhum. Com "reduzir movimento", as moedas somem na hora (regra global do CSS).
 */
export function CoinRain({ count = 24, durationMs = 3000, onDone, className }: CoinRainProps) {
  const target = usePortalTarget();
  const done = useRef(onDone);
  done.current = onDone;

  // posições espalhadas sem sorteio: a mesma chuva a cada vez, sem texto novo na tela
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: (id * 37 + 11) % 96,
        delay: (id % 8) * 0.16,
        duration: 1.5 + (id % 5) * 0.2,
        size: 20 + (id % 3) * 6,
      })),
    [count],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => done.current?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  const rain = (
    <div
      aria-hidden="true"
      className={cx('pointer-events-none fixed inset-0 z-[80] overflow-hidden', className)}
    >
      {coins.map((coin) => (
        <span
          key={coin.id}
          className="absolute top-0 animate-coin-fall text-gold-deep"
          style={{
            left: `${coin.left}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
          }}
        >
          <Icon name="coin" size={coin.size} />
        </span>
      ))}
    </div>
  );
  return target ? createPortal(rain, target) : rain;
}
