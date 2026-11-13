import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export type MissionCardKind = 'daily' | 'weekly' | 'season' | 'store' | 'welcome';

export interface MissionCardReward {
  xp: number;
  coins: number;
  tickets?: number;
  /** Dá figurinha ao concluir. */
  sticker?: boolean;
}

export interface MissionCardProps {
  kind: MissionCardKind;
  title: string;
  description?: string;
  /** Progresso atual. */
  current: number;
  /** Quantidade para concluir. */
  target: number;
  reward: MissionCardReward;
  /** `featured` é o cartão grande e inclinado da Home; `compact` vira uma linha de lista. */
  size?: 'featured' | 'default' | 'compact';
  /** Força o estado de concluída (padrão: current >= target). */
  completed?: boolean;
  /** Torna o cartão inteiro clicável. Não use junto com `action`. */
  onClick?: () => void;
  /** Ação dentro do cartão (ex.: um Button). */
  action?: ReactNode;
  className?: string;
}

const KIND_LABEL: Record<MissionCardKind, string> = {
  daily: 'Missão do dia',
  weekly: 'Da semana',
  season: 'Da temporada',
  store: 'De loja',
  welcome: 'Boas-vindas',
};

const KIND_TONE: Record<MissionCardKind, string> = {
  daily: 'bg-accent text-on-accent',
  weekly: 'bg-secondary text-on-secondary',
  season: 'bg-primary text-on-primary',
  store: 'bg-gold text-on-gold',
  welcome: 'bg-gold text-on-gold',
};

/** Cartão de missão: tipo, título, progresso e recompensa. Estados: em andamento e concluída. */
export function MissionCard({
  kind,
  title,
  description,
  current,
  target,
  reward,
  size = 'default',
  completed: completedProp,
  onClick,
  action,
  className,
}: MissionCardProps) {
  const completed = completedProp ?? current >= target;
  const shown = Math.min(current, target);
  const featured = size === 'featured';
  const compact = size === 'compact';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cx(
            'inline-flex items-center rounded-xs px-2 py-1 font-mono text-xs font-bold uppercase leading-none chunk-thin',
            KIND_TONE[kind],
          )}
        >
          {KIND_LABEL[kind]}
        </span>
        {completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-bold text-on-success chunk-thin">
            <Icon name="check" size={14} strokeWidth={3} /> Feita
          </span>
        ) : (
          <span className="font-mono text-sm font-bold tabular-nums" aria-hidden="true">
            {shown}/{target}
          </span>
        )}
      </div>

      <div className={cx(compact ? 'mt-1.5' : 'mt-3')}>
        <h3
          className={cx(
            'font-display font-extrabold leading-[1.05] tracking-tight',
            featured ? 'text-2xl' : compact ? 'text-lg' : 'text-xl',
            completed && !featured && 'line-through decoration-[3px] decoration-primary',
          )}
        >
          {title}
        </h3>
        {description && !compact && (
          <p className={cx('mt-1 text-sm text-ink-soft', featured && 'max-w-[26ch]')}>{description}</p>
        )}
      </div>

      <Progress current={shown} target={target} completed={completed} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm font-bold">
          <span>+{reward.xp} XP</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="coin" size={16} className="text-gold-deep" />+{reward.coins}
          </span>
          {reward.tickets ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="ticket" size={16} />+{reward.tickets}
            </span>
          ) : null}
          {reward.sticker && (
            <span className="inline-flex items-center gap-1">
              <Icon name="sparkle" size={16} />
              figurinha
            </span>
          )}
        </p>
        {action}
        {onClick && !action && <Icon name="arrowRight" size={22} />}
      </div>
      <span className="sr-only">
        {completed ? 'Missão concluída.' : `Progresso: ${shown} de ${target}.`}
      </span>
    </>
  );

  const shell = cx(
    'relative block w-full text-left chunk',
    featured
      ? 'rounded-blob p-5 shadow-hard-lg -rotate-[1.4deg]'
      : compact
        ? 'rounded-md px-4 py-3 shadow-hard-sm'
        : 'rounded-lg p-4 shadow-hard',
    completed ? 'bg-surface-2' : 'bg-surface',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(shell, 'focus-ring pressable cursor-pointer')}>
        {body}
      </button>
    );
  }
  return <article className={shell}>{body}</article>;
}

function Progress({ current, target, completed }: { current: number; target: number; completed: boolean }) {
  if (target <= 7) {
    return (
      <ol className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: target }, (_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: posições fixas
            key={i}
            className={cx(
              'h-3 flex-1 rounded-xs chunk-thin',
              i < current ? (completed ? 'bg-success' : 'bg-accent') : 'bg-surface-2',
            )}
          />
        ))}
      </ol>
    );
  }
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-xs bg-surface-2 chunk-thin" aria-hidden="true">
      <div className="h-full bg-accent" style={{ width: `${(current / target) * 100}%` }} />
    </div>
  );
}
