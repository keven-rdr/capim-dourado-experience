import type { Floor, LatLng, QrKind } from '@cde/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckinRecord, CheckinRepository } from '../../modules/checkin/repository.js';
import type { QrRepository, ScanRecord, Secret } from '../../modules/qr/repository.js';
import { CachedLoader, fail, PG_UNIQUE_VIOLATION } from './client.js';

export class SupabaseCheckinRepository implements CheckinRepository {
  private readonly area: CachedLoader<LatLng[] | null>;

  constructor(private readonly db: SupabaseClient) {
    this.area = new CachedLoader(async () => {
      const { data, error } = await this.db
        .from('mall_area')
        .select('polygon')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) fail('ler área do shopping', error);
      const polygon = (data as { polygon: unknown } | null)?.polygon;
      return Array.isArray(polygon) && polygon.length >= 3 ? (polygon as LatLng[]) : null;
    });
  }

  async hasCheckedIn(userId: string, localDate: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('local_date', localDate)
      .eq('inside', true);
    if (error) fail('consultar check-in', error);
    return (count ?? 0) > 0;
  }

  async getCheckinAt(userId: string, localDate: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('checkins')
      .select('created_at')
      .eq('user_id', userId)
      .eq('local_date', localDate)
      .eq('inside', true)
      .limit(1)
      .maybeSingle();
    if (error) fail('ler horário do check-in', error);
    return (data as { created_at: string } | null)?.created_at ?? null;
  }

  async record(entry: CheckinRecord): Promise<boolean> {
    const { error } = await this.db.from('checkins').insert({
      user_id: entry.userId,
      local_date: entry.localDate,
      method: entry.method,
      inside: entry.inside,
      created_at: entry.at,
    });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('gravar check-in', error);
    return true;
  }

  getMallArea(): Promise<LatLng[] | null> {
    return this.area.get();
  }
}

interface ScanRow {
  user_id: string;
  kind: QrKind;
  ref_id: string;
  scope_key: string;
  local_date: string;
  created_at: string;
}

export class SupabaseQrRepository implements QrRepository {
  private readonly secrets: CachedLoader<Secret[]>;

  constructor(private readonly db: SupabaseClient) {
    this.secrets = new CachedLoader(async () => {
      const { data, error } = await this.db
        .from('secrets')
        .select('id, label, floor, sticker_id')
        .eq('active', true);
      if (error) fail('ler segredos', error);
      return (
        (data ?? []) as Array<{
          id: string;
          label: string;
          floor: Floor;
          sticker_id: string | null;
        }>
      ).map((row) => ({
        id: row.id,
        label: row.label,
        floor: row.floor,
        ...(row.sticker_id ? { stickerId: row.sticker_id } : {}),
      }));
    });
  }

  async recordScan(entry: ScanRecord): Promise<boolean> {
    const { error } = await this.db.from('qr_scans').insert({
      user_id: entry.userId,
      kind: entry.kind,
      ref_id: entry.refId,
      scope_key: entry.scopeKey,
      local_date: entry.localDate,
      created_at: entry.at,
    });
    if (error?.code === PG_UNIQUE_VIOLATION) return false;
    if (error) fail('gravar leitura de QR', error);
    return true;
  }

  async hasScan(userId: string, kind: QrKind, refId: string, scopeKey: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('ref_id', refId)
      .eq('scope_key', scopeKey);
    if (error) fail('consultar leitura de QR', error);
    return (count ?? 0) > 0;
  }

  async countScans(userId: string, kind: QrKind, localDate: string): Promise<number> {
    const { count, error } = await this.db
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('local_date', localDate);
    if (error) fail('contar leituras do dia', error);
    return count ?? 0;
  }

  async countAllScans(userId: string, kind: QrKind): Promise<number> {
    const { count, error } = await this.db
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', kind);
    if (error) fail('contar leituras', error);
    return count ?? 0;
  }

  async countByRef(kind: QrKind, refId: string): Promise<number> {
    const { count, error } = await this.db
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('kind', kind)
      .eq('ref_id', refId);
    if (error) fail('contar leituras do alvo', error);
    return count ?? 0;
  }

  async listScansSince(userId: string, sinceDate: string): Promise<ScanRecord[]> {
    const { data, error } = await this.db
      .from('qr_scans')
      .select('user_id, kind, ref_id, scope_key, local_date, created_at')
      .eq('user_id', userId)
      .gte('local_date', sinceDate);
    if (error) fail('listar leituras', error);
    return ((data ?? []) as ScanRow[]).map((row) => ({
      userId: row.user_id,
      kind: row.kind,
      refId: row.ref_id,
      scopeKey: row.scope_key,
      localDate: row.local_date,
      at: row.created_at,
    }));
  }

  async findSecret(id: string): Promise<Secret | null> {
    return (await this.secrets.get()).find((secret) => secret.id === id) ?? null;
  }
}
