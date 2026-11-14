import { describe, expect, it } from 'vitest';
import {
  BASE_SPINS,
  describeGoldenWindow,
  GOLDEN_SPIN_FACTOR,
  GOLDEN_WINDOWS,
  isGoldenHour,
  parseClock,
  pickSlice,
  ROULETTE_SLICES,
  sliceViews,
  spinsForCheckIn,
} from './roulette.js';
import { COUPONS } from './seed.js';

/** Palmas é UTC-3 o ano todo. 2026-11-17 é terça-feira. */
const palmas = (iso: string) => new Date(`${iso}-03:00`);

describe('hora dourada', () => {
  it('vale dentro da janela, no horário de Palmas', () => {
    expect(isGoldenHour(palmas('2026-11-17T15:00:00'))).toBe(true);
    expect(isGoldenHour(palmas('2026-11-17T14:00:00'))).toBe(true);
  });

  it('não vale antes, no fim exato da janela, nem em dia fora da lista', () => {
    expect(isGoldenHour(palmas('2026-11-17T13:59:00'))).toBe(false);
    expect(isGoldenHour(palmas('2026-11-17T17:00:00'))).toBe(false);
    // sábado, 14/11/2026, 15h
    expect(isGoldenHour(palmas('2026-11-14T15:00:00'))).toBe(false);
  });

  it('o domingo tem janela própria', () => {
    // domingo, 15/11/2026
    expect(isGoldenHour(palmas('2026-11-15T15:30:00'))).toBe(true);
    expect(isGoldenHour(palmas('2026-11-15T16:00:00'))).toBe(false);
  });

  it('usa o fuso de Palmas e não o do servidor', () => {
    // 17:30 UTC é 14:30 em Palmas
    expect(isGoldenHour(new Date('2026-11-17T17:30:00Z'))).toBe(true);
    // 15:30 UTC é 12:30 em Palmas
    expect(isGoldenHour(new Date('2026-11-17T15:30:00Z'))).toBe(false);
  });

  it('aceita janelas próprias e ignora horário inválido', () => {
    const windows = [{ days: [2], from: '09:00', to: '10:30' }];
    expect(isGoldenHour(palmas('2026-11-17T10:00:00'), windows)).toBe(true);
    expect(isGoldenHour(palmas('2026-11-17T10:30:00'), windows)).toBe(false);
    expect(
      isGoldenHour(palmas('2026-11-17T10:00:00'), [{ days: [2], from: '9h', to: '11h' }]),
    ).toBe(false);
  });

  it('parseClock lê só HH:MM', () => {
    expect(parseClock('14:00')).toBe(840);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('9:00')).toBeNull();
  });
});

describe('giros do check-in', () => {
  it('sem check-in não há giro', () => {
    expect(spinsForCheckIn(null)).toBe(0);
  });

  it('1 giro no horário normal e giros em dobro na hora dourada', () => {
    expect(spinsForCheckIn(palmas('2026-11-14T16:00:00'))).toBe(BASE_SPINS);
    expect(spinsForCheckIn(palmas('2026-11-17T15:00:00'))).toBe(BASE_SPINS * GOLDEN_SPIN_FACTOR);
  });
});

describe('sorteio da fatia', () => {
  it('respeita os pesos nas pontas', () => {
    expect(pickSlice(() => 0)).toBe(0);
    expect(pickSlice(() => 0.999999)).toBe(ROULETTE_SLICES.length - 1);
  });

  it('cai na fatia cujo intervalo contém o ponto sorteado', () => {
    const slices = [
      { couponId: 'a', label: 'A', weight: 1 },
      { couponId: 'b', label: 'B', weight: 3 },
    ];
    expect(pickSlice(() => 0.1, slices)).toBe(0);
    expect(pickSlice(() => 0.3, slices)).toBe(1);
  });

  it('a distribuição segue os pesos', () => {
    const total = ROULETTE_SLICES.reduce((sum, s) => sum + s.weight, 0);
    const counts = ROULETTE_SLICES.map(() => 0);
    const steps = 10_000;
    for (let i = 0; i < steps; i++) {
      const index = pickSlice(() => (i + 0.5) / steps);
      counts[index] = (counts[index] ?? 0) + 1;
    }
    for (const [i, slice] of ROULETTE_SLICES.entries()) {
      const expected = (slice.weight / total) * steps;
      expect(Math.abs((counts[i] ?? 0) - expected)).toBeLessThan(steps * 0.01);
    }
  });

  it('todas as fatias apontam para cupons do catálogo', () => {
    const views = sliceViews(COUPONS);
    expect(views).toHaveLength(ROULETTE_SLICES.length);
    expect(views.map((v) => v.index)).toEqual(views.map((_, i) => i));
  });

  it('avisa quando uma fatia aponta para cupom fora do catálogo', () => {
    expect(() => sliceViews([])).toThrow(/fora do catálogo/);
  });
});

describe('texto da janela', () => {
  it('descreve dias seguidos e dia único', () => {
    expect(describeGoldenWindow(GOLDEN_WINDOWS[0] as never)).toBe('seg. a qui., 14h às 17h');
    expect(describeGoldenWindow(GOLDEN_WINDOWS[1] as never)).toBe('dom., 14h às 16h');
    expect(describeGoldenWindow({ days: [1, 3, 5], from: '09:30', to: '11:00' })).toBe(
      'seg., qua., sex., 9h30 às 11h',
    );
  });
});
