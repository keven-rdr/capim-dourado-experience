import { describe, expect, it } from 'vitest';
import { countdown, currentFlash, FLASH_OFFERS } from './flash';

const at = (h: number, m = 0, day = 13) => new Date(2026, 10, day, h, m);

describe('Hora do Capi', () => {
  it('antes do meio-dia aponta para as 12h, ainda fechada', () => {
    const w = currentFlash(at(9), 'ele');
    expect(w.start).toEqual(at(12));
    expect(w.live).toBe(false);
  });

  it('fica aberta por 30 minutos', () => {
    expect(currentFlash(at(12, 10), 'ele').live).toBe(true);
    expect(currentFlash(at(12, 30), 'ele').start).toEqual(at(18));
  });

  it('depois das 20h30 pula para as 12h do dia seguinte', () => {
    const w = currentFlash(at(21), 'kids');
    expect(w.start).toEqual(at(12, 0, 14));
  });

  it('usa só ofertas da trilha da pessoa', () => {
    for (const trail of ['ele', 'ela', 'kids', 'todos'] as const) {
      expect(FLASH_OFFERS[trail]).toContain(currentFlash(at(17), trail).offer);
    }
  });

  it('formata a contagem regressiva', () => {
    expect(countdown(at(10), at(11, 42))).toBe('01:42:00');
    expect(countdown(at(12), at(11))).toBe('00:00:00');
  });
});
