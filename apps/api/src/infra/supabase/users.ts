import type { Profile, Trail, UpdateProfileInput } from '@cde/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UsersRepository } from '../../modules/users/repository.js';
import type { Logger } from '../../shared/logger.js';
import { fail, PG_UNIQUE_VIOLATION } from './client.js';

export interface ProfileRow {
  id: string;
  name: string;
  trail: Trail;
  character: string;
  location_consent: boolean;
  xp: number;
  coins: number;
  tickets: number;
  streak_days: number;
  streak_last_date: string | null;
  streak_freeze: boolean;
  created_at: string;
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    trail: row.trail,
    character: row.character,
    locationConsent: row.location_consent,
    wallet: { xp: row.xp, coins: row.coins, tickets: row.tickets },
    streak: {
      days: row.streak_days,
      lastActiveDate: row.streak_last_date,
      freezeAvailable: row.streak_freeze,
    },
    createdAt: row.created_at,
  };
}

export class SupabaseUsersRepository implements UsersRepository {
  constructor(
    private readonly db: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) fail('ler perfil', error);
    return data ? toProfile(data as ProfileRow) : null;
  }

  async insert(profile: Profile): Promise<void> {
    const { error } = await this.db.from('profiles').insert({
      id: profile.id,
      name: profile.name,
      trail: profile.trail,
      character: profile.character,
      location_consent: profile.locationConsent,
      xp: profile.wallet.xp,
      coins: profile.wallet.coins,
      tickets: profile.wallet.tickets,
      streak_days: profile.streak.days,
      streak_last_date: profile.streak.lastActiveDate,
      streak_freeze: profile.streak.freezeAvailable,
      created_at: profile.createdAt,
    });
    if (error && error.code !== PG_UNIQUE_VIOLATION) fail('criar perfil', error);
  }

  async update(id: string, patch: UpdateProfileInput): Promise<Profile | null> {
    const changes: Record<string, unknown> = {};
    if (patch.name !== undefined) changes.name = patch.name;
    if (patch.trail !== undefined) changes.trail = patch.trail;
    if (patch.character !== undefined) changes.character = patch.character;
    if (patch.locationConsent !== undefined) changes.location_consent = patch.locationConsent;
    if (Object.keys(changes).length === 0) return this.findById(id);
    const { data, error } = await this.db
      .from('profiles')
      .update(changes)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) fail('atualizar perfil', error);
    return data ? toProfile(data as ProfileRow) : null;
  }

  /**
   * Apaga o perfil (as tabelas do usuário caem em cascata) e o usuário do Supabase Auth.
   */
  async deleteAccount(id: string): Promise<void> {
    const { error } = await this.db.from('profiles').delete().eq('id', id);
    if (error) fail('apagar perfil', error);
    const { error: authError } = await this.db.auth.admin.deleteUser(id);
    if (authError) {
      this.logger.warn('perfil apagado, mas o usuário do Auth não foi removido', {
        error: authError.message,
      });
    }
  }
}
