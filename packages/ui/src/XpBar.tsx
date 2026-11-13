import { motion } from 'motion/react';
import { cx } from './cx';

export interface XpBarProps {
  /** XP total do visitante. */
  xp: number;
  /** XP mínimo do nível atual. */
  levelMinXp: number;
  /** XP do próximo nível. `null` quando já está no último. */
  nextLevelXp: number | null;
  /** Nome do nível atual (ex.: "Explorador"). */
  levelName: string;
  /** Número do nível, começando em 1. */
  levelNumber: number;
  /** Nome do próximo nível, para o texto de apoio. */
  nextLevelName?: string | null;
  /** XP de onde a barra começa a animar (ex.: antes de ganhar pontos). */
  fromXp?: number;
  /** Versão compacta, sem o texto de apoio. */
  compact?: boolean;
  className?: string;
}

/** Barra de XP: nível atual, progresso até o próximo e números grandes em fonte mono. */
export function XpBar({
  xp,
  levelMinXp,
  nextLevelXp,
  levelName,
  levelNumber,
  nextLevelName,
  fromXp,
  compact = false,
  className,
}: XpBarProps) {
  const span = nextLevelXp === null ? 1 : nextLevelXp - levelMinXp;
  const ratio = (value: number) =>
    nextLevelXp === null ? 1 : Math.min(1, Math.max(0, (value - levelMinXp) / span));
  const pct = ratio(xp) * 100;
  const fromPct = fromXp === undefined ? pct : ratio(fromXp) * 100;
  const missing = nextLevelXp === null ? 0 : nextLevelXp - xp;

  return (
    <div className={cx('w-full', className)}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <p className="flex items-baseline gap-2">
          <span className="rounded-xs bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-bg">
            NV {levelNumber}
          </span>
          <span className="font-display text-lg font-extrabold leading-none">{levelName}</span>
        </p>
        <p className="font-mono text-sm font-bold tabular-nums">
          {xp}
          <span className="text-ink-soft">/{nextLevelXp ?? xp} XP</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Progresso do nível ${levelName}`}
        aria-valuemin={levelMinXp}
        aria-valuemax={nextLevelXp ?? xp}
        aria-valuenow={xp}
        className="relative h-5 overflow-hidden rounded-xs bg-surface-2 chunk"
      >
        <motion.div
          className="h-full border-r-[3px] border-line bg-accent"
          initial={{ width: `${fromPct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: fromXp === undefined ? 0 : 1.1,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.2,
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_10px,rgb(255_255_255/0.18)_10px_16px)]"
        />
      </div>
      {!compact && (
        <p className="mt-1.5 text-xs text-ink-soft">
          {nextLevelXp === null
            ? 'Nível máximo. Agora é colecionar.'
            : `Faltam ${missing} XP para ${nextLevelName ?? 'o próximo nível'}.`}
        </p>
      )}
    </div>
  );
}
