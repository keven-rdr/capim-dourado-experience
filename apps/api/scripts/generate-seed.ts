/**
 * Gera `supabase/seed.sql` a partir do seed do `@cde/shared` (fonte única dos dados iniciais).
 *
 *   npm run seed:sql -w @cde/api
 *
 * O SQL é idempotente (upsert por id) e deve ser versionado junto com a mudança no shared.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  COUPONS,
  CURRENT_SEASON,
  HUNTS,
  MALL_AREA_APPROX,
  MISSIONS,
  SEASON_INFO,
  SEASONS,
  SECRETS,
  STICKERS,
  STORES,
} from '@cde/shared';

type Value = string | number | boolean | null | undefined | readonly string[];

function literal(value: Value): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value))
    return `array[${value.map((item) => literal(item)).join(', ')}]::text[]`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

function upsert(table: string, columns: string[], rows: Value[][], key = 'id'): string {
  if (rows.length === 0) return '';
  const values = rows.map((row) => `  (${row.map(literal).join(', ')})`).join(',\n');
  const keys = key.split(',').map((item) => item.trim());
  const updates = columns
    .filter((column) => !keys.includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  return `insert into public.${table} (${columns.join(', ')}) values\n${values}\non conflict (${key}) do update set ${updates};\n`;
}

const sections: string[] = [
  '-- GERADO por apps/api/scripts/generate-seed.ts a partir de packages/shared/src/seed.ts.',
  '-- Não edite à mão: rode `npm run seed:sql -w @cde/api`.',
  '-- Nomes de lojas são reais; descontos, prêmios, parcerias e locais de QR são EXEMPLOS.',
  '-- A área do shopping é APROXIMADA, a confirmar em campo.',
  '',
  'begin;',
  '',
  '-- Só uma temporada fica ativa: desliga as outras antes do upsert.',
  `update public.seasons set active = false where id <> ${literal(CURRENT_SEASON)};`,
  upsert(
    'seasons',
    ['id', 'name', 'theme', 'tagline', 'active'],
    SEASONS.map((id) => [
      id,
      SEASON_INFO[id].name,
      SEASON_INFO[id].theme,
      SEASON_INFO[id].tagline,
      id === CURRENT_SEASON,
    ]),
  ),
  upsert(
    'stickers',
    ['id', 'season_id', 'name', 'rarity', 'sort_order'],
    STICKERS.map((s, index) => [s.id, s.seasonId, s.name, s.rarity, index]),
  ),
  upsert(
    'stores',
    ['id', 'name', 'floor', 'category', 'trails', 'map_x', 'map_y', 'active', 'sort_order'],
    STORES.map((s, index) => [
      s.id,
      s.name,
      s.floor,
      s.category,
      s.trails,
      s.map.x,
      s.map.y,
      true,
      index,
    ]),
  ),
  upsert(
    'coupons',
    [
      'id',
      'title',
      'store_name',
      'store_id',
      'cost',
      'trail',
      'valid_days',
      'example',
      'active',
      'sort_order',
    ],
    COUPONS.map((c, index) => [
      c.id,
      c.title,
      c.storeName,
      c.storeId,
      c.cost,
      c.trail,
      c.validDays,
      true,
      true,
      index,
    ]),
  ),
  upsert(
    'missions',
    [
      'id',
      'kind',
      'title',
      'description',
      'season_id',
      'target',
      'reward_xp',
      'reward_coins',
      'reward_tickets',
      'reward_sticker_id',
      'active',
      'sort_order',
    ],
    MISSIONS.map((m, index) => [
      m.id,
      m.kind,
      m.title,
      m.description,
      m.seasonId,
      m.target,
      m.reward.xp,
      m.reward.coins,
      m.reward.tickets,
      m.reward.stickerId,
      true,
      index,
    ]),
  ),
  upsert(
    'hunts',
    [
      'id',
      'season_id',
      'title',
      'final_xp',
      'final_coins',
      'final_tickets',
      'final_sticker_id',
      'active',
    ],
    HUNTS.map((h) => [
      h.id,
      h.seasonId,
      h.title,
      h.finalReward.xp,
      h.finalReward.coins,
      h.finalReward.tickets,
      h.finalReward.stickerId,
      true,
    ]),
  ),
  upsert(
    'hunt_clues',
    ['hunt_id', 'clue_order', 'riddle', 'hint', 'location_label', 'floor'],
    HUNTS.flatMap((h) =>
      h.clues.map((c) => [h.id, c.order, c.riddle, c.hint, c.locationLabel, c.floor]),
    ),
    'hunt_id, clue_order',
  ),
  upsert(
    'secrets',
    ['id', 'label', 'floor', 'sticker_id', 'active'],
    SECRETS.map((s) => [s.id, s.label, s.floor, s.stickerId, true]),
  ),
  upsert(
    'mall_area',
    ['id', 'polygon', 'note', 'active'],
    [
      [
        'default',
        JSON.stringify(MALL_AREA_APPROX),
        'Polígono APROXIMADO do protótipo. Confirmar em campo e com o shopping.',
        true,
      ],
    ],
  ),
  'commit;',
  '',
];

const target = fileURLToPath(new URL('../../../supabase/seed.sql', import.meta.url));
writeFileSync(target, sections.join('\n'));
console.error(`Seed gravado em ${target}`);
