import { describe, expect, it } from 'vitest';
import { CAPI_EXPRESSIONS, CAPI_LOOKS } from './Capi';
import { cx } from './cx';
import { ICON_NAMES } from './Icon';
import { daysToChest } from './StreakChip';
import { SEASON_IDS, SEASON_THEME } from './season';

describe('helpers da biblioteca', () => {
  it('junta classes ignorando valores falsos', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('conta os dias até o baú da sequência', () => {
    expect(daysToChest(5)).toBe(2);
    expect(daysToChest(7)).toBe(0);
    expect(daysToChest(0)).toBe(7);
    expect(daysToChest(8)).toBe(6);
  });

  it('mostra só Natal (claro) e Black Friday (escura)', () => {
    expect(SEASON_IDS).toEqual(['natal', 'halloween']);
    expect(SEASON_THEME.halloween.label).toBe('Black Friday');
    expect(SEASON_IDS.filter((s) => SEASON_THEME[s].dark)).toEqual(['halloween']);
  });

  it('a Capi tem 4 expressões e 4 visuais', () => {
    expect(CAPI_EXPRESSIONS).toHaveLength(4);
    expect(CAPI_LOOKS.map((l) => l.id)).toEqual(['capi', 'jalapa', 'buriti', 'sussa']);
    expect(ICON_NAMES.length).toBeGreaterThan(20);
  });
});
