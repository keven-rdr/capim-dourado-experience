import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type WalletKind = 'xp' | 'coins' | 'tickets';

export interface WalletBadgeProps {
  /** Tipo de ponto: XP (nível), moedas (capicoins) ou bilhetes (sorteio). */
  kind: WalletKind;
  value: number;
  /** `pill` para cabeçalhos; `tile` para a carteira, com rótulo e microtexto. */
  variant?: 'pill' | 'tile';
  /** Microtexto explicando para que serve (só no `tile`). */
  hint?: string;
  className?: string;
}

const META: Record<WalletKind, { label: string; icon: IconName; tone: string; short: string }> = {
  xp: { label: 'XP', short: 'XP', icon: 'star', tone: 'bg-accent text-on-accent' },
  coins: { label: 'Capicoins', short: 'moedas', icon: 'coin', tone: 'bg-gold text-on-gold' },
  tickets: { label: 'Bilhetes', short: 'bilhetes', icon: 'ticket', tone: 'bg-primary text-on-primary' },
};

/** Saldo de um tipo de ponto da carteira. */
export function WalletBadge({ kind, value, variant = 'pill', hint, className }: WalletBadgeProps) {
  const meta = META[kind];
  if (variant === 'tile') {
    return (
      <div className={cx('flex flex-col gap-1 rounded-md bg-surface p-3 chunk', className)}>
        <span className={cx('grid size-9 place-items-center rounded-sm chunk-thin', meta.tone)}>
          <Icon name={meta.icon} size={20} />
        </span>
        <span className="font-mono text-2xl font-extrabold leading-none tabular-nums">{value}</span>
        <span className="font-display text-sm font-bold">{meta.label}</span>
        {hint && <span className="text-xs leading-snug text-ink-soft">{hint}</span>}
      </div>
    );
  }
  return (
    <span
      className={cx(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface py-0.5 pl-0.5 pr-2.5 chunk-thin',
        className,
      )}
      aria-label={`${value} ${meta.short}`}
    >
      <span className={cx('grid size-7 place-items-center rounded-full', meta.tone)} aria-hidden="true">
        <Icon name={meta.icon} size={16} strokeWidth={2.8} />
      </span>
      <span className="font-mono text-sm font-extrabold tabular-nums" aria-hidden="true">
        {value}
      </span>
    </span>
  );
}
