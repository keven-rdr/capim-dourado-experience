import type { Floor, Mission } from '@cde/shared';
import { weekStart } from '../../shared/dates.js';

/**
 * De onde vem o progresso de cada missão. O tipo `Mission` do contrato não diz
 * o que a missão mede, então a API associa cada id do seed a uma métrica.
 */
export type ProgressSource =
  | { type: 'checkin_today' }
  | { type: 'stores_week' }
  | { type: 'secrets' }
  | { type: 'floors_week'; floors: Floor[] }
  /** Espelho da caça: a recompensa é a recompensa final da caça, creditada uma vez pela própria caça. */
  | { type: 'hunt'; huntId: string };

export const MISSION_SOURCES: Readonly<Record<string, ProgressSource>> = {
  'm-checkin': { type: 'checkin_today' },
  'm-lojas': { type: 'stores_week' },
  'm-natal': { type: 'hunt', huntId: 'natal-2026' },
  'm-segredos': { type: 'secrets' },
  'm-sobe': { type: 'floors_week', floors: ['terreo', 'segundo'] },
};

/** Período em que a missão vale: o dia, a semana (segunda a domingo) ou a temporada. */
export function periodKey(mission: Mission, today: string): string {
  switch (mission.kind) {
    case 'daily':
      return `d:${today}`;
    case 'weekly':
      return `w:${weekStart(today)}`;
    default:
      return `s:${mission.seasonId ?? 'geral'}`;
  }
}
