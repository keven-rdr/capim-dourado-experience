import type { PointEvent, Streak, Wallet } from '@cde/shared';

/** Lançamento a gravar no ledger. O ledger é imutável: só recebe inserções. */
export interface LedgerEntry {
  action: string;
  label: string;
  /** Nunca negativo: XP não diminui. */
  xp: number;
  /** Negativo quando o usuário gasta moedas. */
  coins: number;
  tickets: number;
  /** Data local (Palmas) do lançamento, AAAA-MM-DD. */
  localDate: string;
  at: string;
  /** Chave de idempotência por usuário (ex.: `daily_open:2026-11-13`). `null` quando pode repetir. */
  dedupeKey: string | null;
}

export interface PointsState {
  wallet: Wallet;
  streak: Streak;
}

export interface AppliedEntry {
  event: PointEvent;
  wallet: Wallet;
}

/** Carteira, sequência e ledger de pontos do usuário. */
export interface PointsRepository {
  getState(userId: string): Promise<PointsState | null>;
  saveStreak(userId: string, streak: Streak): Promise<void>;
  /**
   * Grava o evento e atualiza a carteira na mesma operação.
   * Devolve `null` se a `dedupeKey` já existe para o usuário.
   * Lança `AppError('insufficient_coins')` se as moedas ficariam negativas.
   */
  apply(userId: string, entry: LedgerEntry): Promise<AppliedEntry | null>;
  /** Soma do XP lançado na data local. */
  xpOnDate(userId: string, localDate: string): Promise<number>;
  hasEvent(userId: string, dedupeKey: string): Promise<boolean>;
  /** Eventos mais recentes primeiro. */
  listEvents(userId: string, limit: number): Promise<PointEvent[]>;
}
