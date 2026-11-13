import { z } from 'zod';
import type {
  AlbumState,
  Coupon,
  HuntState,
  MissionWithProgress,
  PointEvent,
  Profile,
  Redemption,
  Reward,
  SeasonId,
  Store,
  Trail,
  Wallet,
} from './domain.js';

/**
 * Contrato entre o app e a API. O app fala com a API só por `GameApi`.
 * Existem duas implementações no app: local (modo demonstração) e HTTP.
 * A API implementa as rotas de `ROUTES` com estes mesmos formatos.
 */

export const trailSchema = z.enum(['kids', 'ela', 'ele', 'todos']);
export const seasonSchema = z.enum(['natal', 'pascoa', 'halloween']);

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  trail: trailSchema,
  character: z.string().min(1).max(40),
  locationConsent: z.boolean(),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = createProfileSchema.partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Precisão informada pelo navegador, em metros. */
  accuracy: z.number().nonnegative(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const scanQrSchema = z.object({ token: z.string().min(3).max(512) });
export type ScanQrInput = z.infer<typeof scanQrSchema>;

export const redeemSchema = z.object({ couponId: z.string().min(1) });
export type RedeemInput = z.infer<typeof redeemSchema>;

/** Códigos de erro de regra de negócio. A API responde `{ error: { code, message } }`. */
export const ERROR_CODES = [
  'unauthorized',
  'profile_not_found',
  'validation',
  'outside_area',
  'low_accuracy',
  'mall_closed',
  'already_checked_in',
  'daily_limit',
  'qr_invalid',
  'qr_expired',
  'qr_already_used',
  'clue_out_of_order',
  'insufficient_coins',
  'coupon_not_found',
  'not_found',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** Resultado comum de qualquer ação que dá pontos. */
export interface PointsResult {
  reward: Reward;
  wallet: Wallet;
  /** Rótulo da ação, para exibir ao usuário. */
  label: string;
  leveledUp: boolean;
  streakDays: number;
  /** Verdadeiro quando a ação completou 7, 14, 21... dias seguidos (baú). */
  streakMilestone: boolean;
}

export type CheckInResult = PointsResult & { distanceM: number };

export type ScanResult = PointsResult & {
  kind: 'checkin' | 'store' | 'secret' | 'clue';
  /** Loja visitada, quando `kind` é `store`. */
  store?: Store;
  /** Estado da caça depois da leitura, quando `kind` é `clue`. */
  hunt?: HuntState;
  /** Figurinha ganha, se houver. */
  stickerId?: string;
};

export interface RedeemResult {
  redemption: Redemption;
  wallet: Wallet;
}

export interface TodayStatus {
  date: string;
  dailyOpenDone: boolean;
  checkInDone: boolean;
  storesVisited: number;
  mallOpen: boolean;
}

export interface GameApi {
  getMe(): Promise<Profile | null>;
  createProfile(input: CreateProfileInput): Promise<Profile>;
  updateProfile(input: UpdateProfileInput): Promise<Profile>;
  deleteAccount(): Promise<void>;
  getToday(): Promise<TodayStatus>;
  /** Pontua o primeiro acesso do dia. Chamadas repetidas no mesmo dia devolvem `null`. */
  dailyOpen(): Promise<PointsResult | null>;
  checkIn(input: CheckInInput): Promise<CheckInResult>;
  scanQr(input: ScanQrInput): Promise<ScanResult>;
  listMissions(): Promise<MissionWithProgress[]>;
  getHunt(seasonId: SeasonId): Promise<HuntState>;
  listStores(): Promise<Store[]>;
  listCoupons(trail?: Trail): Promise<Coupon[]>;
  redeemCoupon(input: RedeemInput): Promise<RedeemResult>;
  listRedemptions(): Promise<Redemption[]>;
  /** Troca moedas por um bilhete de sorteio (sorteio simulado no MVP). */
  buyTicket(): Promise<Wallet>;
  getAlbum(seasonId: SeasonId): Promise<AlbumState>;
  listEvents(): Promise<PointEvent[]>;
}

/** Rotas HTTP da API, todas sob `/v1`. Autenticação: `Authorization: Bearer <JWT do Supabase>`. */
export const ROUTES = {
  health: { method: 'GET', path: '/health' },
  getMe: { method: 'GET', path: '/v1/me' },
  createProfile: { method: 'POST', path: '/v1/me' },
  updateProfile: { method: 'PATCH', path: '/v1/me' },
  deleteAccount: { method: 'DELETE', path: '/v1/me' },
  getToday: { method: 'GET', path: '/v1/me/today' },
  dailyOpen: { method: 'POST', path: '/v1/me/daily-open' },
  listEvents: { method: 'GET', path: '/v1/me/events' },
  checkIn: { method: 'POST', path: '/v1/checkin' },
  scanQr: { method: 'POST', path: '/v1/qr/scan' },
  listMissions: { method: 'GET', path: '/v1/missions' },
  getHunt: { method: 'GET', path: '/v1/hunts/:seasonId' },
  listStores: { method: 'GET', path: '/v1/stores' },
  listCoupons: { method: 'GET', path: '/v1/rewards/coupons' },
  redeemCoupon: { method: 'POST', path: '/v1/rewards/redeem' },
  listRedemptions: { method: 'GET', path: '/v1/rewards/redemptions' },
  buyTicket: { method: 'POST', path: '/v1/raffles/tickets' },
  getAlbum: { method: 'GET', path: '/v1/album/:seasonId' },
} as const satisfies Record<string, { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }>;

/**
 * Códigos de QR.
 * Demonstração: `cde:<kind>:<id>` (ex.: `cde:secret:s1`, `cde:clue:natal-2026:3`, `cde:store:leitura`).
 * Produção: token assinado pela API, com expiração; o formato é decidido no módulo `qr`.
 */
export const DEMO_QR_PREFIX = 'cde:';
export function demoQr(kind: 'checkin' | 'store' | 'secret' | 'clue', id: string): string {
  return `${DEMO_QR_PREFIX}${kind}:${id}`;
}
