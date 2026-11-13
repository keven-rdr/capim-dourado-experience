import type { Mission } from '@cde/shared';

/** Catálogo de missões e registro de conclusão por período. */
export interface MissionsRepository {
  list(): Promise<Mission[]>;
  isCompleted(userId: string, missionId: string, periodKey: string): Promise<boolean>;
  /** Marca a missão como concluída no período. Devolve `false` se já estava. */
  tryComplete(userId: string, missionId: string, periodKey: string, at: string): Promise<boolean>;
}
