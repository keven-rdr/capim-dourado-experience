import { FLOOR_LABEL, STORES, type Trail } from '@cde/shared';

export type ProductCategory =
  | 'tenis'
  | 'roupa'
  | 'bolsa'
  | 'joia'
  | 'brinquedo'
  | 'cinema'
  | 'livro';

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  tenis: 'Tênis',
  roupa: 'Roupa',
  bolsa: 'Bolsa',
  joia: 'Joia',
  brinquedo: 'Brinquedo',
  cinema: 'Cinema',
  livro: 'Livro',
};

export interface Product {
  id: string;
  name: string;
  storeId: string;
  category: ProductCategory;
  trails: Trail[];
  /** Preço de hoje, em reais. */
  price: number;
  /** Preço "de", quando há desconto. */
  oldPrice?: number;
}

/**
 * Produtos de exemplo em lojas reais do shopping. Preços e descontos são ilustrativos.
 * shortcut: catálogo fixo no app; quando os lojistas cadastrarem produtos, vem da API.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'tenis-corrida',
    name: 'Tênis de corrida amortecido',
    storeId: 'centauro',
    category: 'tenis',
    trails: ['ele', 'todos'],
    price: 399.9,
    oldPrice: 499.9,
  },
  {
    id: 'camiseta-dry',
    name: 'Camiseta dry-fit',
    storeId: 'hering',
    category: 'roupa',
    trails: ['ele'],
    price: 69.9,
    oldPrice: 89.9,
  },
  {
    id: 'jaqueta-corta',
    name: 'Jaqueta acolchoada com capuz',
    storeId: 'renner',
    category: 'roupa',
    trails: ['ele'],
    price: 199.9,
    oldPrice: 249.9,
  },
  {
    id: 'mochila-treino',
    name: 'Mochila de treino',
    storeId: 'centauro',
    category: 'bolsa',
    trails: ['ele'],
    price: 149.9,
  },
  {
    id: 'bolsa-transversal',
    name: 'Bolsa transversal',
    storeId: 'riachuelo',
    category: 'bolsa',
    trails: ['ela', 'todos'],
    price: 129.9,
    oldPrice: 159.9,
  },
  {
    id: 'vestido-midi',
    name: 'Vestido midi estampado',
    storeId: 'marisa',
    category: 'roupa',
    trails: ['ela'],
    price: 139.9,
    oldPrice: 179.9,
  },
  {
    id: 'brinco-ouro',
    name: 'Brinco em ouro 18k',
    storeId: 'vivara',
    category: 'joia',
    trails: ['ela'],
    price: 590,
    oldPrice: 690,
  },
  {
    id: 'sandalia-salto',
    name: 'Sandália de salto bloco',
    storeId: 'renner',
    category: 'tenis',
    trails: ['ela'],
    price: 159.9,
  },
  {
    id: 'blocos-montar',
    name: 'Blocos de montar, 500 peças',
    storeId: 'rihappy',
    category: 'brinquedo',
    trails: ['kids'],
    price: 159.9,
    oldPrice: 199.9,
  },
  {
    id: 'boneca',
    name: 'Boneca articulada',
    storeId: 'rihappy',
    category: 'brinquedo',
    trails: ['kids'],
    price: 99.9,
  },
  {
    id: 'combo-kids',
    name: 'Combo pipoca kids',
    storeId: 'cinemark',
    category: 'cinema',
    trails: ['kids'],
    price: 19.9,
  },
  {
    id: 'combo-pipoca',
    name: 'Combo pipoca + refri',
    storeId: 'cinemark',
    category: 'cinema',
    trails: ['todos'],
    price: 34.9,
  },
  {
    id: 'box-livros',
    name: 'Box de livros de bolso',
    storeId: 'leitura',
    category: 'livro',
    trails: ['todos', 'kids'],
    price: 89.9,
    oldPrice: 119.9,
  },
];

export function productsFor(trail: Trail): Product[] {
  return PRODUCTS.filter((p) => p.trails.includes(trail));
}

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function storeOf(p: Product): { name: string; floor: string } {
  const s = STORES.find((x) => x.id === p.storeId);
  return { name: s?.name ?? p.storeId, floor: s ? FLOOR_LABEL[s.floor] : '' };
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Preço dos últimos 30 dias (exemplo): sai do preço "de" e termina no preço de hoje. */
export function priceHistory(p: Product, today: number = p.price): number[] {
  const start = p.oldPrice ?? p.price * 1.12;
  let seed = [...p.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const noise = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed % 1000) / 1000 - 0.5;
  };
  return Array.from({ length: 30 }, (_, i) => {
    if (i === 29) return today;
    const base = start + ((p.price - start) * i) / 29;
    return Math.round((base + noise() * p.price * 0.06) * 100) / 100;
  });
}

export function discountPct(p: Product, price: number = p.price): number | null {
  const from = p.oldPrice;
  return from && from > price ? Math.round((1 - price / from) * 100) : null;
}
