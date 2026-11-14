import { cx } from './cx';

export interface RouletteWheelSlice {
  /** Identificador estável da fatia (ex.: o id da loja). Sem ele, vale o texto. */
  id?: string;
  /** Texto curto dentro da fatia (nome da loja). */
  label: string;
}

export interface RouletteWheelProps {
  slices: readonly RouletteWheelSlice[];
  /** Giro acumulado, em graus. Só cresce: a roda sempre gira para o mesmo lado. */
  rotation?: number;
  /** Duração da animação, em ms. Com 0 (ou com "reduzir movimento"), a roda salta direto. */
  durationMs?: number;
  /** Diâmetro em px. Padrão: 280. */
  size?: number;
  className?: string;
}

const CENTER = 110;
const RADIUS = 104;
const POINT = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
};

/** Ângulo (graus, horário, a partir do topo) do centro da fatia `index`. */
export function sliceCenter(index: number, total: number): number {
  return ((index + 0.5) * 360) / total;
}

/**
 * Giro acumulado que leva o centro da fatia `index` até o ponteiro (topo).
 * Soma ao menos `turns` voltas completas ao giro atual, para a roda sempre girar para a frente.
 */
export function rotationFor(current: number, index: number, total: number, turns = 5): number {
  const target = -sliceCenter(index, total);
  const delta = (((target - current) % 360) + 360) % 360;
  return current + turns * 360 + delta;
}

/**
 * Roleta de cupons: fatias iguais, uma por loja, e um ponteiro fixo no topo.
 * Não sorteia nada: quem decide a fatia é o servidor, e esta peça só gira até ela.
 */
export function RouletteWheel({
  slices,
  rotation = 0,
  durationMs = 3200,
  size = 280,
  className,
}: RouletteWheelProps) {
  const count = Math.max(slices.length, 1);
  const step = 360 / count;

  return (
    <div
      className={cx('relative mx-auto', className)}
      style={{ width: size, height: size + 18 }}
      role="img"
      aria-label={`Roleta com ${slices.length} prêmios: ${slices.map((s) => s.label).join(', ')}`}
    >
      <svg
        viewBox="0 0 28 22"
        width={28}
        height={22}
        aria-hidden="true"
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
      >
        <path
          d="M3 2h22L14 20z"
          className="fill-ink stroke-line"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="absolute inset-x-0 bottom-0 motion-reduce:!transition-none"
        style={{
          height: size,
          transform: `rotate(${rotation}deg)`,
          transition:
            durationMs > 0 ? `transform ${durationMs}ms cubic-bezier(.12,.6,.15,1)` : 'none',
        }}
      >
        <svg viewBox="0 0 220 220" width={size} height={size} aria-hidden="true" focusable="false">
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 4} className="fill-ink" />
          {slices.map((slice, index) => {
            const a = POINT(index * step, RADIUS);
            const b = POINT((index + 1) * step, RADIUS);
            const warm = index % 2 === 0;
            return (
              <path
                key={slice.id ?? slice.label}
                d={`M${CENTER} ${CENTER}L${a.x.toFixed(2)} ${a.y.toFixed(2)}A${RADIUS} ${RADIUS} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}Z`}
                className={cx(warm ? 'fill-gold' : 'fill-secondary', 'stroke-line')}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            );
          })}
          {slices.map((slice, index) => (
            <text
              key={`t-${slice.id ?? slice.label}`}
              x={CENTER + RADIUS - 10}
              y={CENTER}
              textAnchor="end"
              dominantBaseline="central"
              transform={`rotate(${sliceCenter(index, count) - 90} ${CENTER} ${CENTER})`}
              className={cx(
                'font-display text-[11px] font-extrabold',
                index % 2 === 0 ? 'fill-on-gold' : 'fill-on-secondary',
              )}
            >
              {slice.label}
            </text>
          ))}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={17}
            className="fill-surface stroke-line"
            strokeWidth="3"
          />
          <circle cx={CENTER} cy={CENTER} r={5} className="fill-primary" />
        </svg>
      </div>
    </div>
  );
}
