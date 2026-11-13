import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type MapPinKind = 'store' | 'secret' | 'event' | 'you';

export interface MapPinProps {
  kind: MapPinKind;
  /** Nome lido por leitores de tela e mostrado quando selecionado. */
  label: string;
  /** Posição horizontal, de 0 a 100 (% do mapa). */
  x: number;
  /** Posição vertical, de 0 a 100 (% do mapa). */
  y: number;
  selected?: boolean;
  /** Pin esmaecido (ex.: fora do filtro de trilha). */
  dimmed?: boolean;
  onSelect?: () => void;
}

const META: Record<MapPinKind, { icon: IconName; tone: string }> = {
  store: { icon: 'gift', tone: 'bg-primary text-on-primary' },
  secret: { icon: 'sparkle', tone: 'bg-gold text-on-gold' },
  event: { icon: 'star', tone: 'bg-secondary text-on-secondary' },
  you: { icon: 'location', tone: 'bg-accent text-on-accent' },
};

/** Pin do mapa dos pavimentos. Variações: loja, segredo, evento e "você está aqui". */
export function MapPin({ kind, label, x, y, selected = false, dimmed = false, onSelect }: MapPinProps) {
  const meta = META[kind];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={cx(
        'group absolute z-10 grid size-11 -translate-x-1/2 -translate-y-full cursor-pointer place-items-center focus-ring',
        selected && 'z-20',
        dimmed && !selected && 'opacity-45',
      )}
    >
      <span
        className={cx(
          'relative grid place-items-center rounded-[50%_50%_50%_6px] -rotate-45 chunk shadow-hard-sm transition-transform',
          selected ? 'size-10 scale-110' : 'size-8 group-hover:scale-110',
          meta.tone,
        )}
      >
        <span className="rotate-45">
          <Icon name={meta.icon} size={selected ? 20 : 16} strokeWidth={2.8} />
        </span>
      </span>
      {selected && (
        <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-xs bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-bg">
          {label}
        </span>
      )}
    </button>
  );
}
