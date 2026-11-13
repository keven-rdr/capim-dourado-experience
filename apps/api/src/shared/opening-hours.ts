import { isMallOpen } from '@cde/shared';

/** Política de horário de funcionamento (RN02), usada por check-in, QR e status do dia. */
export interface OpeningHours {
  isOpen(date: Date): boolean;
}

/**
 * `skip` vem de `SKIP_OPENING_HOURS=true`: libera o horário para demonstrações.
 * Nunca ligar em produção.
 */
export function createOpeningHours(skip: boolean): OpeningHours {
  return { isOpen: (date) => skip || isMallOpen(date) };
}
