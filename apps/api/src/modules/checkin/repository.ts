import type { LatLng } from '@cde/shared';

export type CheckinMethod = 'gps' | 'qr';

/** Só o resultado da verificação: nunca a coordenada (LGPD, minimização). */
export interface CheckinRecord {
  userId: string;
  localDate: string;
  method: CheckinMethod;
  inside: boolean;
  at: string;
}

export interface CheckinRepository {
  hasCheckedIn(userId: string, localDate: string): Promise<boolean>;
  /**
   * Grava o resultado. Para `inside: true`, devolve `false` se já existe
   * check-in válido no dia (um por usuário por dia).
   */
  record(entry: CheckinRecord): Promise<boolean>;
  /** Polígono configurado no armazenamento (tabela `mall_area`), ou `null`. */
  getMallArea(): Promise<LatLng[] | null>;
}
