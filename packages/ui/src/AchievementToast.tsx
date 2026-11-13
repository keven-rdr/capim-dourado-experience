import { motion } from 'motion/react';
import { useEffect } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type ToastVariant = 'success' | 'sticker' | 'chest' | 'info' | 'warning';

export interface AchievementToastProps {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Linha de recompensa em fonte mono (ex.: "+30 XP · +10 moedas"). */
  reward?: string;
  /** Fecha sozinho depois de N ms. 0 desliga. Padrão: 4200. */
  duration?: number;
  onClose?: () => void;
  className?: string;
}

const META: Record<ToastVariant, { icon: IconName; tone: string; label: string }> = {
  success: { icon: 'check', tone: 'bg-success text-on-success', label: 'Conquista' },
  sticker: { icon: 'sparkle', tone: 'bg-gold text-on-gold', label: 'Figurinha nova' },
  chest: { icon: 'gift', tone: 'bg-primary text-on-primary', label: 'Baú aberto' },
  info: { icon: 'info', tone: 'bg-accent text-on-accent', label: 'Aviso' },
  warning: { icon: 'clock', tone: 'bg-surface-2 text-ink', label: 'Quase lá' },
};

/** Aviso de conquista: entra de cima, com leve inclinação. Variações: sucesso, figurinha, baú, aviso. */
export function AchievementToast({
  variant = 'success',
  title,
  description,
  reward,
  duration = 4200,
  onClose,
  className,
}: AchievementToastProps) {
  const meta = META[variant];

  useEffect(() => {
    if (!duration || !onClose) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [duration, onClose]);

  return (
    <motion.div
      layout
      role={variant === 'warning' ? 'alert' : 'status'}
      initial={{ y: -40, opacity: 0, rotate: -4 }}
      animate={{ y: 0, opacity: 1, rotate: -1.2 }}
      exit={{ y: -30, opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={cx(
        'pointer-events-auto flex w-full items-start gap-3 rounded-blob bg-surface p-3 pr-2 text-ink chunk shadow-hard',
        className,
      )}
    >
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-sm chunk-thin', meta.tone)}>
        <Icon name={meta.icon} size={24} />
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="font-mono text-xs font-bold uppercase text-ink-soft">{meta.label}</p>
        <p className="font-display text-base font-extrabold leading-tight">{title}</p>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
        {reward && <p className="mt-0.5 font-mono text-sm font-bold">{reward}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar aviso"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm focus-ring hover:bg-surface-2"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </motion.div>
  );
}
