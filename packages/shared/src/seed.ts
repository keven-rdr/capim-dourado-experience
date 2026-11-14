import type { Coupon, Hunt, Mission, Promotion, SeasonId, Sticker, Store } from './domain.js';

/**
 * Dados iniciais do protótipo.
 * Nomes de lojas e espaços vêm da planta e do site do Capim Dourado Shopping (conferir antes de publicar).
 * Parcerias, descontos, prêmios e locais de QR são EXEMPLOS: nada aqui foi combinado com lojistas.
 */

export const CURRENT_SEASON: SeasonId = 'natal';

export const SEASON_INFO: Record<SeasonId, { name: string; theme: string; tagline: string }> = {
  natal: {
    name: 'Natal',
    theme: 'Fábrica de Presentes',
    tagline: 'Ache os presentes escondidos pelo shopping.',
  },
  pascoa: {
    name: 'Páscoa',
    theme: 'Caça aos Ovos',
    tagline: 'Encontre os ovos coloridos e monte a sua cesta.',
  },
  halloween: {
    name: 'Halloween',
    theme: 'Noite dos Monstrinhos',
    tagline: 'Colete um monstrinho em cada pavimento.',
  },
};

export const STORES: readonly Store[] = [
  {
    id: 'renner',
    name: 'Renner',
    floor: 'terreo',
    category: 'Moda',
    trails: ['ela', 'ele', 'todos'],
    map: { x: 14, y: 62 },
  },
  {
    id: 'cea',
    name: 'C&A',
    floor: 'terreo',
    category: 'Moda',
    trails: ['ela', 'ele', 'todos'],
    map: { x: 44, y: 18 },
  },
  {
    id: 'riachuelo',
    name: 'Riachuelo',
    floor: 'terreo',
    category: 'Moda',
    trails: ['ela', 'ele', 'todos'],
    map: { x: 46, y: 46 },
  },
  {
    id: 'marisa',
    name: 'Marisa',
    floor: 'terreo',
    category: 'Moda',
    trails: ['ela'],
    map: { x: 66, y: 82 },
  },
  {
    id: 'centauro',
    name: 'Centauro',
    floor: 'terreo',
    category: 'Esporte',
    trails: ['ele', 'todos'],
    map: { x: 28, y: 84 },
  },
  {
    id: 'hering',
    name: 'Hering',
    floor: 'terreo',
    category: 'Moda',
    trails: ['ela', 'ele'],
    map: { x: 60, y: 60 },
  },
  {
    id: 'vivara',
    name: 'Vivara',
    floor: 'terreo',
    category: 'Joalheria',
    trails: ['ela'],
    map: { x: 52, y: 70 },
  },
  {
    id: 'leitura',
    name: 'Leitura',
    floor: 'terreo',
    category: 'Livraria',
    trails: ['todos', 'kids'],
    map: { x: 58, y: 30 },
  },
  {
    id: 'rihappy',
    name: 'Ri Happy',
    floor: 'terreo',
    category: 'Brinquedos',
    trails: ['kids'],
    map: { x: 32, y: 60 },
  },
  {
    id: 'wowpark',
    name: 'Wow Park',
    floor: 'terreo',
    category: 'Diversão',
    trails: ['kids'],
    map: { x: 84, y: 14 },
  },
  {
    id: 'zigzag',
    name: 'Zig Zag',
    floor: 'terreo',
    category: 'Diversão',
    trails: ['kids'],
    map: { x: 84, y: 30 },
  },
  {
    id: 'cinemark',
    name: 'Cinemark',
    floor: 'terreo',
    category: 'Cinema',
    trails: ['todos', 'kids'],
    map: { x: 86, y: 68 },
  },
  {
    id: 'outback',
    name: 'Outback',
    floor: 'terreo',
    category: 'Restaurante',
    trails: ['todos'],
    map: { x: 54, y: 82 },
  },
  {
    id: 'madero',
    name: 'Madero',
    floor: 'terreo',
    category: 'Restaurante',
    trails: ['todos'],
    map: { x: 60, y: 90 },
  },
  {
    id: 'mcdonalds',
    name: "McDonald's",
    floor: 'segundo',
    category: 'Alimentação',
    trails: ['todos', 'kids'],
    map: { x: 30, y: 22 },
  },
  {
    id: 'spoleto',
    name: 'Spoleto',
    floor: 'segundo',
    category: 'Alimentação',
    trails: ['todos'],
    map: { x: 44, y: 20 },
  },
  {
    id: 'pizzahut',
    name: 'Pizza Hut',
    floor: 'segundo',
    category: 'Alimentação',
    trails: ['todos'],
    map: { x: 54, y: 20 },
  },
  {
    id: 'giraffas',
    name: 'Giraffas',
    floor: 'segundo',
    category: 'Alimentação',
    trails: ['todos'],
    map: { x: 38, y: 80 },
  },
  {
    id: 'subway',
    name: 'Subway',
    floor: 'segundo',
    category: 'Alimentação',
    trails: ['todos'],
    map: { x: 58, y: 80 },
  },
];

/** Segredos: QR escondidos em áreas públicas. Locais de exemplo, a combinar com a Operação. */
export const SECRETS: ReadonlyArray<{
  id: string;
  label: string;
  floor: Store['floor'];
  stickerId?: string;
}> = [
  { id: 's1', label: 'Praça de Eventos central', floor: 'terreo', stickerId: 'natal-07' },
  { id: 's2', label: 'Alameda das Cores', floor: 'terreo' },
  { id: 's3', label: 'Espaço Família', floor: 'terreo', stickerId: 'natal-08' },
  { id: 's4', label: 'Topo da escada rolante', floor: 'segundo' },
  { id: 's5', label: 'Entrada do cinema', floor: 'terreo', stickerId: 'natal-09' },
];

export const HUNTS: readonly Hunt[] = [
  {
    id: 'natal-2026',
    seasonId: 'natal',
    title: 'A Fábrica de Presentes',
    clues: [
      {
        order: 1,
        riddle: 'Onde o shopping faz festa, o primeiro presente espera.',
        hint: 'Procure a praça onde montam os eventos.',
        locationLabel: 'Praça de Eventos central',
        floor: 'terreo',
      },
      {
        order: 2,
        riddle: 'Quem vende histórias guarda um segredo na prateleira de baixo.',
        hint: 'É uma livraria.',
        locationLabel: 'Leitura',
        floor: 'terreo',
      },
      {
        order: 3,
        riddle: 'Onde os brinquedos moram, um embrulho dourado se esconde.',
        hint: 'Tem um sol sorrindo na fachada.',
        locationLabel: 'Ri Happy',
        floor: 'terreo',
      },
      {
        order: 4,
        riddle: 'Suba até onde a fome acaba. O presente está perto das mesas.',
        hint: 'Use a escada rolante.',
        locationLabel: 'Praça de Alimentação',
        floor: 'segundo',
      },
      {
        order: 5,
        riddle: 'Luzes apagadas, pipoca na mão. O último presente fica na entrada.',
        hint: 'É onde passam os filmes.',
        locationLabel: 'Cinemark',
        floor: 'terreo',
      },
    ],
    finalReward: { xp: 100, coins: 40, tickets: 1, stickerId: 'natal-12' },
  },
];

export const MISSIONS: readonly Mission[] = [
  {
    id: 'm-checkin',
    kind: 'daily',
    title: 'Cheguei!',
    description: 'Faça o check-in no shopping hoje.',
    target: 1,
    reward: { xp: 30, coins: 10, tickets: 0 },
  },
  {
    id: 'm-lojas',
    kind: 'weekly',
    title: 'Maratona de lojas',
    description: 'Visite 5 lojas parceiras nesta semana.',
    target: 5,
    reward: { xp: 60, coins: 30, tickets: 0 },
  },
  {
    id: 'm-natal',
    kind: 'season',
    seasonId: 'natal',
    title: 'A Fábrica de Presentes',
    description: 'Encontre os 5 presentes da caça de Natal.',
    target: 5,
    reward: { xp: 100, coins: 40, tickets: 1, stickerId: 'natal-12' },
  },
  {
    id: 'm-segredos',
    kind: 'season',
    seasonId: 'natal',
    title: 'Olhos de capivara',
    description: 'Ache 3 segredos escondidos.',
    target: 3,
    reward: { xp: 80, coins: 30, tickets: 0, stickerId: 'natal-10' },
  },
  {
    id: 'm-sobe',
    kind: 'weekly',
    title: 'Sobe pra comer',
    description: 'Leia um QR no térreo e outro na Praça de Alimentação.',
    target: 2,
    reward: { xp: 50, coins: 20, tickets: 0 },
  },
];

export const COUPONS: readonly Coupon[] = [
  {
    id: 'c-pipoca',
    title: 'Pipoca média',
    storeName: 'Cinemark',
    storeId: 'cinemark',
    cost: 120,
    trail: 'todos',
    validDays: 7,
    example: true,
  },
  {
    id: 'c-estac',
    title: '1 hora de estacionamento',
    storeName: 'Capim Dourado Shopping',
    cost: 100,
    trail: 'todos',
    validDays: 7,
    example: true,
  },
  {
    id: 'c-sorvete',
    title: 'Casquinha',
    storeName: "McDonald's",
    storeId: 'mcdonalds',
    cost: 60,
    trail: 'kids',
    validDays: 7,
    example: true,
  },
  {
    id: 'c-brinquedo',
    title: '10% em brinquedos',
    storeName: 'Ri Happy',
    storeId: 'rihappy',
    cost: 150,
    trail: 'kids',
    validDays: 10,
    example: true,
  },
  {
    id: 'c-parque',
    title: '15 minutos extras',
    storeName: 'Wow Park',
    storeId: 'wowpark',
    cost: 180,
    trail: 'kids',
    validDays: 10,
    example: true,
  },
  {
    id: 'c-moda-ela',
    title: '10% na coleção nova',
    storeName: 'Marisa',
    storeId: 'marisa',
    cost: 150,
    trail: 'ela',
    validDays: 10,
    example: true,
  },
  {
    id: 'c-joia',
    title: 'Limpeza de joia',
    storeName: 'Vivara',
    storeId: 'vivara',
    cost: 90,
    trail: 'ela',
    validDays: 14,
    example: true,
  },
  {
    id: 'c-esporte',
    title: '10% em tênis',
    storeName: 'Centauro',
    storeId: 'centauro',
    cost: 160,
    trail: 'ele',
    validDays: 10,
    example: true,
  },
  {
    id: 'c-basico',
    title: '10% em básicos',
    storeName: 'Hering',
    storeId: 'hering',
    cost: 140,
    trail: 'ele',
    validDays: 10,
    example: true,
  },
  {
    id: 'c-livro',
    title: '10% em um livro',
    storeName: 'Leitura',
    storeId: 'leitura',
    cost: 110,
    trail: 'todos',
    validDays: 10,
    example: true,
  },
];

/** Ofertas fictícias para exercitar o catálogo e o chat na demonstração. */
export const PROMOTIONS: readonly Promotion[] = [
  {
    id: 'promo-leitura-demo',
    storeId: 'leitura',
    title: 'Oferta de exemplo em livros',
    description: 'Confira uma condição especial fictícia para a demonstração.',
    terms: 'Oferta ilustrativa; consulte a loja para condições reais.',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-01-01T00:00:00.000Z',
    status: 'published',
    couponId: 'c-livro',
    example: true,
  },
  {
    id: 'promo-rihappy-demo',
    storeId: 'rihappy',
    title: 'Brincadeira de exemplo',
    description: 'Veja uma promoção fictícia para testar o cadastro de lojista.',
    terms: 'Oferta ilustrativa; consulte a loja para condições reais.',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-01-01T00:00:00.000Z',
    status: 'published',
    couponId: 'c-brinquedo',
    example: true,
  },
];

export const STICKERS: readonly Sticker[] = [
  { id: 'natal-01', seasonId: 'natal', name: 'Capi de gorro', rarity: 'comum' },
  { id: 'natal-02', seasonId: 'natal', name: 'Presente vermelho', rarity: 'comum' },
  { id: 'natal-03', seasonId: 'natal', name: 'Pinheiro do cerrado', rarity: 'comum' },
  { id: 'natal-04', seasonId: 'natal', name: 'Biscoito de gengibre', rarity: 'comum' },
  { id: 'natal-05', seasonId: 'natal', name: 'Estrela de capim dourado', rarity: 'comum' },
  { id: 'natal-06', seasonId: 'natal', name: 'Laço azul', rarity: 'comum' },
  { id: 'natal-07', seasonId: 'natal', name: 'Sino da praça', rarity: 'comum' },
  { id: 'natal-08', seasonId: 'natal', name: 'Trenó de buriti', rarity: 'comum' },
  { id: 'natal-09', seasonId: 'natal', name: 'Pipoca de Natal', rarity: 'comum' },
  { id: 'natal-10', seasonId: 'natal', name: 'Capi detetive', rarity: 'rara' },
  { id: 'natal-11', seasonId: 'natal', name: 'Guirlanda trançada', rarity: 'rara' },
  { id: 'natal-12', seasonId: 'natal', name: 'Capi Dourada', rarity: 'rara' },
  { id: 'pascoa-01', seasonId: 'pascoa', name: 'Capi de orelhas', rarity: 'comum' },
  { id: 'pascoa-02', seasonId: 'pascoa', name: 'Ovo pintado', rarity: 'comum' },
  { id: 'pascoa-03', seasonId: 'pascoa', name: 'Cesta de capim', rarity: 'rara' },
  { id: 'halloween-01', seasonId: 'halloween', name: 'Capi bruxa', rarity: 'comum' },
  { id: 'halloween-02', seasonId: 'halloween', name: 'Abóbora do cerrado', rarity: 'comum' },
  { id: 'halloween-03', seasonId: 'halloween', name: 'Monstrinho do subsolo', rarity: 'rara' },
];

/** Figurinhas que o visitante ganha em ações comuns (rodízio simples no protótipo). */
export const COMMON_STICKER_POOL: Record<SeasonId, readonly string[]> = {
  natal: ['natal-01', 'natal-02', 'natal-03', 'natal-04', 'natal-05', 'natal-06'],
  pascoa: ['pascoa-01', 'pascoa-02'],
  halloween: ['halloween-01', 'halloween-02'],
};
