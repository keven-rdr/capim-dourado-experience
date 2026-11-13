import { describe, expect, it } from 'vitest';
import { isMallOpen, MALL_AREA_APPROX, pointInPolygon, polygonCenter } from './geo.js';
import {
  EMPTY_STREAK,
  hitStreakMilestone,
  levelFor,
  levelProgress,
  localDate,
  nextLevel,
  nextStreak,
} from './points.js';

describe('níveis', () => {
  it('escolhe o nível pelo XP', () => {
    expect(levelFor(0).id).toBe('explorador');
    expect(levelFor(299).id).toBe('explorador');
    expect(levelFor(300).id).toBe('aventureiro');
    expect(levelFor(5000).id).toBe('mestre');
  });
  it('calcula o progresso e o próximo nível', () => {
    expect(nextLevel(340)?.id).toBe('cacador');
    expect(levelProgress(550)).toBeCloseTo(0.5);
    expect(nextLevel(1800)).toBeNull();
    expect(levelProgress(1800)).toBe(1);
  });
});

describe('sequência de dias', () => {
  it('começa em 1 e sobe em dias seguidos', () => {
    const d1 = nextStreak(EMPTY_STREAK, '2026-11-13');
    expect(d1.days).toBe(1);
    expect(nextStreak(d1, '2026-11-13')).toBe(d1);
    expect(nextStreak(d1, '2026-11-14').days).toBe(2);
  });
  it('perdoa um dia perdido uma vez e depois zera', () => {
    const d1 = nextStreak(EMPTY_STREAK, '2026-11-10');
    const d2 = nextStreak(d1, '2026-11-12');
    expect(d2.days).toBe(2);
    expect(d2.freezeAvailable).toBe(false);
    expect(nextStreak(d2, '2026-11-14').days).toBe(1);
  });
  it('marca o baú ao completar 7 dias', () => {
    let s = EMPTY_STREAK;
    for (let day = 1; day <= 6; day++) s = nextStreak(s, `2026-12-0${day}`);
    const s7 = nextStreak(s, '2026-12-07');
    expect(s7.days).toBe(7);
    expect(hitStreakMilestone(s, s7)).toBe(true);
    expect(hitStreakMilestone(s7, s7)).toBe(false);
  });
});

describe('local e horário', () => {
  it('usa a data de Palmas', () => {
    expect(localDate(new Date('2026-11-14T01:30:00Z'))).toBe('2026-11-13');
  });
  it('reconhece ponto dentro e fora da área', () => {
    expect(pointInPolygon(polygonCenter(MALL_AREA_APPROX), MALL_AREA_APPROX)).toBe(true);
    expect(pointInPolygon({ lat: -10.25, lng: -48.33 }, MALL_AREA_APPROX)).toBe(false);
  });
  it('segue o horário das lojas', () => {
    expect(isMallOpen(new Date('2026-11-13T15:00:00Z'))).toBe(true); // sexta, 12h
    expect(isMallOpen(new Date('2026-11-13T11:00:00Z'))).toBe(false); // sexta, 8h
    expect(isMallOpen(new Date('2026-11-15T15:00:00Z'))).toBe(false); // domingo, 12h
    expect(isMallOpen(new Date('2026-11-15T18:00:00Z'))).toBe(true); // domingo, 15h
  });
});
