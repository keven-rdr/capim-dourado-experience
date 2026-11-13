import { cx } from './cx';
import { Icon } from './Icon';
import { StickerArt, type StickerMotif } from './StickerArt';

export type StickerRarity = 'comum' | 'rara';

export interface StickerCardProps {
  name: string;
  rarity: StickerRarity;
  /** Trancada: mostra só a silhueta e a dica. */
  locked?: boolean;
  /** Desenho da figurinha. */
  motif: StickerMotif;
  /** Número no álbum (ex.: "07"). */
  number?: string;
  /** Dica de onde ganhar (quando trancada). */
  hint?: string;
  /** Inclinação em graus, para o álbum não parecer uma grade de cartões idênticos. */
  tiltDeg?: number;
  /** Figurinha recém-ganha: entra com destaque. */
  isNew?: boolean;
  className?: string;
}

/** Cartinha de figurinha do álbum. Variações: comum, rara (com brilho) e trancada (silhueta). */
export function StickerCard({
  name,
  rarity,
  locked = false,
  motif,
  number,
  hint,
  tiltDeg = 0,
  isNew = false,
  className,
}: StickerCardProps) {
  const rare = rarity === 'rara';
  const label = locked
    ? `Figurinha ${number ?? ''} trancada${hint ? `. ${hint}` : ''}`
    : `Figurinha ${number ?? ''} ${name}${rare ? ', rara' : ''}`;
  return (
    <figure
      aria-label={label}
      style={{ rotate: `${tiltDeg}deg` }}
      className={cx(
        'relative rounded-md p-1 chunk shadow-hard-sm',
        rare && !locked ? 'cde-foil animate-foil' : locked ? 'bg-surface-2' : 'bg-surface',
        isNew && 'ring-4 ring-gold ring-offset-2 ring-offset-bg',
        className,
      )}
    >
      <div
        className={cx(
          'flex aspect-[3/4] flex-col items-center justify-between rounded-sm px-1.5 pb-1.5 pt-1',
          locked ? 'border-2 border-dashed border-ink-soft/50' : 'bg-surface chunk-thin',
        )}
      >
        <div className="flex w-full items-center justify-between font-mono text-xs font-bold">
          <span>{number}</span>
          {rare && (
            <span className="inline-flex items-center gap-0.5 text-gold-deep">
              <Icon name="sparkle" size={13} strokeWidth={2.6} />
              <span className={locked ? 'text-ink-soft' : 'text-ink'}>rara</span>
            </span>
          )}
        </div>
        <div className="relative grid flex-1 place-items-center">
          <StickerArt motif={motif} silhouette={locked} size={64} />
          {locked && (
            <span className="absolute grid size-8 place-items-center rounded-full bg-surface chunk-thin">
              <Icon name="lock" size={16} />
            </span>
          )}
        </div>
        <figcaption
          className={cx(
            'w-full text-center font-display text-xs font-bold leading-tight',
            locked && 'text-ink-soft',
          )}
        >
          {locked ? (hint ?? '???') : name}
        </figcaption>
      </div>
    </figure>
  );
}
