import { cx } from './cx';
import { type Season, useSeason } from './season';

export type CapiExpression = 'animada' | 'comemorando' | 'curiosa' | 'dormindo';
export const CAPI_EXPRESSIONS: readonly CapiExpression[] = [
  'animada',
  'comemorando',
  'curiosa',
  'dormindo',
];

/** Visuais da turma de capivaras (escolha de personagem). */
export type CapiLook = 'capi' | 'jalapa' | 'buriti' | 'sussa';
export const CAPI_LOOKS: ReadonlyArray<{ id: CapiLook; name: string; bio: string }> = [
  { id: 'capi', name: 'Capi', bio: 'A guia da turma. Fala pouco, acha tudo.' },
  { id: 'jalapa', name: 'Jalapa', bio: 'Dourada como o capim do Jalapão.' },
  { id: 'buriti', name: 'Buriti', bio: 'De óculos, lê todas as pistas duas vezes.' },
  { id: 'sussa', name: 'Sussa', bio: 'Sem pressa, com uma flor de capim na orelha.' },
];

const FUR: Record<CapiLook, { fur: string; dark: string; snout: string }> = {
  capi: { fur: '#b06f45', dark: '#7f4b2b', snout: '#dcaa7c' },
  jalapa: { fur: '#c98b3a', dark: '#8f5d1d', snout: '#efc683' },
  buriti: { fur: '#7a4a33', dark: '#4f2e1f', snout: '#bd8a66' },
  sussa: { fur: '#c4a088', dark: '#94735c', snout: '#ecd5c2' },
};

const LINE = '#1a1210';
const GOLD = '#e8b02f';
const GOLD_DEEP = '#a8740e';

export interface CapiProps {
  /** Expressão do rosto. */
  expression?: CapiExpression;
  /** Visual (personagem escolhido). */
  look?: CapiLook;
  /** Temporada da fantasia. Sem valor, usa a temporada do contexto. */
  season?: Season;
  /** Veste a fantasia da temporada. Padrão: true. */
  costume?: boolean;
  /** Largura em px. Padrão: 160. */
  size?: number;
  /** Balança de leve (desliga sozinho com "reduzir movimento"). */
  animate?: boolean;
  /** Texto alternativo. Sem ele, o desenho é decorativo. */
  title?: string;
  /** Só o rosto (para avatares pequenos). Vale para a imagem 3D. */
  face?: boolean;
  /** Força o desenho 2D mesmo com imagem 3D configurada (ex.: figurinhas). */
  illustrated?: boolean;
  className?: string;
}

/**
 * Imagem da Capi 3D, configurada pelo app (URLs do próprio app). Vazia: usa o desenho 2D.
 * Só a personagem Capi tem versão 3D; as outras da turma seguem desenhadas.
 */
export const CAPI_ART = { full: '', face: '' };

/**
 * A Capi, mascote original do Capim Dourado Experience: capivara de formas simples,
 * com lenço de capim dourado trançado e fantasia por temporada.
 */
export function Capi({
  expression = 'animada',
  look = 'capi',
  season: seasonProp,
  costume = true,
  size = 160,
  animate = false,
  title,
  face = false,
  illustrated = false,
  className,
}: CapiProps) {
  const ctx = useSeason();
  const season = seasonProp ?? ctx.season;
  const art = face ? CAPI_ART.face : CAPI_ART.full;
  if (look === 'capi' && art && !illustrated) {
    return (
      <img
        src={art}
        alt={title ?? ''}
        width={size}
        className={cx('h-auto select-none', animate && 'animate-bob', className)}
        draggable={false}
      />
    );
  }
  const c = FUR[look];
  const cheer = expression === 'comemorando';
  const asleep = expression === 'dormindo';

  return (
    <svg
      viewBox="0 -26 200 232"
      width={size}
      height={(size * 232) / 200}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx(animate && 'animate-bob', 'overflow-visible', className)}
    >
      <g stroke={LINE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {/* orelhas de coelho (Páscoa) ficam atrás da cabeça */}
        {costume && season === 'pascoa' && (
          <g>
            <g transform="rotate(-14 74 40)">
              <ellipse cx="74" cy="6" rx="15" ry="36" fill="var(--cde-costume-trim)" />
              <ellipse
                cx="74"
                cy="8"
                rx="6.5"
                ry="24"
                fill="var(--cde-costume-main)"
                strokeWidth="0"
              />
            </g>
            <g transform="rotate(12 126 40)">
              <ellipse cx="126" cy="6" rx="15" ry="36" fill="var(--cde-costume-trim)" />
              <ellipse
                cx="126"
                cy="8"
                rx="6.5"
                ry="24"
                fill="var(--cde-costume-main)"
                strokeWidth="0"
              />
            </g>
          </g>
        )}

        {/* braços levantados (comemorando) */}
        {cheer && (
          <>
            <rect
              x="20"
              y="96"
              width="22"
              height="52"
              rx="11"
              fill={c.fur}
              transform="rotate(-30 31 122)"
            />
            <rect
              x="158"
              y="96"
              width="22"
              height="52"
              rx="11"
              fill={c.fur}
              transform="rotate(30 169 122)"
            />
          </>
        )}

        {/* corpo */}
        <path d="M38 204 C38 152 62 128 100 128 C138 128 162 152 162 204 Z" fill={c.fur} />
        <ellipse cx="100" cy="182" rx="30" ry="19" fill={c.snout} strokeWidth="0" />
        {!cheer && (
          <>
            <ellipse cx="70" cy="176" rx="11" ry="17" fill={c.fur} transform="rotate(16 70 176)" />
            <ellipse
              cx="130"
              cy="176"
              rx="11"
              ry="17"
              fill={c.fur}
              transform="rotate(-16 130 176)"
            />
          </>
        )}

        {/* orelhas */}
        <ellipse cx="62" cy="50" rx="13" ry="11" fill={c.dark} />
        <ellipse cx="138" cy="50" rx="13" ry="11" fill={c.dark} />

        {/* cabeça e focinho: a cara quadradona de capivara */}
        <g
          transform={
            expression === 'curiosa' ? 'rotate(-6 100 96)' : asleep ? 'rotate(5 100 96)' : undefined
          }
        >
          <rect x="44" y="44" width="112" height="90" rx="40" fill={c.fur} />
          <rect x="64" y="92" width="72" height="46" rx="21" fill={c.snout} />
          <ellipse cx="87" cy="106" rx="4.5" ry="3.2" fill={LINE} strokeWidth="0" />
          <ellipse cx="113" cy="106" rx="4.5" ry="3.2" fill={LINE} strokeWidth="0" />

          {/* bochechas */}
          {!asleep && (
            <>
              <ellipse
                cx="58"
                cy="100"
                rx="8"
                ry="5"
                fill="#ef8a7a"
                opacity="0.6"
                strokeWidth="0"
              />
              <ellipse
                cx="142"
                cy="100"
                rx="8"
                ry="5"
                fill="#ef8a7a"
                opacity="0.6"
                strokeWidth="0"
              />
            </>
          )}

          <Face expression={expression} />

          {look === 'buriti' && (
            <g fill="none" strokeWidth="4">
              <circle cx="76" cy="80" r="13" />
              <circle cx="124" cy="80" r="13" />
              <path d="M89 80 h22" />
            </g>
          )}
          {look === 'jalapa' && (
            <g fill={c.dark} strokeWidth="0">
              <circle cx="66" cy="94" r="1.8" />
              <circle cx="71" cy="98" r="1.8" />
              <circle cx="134" cy="94" r="1.8" />
              <circle cx="129" cy="98" r="1.8" />
            </g>
          )}
        </g>

        {/* lenço de capim dourado trançado */}
        <path d="M50 128 Q100 152 150 128 L152 142 Q100 168 48 142 Z" fill={GOLD} />
        <path
          d="M53 135 Q100 160 147 135"
          fill="none"
          stroke={GOLD_DEEP}
          strokeWidth="4.5"
          strokeDasharray="5 6"
          strokeLinecap="butt"
        />
        <path d="M126 146 l6 30 l9 -3 l-3 -28 Z" fill={GOLD} strokeWidth="4" />
        <path d="M128 156 l9 -2 M130 166 l9 -2" stroke={GOLD_DEEP} strokeWidth="3" />

        {look === 'sussa' && (
          <g strokeWidth="3.5">
            <circle cx="144" cy="40" r="6" fill={GOLD} />
            <circle cx="153" cy="46" r="6" fill={GOLD} />
            <circle cx="146" cy="52" r="6" fill={GOLD} />
            <circle cx="148" cy="46" r="3.5" fill={GOLD_DEEP} />
          </g>
        )}

        {costume && season === 'natal' && (
          <g>
            <path
              d="M50 50 C56 12 112 -2 144 16 C162 26 172 44 176 64 L150 42 Z"
              fill="var(--cde-costume-main)"
            />
            <rect
              x="40"
              y="42"
              width="120"
              height="20"
              rx="10"
              fill="var(--cde-costume-trim)"
              transform="rotate(-6 100 52)"
            />
            <circle cx="176" cy="68" r="11" fill="var(--cde-costume-trim)" />
          </g>
        )}
        {costume && season === 'halloween' && (
          <g>
            <path
              d="M64 48 L94 -12 Q102 -22 110 -12 L126 4 Q114 0 112 8 L138 44 Z"
              fill="var(--cde-costume-main)"
            />
            <ellipse
              cx="100"
              cy="48"
              rx="70"
              ry="12"
              fill="var(--cde-costume-main)"
              transform="rotate(-5 100 48)"
            />
            <path
              d="M70 38 Q100 30 132 36 L134 44 Q100 38 68 46 Z"
              fill="var(--cde-costume-trim)"
              strokeWidth="3.5"
            />
          </g>
        )}
        {costume && season === 'pascoa' && (
          <g strokeWidth="3.5">
            <path d="M88 132 L100 140 L88 148 Z" fill="var(--cde-costume-main)" />
            <path d="M112 132 L100 140 L112 148 Z" fill="var(--cde-costume-main)" />
            <circle cx="100" cy="140" r="4" fill="var(--cde-costume-trim)" />
          </g>
        )}

        {asleep && (
          <g fill="none" strokeWidth="4" stroke={LINE}>
            <path d="M160 18 h12 l-12 13 h12" />
            <path d="M180 -6 h9 l-9 10 h9" strokeWidth="3.5" />
          </g>
        )}
      </g>
    </svg>
  );
}

function Face({ expression }: { expression: CapiExpression }) {
  switch (expression) {
    case 'comemorando':
      return (
        <g fill="none" strokeWidth="5">
          <path d="M67 84 q9 -12 18 0" />
          <path d="M115 84 q9 -12 18 0" />
          <path d="M86 118 q14 16 28 0 z" fill="#8c1d1d" />
        </g>
      );
    case 'curiosa':
      return (
        <g>
          <circle cx="76" cy="80" r="7.5" fill={LINE} strokeWidth="0" />
          <circle cx="124" cy="81" r="5.5" fill={LINE} strokeWidth="0" />
          <circle cx="78.5" cy="77.5" r="2.4" fill="#fff" strokeWidth="0" />
          <path d="M64 64 q11 -8 22 -2" fill="none" strokeWidth="4.5" />
          <path d="M114 70 q10 -3 20 1" fill="none" strokeWidth="4.5" />
          <circle cx="100" cy="122" r="4" fill="#8c1d1d" strokeWidth="3.5" />
        </g>
      );
    case 'dormindo':
      return (
        <g fill="none" strokeWidth="5">
          <path d="M67 80 q9 7 18 0" />
          <path d="M115 80 q9 7 18 0" />
          <path d="M93 122 h14" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="76" cy="80" r="6.5" fill={LINE} strokeWidth="0" />
          <circle cx="124" cy="80" r="6.5" fill={LINE} strokeWidth="0" />
          <circle cx="78.2" cy="77.6" r="2.2" fill="#fff" strokeWidth="0" />
          <circle cx="126.2" cy="77.6" r="2.2" fill="#fff" strokeWidth="0" />
          <path d="M89 119 q11 10 22 0" fill="none" strokeWidth="5" />
        </g>
      );
  }
}
