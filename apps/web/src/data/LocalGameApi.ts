import {
  type AlbumState,
  addReward,
  BASE_SPINS,
  type CheckInInput,
  type CheckInResult,
  COMMON_STICKER_POOL,
  COUPONS,
  type Coupon,
  type CreateProfileInput,
  CURRENT_SEASON,
  checkInSchema,
  couponStoreId,
  createProfileSchema,
  DAILY_LIMITS,
  DEMO_QR_PREFIX,
  distanceM,
  EMPTY_STREAK,
  EMPTY_WALLET,
  type Floor,
  type GameApi,
  GOLDEN_SPIN_FACTOR,
  GOLDEN_WINDOWS,
  HUNTS,
  type Hunt,
  type HuntState,
  hitStreakMilestone,
  isGoldenHour,
  isMallOpen,
  levelFor,
  localDate,
  MALL_AREA_APPROX,
  MALL_CENTER,
  MALL_DESK_ID,
  MALL_DESK_NAME,
  MAX_GPS_ACCURACY_M,
  type MarkCouponUsedInput,
  MISSIONS,
  type Mission,
  type MissionWithProgress,
  markCouponUsedSchema,
  nextStreak,
  POINT_RULES,
  type PointAction,
  type PointEvent,
  type PointsResult,
  type Profile,
  pickSlice,
  pointInPolygon,
  type QrKind,
  type RedeemInput,
  type RedeemResult,
  type Redemption,
  type Reward,
  ROULETTE_COUPON_VALID_DAYS,
  ROULETTE_SLICES,
  type RouletteStatus,
  redeemSchema,
  type ScanQrInput,
  type ScanResult,
  SECRETS,
  type SeasonId,
  type SpinResult,
  STICKERS,
  STORES,
  type Store,
  type StorePanelApi,
  type StoreStats,
  scanQrSchema,
  sliceViews,
  TICKET_COST,
  type TodayStatus,
  type Trail,
  type UpdateProfileInput,
  type UseCouponResult,
  updateProfileSchema,
  type Wallet,
} from '@cde/shared';
import { GameApiError } from './errors';

/** Armazenamento chave-valor (o `localStorage` do navegador ou um dublê nos testes). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalGameApiOptions {
  storage?: KeyValueStorage;
  /** Relógio. O modo demonstração usa um relógio adiantado para "avançar um dia". */
  now?: () => Date;
  /** Ignora o horário de funcionamento (apresentação fora do horário). */
  ignoreMallHours?: () => boolean;
  storageKey?: string;
  random?: () => number;
  /** Força a hora dourada (apresentação fora dos horários de baixo movimento). */
  forceGolden?: () => boolean;
}

interface DayLog {
  dailyOpen: boolean;
  checkIn: boolean;
  /** Instante e hora dourada do check-in do dia: definem quantos giros o dia rende. */
  checkInAt?: string;
  checkInGolden?: boolean;
  stores: string[];
  xp: number;
}

interface ScanLog {
  kind: QrKind;
  id: string;
  floor: Floor;
  date: string;
}

interface SpinLog {
  date: string;
  sliceIndex: number;
  couponId: string;
}

interface LocalState {
  version: 1;
  profile: Profile | null;
  events: PointEvent[];
  redemptions: Redemption[];
  stickers: string[];
  secrets: string[];
  hunts: Record<string, number>;
  days: Record<string, DayLog>;
  claimed: string[];
  scans: ScanLog[];
  spins: SpinLog[];
}

type Amount = Omit<Reward, 'stickerId'>;

const EMPTY_STATE = (): LocalState => ({
  version: 1,
  profile: null,
  events: [],
  redemptions: [],
  stickers: [],
  secrets: [],
  hunts: {},
  days: {},
  claimed: [],
  scans: [],
  spins: [],
});

/** Missões cuja recompensa já vem da própria ação (check-in, baú final da caça). */
const IMPLICIT_REWARD = new Set(['m-checkin', 'm-natal']);

/** Figurinha rara do baú da sequência de 7 dias (o seed não diz de onde vem `natal-11`). */
const STREAK_CHEST_STICKER = 'natal-11';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DAY_MS = 86_400_000;

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Segunda-feira da semana de uma data AAAA-MM-DD. */
export function weekStart(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  const day = new Date(ms).getUTCDay();
  const monday = ms - ((day + 6) % 7) * DAY_MS;
  return new Date(monday).toISOString().slice(0, 10);
}

/** Lê um código de demonstração `cde:<kind>:<id>`. Aceita maiúsculas e espaços nas pontas. */
export function parseDemoToken(token: string): { kind: QrKind; id: string } | null {
  const raw = token.trim();
  if (!raw.toLowerCase().startsWith(DEMO_QR_PREFIX)) return null;
  const rest = raw.slice(DEMO_QR_PREFIX.length);
  const cut = rest.indexOf(':');
  if (cut <= 0) return null;
  const kind = rest.slice(0, cut).toLowerCase();
  const id = rest
    .slice(cut + 1)
    .trim()
    .toLowerCase();
  if (!id) return null;
  if (kind !== 'checkin' && kind !== 'store' && kind !== 'secret' && kind !== 'clue') return null;
  return { kind, id };
}

/**
 * `GameApi` que roda inteiro no navegador, com `localStorage`.
 * Aplica as regras de `@cde/shared` (limites diários, sequência, níveis, caça em ordem,
 * cupons com código e validade). É o padrão do protótipo e o motor do modo demonstração.
 * Em produção, quem aplica as regras de verdade é a API (RN09).
 */
export class LocalGameApi implements GameApi, StorePanelApi {
  private readonly storage: KeyValueStorage;
  private readonly now: () => Date;
  private readonly ignoreHours: () => boolean;
  private readonly key: string;
  private readonly random: () => number;
  private readonly forceGolden: () => boolean;

  constructor(options: LocalGameApiOptions = {}) {
    this.storage =
      options.storage ?? (typeof localStorage === 'undefined' ? memoryStorage() : localStorage);
    this.now = options.now ?? (() => new Date());
    this.ignoreHours = options.ignoreMallHours ?? (() => false);
    this.key = options.storageKey ?? 'cde:local:v1';
    this.random = options.random ?? Math.random;
    this.forceGolden = options.forceGolden ?? (() => false);
  }

  // ---------- estado ----------

  private load(): LocalState {
    const raw = this.storage.getItem(this.key);
    if (!raw) return EMPTY_STATE();
    try {
      const parsed = JSON.parse(raw) as LocalState;
      return parsed.version === 1 ? { ...EMPTY_STATE(), ...parsed } : EMPTY_STATE();
    } catch {
      return EMPTY_STATE();
    }
  }

  private save(state: LocalState): void {
    this.storage.setItem(this.key, JSON.stringify(state));
  }

  private today(): string {
    return localDate(this.now());
  }

  private day(state: LocalState, date: string): DayLog {
    let log = state.days[date];
    if (!log) {
      log = { dailyOpen: false, checkIn: false, stores: [], xp: 0 };
      state.days[date] = log;
    }
    return log;
  }

  private requireProfile(state: LocalState): Profile {
    if (!state.profile) throw new GameApiError('profile_not_found', 'Perfil não encontrado.');
    return state.profile;
  }

  private mallOpen(): boolean {
    return this.ignoreHours() || isMallOpen(this.now());
  }

  private goldenNow(): boolean {
    return this.forceGolden() || isGoldenHour(this.now());
  }

  /** Registra o check-in do dia e guarda se caiu na hora dourada (define os giros do dia). */
  private markCheckIn(log: DayLog): void {
    log.checkIn = true;
    log.checkInAt = this.now().toISOString();
    log.checkInGolden = this.goldenNow();
  }

  private id(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `id-${Date.now().toString(36)}-${Math.floor(this.random() * 1e9).toString(36)}`;
  }

  // ---------- pontos ----------

  /** Credita pontos respeitando o teto diário de XP e registra no histórico. */
  private grant(state: LocalState, action: string, label: string, amount: Amount): Amount {
    const profile = this.requireProfile(state);
    const log = this.day(state, this.today());
    const room = Math.max(0, DAILY_LIMITS.xp - log.xp);
    const xp = Math.min(amount.xp, room);
    log.xp += xp;
    const granted = { xp, coins: amount.coins, tickets: amount.tickets };
    profile.wallet = addReward(profile.wallet, granted);
    state.events.push({ id: this.id(), action, label, ...granted, at: this.now().toISOString() });
    return granted;
  }

  private grantRule(state: LocalState, action: PointAction): Amount {
    const rule = POINT_RULES[action];
    return this.grant(state, action, rule.label, rule);
  }

  private giveSticker(state: LocalState, stickerId: string | undefined): string | undefined {
    if (!stickerId || state.stickers.includes(stickerId)) return undefined;
    state.stickers.push(stickerId);
    return stickerId;
  }

  private nextCommonSticker(state: LocalState): string | undefined {
    const pool = COMMON_STICKER_POOL[CURRENT_SEASON];
    return this.giveSticker(
      state,
      pool.find((id) => !state.stickers.includes(id)),
    );
  }

  /** Marca atividade no dia (sequência). No 7º, 14º... dia, abre o baú. */
  private touch(state: LocalState): { milestone: boolean; bonus: Reward[] } {
    const profile = this.requireProfile(state);
    const before = profile.streak;
    const after = nextStreak(before, this.today());
    profile.streak = after;
    if (!hitStreakMilestone(before, after)) return { milestone: false, bonus: [] };
    const amount = this.grantRule(state, 'streak_7');
    const stickerId = this.giveSticker(state, STREAK_CHEST_STICKER);
    return { milestone: true, bonus: [{ ...amount, stickerId }] };
  }

  private result(
    state: LocalState,
    xpBefore: number,
    label: string,
    parts: Reward[],
    milestone: boolean,
  ): PointsResult {
    const profile = this.requireProfile(state);
    const reward: Reward = { xp: 0, coins: 0, tickets: 0 };
    for (const part of parts) {
      reward.xp += part.xp;
      reward.coins += part.coins;
      reward.tickets += part.tickets;
      if (part.stickerId && !reward.stickerId) reward.stickerId = part.stickerId;
    }
    return {
      reward,
      wallet: { ...profile.wallet },
      label,
      leveledUp: levelFor(xpBefore).id !== levelFor(profile.wallet.xp).id,
      streakDays: profile.streak.days,
      streakMilestone: milestone,
    };
  }

  // ---------- missões ----------

  private missionKey(mission: Mission): string {
    const date = this.today();
    if (mission.kind === 'daily') return `${mission.id}:${date}`;
    if (mission.kind === 'weekly') return `${mission.id}:${weekStart(date)}`;
    return `${mission.id}:season`;
  }

  private missionProgress(state: LocalState, mission: Mission): number {
    const date = this.today();
    const week = weekStart(date);
    const thisWeek = state.scans.filter((s) => weekStart(s.date) === week);
    switch (mission.id) {
      case 'm-checkin':
        return state.days[date]?.checkIn ? 1 : 0;
      case 'm-lojas':
        return new Set(thisWeek.filter((s) => s.kind === 'store').map((s) => s.id)).size;
      case 'm-segredos':
        return state.secrets.length;
      case 'm-sobe':
        return (
          (thisWeek.some((s) => s.floor === 'terreo') ? 1 : 0) +
          (thisWeek.some((s) => s.floor === 'segundo') ? 1 : 0)
        );
      default: {
        if (mission.kind === 'season') {
          const hunt = HUNTS.find((h) => h.seasonId === mission.seasonId);
          return hunt ? (state.hunts[hunt.id] ?? 0) : 0;
        }
        return 0;
      }
    }
  }

  /** Paga o bônus das missões que acabaram de ser concluídas. */
  private settleMissions(state: LocalState): Reward[] {
    const bonus: Reward[] = [];
    for (const mission of MISSIONS) {
      if (IMPLICIT_REWARD.has(mission.id)) continue;
      const key = this.missionKey(mission);
      if (state.claimed.includes(key)) continue;
      if (this.missionProgress(state, mission) < mission.target) continue;
      state.claimed.push(key);
      const action = mission.kind === 'season' ? 'season_mission' : 'mission';
      const amount = this.grant(
        state,
        action,
        `Missão concluída: ${mission.title}`,
        mission.reward,
      );
      bonus.push({ ...amount, stickerId: this.giveSticker(state, mission.reward.stickerId) });
    }
    return bonus;
  }

  private huntState(state: LocalState, hunt: Hunt): HuntState {
    const solved = Math.min(state.hunts[hunt.id] ?? 0, hunt.clues.length);
    return {
      // O local do QR só aparece depois de encontrado.
      hunt: {
        ...hunt,
        clues: hunt.clues.map((clue) =>
          clue.order <= solved ? clue : { ...clue, locationLabel: '' },
        ),
      },
      solved,
      completed: solved >= hunt.clues.length,
    };
  }

  // ---------- GameApi ----------

  async getMe(): Promise<Profile | null> {
    return this.load().profile;
  }

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const parsed = createProfileSchema.safeParse(input);
    if (!parsed.success)
      throw new GameApiError('validation', 'Dados do perfil inválidos.', parsed.error.issues);
    const state = EMPTY_STATE();
    state.profile = {
      id: this.id(),
      ...parsed.data,
      wallet: { ...EMPTY_WALLET },
      streak: { ...EMPTY_STREAK },
      createdAt: this.now().toISOString(),
    };
    this.grantRule(state, 'welcome');
    this.save(state);
    return { ...state.profile };
  }

  async updateProfile(input: UpdateProfileInput): Promise<Profile> {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success)
      throw new GameApiError('validation', 'Dados do perfil inválidos.', parsed.error.issues);
    const state = this.load();
    const profile = this.requireProfile(state);
    const clean = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    );
    state.profile = { ...profile, ...clean };
    this.save(state);
    return { ...state.profile };
  }

  async deleteAccount(): Promise<void> {
    this.storage.removeItem(this.key);
  }

  async getToday(): Promise<TodayStatus> {
    const state = this.load();
    const date = this.today();
    const log = state.days[date];
    return {
      date,
      dailyOpenDone: log?.dailyOpen ?? false,
      checkInDone: log?.checkIn ?? false,
      storesVisited: log?.stores.length ?? 0,
      mallOpen: this.mallOpen(),
    };
  }

  async dailyOpen(): Promise<PointsResult | null> {
    const state = this.load();
    const profile = this.requireProfile(state);
    const log = this.day(state, this.today());
    if (log.dailyOpen) return null;
    const xpBefore = profile.wallet.xp;
    log.dailyOpen = true;
    const amount = this.grantRule(state, 'daily_open');
    const { milestone, bonus } = this.touch(state);
    const result = this.result(
      state,
      xpBefore,
      POINT_RULES.daily_open.label,
      [amount, ...bonus],
      milestone,
    );
    this.save(state);
    return result;
  }

  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const parsed = checkInSchema.safeParse(input);
    if (!parsed.success)
      throw new GameApiError('validation', 'Localização inválida.', parsed.error.issues);
    const state = this.load();
    const profile = this.requireProfile(state);
    const log = this.day(state, this.today());
    if (log.checkIn) throw new GameApiError('already_checked_in', 'Check-in de hoje já feito.');
    if (!this.mallOpen())
      throw new GameApiError('mall_closed', 'Fora do horário de funcionamento.');
    if (parsed.data.accuracy > MAX_GPS_ACCURACY_M) {
      throw new GameApiError('low_accuracy', 'Precisão do GPS insuficiente.', {
        accuracy: parsed.data.accuracy,
        max: MAX_GPS_ACCURACY_M,
      });
    }
    const point = { lat: parsed.data.lat, lng: parsed.data.lng };
    const distance = Math.round(distanceM(point, MALL_CENTER));
    if (!pointInPolygon(point, MALL_AREA_APPROX)) {
      throw new GameApiError('outside_area', 'Fora da área do shopping.', { distanceM: distance });
    }
    const xpBefore = profile.wallet.xp;
    this.markCheckIn(log);
    const amount = this.grantRule(state, 'checkin');
    const stickerId = this.nextCommonSticker(state);
    const { milestone, bonus } = this.touch(state);
    const missions = this.settleMissions(state);
    const result = this.result(
      state,
      xpBefore,
      POINT_RULES.checkin.label,
      [{ ...amount, stickerId }, ...bonus, ...missions],
      milestone,
    );
    this.save(state);
    return { ...result, distanceM: distance };
  }

  async scanQr(input: ScanQrInput): Promise<ScanResult> {
    const parsed = scanQrSchema.safeParse(input);
    if (!parsed.success) throw new GameApiError('qr_invalid', 'Código vazio ou curto demais.');
    const token = parseDemoToken(parsed.data.token);
    if (!token) throw new GameApiError('qr_invalid', 'Código não reconhecido.');

    const state = this.load();
    const profile = this.requireProfile(state);
    const date = this.today();
    const log = this.day(state, date);
    const xpBefore = profile.wallet.xp;

    const resolve = (): {
      kind: QrKind;
      floor: Floor;
      label: string;
      parts: Reward[];
      extra: Partial<ScanResult>;
    } => {
      switch (token.kind) {
        case 'checkin': {
          if (log.checkIn)
            throw new GameApiError('already_checked_in', 'Check-in de hoje já feito.');
          this.ensureOpen();
          this.markCheckIn(log);
          const amount = this.grantRule(state, 'checkin');
          const stickerId = this.nextCommonSticker(state);
          return {
            kind: 'checkin',
            floor: 'terreo',
            label: POINT_RULES.checkin.label,
            parts: [{ ...amount, stickerId }],
            extra: { stickerId },
          };
        }
        case 'store': {
          const store = STORES.find((s) => s.id === token.id);
          if (!store) throw new GameApiError('qr_invalid', 'Loja não encontrada.');
          this.ensureOpen();
          if (log.stores.includes(store.id)) {
            throw new GameApiError('qr_already_used', 'Visita a esta loja já registrada hoje.');
          }
          if (log.stores.length >= DAILY_LIMITS.store_visit) {
            throw new GameApiError('daily_limit', 'Limite de lojas do dia alcançado.');
          }
          log.stores.push(store.id);
          const amount = this.grantRule(state, 'store_visit');
          const stickerId = this.nextCommonSticker(state);
          return {
            kind: 'store',
            floor: store.floor,
            label: `${POINT_RULES.store_visit.label}: ${store.name}`,
            parts: [{ ...amount, stickerId }],
            extra: { store, stickerId },
          };
        }
        case 'secret': {
          const secret = SECRETS.find((s) => s.id === token.id);
          if (!secret) throw new GameApiError('qr_invalid', 'Segredo não encontrado.');
          this.ensureOpen();
          if (state.secrets.includes(secret.id)) {
            throw new GameApiError('qr_already_used', 'Segredo já encontrado.');
          }
          state.secrets.push(secret.id);
          const amount = this.grantRule(state, 'secret_found');
          const stickerId = this.giveSticker(state, secret.stickerId);
          return {
            kind: 'secret',
            floor: secret.floor,
            label: `${POINT_RULES.secret_found.label}: ${secret.label}`,
            parts: [{ ...amount, stickerId }],
            extra: { stickerId },
          };
        }
        case 'clue': {
          const cut = token.id.lastIndexOf(':');
          const hunt = HUNTS.find((h) => h.id === token.id.slice(0, cut));
          const order = Number(token.id.slice(cut + 1));
          const clue = hunt?.clues.find((c) => c.order === order);
          if (!hunt || !clue) throw new GameApiError('qr_invalid', 'Pista não encontrada.');
          this.ensureOpen();
          const solved = state.hunts[hunt.id] ?? 0;
          if (order <= solved) throw new GameApiError('qr_already_used', 'Pista já resolvida.');
          if (order !== solved + 1) {
            throw new GameApiError('clue_out_of_order', 'Pista fora de ordem.', {
              expected: solved + 1,
            });
          }
          state.hunts[hunt.id] = order;
          const parts: Reward[] = [this.grantRule(state, 'hunt_clue')];
          let stickerId: string | undefined;
          if (order === hunt.clues.length) {
            const final = this.grant(
              state,
              'hunt_complete',
              `Baú final: ${hunt.title}`,
              hunt.finalReward,
            );
            stickerId = this.giveSticker(state, hunt.finalReward.stickerId);
            parts.push({ ...final, stickerId });
          }
          return {
            kind: 'clue',
            floor: clue.floor,
            label: `${POINT_RULES.hunt_clue.label} ${order} de ${hunt.clues.length}`,
            parts,
            extra: { stickerId },
          };
        }
      }
    };

    const outcome = resolve();
    state.scans.push({ kind: outcome.kind, id: token.id, floor: outcome.floor, date });
    const { milestone, bonus } = this.touch(state);
    const missions = this.settleMissions(state);
    const missionSticker = missions.find((m) => m.stickerId)?.stickerId;
    const result = this.result(
      state,
      xpBefore,
      outcome.label,
      [...outcome.parts, ...bonus, ...missions],
      milestone,
    );
    let hunt: HuntState | undefined;
    if (outcome.kind === 'clue') {
      const id = token.id.slice(0, token.id.lastIndexOf(':'));
      const found = HUNTS.find((h) => h.id === id);
      if (found) hunt = this.huntState(state, found);
    }
    this.save(state);
    return {
      ...result,
      kind: outcome.kind,
      ...outcome.extra,
      stickerId:
        outcome.extra.stickerId ?? missionSticker ?? bonus.find((b) => b.stickerId)?.stickerId,
      ...(hunt ? { hunt } : {}),
    };
  }

  private ensureOpen(): void {
    if (!this.mallOpen())
      throw new GameApiError('mall_closed', 'Fora do horário de funcionamento.');
  }

  async listMissions(): Promise<MissionWithProgress[]> {
    const state = this.load();
    return MISSIONS.map((mission) => {
      const current = Math.min(this.missionProgress(state, mission), mission.target);
      return { ...mission, current, completed: current >= mission.target };
    });
  }

  async getHunt(seasonId: SeasonId): Promise<HuntState> {
    const hunt = HUNTS.find((h) => h.seasonId === seasonId);
    if (!hunt) throw new GameApiError('not_found', 'Não há caça cadastrada para esta temporada.');
    return this.huntState(this.load(), hunt);
  }

  async listStores(): Promise<Store[]> {
    return [...STORES];
  }

  async listCoupons(trail?: Trail): Promise<Coupon[]> {
    return COUPONS.filter((c) => !trail || c.trail === trail);
  }

  async redeemCoupon(input: RedeemInput): Promise<RedeemResult> {
    const parsed = redeemSchema.safeParse(input);
    if (!parsed.success) throw new GameApiError('validation', 'Cupom inválido.');
    const coupon = COUPONS.find((c) => c.id === parsed.data.couponId);
    if (!coupon) throw new GameApiError('coupon_not_found', 'Cupom não encontrado.');
    const state = this.load();
    const profile = this.requireProfile(state);
    if (profile.wallet.coins < coupon.cost) {
      throw new GameApiError('insufficient_coins', 'Moedas insuficientes.', {
        missing: coupon.cost - profile.wallet.coins,
      });
    }
    profile.wallet = { ...profile.wallet, coins: profile.wallet.coins - coupon.cost };
    const now = this.now();
    const redemption = this.issueRedemption(state, coupon, coupon.validDays);
    state.events.push({
      id: this.id(),
      action: 'redeem',
      label: `Cupom resgatado: ${coupon.title}`,
      xp: 0,
      coins: -coupon.cost,
      tickets: 0,
      at: now.toISOString(),
    });
    this.save(state);
    return { redemption, wallet: { ...profile.wallet } };
  }

  /** Emite o cupom com código único e validade (RN07). Não cobra moedas. */
  private issueRedemption(state: LocalState, coupon: Coupon, validDays: number): Redemption {
    const now = this.now();
    let code = this.code();
    // Código único: a loja confere pelo código, então dois cupons nunca podem ter o mesmo.
    for (let i = 0; i < 10 && state.redemptions.some((item) => item.code === code); i++) {
      code = this.code();
    }
    const redemption: Redemption = {
      id: this.id(),
      couponId: coupon.id,
      title: coupon.title,
      storeName: coupon.storeName,
      code,
      redeemedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + validDays * DAY_MS).toISOString(),
      usedAt: null,
    };
    state.redemptions.push(redemption);
    return redemption;
  }

  private code(): string {
    const pick = (n: number) =>
      Array.from(
        { length: n },
        () => CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)],
      ).join('');
    return `CDE-${pick(4)}-${pick(2)}`;
  }

  async listRedemptions(): Promise<Redemption[]> {
    return [...this.load().redemptions].reverse();
  }

  async buyTicket(): Promise<Wallet> {
    const state = this.load();
    const profile = this.requireProfile(state);
    if (profile.wallet.coins < TICKET_COST) {
      throw new GameApiError('insufficient_coins', 'Moedas insuficientes.', {
        missing: TICKET_COST - profile.wallet.coins,
      });
    }
    profile.wallet = {
      ...profile.wallet,
      coins: profile.wallet.coins - TICKET_COST,
      tickets: profile.wallet.tickets + 1,
    };
    state.events.push({
      id: this.id(),
      action: 'ticket',
      label: 'Bilhete do sorteio',
      xp: 0,
      coins: -TICKET_COST,
      tickets: 1,
      at: this.now().toISOString(),
    });
    this.save(state);
    return { ...profile.wallet };
  }

  async getAlbum(seasonId: SeasonId): Promise<AlbumState> {
    const owned = new Set(this.load().stickers);
    return {
      seasonId,
      stickers: STICKERS.filter((s) => s.seasonId === seasonId).map((s) => ({
        ...s,
        owned: owned.has(s.id),
      })),
    };
  }

  async listEvents(): Promise<PointEvent[]> {
    return [...this.load().events].reverse();
  }

  // ---------- roleta ----------

  private rouletteStatus(state: LocalState): RouletteStatus {
    const date = this.today();
    const log = state.days[date];
    const checkedIn = log?.checkIn ?? false;
    const goldenCheckIn = checkedIn && (log?.checkInGolden ?? false);
    const granted = !checkedIn ? 0 : goldenCheckIn ? BASE_SPINS * GOLDEN_SPIN_FACTOR : BASE_SPINS;
    const used = state.spins.filter((spin) => spin.date === date).length;
    return {
      date,
      checkedIn,
      goldenNow: this.goldenNow(),
      goldenCheckIn,
      goldenWindows: GOLDEN_WINDOWS.map((window) => ({ ...window, days: [...window.days] })),
      spinsGranted: granted,
      spinsUsed: used,
      spinsLeft: Math.max(0, granted - used),
      couponValidDays: ROULETTE_COUPON_VALID_DAYS,
      slices: sliceViews(COUPONS),
    };
  }

  async getRoulette(): Promise<RouletteStatus> {
    const state = this.load();
    this.requireProfile(state);
    return this.rouletteStatus(state);
  }

  async spinRoulette(): Promise<SpinResult> {
    const state = this.load();
    this.requireProfile(state);
    const before = this.rouletteStatus(state);
    if (!before.checkedIn) {
      throw new GameApiError('no_spins', 'Faça o check-in de hoje para ganhar giros.');
    }
    if (before.spinsLeft < 1) {
      throw new GameApiError('no_spins', 'Seus giros de hoje acabaram. Volte amanhã.');
    }
    const sliceIndex = pickSlice(this.random);
    const couponId = ROULETTE_SLICES[sliceIndex]?.couponId;
    const coupon = COUPONS.find((item) => item.id === couponId);
    if (!coupon) throw new GameApiError('not_found', 'Fatia da roleta fora do catálogo.');
    const redemption = this.issueRedemption(state, coupon, ROULETTE_COUPON_VALID_DAYS);
    state.spins.push({ date: this.today(), sliceIndex, couponId: coupon.id });
    this.save(state);
    return { sliceIndex, redemption, status: this.rouletteStatus(state) };
  }

  // ---------- painel da loja ----------

  private storeName(storeId: string): string {
    if (storeId === MALL_DESK_ID) return MALL_DESK_NAME;
    const store = STORES.find((item) => item.id === storeId);
    if (!store) throw new GameApiError('not_found', 'Loja não encontrada.');
    return store.name;
  }

  private statsFor(state: LocalState, storeId: string): StoreStats {
    const storeName = this.storeName(storeId);
    const couponIds = COUPONS.filter((c) => couponStoreId(c) === storeId).map((c) => c.id);
    return {
      storeId,
      storeName,
      spinsLanded: state.spins.filter((spin) => couponIds.includes(spin.couponId)).length,
      visits:
        storeId === MALL_DESK_ID
          ? null
          : state.scans.filter((scan) => scan.kind === 'store' && scan.id === storeId).length,
      couponsUsed: state.redemptions.filter(
        (redemption) => redemption.usedAt && couponIds.includes(redemption.couponId),
      ).length,
    };
  }

  async getStoreStats(storeId: string): Promise<StoreStats> {
    return this.statsFor(this.load(), storeId);
  }

  async markCouponUsed(storeId: string, input: MarkCouponUsedInput): Promise<UseCouponResult> {
    const parsed = markCouponUsedSchema.safeParse(input);
    if (!parsed.success) throw new GameApiError('validation', 'Digite o código do cupom.');
    this.storeName(storeId);
    const state = this.load();
    const code = parsed.data.code.toUpperCase();
    const redemption = state.redemptions.find((item) => item.code === code);
    if (!redemption) throw new GameApiError('coupon_not_found', 'Código não encontrado.');
    const coupon = COUPONS.find((item) => item.id === redemption.couponId);
    if (!coupon) throw new GameApiError('coupon_not_found', 'Cupom fora do catálogo.');
    if (couponStoreId(coupon) !== storeId) {
      throw new GameApiError('coupon_wrong_store', `Este cupom vale em: ${coupon.storeName}.`, {
        storeName: coupon.storeName,
      });
    }
    if (redemption.usedAt) throw new GameApiError('coupon_used', 'Este cupom já foi usado.');
    const now = this.now();
    if (Date.parse(redemption.expiresAt) <= now.getTime()) {
      throw new GameApiError('coupon_expired', 'Este cupom venceu.');
    }
    redemption.usedAt = now.toISOString();
    this.save(state);
    return { redemption: { ...redemption }, stats: this.statsFor(state, storeId) };
  }

  // ---------- extras do modo demonstração (fora do contrato) ----------

  /** Apaga tudo (mesmo efeito de `deleteAccount`). */
  reset(): void {
    this.storage.removeItem(this.key);
  }

  /**
   * Preenche um perfil de exemplo (Marina, trilha Kids, 340 XP, 4 dias de sequência até ontem,
   * 2 presentes da caça e 1 segredo), para a demonstração começar no meio do jogo.
   */
  seedExample(): void {
    const now = this.now();
    const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);
    const state = EMPTY_STATE();
    state.profile = {
      id: this.id(),
      name: 'Marina',
      trail: 'kids',
      character: 'capi',
      locationConsent: true,
      wallet: { ...EMPTY_WALLET },
      streak: { days: 4, lastActiveDate: localDate(daysAgo(1)), freezeAvailable: true },
      createdAt: daysAgo(9).toISOString(),
    };
    const history: Array<[number, PointAction, string?]> = [
      [9, 'welcome'],
      [9, 'daily_open'],
      [9, 'checkin'],
      [9, 'store_visit', 'Leitura'],
      [4, 'daily_open'],
      [3, 'daily_open'],
      [3, 'checkin'],
      [3, 'hunt_clue', '1 de 5'],
      [3, 'store_visit', 'Ri Happy'],
      [2, 'daily_open'],
      [2, 'secret_found', 'Praça de Eventos central'],
      [1, 'daily_open'],
      [1, 'checkin'],
      [1, 'hunt_clue', '2 de 5'],
      [1, 'store_visit', 'Cinemark'],
    ];
    for (const [ago, action, suffix] of history) {
      const rule = POINT_RULES[action];
      const amount = { xp: rule.xp, coins: rule.coins, tickets: rule.tickets };
      state.profile.wallet = addReward(state.profile.wallet, amount);
      state.events.push({
        id: this.id(),
        action,
        label: suffix ? `${rule.label}: ${suffix}` : rule.label,
        ...amount,
        at: daysAgo(ago).toISOString(),
      });
    }
    state.hunts['natal-2026'] = 2;
    state.secrets = ['s1'];
    state.stickers = ['natal-01', 'natal-02', 'natal-03', 'natal-07'];
    state.scans = [
      { kind: 'store', id: 'rihappy', floor: 'terreo', date: localDate(daysAgo(3)) },
      { kind: 'store', id: 'cinemark', floor: 'terreo', date: localDate(daysAgo(1)) },
    ];
    this.save(state);
  }
}
