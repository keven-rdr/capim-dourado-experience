import { describe, expect, it } from 'vitest';
import { answerChat } from './chat.js';
import { PROMOTIONS, STORES } from './seed.js';

describe('respostas da Capi', () => {
  it('encontra uma loja e informa o nome do pavimento', () => {
    const result = answerChat({ text: 'Onde fica a C&A?' }, STORES, PROMOTIONS);
    expect(result.store?.id).toBe('cea');
    expect(result.text).toContain('1º Pavimento – Térreo');
  });

  it('filtra promoções de uma loja e respeita a validade', () => {
    const input = { text: 'Tem promoção na Leitura?', now: '2026-11-14T12:00:00.000Z' };
    expect(answerChat(input, STORES, PROMOTIONS).promotions.map((item) => item.storeId)).toEqual([
      'leitura',
    ]);
    expect(
      answerChat({ ...input, now: '2028-01-01T00:00:00.000Z' }, STORES, PROMOTIONS).promotions,
    ).toEqual([]);
  });

  it('responde aos atalhos de pontos e eventos sem inventar dados', () => {
    expect(answerChat({ text: '', intent: 'points_help' }, STORES, PROMOTIONS).intent).toBe(
      'points_help',
    );
    expect(answerChat({ text: 'Quais são os eventos?' }, STORES, PROMOTIONS).intent).toBe('events');
  });
});
