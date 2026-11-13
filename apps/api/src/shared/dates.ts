import { localDate } from '@cde/shared';

export { localDate };

/** Soma dias a uma data AAAA-MM-DD. */
export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Segunda-feira da semana (local) de uma data AAAA-MM-DD. */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const sinceMonday = (weekday + 6) % 7;
  return addDays(date, -sinceMonday);
}
