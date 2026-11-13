import { localDate } from '@cde/shared';

const HOUR = 3_600_000;

/** Milissegundos até a próxima meia-noite de Palmas (UTC-3, sem horário de verão). */
export function msUntilLocalMidnight(now: Date): number {
  const [y, m, d] = localDate(now).split('-').map(Number);
  const next = Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1, 3, 0, 0);
  return Math.max(0, next - now.getTime());
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "vence em 6 dias e 4 h", "vence em 3 h", "venceu". */
export function deadlineLabel(expiresAt: string, now: Date): string {
  const ms = Date.parse(expiresAt) - now.getTime();
  if (ms <= 0) return 'venceu';
  const days = Math.floor(ms / (24 * HOUR));
  const hours = Math.floor((ms % (24 * HOUR)) / HOUR);
  if (days > 0) return `vence em ${days} ${days === 1 ? 'dia' : 'dias'} e ${hours} h`;
  const minutes = Math.floor((ms % HOUR) / 60_000);
  return hours > 0 ? `vence em ${hours} h e ${minutes} min` : `vence em ${minutes} min`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Araguaina',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
