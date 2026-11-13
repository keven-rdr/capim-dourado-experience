import type { PointEvent, Streak, Wallet } from '@cde/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppliedEntry,
  LedgerEntry,
  PointsRepository,
  PointsState,
} from '../../modules/points/repository.js';
import { AppError } from '../../shared/errors.js';
import { fail, PG_CHECK_VIOLATION } from './client.js';

interface EventRow {
  id: string;
  action: string;
  label: string;
  xp: number;
  coins: number;
  tickets: number;
  created_at: string;
}

function toEvent(row: EventRow): PointEvent {
  return {
    id: row.id,
    action: row.action,
    label: row.label,
    xp: row.xp,
    coins: row.coins,
    tickets: row.tickets,
    at: row.created_at,
  };
}

export class SupabasePointsRepository implements PointsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getState(userId: string): Promise<PointsState | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('xp, coins, tickets, streak_days, streak_last_date, streak_freeze')
      .eq('id', userId)
      .maybeSingle();
    if (error) fail('ler carteira', error);
    if (!data) return null;
    const row = data as {
      xp: number;
      coins: number;
      tickets: number;
      streak_days: number;
      streak_last_date: string | null;
      streak_freeze: boolean;
    };
    return {
      wallet: { xp: row.xp, coins: row.coins, tickets: row.tickets },
      streak: {
        days: row.streak_days,
        lastActiveDate: row.streak_last_date,
        freezeAvailable: row.streak_freeze,
      },
    };
  }

  async saveStreak(userId: string, streak: Streak): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({
        streak_days: streak.days,
        streak_last_date: streak.lastActiveDate,
        streak_freeze: streak.freezeAvailable,
      })
      .eq('id', userId);
    if (error) fail('salvar sequência', error);
  }

  /** Usa a função `apply_points` (migração 0001), que grava evento e carteira na mesma transação. */
  async apply(userId: string, entry: LedgerEntry): Promise<AppliedEntry | null> {
    const { data, error } = await this.db.rpc('apply_points', {
      p_user: userId,
      p_action: entry.action,
      p_label: entry.label,
      p_xp: entry.xp,
      p_coins: entry.coins,
      p_tickets: entry.tickets,
      p_local_date: entry.localDate,
      p_at: entry.at,
      p_dedupe_key: entry.dedupeKey,
    });
    if (error) {
      if (error.code === PG_CHECK_VIOLATION) throw new AppError('insufficient_coins');
      if (error.code === 'P0002') throw new AppError('profile_not_found');
      fail('lançar pontos', error);
    }
    if (!data) return null;
    const result = data as { event: EventRow; wallet: Wallet };
    return { event: toEvent(result.event), wallet: result.wallet };
  }

  async xpOnDate(userId: string, localDate: string): Promise<number> {
    const { data, error } = await this.db
      .from('point_events')
      .select('xp')
      .eq('user_id', userId)
      .eq('local_date', localDate);
    if (error) fail('somar XP do dia', error);
    return ((data ?? []) as Array<{ xp: number }>).reduce((sum, row) => sum + row.xp, 0);
  }

  async hasEvent(userId: string, dedupeKey: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('point_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('dedupe_key', dedupeKey);
    if (error) fail('consultar evento', error);
    return (count ?? 0) > 0;
  }

  async listEvents(userId: string, limit: number): Promise<PointEvent[]> {
    const { data, error } = await this.db
      .from('point_events')
      .select('id, action, label, xp, coins, tickets, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) fail('listar eventos', error);
    return ((data ?? []) as EventRow[]).map(toEvent);
  }
}
