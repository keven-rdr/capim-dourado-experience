import { describe, expect, it } from 'vitest';
import { markStoreVisit, toMapPercent, visitedOn } from './mapVotes';

describe('toMapPercent', () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };

  it('converte o toque em porcentagem do desenho', () => {
    expect(toMapPercent(box, 150, 75)).toEqual({ x: 25, y: 25 });
  });

  it('não deixa a posição sair da imagem', () => {
    expect(toMapPercent(box, 0, 500)).toEqual({ x: 0, y: 100 });
  });
});

describe('lojas visitadas hoje', () => {
  it('libera só a loja cujo QR foi lido, e só no mesmo dia', () => {
    markStoreVisit('renner', '2026-11-14');
    expect(visitedOn('2026-11-14')).toEqual(['renner']);
    expect(visitedOn('2026-11-15')).toEqual([]);
  });
});
