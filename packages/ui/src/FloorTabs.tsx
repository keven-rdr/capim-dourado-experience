import { type KeyboardEvent, useRef } from 'react';
import { cx } from './cx';

export interface FloorTab<T extends string = string> {
  id: T;
  /** Nome oficial do pavimento. */
  label: string;
  /** Rótulo curto para a aba (ex.: "Térreo"). */
  short: string;
}

export interface FloorTabsProps<T extends string = string> {
  floors: ReadonlyArray<FloorTab<T>>;
  value: T;
  onChange: (id: T) => void;
  /** Id do painel controlado pelas abas (acessibilidade). */
  panelId?: string;
  className?: string;
}

/** Abas dos pavimentos, como "fases" do mapa. Setas do teclado trocam de aba. */
export function FloorTabs<T extends string>({ floors, value, onChange, panelId, className }: FloorTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + floors.length) % floors.length;
    const floor = floors[next];
    if (!floor) return;
    onChange(floor.id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label="Pavimentos" className={cx('flex gap-2', className)}>
      {floors.map((floor, index) => {
        const active = floor.id === value;
        return (
          <button
            key={floor.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            title={floor.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(floor.id)}
            onKeyDown={(e) => onKey(e, index)}
            className={cx(
              'flex min-h-12 flex-1 cursor-pointer flex-col items-start justify-center rounded-md px-3 py-1.5 text-left chunk focus-ring',
              active ? 'bg-ink text-bg shadow-hard-sm -rotate-1' : 'bg-surface text-ink',
            )}
          >
            <span className="font-mono text-xs font-bold opacity-80">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-display text-sm font-extrabold leading-tight">{floor.short}</span>
          </button>
        );
      })}
    </div>
  );
}
