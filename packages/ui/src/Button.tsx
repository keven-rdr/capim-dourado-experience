import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estilo: primário (ação principal), secundário, dourado (recompensa), fantasma e perigo. */
  variant?: ButtonVariant;
  /** Tamanho. Todos têm no mínimo 44 px de altura. */
  size?: ButtonSize;
  /** Mostra o indicador e bloqueia o clique. */
  loading?: boolean;
  /** Texto lido enquanto carrega. */
  loadingLabel?: string;
  /** Ícone à esquerda do texto. */
  icon?: IconName;
  /** Ícone à direita do texto. */
  iconRight?: IconName;
  /** Ocupa toda a largura disponível. */
  block?: boolean;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary chunk shadow-hard',
  secondary: 'bg-surface text-ink chunk shadow-hard',
  gold: 'bg-gold text-on-gold chunk shadow-hard',
  ghost: 'bg-transparent text-ink border-2 border-transparent hover:border-line',
  danger: 'bg-danger text-on-danger chunk shadow-hard',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-base gap-2',
  lg: 'min-h-14 px-6 text-lg gap-2.5',
};

/** Botão da identidade: borda grossa, sombra dura deslocada que "afunda" ao apertar. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel = 'Carregando',
  icon,
  iconRight,
  block,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={cx(
        'relative inline-flex select-none items-center justify-center rounded-md font-display font-bold tracking-tight',
        'focus-ring pressable cursor-pointer',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        inactive && 'cursor-not-allowed',
        disabled && !loading && 'opacity-55 saturate-50 shadow-none',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 22 : 18} label={loadingLabel} />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 18 : 22} />
      )}
      {children && <span className={cx(loading && 'opacity-80')}>{children}</span>}
      {!loading && iconRight && <Icon name={iconRight} size={size === 'sm' ? 18 : 22} />}
    </button>
  );
}
