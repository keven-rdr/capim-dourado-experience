import {
  LEVELS,
  levelFor,
  nextLevel,
  type PointsResult,
  type Reward,
  SEASON_INFO,
  type SeasonId,
  STICKERS,
  type Trail,
} from '@cde/shared';
import { CAPI_LOOKS, type CapiLook, type StickerMotif } from '@cde/ui';

/** Desenho de cada figurinha do seed. */
export const STICKER_MOTIF: Record<string, StickerMotif> = {
  'natal-01': 'capi',
  'natal-02': 'gift',
  'natal-03': 'tree',
  'natal-04': 'cookie',
  'natal-05': 'star',
  'natal-06': 'bow',
  'natal-07': 'bell',
  'natal-08': 'sled',
  'natal-09': 'popcorn',
  'natal-10': 'capi',
  'natal-11': 'wreath',
  'natal-12': 'capi',
  'pascoa-01': 'capi',
  'pascoa-02': 'egg',
  'pascoa-03': 'basket',
  'halloween-01': 'capi',
  'halloween-02': 'pumpkin',
  'halloween-03': 'monster',
};

/** Onde se ganha cada figurinha (dica do álbum). */
export const STICKER_HINT: Record<string, string> = {
  'natal-07': 'Segredo da Praça de Eventos',
  'natal-08': 'Segredo do Espaço Família',
  'natal-09': 'Segredo da entrada do cinema',
  'natal-10': 'Missão: ache 3 segredos',
  'natal-11': 'Baú dos 7 dias seguidos',
  'natal-12': 'Baú final da caça',
};

export function stickerHint(id: string): string {
  return STICKER_HINT[id] ?? 'Check-in ou visita a loja';
}

export function stickerName(id: string | undefined): string | undefined {
  return id ? STICKERS.find((s) => s.id === id)?.name : undefined;
}

/** Como chamar o "presente" da caça em cada temporada. */
export const HUNT_NOUN: Record<SeasonId, { one: string; many: string }> = {
  natal: { one: 'Presente', many: 'presentes' },
  pascoa: { one: 'Ovo', many: 'ovos' },
  halloween: { one: 'Monstrinho', many: 'monstrinhos' },
};

/** Missão do dia da Home, com o texto de cada temporada (o resto da tela é igual). */
export const SEASON_COPY: Record<SeasonId, { mission: string; greeting: string }> = {
  natal: { mission: 'Ache os presentes da Fábrica de Natal', greeting: 'A fábrica abriu!' },
  pascoa: {
    mission: 'Encontre os ovos e monte a sua cesta',
    greeting: 'Tem ovo escondido por aí.',
  },
  halloween: {
    mission: 'Colete um monstrinho em cada pavimento',
    greeting: 'Hoje a noite é dos monstrinhos.',
  },
};

export function seasonInfo(season: SeasonId) {
  return SEASON_INFO[season];
}

export const TRAIL_HINT: Record<Trail, string> = {
  kids: 'Missões curtas, brinquedos e diversão. Sem ranking.',
  ela: 'Moda, beleza e joias primeiro.',
  ele: 'Esporte, moda e tecnologia primeiro.',
  todos: 'Cinema, comida e um pouco de tudo.',
};

export function levelInfo(xp: number) {
  const level = levelFor(xp);
  const next = nextLevel(xp);
  return {
    level,
    next,
    number: LEVELS.findIndex((l) => l.id === level.id) + 1,
  };
}

export function rewardLine(reward: Pick<Reward, 'xp' | 'coins' | 'tickets'>): string {
  const parts = [`+${reward.xp} XP`, `+${reward.coins} moedas`];
  if (reward.tickets) parts.push(`+${reward.tickets} bilhete`);
  return parts.join(' · ');
}

export function isCapiLook(value: string): value is CapiLook {
  return value === 'capi' || value === 'jalapa' || value === 'buriti' || value === 'sussa';
}

export function lookOf(character: string | undefined): CapiLook {
  return character && isCapiLook(character) ? character : 'capi';
}

export const CAPI_NAME = Object.fromEntries(CAPI_LOOKS.map((l) => [l.id, l.name])) as Record<
  CapiLook,
  string
>;

export type { PointsResult };
