import { useSyncExternalStore } from 'react';
import { PRODUCTS, type Product } from './catalog';

/**
 * Lista de desejos e quedas de preço da demonstração, guardadas no aparelho.
 * shortcut: fica no localStorage porque o contrato da API ainda não tem lista de desejos;
 * quando o orquestrador incluir no @cde/shared, troca para a API.
 */
export interface WishEntry {
  /** Avisar quando o preço ficar igual ou abaixo disto. */
  target: number;
  /** Preço no momento em que salvou. */
  savedPrice: number;
}

interface State {
  wishes: Record<string, WishEntry>;
  /** Preço atual sobrescrito pela demo ("simular queda"). */
  drops: Record<string, number>;
}

const KEY = 'cde-desejos';
const EVENT = 'cde-desejos';
const EMPTY: State = { wishes: {}, drops: {} };
let cache: State | null = null;

function read(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : EMPTY;
  } catch {
    cache = EMPTY; // armazenamento bloqueado ou corrompido: começa vazia
  }
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function useWishlist() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    wishes: state.wishes,
    priceOf: (p: Product) => state.drops[p.id] ?? p.price,
    save: (p: Product, target: number) =>
      write({
        ...state,
        wishes: { ...state.wishes, [p.id]: { target, savedPrice: state.drops[p.id] ?? p.price } },
      }),
    remove: (id: string) => {
      const { [id]: _, ...rest } = state.wishes;
      write({ ...state, wishes: rest });
    },
  };
}

export interface WishStatus {
  /** Quanto baixou desde que salvou (0 se não baixou). */
  dropped: number;
  /** Chegou no preço que a pessoa quer. */
  reached: boolean;
}

export function wishStatus(entry: WishEntry, price: number): WishStatus {
  return {
    dropped: Math.max(0, Math.round((entry.savedPrice - price) * 100) / 100),
    reached: price <= entry.target,
  };
}

/**
 * Demo: derruba o preço de um desejo até o alvo (ou 15% de um produto, se não há desejos).
 * Devolve o que mudou, para a demo avisar.
 */
export function simulatePriceDrop(): { product: Product; from: number; to: number } | null {
  const state = read();
  const priceOf = (p: Product) => state.drops[p.id] ?? p.price;
  const waiting = PRODUCTS.find((p) => {
    const w = state.wishes[p.id];
    return w && priceOf(p) > w.target;
  });
  const product = waiting ?? PRODUCTS.find((p) => state.wishes[p.id]) ?? PRODUCTS[0];
  if (!product) return null;
  const from = priceOf(product);
  const goal = state.wishes[product.id]?.target ?? from * 0.85;
  // termina em ,90 sem passar do alvo (ex.: alvo 359,00 vira 358,90)
  const to = Math.floor(Math.min(goal, from * 0.95) - 0.9) + 0.9;
  write({ ...state, drops: { ...state.drops, [product.id]: to } });
  return { product, from, to };
}
