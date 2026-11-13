import type { Floor, QrKind } from '@cde/shared';

/**
 * Leitura de QR registrada. A unicidade é (usuário, tipo, id, escopo):
 * lojas usam a data como escopo (uma vez por loja por dia); segredos e pistas usam `once`.
 */
export interface ScanRecord {
  userId: string;
  kind: QrKind;
  refId: string;
  scopeKey: string;
  localDate: string;
  at: string;
}

export interface Secret {
  id: string;
  label: string;
  floor: Floor;
  stickerId?: string;
}

export interface QrRepository {
  /** Devolve `false` se a mesma leitura (usuário, tipo, id, escopo) já existe. */
  recordScan(entry: ScanRecord): Promise<boolean>;
  hasScan(userId: string, kind: QrKind, refId: string, scopeKey: string): Promise<boolean>;
  countScans(userId: string, kind: QrKind, localDate: string): Promise<number>;
  countAllScans(userId: string, kind: QrKind): Promise<number>;
  /** Leituras a partir de `sinceDate` (inclusive). */
  listScansSince(userId: string, sinceDate: string): Promise<ScanRecord[]>;
  findSecret(id: string): Promise<Secret | null>;
}
