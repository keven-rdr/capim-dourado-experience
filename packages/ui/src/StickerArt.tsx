import { Capi } from './Capi';

export type StickerMotif =
  | 'capi'
  | 'gift'
  | 'tree'
  | 'cookie'
  | 'star'
  | 'bow'
  | 'bell'
  | 'sled'
  | 'popcorn'
  | 'wreath'
  | 'egg'
  | 'basket'
  | 'pumpkin'
  | 'monster';

export interface StickerArtProps {
  motif: StickerMotif;
  /** Desenha só a silhueta (figurinha trancada). */
  silhouette?: boolean;
  size?: number;
}

const L = 'var(--cde-line)';

/** Ilustração simples de cada figurinha, nas cores da temporada. */
export function StickerArt({ motif, silhouette = false, size = 84 }: StickerArtProps) {
  if (motif === 'capi') {
    return (
      <span className={silhouette ? 'opacity-25 brightness-0' : undefined}>
        <Capi size={size * 0.9} expression={silhouette ? 'dormindo' : 'animada'} />
      </span>
    );
  }
  const fill = (token: string) => (silhouette ? 'var(--cde-ink)' : `var(${token})`);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={silhouette ? 'opacity-25' : undefined}
    >
      <g
        stroke={silhouette ? 'var(--cde-ink)' : L}
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {motif === 'gift' && (
          <>
            <rect x="18" y="40" width="64" height="46" rx="4" fill={fill('--cde-primary')} />
            <rect x="12" y="28" width="76" height="16" rx="3" fill={fill('--cde-primary')} />
            <path d="M50 28v58" stroke={fill('--cde-gold')} strokeWidth="9" />
            <path
              d="M50 28c-10-18-28-14-22-4 4 6 22 4 22 4Zm0 0c10-18 28-14 22-4-4 6-22 4-22 4Z"
              fill={fill('--cde-gold')}
            />
          </>
        )}
        {motif === 'tree' && (
          <>
            <path d="M50 10 76 46H62l18 26H20l18-26H24z" fill={fill('--cde-secondary')} />
            <rect x="43" y="72" width="14" height="16" fill={fill('--cde-gold-deep')} />
            <circle cx="40" cy="52" r="4" fill={fill('--cde-gold')} />
            <circle cx="60" cy="62" r="4" fill={fill('--cde-primary')} />
          </>
        )}
        {motif === 'cookie' && (
          <>
            <path
              d="M50 12a12 12 0 0 1 9 20h14a6 6 0 0 1 0 12H62l8 34a6 6 0 0 1-11 4L50 64l-9 18a6 6 0 0 1-11-4l8-34H27a6 6 0 0 1 0-12h14a12 12 0 0 1 9-20Z"
              fill={fill('--cde-gold-deep')}
            />
            <circle cx="46" cy="23" r="2" fill={L} />
            <circle cx="54" cy="23" r="2" fill={L} />
            <path d="M44 48h12M45 56h10" stroke={fill('--cde-surface')} />
          </>
        )}
        {motif === 'star' && (
          <path
            d="m50 8 11 26 28 2-21 18 7 28-25-15-25 15 7-28-21-18 28-2z"
            fill={fill('--cde-gold')}
          />
        )}
        {motif === 'bow' && (
          <>
            <path d="M50 46 18 28v40zM50 46l32-18v40z" fill={fill('--cde-accent')} />
            <path
              d="m44 50-12 34 10-4 6 8 4-36M56 50l12 34-10-4-6 8-4-36"
              fill={fill('--cde-accent')}
            />
            <rect x="42" y="38" width="16" height="16" rx="4" fill={fill('--cde-gold')} />
          </>
        )}
        {motif === 'bell' && (
          <>
            <path
              d="M50 14c16 0 24 12 24 30v18l8 10H18l8-10V44c0-18 8-30 24-30Z"
              fill={fill('--cde-gold')}
            />
            <circle cx="50" cy="80" r="7" fill={fill('--cde-primary')} />
            <path d="M34 60h32" stroke={fill('--cde-gold-deep')} />
          </>
        )}
        {motif === 'sled' && (
          <>
            <path d="M16 70h60c8 0 12-6 12-12" fill="none" />
            <rect x="22" y="40" width="50" height="22" rx="4" fill={fill('--cde-primary')} />
            <path d="M28 62v8M66 62v8" />
            <path d="M28 40l6-12h26l6 12" fill={fill('--cde-gold')} />
          </>
        )}
        {motif === 'popcorn' && (
          <>
            <circle cx="36" cy="30" r="11" fill={fill('--cde-paper')} />
            <circle cx="52" cy="24" r="12" fill={fill('--cde-paper')} />
            <circle cx="66" cy="32" r="11" fill={fill('--cde-paper')} />
            <path d="M24 38h52l-8 50H32z" fill={fill('--cde-primary')} />
            <path d="M42 38l2 50M58 38l-2 50" stroke={fill('--cde-surface')} strokeWidth="6" />
          </>
        )}
        {motif === 'wreath' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke={fill('--cde-gold')}
              strokeWidth="16"
            />
            <circle cx="50" cy="50" r="40" fill="none" />
            <circle cx="50" cy="50" r="24" fill="none" />
            <path d="M28 34l8 6M70 32l-6 8M30 68l8-4M70 68l-8-4" stroke={fill('--cde-gold-deep')} />
            <path d="M42 84l8-10 8 10" fill={fill('--cde-primary')} />
          </>
        )}
        {motif === 'egg' && (
          <>
            <path
              d="M50 10c18 0 30 30 30 48 0 18-13 30-30 30S20 76 20 58c0-18 12-48 30-48Z"
              fill={fill('--cde-primary')}
            />
            <path
              d="M22 50c10-6 18 6 28 0s18-6 28 0"
              fill="none"
              stroke={fill('--cde-secondary')}
              strokeWidth="7"
            />
            <circle cx="40" cy="70" r="4" fill={fill('--cde-accent')} />
            <circle cx="60" cy="72" r="4" fill={fill('--cde-accent')} />
          </>
        )}
        {motif === 'basket' && (
          <>
            <path d="M24 48c0-26 52-26 52 0" fill="none" strokeWidth="6" />
            <path d="M14 48h72l-8 38H22z" fill={fill('--cde-gold')} />
            <path d="M20 62h60M24 74h52M40 48l-4 38M60 48l4 38" stroke={fill('--cde-gold-deep')} />
          </>
        )}
        {motif === 'pumpkin' && (
          <>
            <path d="M50 26c4-8 8-12 14-12" fill="none" />
            <ellipse cx="50" cy="58" rx="36" ry="28" fill={fill('--cde-primary')} />
            <path d="M50 30c-10 8-10 48 0 56M50 30c10 8 10 48 0 56" fill="none" />
            <path d="M34 52l6-6 6 6zM54 52l6-6 6 6zM38 68q12 8 24 0" fill={L} />
          </>
        )}
        {motif === 'monster' && (
          <>
            <path
              d="M22 86V46c0-18 12-30 28-30s28 12 28 30v40l-9-8-9 8-10-8-10 8-9-8z"
              fill={fill('--cde-secondary')}
            />
            <circle cx="40" cy="44" r="8" fill={fill('--cde-surface')} />
            <circle cx="62" cy="44" r="6" fill={fill('--cde-surface')} />
            <circle cx="41" cy="45" r="3" fill={L} />
            <circle cx="62" cy="45" r="2.5" fill={L} />
            <path d="M40 62q10 6 20 0" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}
