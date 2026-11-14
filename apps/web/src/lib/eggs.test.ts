import { describe, expect, it } from 'vitest';
import {
  createSequenceMatcher,
  createTapCounter,
  EGG_COUNT,
  EGG_IDS,
  type EggStorage,
  findWordEgg,
  foundEggs,
  KONAMI,
  markEgg,
  normalizeKey,
  normalizeWord,
  POKE_LINES,
} from './eggs';

function memory(initial?: string): EggStorage & { raw: () => string | null } {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    raw: () => value,
  };
}

describe('palavras secretas', () => {
  it('ignora acento, caixa, pontuação e espaços sobrando', () => {
    expect(normalizeWord('  Grátis!! ')).toBe('gratis');
    expect(normalizeWord('Sexta-feira 13')).toBe('sexta feira 13');
    expect(findWordEgg('GRÁTIS')).toBe(findWordEgg('gratis'));
    expect(findWordEgg('De graça?')).toBe(findWordEgg('gratis'));
  });

  it('reconhece a sexta-feira 13 de vários jeitos', () => {
    const reply = findWordEgg('sexta-feira 13');
    expect(reply).toContain('madeira');
    expect(findWordEgg('Sexta 13')).toBe(reply);
    expect(findWordEgg('sexta feira treze')).toBe(reply);
  });

  it('só responde a palavra inteira: um código de QR de verdade nunca vira ovo', () => {
    expect(findWordEgg('cde:store:leitura')).toBeNull();
    expect(findWordEgg('cde1.eyJrIjoic2VjcmV0In0.assinatura')).toBeNull();
    expect(findWordEgg('desconto na loja')).toBeNull();
    expect(findWordEgg('')).toBeNull();
    expect(findWordEgg('   ')).toBeNull();
  });
});

describe('contador de toques', () => {
  it('conta toques seguidos e recomeça depois de uma pausa', () => {
    const counter = createTapCounter(1000);
    expect([counter.tap(0), counter.tap(400), counter.tap(900)]).toEqual([1, 2, 3]);
    expect(counter.tap(2500)).toBe(1);
    expect(counter.tap(2900)).toBe(2);
  });

  it('reset zera a contagem', () => {
    const counter = createTapCounter(1000);
    counter.tap(0);
    counter.tap(100);
    counter.reset();
    expect(counter.tap(200)).toBe(1);
  });

  it('as falas da Capi existem nas marcas 3, 6 e 10', () => {
    expect(Object.keys(POKE_LINES).map(Number)).toEqual([3, 6, 10]);
  });
});

describe('sequência Konami', () => {
  const play = (keys: string[]) => {
    const matcher = createSequenceMatcher(KONAMI);
    return keys.map((key) => matcher.push(normalizeKey(key)));
  };

  it('completa só no último toque', () => {
    const result = play(KONAMI.map((key) => key));
    expect(result.at(-1)).toBe(true);
    expect(result.slice(0, -1).every((hit) => !hit)).toBe(true);
  });

  it('aceita B e A maiúsculos', () => {
    const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    expect(play([...keys, 'ArrowLeft', 'ArrowRight', 'B', 'A']).at(-1)).toBe(true);
  });

  it('errou uma tecla, recomeça', () => {
    const wrong = [...KONAMI.slice(0, 5), 'arrowup', ...KONAMI.slice(5)];
    expect(play(wrong).some(Boolean)).toBe(false);
  });

  it('a tecla errada pode ser o começo de uma nova tentativa', () => {
    const matcher = createSequenceMatcher(KONAMI);
    for (const key of KONAMI.slice(0, 3)) matcher.push(key);
    // ↑ no lugar do segundo ↓ derruba a tentativa, mas já vale como primeiro ↑
    expect(matcher.push('arrowup')).toBe(false);
    for (const key of KONAMI.slice(1, -1)) matcher.push(key);
    expect(matcher.push('a')).toBe(true);
  });

  it('pode ser repetida', () => {
    const matcher = createSequenceMatcher(KONAMI);
    const run = () => KONAMI.map((key) => matcher.push(key)).at(-1);
    expect([run(), run()]).toEqual([true, true]);
  });
});

describe('ovos achados', () => {
  it('guarda cada ovo uma vez e conta quantos já foram', () => {
    const storage = memory();
    expect(foundEggs(storage)).toEqual([]);
    expect(markEgg('palavra', storage)).toEqual({ isNew: true, count: 1 });
    expect(markEgg('palavra', storage)).toEqual({ isNew: false, count: 1 });
    expect(markEgg('konami', storage)).toEqual({ isNew: true, count: 2 });
    expect(foundEggs(storage)).toEqual(['palavra', 'konami']);
  });

  it('ignora lixo no armazenamento', () => {
    expect(foundEggs(memory('não é json'))).toEqual([]);
    expect(foundEggs(memory('{"a":1}'))).toEqual([]);
    expect(foundEggs(memory('["palavra","outro-ovo"]'))).toEqual(['palavra']);
  });

  it('sem armazenamento (ou com ele quebrado), o ovo vale mas não fica guardado', () => {
    expect(markEgg('perdido', null)).toEqual({ isNew: true, count: 1 });
    const broken: EggStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(foundEggs(broken)).toEqual([]);
    expect(markEgg('perdido', broken)).toEqual({ isNew: true, count: 1 });
  });

  it('são 6 ovos para achar', () => {
    expect(EGG_COUNT).toBe(6);
    expect(new Set(EGG_IDS).size).toBe(EGG_COUNT);
  });
});
