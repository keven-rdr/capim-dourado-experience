import { useSyncExternalStore } from 'react';

/** Como o modo demonstração responde quando o app pede a localização. */
export type DemoLocation = 'real' | 'inside' | 'outside' | 'imprecise' | 'denied';

export interface DemoSettings {
  /** Forçado por `?demo=1` (usa o LocalGameApi mesmo com API configurada). */
  forced: boolean;
  location: DemoLocation;
  /** Dias adiantados no relógio do jogo. */
  dayOffset: number;
  /** Respeitar o horário do shopping. Na apresentação, desligado. */
  respectHours: boolean;
}

const KEY = 'cde:demo:v1';
const DAY_MS = 86_400_000;
const DEFAULTS: DemoSettings = {
  forced: false,
  location: 'inside',
  dayOffset: 0,
  respectHours: false,
};

function read(): DemoSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DemoSettings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let current: DemoSettings = typeof localStorage === 'undefined' ? { ...DEFAULTS } : read();
const listeners = new Set<() => void>();

export function getDemo(): DemoSettings {
  return current;
}

export function setDemo(patch: Partial<DemoSettings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // sem armazenamento: vale só nesta aba
  }
  for (const listener of listeners) listener();
}

export function resetDemo(): void {
  setDemo({ ...DEFAULTS, forced: current.forced });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemo(): DemoSettings {
  return useSyncExternalStore(subscribe, getDemo, getDemo);
}

/** Relógio do jogo: o real mais os dias adiantados no painel. */
export function demoNow(): Date {
  return new Date(Date.now() + current.dayOffset * DAY_MS);
}

let openOnStart = false;

/** Pede para abrir o painel quando o app terminar de carregar (ex.: `?demo=1`). */
export function requestOpenOnStart(): void {
  openOnStart = true;
}

/** Devolve o pedido de abrir o painel uma única vez. */
export function consumeOpenOnStart(): boolean {
  const value = openOnStart;
  openOnStart = false;
  return value;
}
