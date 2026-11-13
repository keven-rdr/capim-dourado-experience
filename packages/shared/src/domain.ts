/** Tipos de domínio do Capim Dourado Experience. Fonte única para app, painel e API. */

export type Trail = 'kids' | 'ela' | 'ele' | 'todos';
export const TRAILS: readonly Trail[] = ['kids', 'ela', 'ele', 'todos'];
export const TRAIL_LABEL: Record<Trail, string> = {
  kids: 'Kids',
  ela: 'Ela',
  ele: 'Ele',
  todos: 'Para todos',
};

export type SeasonId = 'natal' | 'pascoa' | 'halloween';
export const SEASONS: readonly SeasonId[] = ['natal', 'pascoa', 'halloween'];

/** Nomes oficiais dos pavimentos na planta do shopping. */
export type Floor = 'terreo' | 'segundo' | 'subsolo';
export const FLOOR_LABEL: Record<Floor, string> = {
  terreo: '1º Pavimento – Térreo',
  segundo: '2º Pavimento – Praça de Alimentação',
  subsolo: 'Subsolo 1',
};

export interface Wallet {
  /** Mede o nível. Nunca diminui. */
  xp: number;
  /** Moeda de troca (capicoins). Gasta em cupons e bilhetes. */
  coins: number;
  /** Chances em sorteios. */
  tickets: number;
}

export interface Streak {
  days: number;
  /** Data local (America/Araguaina) do último dia ativo, no formato AAAA-MM-DD. */
  lastActiveDate: string | null;
  /** Um dia de folga disponível: a sequência não quebra por um dia perdido. */
  freezeAvailable: boolean;
}

export interface Level {
  id: 'explorador' | 'aventureiro' | 'cacador' | 'mestre';
  name: string;
  minXp: number;
}

export interface Profile {
  id: string;
  name: string;
  trail: Trail;
  character: string;
  wallet: Wallet;
  streak: Streak;
  /** Consentimento de localização dado dentro do app (LGPD). */
  locationConsent: boolean;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  floor: Floor;
  category: string;
  /** Trilhas em que a loja aparece primeiro. */
  trails: Trail[];
  /** Posição no mapa simplificado do pavimento, de 0 a 100. */
  map: { x: number; y: number };
}

export interface Reward {
  xp: number;
  coins: number;
  tickets: number;
  stickerId?: string;
}

export type MissionKind = 'daily' | 'weekly' | 'season' | 'store';

export interface Mission {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  seasonId?: SeasonId;
  /** Quantidade necessária para concluir. */
  target: number;
  reward: Reward;
}

export interface MissionWithProgress extends Mission {
  current: number;
  completed: boolean;
}

export interface Clue {
  order: number;
  riddle: string;
  hint: string;
  /** Local público onde o QR fica. Só aparece depois de encontrado. */
  locationLabel: string;
  floor: Floor;
}

export interface Hunt {
  id: string;
  seasonId: SeasonId;
  title: string;
  clues: Clue[];
  finalReward: Reward;
}

export interface HuntState {
  hunt: Hunt;
  /** Quantidade de pistas já resolvidas, em ordem. */
  solved: number;
  completed: boolean;
}

export type QrKind = 'checkin' | 'store' | 'secret' | 'clue';

export interface QrPayload {
  k: QrKind;
  /** Id da loja, do segredo ou `<huntId>:<ordem>` da pista. */
  id: string;
  /** Expiração em segundos (epoch). Ausente nos códigos de demonstração. */
  exp?: number;
}

export interface Coupon {
  id: string;
  title: string;
  storeName: string;
  storeId?: string;
  /** Custo em moedas. */
  cost: number;
  trail: Trail;
  validDays: number;
  /** Todas as ofertas do protótipo são exemplos. */
  example: true;
}

export interface Redemption {
  id: string;
  couponId: string;
  title: string;
  storeName: string;
  code: string;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export type StickerRarity = 'comum' | 'rara';

export interface Sticker {
  id: string;
  seasonId: SeasonId;
  name: string;
  rarity: StickerRarity;
}

export interface AlbumState {
  seasonId: SeasonId;
  stickers: Array<Sticker & { owned: boolean }>;
}

export interface PointEvent {
  id: string;
  action: string;
  label: string;
  xp: number;
  coins: number;
  tickets: number;
  at: string;
}
