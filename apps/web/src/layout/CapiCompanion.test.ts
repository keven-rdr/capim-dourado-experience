import { beforeEach, describe, expect, it } from 'vitest';
import { loadBall } from './CapiCompanion';

describe('bolinha da Capi', () => {
  beforeEach(() => localStorage.clear());

  it('começa aberta, no canto direito', () => {
    expect(loadBall()).toEqual({ min: false, pos: { side: 'right', top: 0.75 } });
  });

  it('lembra se estava minimizada e onde', () => {
    localStorage.setItem(
      'cde-capi-bola',
      JSON.stringify({ min: true, pos: { side: 'left', top: 0.2 } }),
    );
    expect(loadBall()).toEqual({ min: true, pos: { side: 'left', top: 0.2 } });
  });

  it('ignora dado estragado e limita a posição', () => {
    localStorage.setItem('cde-capi-bola', '{quebrado');
    expect(loadBall().pos.side).toBe('right');
    localStorage.setItem(
      'cde-capi-bola',
      JSON.stringify({ min: true, pos: { side: 'left', top: 9 } }),
    );
    expect(loadBall().pos.top).toBe(1);
  });
});
