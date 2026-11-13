import { motion } from 'motion/react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface PuzzleMapProps {
  /** Total de peças (uma por pista). */
  total: number;
  /** Peças já encaixadas. */
  collected: number;
  /** Peça que acabou de chegar (índice começando em 0), para animar o encaixe. */
  highlight?: number;
  /** Rótulos das peças já reveladas (ex.: local do QR). */
  labels?: ReadonlyArray<string | undefined>;
  className?: string;
}

/** Quebra-cabeça do mapa do tesouro: cada pista resolvida encaixa uma peça. */
export function PuzzleMap({ total, collected, highlight, labels = [], className }: PuzzleMapProps) {
  const cols = total <= 4 ? total : Math.ceil(total / 2);
  return (
    <ol
      aria-label={`Mapa do tesouro: ${collected} de ${total} peças`}
      className={cx('grid gap-1.5 rounded-md bg-paper p-1.5 text-on-paper chunk', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const has = i < collected;
        const isNew = highlight === i;
        return (
          <motion.li
            // biome-ignore lint/suspicious/noArrayIndexKey: peças têm posição fixa
            key={i}
            initial={isNew ? { scale: 1.8, rotate: -25, y: -40, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: isNew ? 0.15 : 0 }}
            className={cx(
              'relative flex min-h-16 flex-col justify-between rounded-sm p-1.5',
              has
                ? i % 2 === 0
                  ? 'bg-primary text-on-primary chunk-thin'
                  : 'bg-secondary text-on-secondary chunk-thin'
                : 'border-2 border-dashed border-on-paper/40',
            )}
          >
            <span className="font-mono text-xs font-bold">{String(i + 1).padStart(2, '0')}</span>
            {has ? (
              <span className="line-clamp-2 text-xs font-bold leading-tight">
                {labels[i] ?? 'Peça encontrada'}
              </span>
            ) : (
              <Icon name="puzzle" size={20} className="self-end opacity-40" />
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
