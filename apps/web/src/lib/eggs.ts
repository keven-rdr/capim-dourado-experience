/**
 * Easter eggs escondidos. Tudo aqui é cosmético: nenhum ovo chama a API nem mexe em moedas, XP,
 * giros, sequência ou álbum. As falas provocam a pessoa, nunca lojas, marcas ou o shopping.
 * Funções puras (e um armazenamento com `try/catch`) para serem testadas sem tela.
 */

/** Ovos que a pessoa precisa achar. O console e o título da aba não contam: aparecem sozinhos. */
export const EGG_IDS = ['palavra', 'cutuque', 'konami', 'nivel99', 'roleta', 'perdido'] as const;
export type EggId = (typeof EGG_IDS)[number];
export const EGG_COUNT = EGG_IDS.length;

/** Minúsculas, sem acento e sem pontuação: "Sexta-feira 13!" vira "sexta feira 13". */
export function normalizeWord(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const WORD_REPLIES: ReadonlyArray<{ words: readonly string[]; reply: string }> = [
  { words: ['gratis', 'de graca'], reply: 'Grátis? Aqui o que é de graça é o ar-condicionado.' },
  { words: ['desconto', 'promocao'], reply: 'Desconto é com a loja. Eu só sei dar bronca.' },
  { words: ['senha', 'password'], reply: 'A senha é: vai passear no shopping.' },
  {
    words: ['konami', 'cima cima baixo baixo'],
    reply: 'Aqui não tem vida extra. Tem casquinha na praça de alimentação.',
  },
  { words: ['capi', 'capivara'], reply: 'Fala meu nome de novo e eu cobro direitos autorais.' },
  { words: ['xyzzy'], reply: 'Nada acontece. (Ou será que sim?)' },
  {
    words: ['sexta feira 13', 'sexta 13', 'sexta feira treze'],
    reply: 'Bati na madeira por você. Agora vai passear.',
  },
];

/** A fala da Capi para uma palavra secreta, ou `null` se não for nenhuma. */
export function findWordEgg(text: string): string | null {
  const word = normalizeWord(text);
  if (!word) return null;
  return WORD_REPLIES.find((entry) => entry.words.includes(word))?.reply ?? null;
}

/** Cutucar a Capi: o que ela diz em cada marca. A 10ª fecha o ovo. */
export const POKE_LINES: Readonly<Record<number, string>> = {
  3: 'Ei.',
  6: 'Tá, eu entendi que você existe.',
  10: 'Quer um autógrafo? Custa uma moeda. Brincadeira. (Ou não.)',
};
export const POKE_LAST = 10;

export interface TapCounter {
  /** Registra um toque e devolve quantos toques seguidos já foram. */
  tap(now?: number): number;
  reset(): void;
}

/** Conta toques seguidos: passou `gapMs` sem tocar, recomeça do 1. */
export function createTapCounter(gapMs = 1500): TapCounter {
  let count = 0;
  let last = Number.NEGATIVE_INFINITY;
  return {
    tap(now = Date.now()) {
      count = now - last > gapMs ? 1 : count + 1;
      last = now;
      return count;
    },
    reset() {
      count = 0;
      last = Number.NEGATIVE_INFINITY;
    },
  };
}

/** ↑ ↑ ↓ ↓ ← → ← → B A, em minúsculas (como `normalizeKey` devolve). */
export const KONAMI: readonly string[] = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
];

export const normalizeKey = (key: string): string => key.toLowerCase();

export interface SequenceMatcher {
  /** Devolve `true` quando a sequência acabou de ser completada. */
  push(key: string): boolean;
}

/** Reconhece uma sequência de teclas. Errou uma, recomeça (a tecla errada pode ser a primeira). */
export function createSequenceMatcher(sequence: readonly string[]): SequenceMatcher {
  let at = 0;
  return {
    push(key) {
      if (key === sequence[at]) {
        at += 1;
        if (at === sequence.length) {
          at = 0;
          return true;
        }
        return false;
      }
      at = key === sequence[0] ? 1 : 0;
      return false;
    },
  };
}

/** Nível de mentira da barra de XP. */
export const FAKE_LEVEL = { name: 'Deus do Shopping', number: 99, xp: 9999 } as const;

/** Armazenamento mínimo (o `localStorage` ou um dublê nos testes). */
export type EggStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'cde:eggs:v1';

function browserStorage(): EggStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Ovos já achados neste aparelho. Sem armazenamento (ou com dado estragado), devolve vazio. */
export function foundEggs(storage: EggStorage | null = browserStorage()): EggId[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return EGG_IDS.filter((id) => parsed.includes(id));
  } catch {
    return [];
  }
}

/** Marca um ovo como achado. `isNew` é verdadeiro só na primeira vez. */
export function markEgg(
  id: EggId,
  storage: EggStorage | null = browserStorage(),
): { isNew: boolean; count: number } {
  const found = foundEggs(storage);
  if (found.includes(id)) return { isNew: false, count: found.length };
  const next = [...found, id];
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sem armazenamento: o ovo vale nesta aba, só não fica guardado
  }
  return { isNew: true, count: next.length };
}

/** Recado para quem abre o console do navegador. */
export const CONSOLE_ART = String.raw`
   ___________
  /  o     o  \     Achou o console.
 (     ___     )    Ou você é dev ou é curioso.
  \   \___/   /     Nos dois casos, vai passear no shopping.
   '---------'
`;

/** Título da aba enquanto a pessoa está em outra aba. */
export const AWAY_TITLE = 'Ei, volta aqui…';
