import type { Level, Reward, Streak, Wallet } from './domain.js';

/**
 * Regras de pontos. Valores de exemplo para o protótipo: ajustar com dados do piloto.
 * A API é a única que aplica estas regras de verdade; o app usa só para exibir.
 */
export const POINT_RULES = {
  welcome: { label: 'Boas-vindas', xp: 50, coins: 0, tickets: 0 },
  daily_open: { label: 'Abrir o app no dia', xp: 5, coins: 2, tickets: 0 },
  checkin: { label: 'Check-in no shopping', xp: 30, coins: 10, tickets: 0 },
  store_visit: { label: 'Visita a loja parceira', xp: 15, coins: 5, tickets: 0 },
  secret_found: { label: 'Segredo encontrado', xp: 50, coins: 15, tickets: 0 },
  hunt_clue: { label: 'Pista da caça ao tesouro', xp: 40, coins: 10, tickets: 0 },
  season_mission: { label: 'Missão da temporada', xp: 100, coins: 40, tickets: 0 },
  streak_7: { label: 'Sequência de 7 dias', xp: 60, coins: 30, tickets: 1 },
  referral: { label: 'Amigo convidado', xp: 50, coins: 20, tickets: 0 },
} as const satisfies Record<string, { label: string } & Omit<Reward, 'stickerId'>>;

export type PointAction = keyof typeof POINT_RULES;

export const DAILY_LIMITS = {
  checkin: 1,
  daily_open: 1,
  /** Máximo de lojas diferentes por dia; cada loja conta uma vez por dia. */
  store_visit: 5,
  /** Teto de XP por dia. Valor a confirmar no piloto. */
  xp: 400,
} as const;

/** Custo, em moedas, de um bilhete de sorteio. */
export const TICKET_COST = 80;

export const LEVELS: readonly Level[] = [
  { id: 'explorador', name: 'Explorador', minXp: 0 },
  { id: 'aventureiro', name: 'Aventureiro', minXp: 300 },
  { id: 'cacador', name: 'Caçador', minXp: 800 },
  { id: 'mestre', name: 'Mestre do Shopping', minXp: 1800 },
];

export function levelFor(xp: number): Level {
  let current = LEVELS[0] as Level;
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  return current;
}

/** Próximo nível, ou `null` se já está no último. */
export function nextLevel(xp: number): Level | null {
  return LEVELS.find((level) => level.minXp > xp) ?? null;
}

/** Progresso de 0 a 1 dentro do nível atual. */
export function levelProgress(xp: number): number {
  const current = levelFor(xp);
  const next = nextLevel(xp);
  if (!next) return 1;
  return (xp - current.minXp) / (next.minXp - current.minXp);
}

export function addReward(wallet: Wallet, reward: Omit<Reward, 'stickerId'>): Wallet {
  return {
    xp: wallet.xp + reward.xp,
    coins: wallet.coins + reward.coins,
    tickets: wallet.tickets + reward.tickets,
  };
}

export const EMPTY_WALLET: Wallet = { xp: 0, coins: 0, tickets: 0 };
export const EMPTY_STREAK: Streak = { days: 0, lastActiveDate: null, freezeAvailable: true };

/** Data local de Palmas (America/Araguaina, UTC-3 sem horário de verão), em AAAA-MM-DD. */
export function localDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Araguaina',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Atualiza a sequência ao registrar atividade em `today`.
 * Um dia perdido é perdoado se houver folga; a folga volta a cada 7 dias de sequência.
 */
export function nextStreak(streak: Streak, today: string): Streak {
  if (streak.lastActiveDate === today) return streak;
  if (streak.lastActiveDate === null) {
    return { days: 1, lastActiveDate: today, freezeAvailable: streak.freezeAvailable };
  }
  const gap = daysBetween(streak.lastActiveDate, today);
  if (gap === 1 || (gap === 2 && streak.freezeAvailable)) {
    const days = streak.days + 1;
    const usedFreeze = gap === 2;
    return {
      days,
      lastActiveDate: today,
      freezeAvailable: days % 7 === 0 ? true : streak.freezeAvailable && !usedFreeze,
    };
  }
  return { days: 1, lastActiveDate: today, freezeAvailable: true };
}

/** Verdadeiro quando a sequência acabou de completar um múltiplo de 7 dias. */
export function hitStreakMilestone(before: Streak, after: Streak): boolean {
  return after.days !== before.days && after.days > 0 && after.days % 7 === 0;
}
