import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type CardTone = 'surface' | 'paper' | 'primary' | 'secondary' | 'gold' | 'accent' | 'muted';
export type CardTilt = 'none' | 'left' | 'right';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Cor de fundo, sempre a partir dos tokens. */
  tone?: CardTone;
  /** Inclinação leve, para pontos de destaque. Use com moderação. */
  tilt?: CardTilt;
  /** Forma: padrão, recortada (raios diferentes em cada canto) ou reta. */
  shape?: 'rounded' | 'blob' | 'square';
  /** Tamanho da sombra dura. */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Elemento HTML. Padrão: div. */
  as?: 'div' | 'section' | 'article' | 'aside';
  children?: ReactNode;
}

const TONE: Record<CardTone, string> = {
  surface: 'bg-surface text-ink',
  paper: 'bg-paper text-on-paper',
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  gold: 'bg-gold text-on-gold',
  accent: 'bg-accent text-on-accent',
  muted: 'bg-surface-2 text-ink',
};

const TILT: Record<CardTilt, string> = {
  none: '',
  left: 'rotate-[calc(-1.6deg*var(--cde-tilt,1))]',
  right: 'rotate-[calc(1.2deg*var(--cde-tilt,1))]',
};

const SHAPE = { rounded: 'rounded-lg', blob: 'rounded-blob', square: 'rounded-xs' } as const;
const ELEVATION = {
  none: '',
  sm: 'shadow-hard-sm',
  md: 'shadow-hard',
  lg: 'shadow-hard-lg',
} as const;

/** Superfície base dos blocos: borda preta grossa e sombra dura. */
export function Card({
  tone = 'surface',
  tilt = 'none',
  shape = 'rounded',
  elevation = 'md',
  as: Tag = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx('chunk', TONE[tone], TILT[tilt], SHAPE[shape], ELEVATION[elevation], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
