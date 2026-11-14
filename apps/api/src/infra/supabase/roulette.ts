import type { SupabaseClient } from '@supabase/supabase-js';
import type { RouletteRepository, SpinRecord } from '../../modules/roulette/repository.js';
import { fail, PG_UNIQUE_VIOLATION } from './client.js';

export class SupabaseRouletteRepository implements RouletteRepository {
  constructor(private readonly db: SupabaseClient) {}

  async countSpins(userId: string, localDate: string): Promise<number> {
    const { count, error } = await this.db
      .from('roulette_spins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('local_date', localDate);
    if (error) fail('contar giros do dia', error);
    return count ?? 0;
  }

  async recordSpin(spin: SpinRecord): Promise<boolean> {
    const { error } = await this.db.from('roulette_spins').insert({
      user_id: spin.userId,
      local_date: spin.localDate,
      spin_no: spin.spinNo,
      slice_index: spin.sliceIndex,
      coupon_id: spin.couponId,
      created_at: spin.at,
    });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('gravar giro', error);
    return true;
  }

  async countSpinsByCoupons(couponIds: readonly string[]): Promise<number> {
    if (couponIds.length === 0) return 0;
    const { count, error } = await this.db
      .from('roulette_spins')
      .select('id', { count: 'exact', head: true })
      .in('coupon_id', [...couponIds]);
    if (error) fail('contar giros por cupom', error);
    return count ?? 0;
  }
}
