import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selecionado. */
  selected?: boolean;
  icon?: IconName;
  /** Contador opcional à direita. */
  count?: number;
}

/** Chip selecionável (filtro, escolha rápida). */
export function Chip({
  selected = false,
  icon,
  count,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 font-display text-sm font-bold chunk-thin focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'bg-ink text-bg' : 'bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {count !== undefined && (
        <span
          className={cx(
            'rounded-full px-1.5 font-mono text-xs',
            selected ? 'bg-bg text-ink' : 'bg-surface-2',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  count?: number;
  disabled?: boolean;
}

export interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<FilterOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Nome do grupo para leitores de tela. */
  label: string;
  className?: string;
}

/** Grupo de chips com uma escolha por vez, em linha rolável. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <fieldset className={cx('min-w-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-0.5 [scrollbar-width:none]">
        {options.map((option) => (
          <Chip
            key={option.value}
            selected={option.value === value}
            icon={option.icon}
            count={option.count}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
