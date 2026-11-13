import type { SVGProps } from 'react';

/**
 * Ícones próprios da identidade, desenhados com traço grosso e pontas arredondadas.
 * Nada de biblioteca de ícones nem emoji: todos seguem o mesmo traço da Capi.
 */
const PATHS = {
  home: (
    <>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 9.5V20h4.5v-5.2h3V20H18V9.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12 19.5 4.5M16 4.5h3.5V8" />
    </>
  ),
  map: (
    <>
      <path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5V20h14v-7.5M12 8.5V20" />
      <path d="M12 8.5C10 4 6.5 4.5 7.5 7c.5 1.2 2.5 1.5 4.5 1.5Zm0 0c2-4.5 5.5-4 4.5-1.5-.5 1.2-2.5 1.5-4.5 1.5Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1M20 14v1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2c-.6-.9-1.6-1.4-2.8-1.4-1.7 0-3 1-3 2.3 0 3 6 1.5 6 4.3 0 1.3-1.3 2.3-3 2.3-1.3 0-2.4-.6-3-1.5M12 6v1.8M12 16.7v1.8" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 7.5h17v3a2 2 0 0 0 0 3v3h-17v-3a2 2 0 0 0 0-3z" />
      <path d="M14.5 7.5v9" strokeDasharray="1.6 2" />
    </>
  ),
  star: <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />,
  flame: (
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.4 3.6-8.8 1.9 1.3 2.6 3 2.6 4.6 1-.8 1.6-2 1.6-3.6 2.8 2 5.2 4.8 5.2 7.8 0 3.6-2.6 6.2-6.5 6.2Z" />
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5c.6 4.4 2.3 6.4 6.5 7-4.2.7-5.9 2.7-6.5 7.5-.6-4.8-2.3-6.8-6.5-7.5 4.2-.6 5.9-2.6 6.5-7ZM19 16.5c.2 1.4.8 2 2 2.2-1.2.2-1.8.8-2 2.3-.2-1.5-.8-2.1-2-2.3 1.2-.2 1.8-.8 2-2.2Z" />
  ),
  camera: (
    <>
      <path d="M4 8.5h3.5l1.6-2.5h5.8l1.6 2.5H20V19H4z" />
      <circle cx="12" cy="13.2" r="3.4" />
    </>
  ),
  flash: <path d="M13.5 3 5.5 13.5h5.5L10 21l8-10.5h-5.5z" />,
  keyboard: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M7.5 14h9" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  arrowRight: <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" />,
  check: <path d="m4.5 12.5 4.8 4.8L19.5 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.4 2.2" />
    </>
  ),
  album: (
    <>
      <path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
      <path d="M5 16.5a3 3 0 0 1 3-3h10.5M9.5 8.5h5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  location: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 13v6.5h14V13" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 11a7.5 7.5 0 0 0-13.6-3.8M4.5 13a7.5 7.5 0 0 0 13.6 3.8" />
      <path d="M5.5 3.5v4h4M18.5 20.5v-4h-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8.5 4.5L12 13 3.5 8.5z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
  bolt: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  puzzle: (
    <path d="M5 5h4.2a2.3 2.3 0 1 1 4.6 0H18v4.2a2.3 2.3 0 1 1 0 4.6V18h-4.2a2.3 2.3 0 1 0-4.6 0H5v-4.2a2.3 2.3 0 1 0 0-4.6z" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** Nome do ícone. */
  name: IconName;
  /** Tamanho em px. Padrão: 24. */
  size?: number;
  /** Texto para leitores de tela. Sem ele, o ícone é decorativo. */
  label?: string;
}

/** Ícone em SVG com o traço da identidade (2,4 px, pontas redondas). */
export function Icon({ name, size = 24, label, strokeWidth = 2.4, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
