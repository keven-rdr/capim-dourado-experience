import type { Coupon, GoldenWindow, RouletteSliceView } from './domain.js';

/**
 * Roleta de cupons e hora dourada.
 * Prêmios, pesos e horários são EXEMPLOS: nada disso foi combinado com lojistas nem com o
 * shopping. A hora dourada pode ser trocada na API por `GOLDEN_HOURS_JSON`, sem mexer no código.
 */

export interface RouletteSlice {
  /** Cupom do catálogo que a fatia entrega. */
  couponId: string;
  /** Texto curto, escrito dentro da fatia. */
  label: string;
  /** Peso do sorteio. Quanto maior, mais provável. Fatias de maior valor pesam menos. */
  weight: number;
}

/** Ordem do desenho: a fatia 0 começa no topo, seguindo o sentido horário. */
export const ROULETTE_SLICES: readonly RouletteSlice[] = [
  { couponId: 'c-pipoca', label: 'Cinemark', weight: 14 },
  { couponId: 'c-esporte', label: 'Centauro', weight: 6 },
  { couponId: 'c-brinquedo', label: 'Ri Happy', weight: 12 },
  { couponId: 'c-sorvete', label: "McDonald's", weight: 20 },
  { couponId: 'c-livro', label: 'Leitura', weight: 16 },
  { couponId: 'c-joia', label: 'Vivara', weight: 8 },
  { couponId: 'c-basico', label: 'Hering', weight: 14 },
  { couponId: 'c-estac', label: 'Estac. 1h', weight: 10 },
];

/** Os cupons da roleta vencem rápido: quem ganha tem motivo para voltar logo. */
export const ROULETTE_COUPON_VALID_DAYS = 2;

/** Giros de quem faz check-in fora da hora dourada. */
export const BASE_SPINS = 1;
/** Na hora dourada os giros do check-in são multiplicados por este fator. */
export const GOLDEN_SPIN_FACTOR = 2;

/**
 * Horários de baixo movimento (exemplo): segunda a quinta, 14h às 17h, e domingo, 14h às 16h.
 * O shopping ajusta isto sem alterar o código (veja `GOLDEN_HOURS_JSON` na API).
 */
export const GOLDEN_WINDOWS: readonly GoldenWindow[] = [
  { days: [1, 2, 3, 4], from: '14:00', to: '17:00' },
  { days: [0], from: '14:00', to: '16:00' },
];

/** Os cupons sem loja (ex.: estacionamento) são conferidos no balcão do shopping. */
export const MALL_DESK_ID = 'shopping';
export const MALL_DESK_NAME = 'Capim Dourado Shopping (balcão)';

/** Loja que confere o cupom: a do cupom ou, sem loja, o balcão do shopping. */
export function couponStoreId(coupon: Pick<Coupon, 'storeId'>): string {
  return coupon.storeId ?? MALL_DESK_ID;
}

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana (0 = domingo) e minuto do dia no horário de Palmas. */
function palmasClock(date: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Araguaina',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: WEEKDAY[value('weekday')] ?? 0,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

/** `HH:MM` em minutos desde a meia-noite, ou `null` se o texto não for um horário válido. */
export function parseClock(text: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** O instante cai em alguma janela da hora dourada? Usa o horário de Palmas. */
export function isGoldenHour(
  date: Date,
  windows: readonly GoldenWindow[] = GOLDEN_WINDOWS,
): boolean {
  const { weekday, minutes } = palmasClock(date);
  return windows.some((window) => {
    const from = parseClock(window.from);
    const to = parseClock(window.to);
    if (from === null || to === null) return false;
    return window.days.includes(weekday) && minutes >= from && minutes < to;
  });
}

/** Giros ganhos pelo check-in feito em `checkInAt`. Sem check-in, nenhum. */
export function spinsForCheckIn(
  checkInAt: Date | null,
  windows: readonly GoldenWindow[] = GOLDEN_WINDOWS,
): number {
  if (!checkInAt) return 0;
  return isGoldenHour(checkInAt, windows) ? BASE_SPINS * GOLDEN_SPIN_FACTOR : BASE_SPINS;
}

/**
 * Sorteia uma fatia pelo peso. `random` devolve um número em [0, 1).
 * Injetável para os testes serem determinísticos.
 */
export function pickSlice(
  random: () => number,
  slices: readonly RouletteSlice[] = ROULETTE_SLICES,
): number {
  const total = slices.reduce((sum, slice) => sum + slice.weight, 0);
  let point = random() * total;
  for (const [index, slice] of slices.entries()) {
    point -= slice.weight;
    if (point < 0) return index;
  }
  return slices.length - 1;
}

/** Monta o que o app desenha, juntando as fatias ao catálogo de cupons. */
export function sliceViews(
  coupons: readonly Coupon[],
  slices: readonly RouletteSlice[] = ROULETTE_SLICES,
): RouletteSliceView[] {
  return slices.map((slice, index) => {
    const coupon = coupons.find((item) => item.id === slice.couponId);
    if (!coupon) throw new Error(`Cupom da roleta fora do catálogo: ${slice.couponId}`);
    return { index, label: slice.label, storeName: coupon.storeName, title: coupon.title };
  });
}

const WEEKDAY_NAME = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'] as const;

/** Texto para o app: "seg. a qui., 14h às 17h". */
export function describeGoldenWindow(window: GoldenWindow): string {
  const days = [...window.days].sort((a, b) => a - b);
  const first = days[0];
  const last = days[days.length - 1];
  const consecutive = days.every((day, i) => i === 0 || day === (days[i - 1] ?? 0) + 1);
  const hour = (text: string) => {
    const [h, m] = text.split(':');
    return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
  };
  let label: string;
  if (first === undefined || last === undefined) label = '';
  else if (days.length === 1) label = WEEKDAY_NAME[first] ?? '';
  else if (consecutive) label = `${WEEKDAY_NAME[first]} a ${WEEKDAY_NAME[last]}`;
  else label = days.map((day) => WEEKDAY_NAME[day]).join(', ');
  return `${label}, ${hour(window.from)} às ${hour(window.to)}`;
}
