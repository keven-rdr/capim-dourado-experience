import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type TagTone = 'ink' | 'primary' | 'secondary' | 'gold' | 'accent' | 'outline' | 'example';

export interface TagProps {
  tone?: TagTone;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}

const TONE: Record<TagTone, string> = {
  ink: 'bg-ink text-bg border-ink',
  primary: 'bg-primary text-on-primary border-line',
  secondary: 'bg-secondary text-on-secondary border-line',
  gold: 'bg-gold text-on-gold border-line',
  accent: 'bg-accent text-on-accent border-line',
  outline: 'bg-transparent text-current border-current',
  example: 'bg-paper text-on-paper border-line border-dashed',
};

/** Etiqueta curta em fonte mono. O tom `example` marca dados ilustrativos ("exemplo"). */
export function Tag({ tone = 'ink', icon, className, children }: TagProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-xs border-2 px-1.5 py-0.5 font-mono text-xs font-bold uppercase leading-none tracking-wide',
        TONE[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} strokeWidth={2.8} />}
      {children}
    </span>
  );
}

/** Selo padrão de "exemplo" para descontos, prêmios e parcerias ilustrativos. */
export function ExampleTag({ className }: { className?: string }) {
  return (
    <Tag tone="example" className={className}>
      exemplo
    </Tag>
  );
}
