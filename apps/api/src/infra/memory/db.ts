import type { PointEvent, Profile, Redemption } from '@cde/shared';
import type { CheckinRecord } from '../../modules/checkin/repository.js';
import type { HuntProgress } from '../../modules/hunts/repository.js';
import type { ScanRecord } from '../../modules/qr/repository.js';

export interface StoredEvent extends PointEvent {
  localDate: string;
  dedupeKey: string | null;
}

/**
 * Banco em memória do modo demonstração. Os dados somem quando o processo reinicia.
 * Catálogos (lojas, cupons, figurinhas, caça, segredos, missões) vêm do seed do `@cde/shared`.
 */
export class MemoryDb {
  readonly profiles = new Map<string, Profile>();
  readonly events = new Map<string, StoredEvent[]>();
  readonly checkins: CheckinRecord[] = [];
  readonly scans: ScanRecord[] = [];
  readonly huntProgress = new Map<string, HuntProgress>();
  readonly missionCompletions = new Set<string>();
  readonly redemptions = new Map<string, Array<Redemption & { userId: string }>>();
  readonly userStickers = new Map<string, Map<string, string>>();

  /** Apaga tudo do usuário (LGPD). */
  deleteUser(userId: string): void {
    this.profiles.delete(userId);
    this.events.delete(userId);
    this.redemptions.delete(userId);
    this.userStickers.delete(userId);
    removeWhere(this.checkins, (row) => row.userId === userId);
    removeWhere(this.scans, (row) => row.userId === userId);
    for (const key of [...this.huntProgress.keys()]) {
      if (key.startsWith(`${userId}|`)) this.huntProgress.delete(key);
    }
    for (const key of [...this.missionCompletions]) {
      if (key.startsWith(`${userId}|`)) this.missionCompletions.delete(key);
    }
  }
}

function removeWhere<T>(rows: T[], predicate: (row: T) => boolean): void {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i] as T)) rows.splice(i, 1);
  }
}

/** Cópia profunda simples, para nenhum chamador alterar o estado guardado por referência. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
