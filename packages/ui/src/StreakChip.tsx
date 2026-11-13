import { cx } from './cx';
import { Icon } from './Icon';

export interface StreakChipProps {
  /** Dias seguidos. */
  days: number;
  /** A sequência quebra se não houver atividade hoje. */
  atRisk?: boolean;
  /** A cada quantos dias abre o baú. Padrão: 7. */
  chestEvery?: number;
  /** Mostra a linha "baú em N dias". Padrão: true. */
  showChest?: boolean;
  className?: string;
}

/** Diz quantos dias faltam para o próximo baú da sequência. */
export function daysToChest(days: number, chestEvery = 7): number {
  const rest = days % chestEvery;
  return rest === 0 && days > 0 ? 0 : chestEvery - rest;
}

/** Chip da sequência de dias, com aviso de risco e contagem para o baú. */
export function StreakChip({
  days,
  atRisk = false,
  chestEvery = 7,
  showChest = true,
  className,
}: StreakChipProps) {
  const toChest = daysToChest(days, chestEvery);
  return (
    <div
      className={cx(
        'inline-flex min-h-11 items-center gap-2 rounded-blob py-1 pl-1.5 pr-3 chunk shadow-hard-sm',
        atRisk ? 'bg-surface text-ink' : 'bg-gold text-on-gold',
        className,
      )}
    >
      <span
        className={cx(
          'grid size-8 place-items-center rounded-sm chunk-thin',
          atRisk ? 'bg-surface-2 text-ink-soft' : 'bg-primary text-on-primary',
        )}
      >
        <Icon name="flame" size={20} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold">
          {days} {days === 1 ? 'dia' : 'dias'}
        </span>
        {atRisk ? (
          <span className="text-xs font-semibold">Passa aqui hoje pra não perder</span>
        ) : (
          showChest && (
            <span className="font-mono text-xs font-bold">
              {toChest === 0 ? 'baú aberto!' : `baú em ${toChest}`}
            </span>
          )
        )}
      </span>
    </div>
  );
}
