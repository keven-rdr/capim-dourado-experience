import {
  type AlbumState,
  type ChatMessageInput,
  type ChatReply,
  type CheckInInput,
  type CheckInResult,
  type Coupon,
  type CreateProfileInput,
  type GameApi,
  type HuntState,
  type MarkCouponUsedInput,
  type MerchantApi,
  type MissionWithProgress,
  type PointEvent,
  type PointsResult,
  type Profile,
  type Promotion,
  type PromotionInput,
  type RedeemInput,
  type RedeemResult,
  type Redemption,
  ROUTES,
  type RouletteStatus,
  type ScanQrInput,
  type ScanResult,
  type SeasonId,
  type SpinResult,
  type Store,
  type StorePanelApi,
  type StoreStats,
  type TodayStatus,
  type Trail,
  type UpdateProfileInput,
  type UseCouponResult,
  type Wallet,
} from '@cde/shared';
import { GameApiError, isApiErrorBody } from './errors';

type RouteName = keyof typeof ROUTES;

export interface HttpGameApiOptions {
  /** URL base da API (ex.: https://api.exemplo.com). */
  baseUrl: string;
  /** Devolve o JWT do Supabase, se houver. Vai em `Authorization: Bearer`. */
  getToken?: () => Promise<string | null>;
  /** Chave da loja, para o painel (cabeçalho `x-store-key`). Não é o login do visitante. */
  getStoreKey?: () => string | null;
  fetch?: typeof fetch;
}

interface RequestOptions {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: unknown;
}

/** Adaptador HTTP para app, painel de loja e lojista. */
export class HttpGameApi implements GameApi, StorePanelApi, MerchantApi {
  private readonly baseUrl: string;
  private readonly getToken: () => Promise<string | null>;
  private readonly getStoreKey: () => string | null;
  private readonly fetcher: typeof fetch;

  constructor(options: HttpGameApiOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.getToken = options.getToken ?? (async () => null);
    this.getStoreKey = options.getStoreKey ?? (() => null);
    this.fetcher = options.fetch ?? ((...args) => fetch(...args));
  }

  private async request<T>(name: RouteName, options: RequestOptions = {}): Promise<T> {
    const route = ROUTES[name];
    let path: string = route.path;
    for (const [key, value] of Object.entries(options.params ?? {})) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) query.set(key, value);
    }
    const qs = query.toString();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const storeKey = this.getStoreKey();
    if (storeKey) headers['x-store-key'] = storeKey;

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}${qs ? `?${qs}` : ''}`, {
        method: route.method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (cause) {
      throw new GameApiError('network', 'Falha de conexão com a API.', cause);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new GameApiError('network', 'Resposta inesperada da API.', text, response.status);
      }
    }
    if (!response.ok) {
      if (isApiErrorBody(data)) throw GameApiError.fromBody(data, response.status);
      const code =
        response.status === 401
          ? 'unauthorized'
          : response.status === 404
            ? 'not_found'
            : 'network';
      throw new GameApiError(code, `Erro ${response.status} da API.`, data, response.status);
    }
    return data as T;
  }

  async getMe(): Promise<Profile | null> {
    try {
      return await this.request<Profile | null>('getMe');
    } catch (error) {
      if (error instanceof GameApiError && error.code === 'profile_not_found') return null;
      throw error;
    }
  }
  createProfile(input: CreateProfileInput) {
    return this.request<Profile>('createProfile', { body: input });
  }
  updateProfile(input: UpdateProfileInput) {
    return this.request<Profile>('updateProfile', { body: input });
  }
  async deleteAccount(): Promise<void> {
    await this.request<void>('deleteAccount');
  }
  getToday() {
    return this.request<TodayStatus>('getToday');
  }
  dailyOpen() {
    return this.request<PointsResult | null>('dailyOpen');
  }
  checkIn(input: CheckInInput) {
    return this.request<CheckInResult>('checkIn', { body: input });
  }
  scanQr(input: ScanQrInput) {
    return this.request<ScanResult>('scanQr', { body: input });
  }
  listMissions() {
    return this.request<MissionWithProgress[]>('listMissions');
  }
  getHunt(seasonId: SeasonId) {
    return this.request<HuntState>('getHunt', { params: { seasonId } });
  }
  listStores() {
    return this.request<Store[]>('listStores');
  }
  listCoupons(trail?: Trail) {
    return this.request<Coupon[]>('listCoupons', { query: { trail } });
  }
  redeemCoupon(input: RedeemInput) {
    return this.request<RedeemResult>('redeemCoupon', { body: input });
  }
  listRedemptions() {
    return this.request<Redemption[]>('listRedemptions');
  }
  buyTicket() {
    return this.request<Wallet>('buyTicket');
  }
  getAlbum(seasonId: SeasonId) {
    return this.request<AlbumState>('getAlbum', { params: { seasonId } });
  }
  listEvents() {
    return this.request<PointEvent[]>('listEvents');
  }
  getRoulette() {
    return this.request<RouletteStatus>('getRoulette');
  }
  spinRoulette() {
    return this.request<SpinResult>('spinRoulette');
  }
  getStoreStats(storeId: string) {
    return this.request<StoreStats>('getStoreStats', { params: { storeId } });
  }
  markCouponUsed(storeId: string, input: MarkCouponUsedInput) {
    return this.request<UseCouponResult>('markCouponUsed', { params: { storeId }, body: input });
  }
  listPromotions(storeId?: string) {
    return this.request<Promotion[]>('listPromotions', { query: { storeId } });
  }
  sendChatMessage(input: ChatMessageInput) {
    return this.request<ChatReply>('sendChatMessage', { body: input });
  }
  listManagedStores() {
    return this.request<Store[]>('listManagedStores');
  }
  listManagedPromotions(storeId: string) {
    return this.request<Promotion[]>('listManagedPromotions', { query: { storeId } });
  }
  createPromotion(input: PromotionInput) {
    return this.request<Promotion>('createPromotion', { body: input });
  }
  updatePromotion(id: string, input: PromotionInput) {
    return this.request<Promotion>('updatePromotion', { params: { id }, body: input });
  }
}
