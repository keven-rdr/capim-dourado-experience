-- GERADO por apps/api/scripts/generate-seed.ts a partir de packages/shared/src/seed.ts.
-- Não edite à mão: rode `npm run seed:sql -w @cde/api`.
-- Nomes de lojas são reais; descontos, prêmios, parcerias e locais de QR são EXEMPLOS.
-- A área do shopping é APROXIMADA, a confirmar em campo.

begin;

-- Só uma temporada fica ativa: desliga as outras antes do upsert.
update public.seasons set active = false where id <> 'natal';
insert into public.seasons (id, name, theme, tagline, active) values
  ('natal', 'Natal', 'Fábrica de Presentes', 'Ache os presentes escondidos pelo shopping.', true),
  ('pascoa', 'Páscoa', 'Caça aos Ovos', 'Encontre os ovos coloridos e monte a sua cesta.', false),
  ('halloween', 'Halloween', 'Noite dos Monstrinhos', 'Colete um monstrinho em cada pavimento.', false)
on conflict (id) do update set name = excluded.name, theme = excluded.theme, tagline = excluded.tagline, active = excluded.active;

insert into public.stickers (id, season_id, name, rarity, sort_order) values
  ('natal-01', 'natal', 'Capi de gorro', 'comum', 0),
  ('natal-02', 'natal', 'Presente vermelho', 'comum', 1),
  ('natal-03', 'natal', 'Pinheiro do cerrado', 'comum', 2),
  ('natal-04', 'natal', 'Biscoito de gengibre', 'comum', 3),
  ('natal-05', 'natal', 'Estrela de capim dourado', 'comum', 4),
  ('natal-06', 'natal', 'Laço azul', 'comum', 5),
  ('natal-07', 'natal', 'Sino da praça', 'comum', 6),
  ('natal-08', 'natal', 'Trenó de buriti', 'comum', 7),
  ('natal-09', 'natal', 'Pipoca de Natal', 'comum', 8),
  ('natal-10', 'natal', 'Capi detetive', 'rara', 9),
  ('natal-11', 'natal', 'Guirlanda trançada', 'rara', 10),
  ('natal-12', 'natal', 'Capi Dourada', 'rara', 11),
  ('pascoa-01', 'pascoa', 'Capi de orelhas', 'comum', 12),
  ('pascoa-02', 'pascoa', 'Ovo pintado', 'comum', 13),
  ('pascoa-03', 'pascoa', 'Cesta de capim', 'rara', 14),
  ('halloween-01', 'halloween', 'Capi bruxa', 'comum', 15),
  ('halloween-02', 'halloween', 'Abóbora do cerrado', 'comum', 16),
  ('halloween-03', 'halloween', 'Monstrinho do subsolo', 'rara', 17)
on conflict (id) do update set season_id = excluded.season_id, name = excluded.name, rarity = excluded.rarity, sort_order = excluded.sort_order;

insert into public.stores (id, name, floor, category, trails, map_x, map_y, active, sort_order) values
  ('renner', 'Renner', 'terreo', 'Moda', array['ela', 'ele', 'todos']::text[], 14, 62, true, 0),
  ('cea', 'C&A', 'terreo', 'Moda', array['ela', 'ele', 'todos']::text[], 44, 18, true, 1),
  ('riachuelo', 'Riachuelo', 'terreo', 'Moda', array['ela', 'ele', 'todos']::text[], 46, 46, true, 2),
  ('marisa', 'Marisa', 'terreo', 'Moda', array['ela']::text[], 66, 82, true, 3),
  ('centauro', 'Centauro', 'terreo', 'Esporte', array['ele', 'todos']::text[], 28, 84, true, 4),
  ('hering', 'Hering', 'terreo', 'Moda', array['ela', 'ele']::text[], 60, 60, true, 5),
  ('vivara', 'Vivara', 'terreo', 'Joalheria', array['ela']::text[], 52, 70, true, 6),
  ('leitura', 'Leitura', 'terreo', 'Livraria', array['todos', 'kids']::text[], 58, 30, true, 7),
  ('rihappy', 'Ri Happy', 'terreo', 'Brinquedos', array['kids']::text[], 32, 60, true, 8),
  ('wowpark', 'Wow Park', 'terreo', 'Diversão', array['kids']::text[], 84, 14, true, 9),
  ('zigzag', 'Zig Zag', 'terreo', 'Diversão', array['kids']::text[], 84, 30, true, 10),
  ('cinemark', 'Cinemark', 'terreo', 'Cinema', array['todos', 'kids']::text[], 86, 68, true, 11),
  ('outback', 'Outback', 'terreo', 'Restaurante', array['todos']::text[], 54, 82, true, 12),
  ('madero', 'Madero', 'terreo', 'Restaurante', array['todos']::text[], 60, 90, true, 13),
  ('mcdonalds', 'McDonald''s', 'segundo', 'Alimentação', array['todos', 'kids']::text[], 30, 22, true, 14),
  ('spoleto', 'Spoleto', 'segundo', 'Alimentação', array['todos']::text[], 44, 20, true, 15),
  ('pizzahut', 'Pizza Hut', 'segundo', 'Alimentação', array['todos']::text[], 54, 20, true, 16),
  ('giraffas', 'Giraffas', 'segundo', 'Alimentação', array['todos']::text[], 38, 80, true, 17),
  ('subway', 'Subway', 'segundo', 'Alimentação', array['todos']::text[], 58, 80, true, 18)
on conflict (id) do update set name = excluded.name, floor = excluded.floor, category = excluded.category, trails = excluded.trails, map_x = excluded.map_x, map_y = excluded.map_y, active = excluded.active, sort_order = excluded.sort_order;

insert into public.coupons (id, title, store_name, store_id, cost, trail, valid_days, example, active, sort_order) values
  ('c-pipoca', 'Pipoca média', 'Cinemark', 'cinemark', 120, 'todos', 7, true, true, 0),
  ('c-estac', '1 hora de estacionamento', 'Capim Dourado Shopping', null, 100, 'todos', 7, true, true, 1),
  ('c-sorvete', 'Casquinha', 'McDonald''s', 'mcdonalds', 60, 'kids', 7, true, true, 2),
  ('c-brinquedo', '10% em brinquedos', 'Ri Happy', 'rihappy', 150, 'kids', 10, true, true, 3),
  ('c-parque', '15 minutos extras', 'Wow Park', 'wowpark', 180, 'kids', 10, true, true, 4),
  ('c-moda-ela', '10% na coleção nova', 'Marisa', 'marisa', 150, 'ela', 10, true, true, 5),
  ('c-joia', 'Limpeza de joia', 'Vivara', 'vivara', 90, 'ela', 14, true, true, 6),
  ('c-esporte', '10% em tênis', 'Centauro', 'centauro', 160, 'ele', 10, true, true, 7),
  ('c-basico', '10% em básicos', 'Hering', 'hering', 140, 'ele', 10, true, true, 8),
  ('c-livro', '10% em um livro', 'Leitura', 'leitura', 110, 'todos', 10, true, true, 9)
on conflict (id) do update set title = excluded.title, store_name = excluded.store_name, store_id = excluded.store_id, cost = excluded.cost, trail = excluded.trail, valid_days = excluded.valid_days, example = excluded.example, active = excluded.active, sort_order = excluded.sort_order;

insert into public.missions (id, kind, title, description, season_id, target, reward_xp, reward_coins, reward_tickets, reward_sticker_id, active, sort_order) values
  ('m-checkin', 'daily', 'Cheguei!', 'Faça o check-in no shopping hoje.', null, 1, 30, 10, 0, null, true, 0),
  ('m-lojas', 'weekly', 'Maratona de lojas', 'Visite 5 lojas parceiras nesta semana.', null, 5, 60, 30, 0, null, true, 1),
  ('m-natal', 'season', 'A Fábrica de Presentes', 'Encontre os 5 presentes da caça de Natal.', 'natal', 5, 100, 40, 1, 'natal-12', true, 2),
  ('m-segredos', 'season', 'Olhos de capivara', 'Ache 3 segredos escondidos.', 'natal', 3, 80, 30, 0, 'natal-10', true, 3),
  ('m-sobe', 'weekly', 'Sobe pra comer', 'Leia um QR no térreo e outro na Praça de Alimentação.', null, 2, 50, 20, 0, null, true, 4)
on conflict (id) do update set kind = excluded.kind, title = excluded.title, description = excluded.description, season_id = excluded.season_id, target = excluded.target, reward_xp = excluded.reward_xp, reward_coins = excluded.reward_coins, reward_tickets = excluded.reward_tickets, reward_sticker_id = excluded.reward_sticker_id, active = excluded.active, sort_order = excluded.sort_order;

insert into public.hunts (id, season_id, title, final_xp, final_coins, final_tickets, final_sticker_id, active) values
  ('natal-2026', 'natal', 'A Fábrica de Presentes', 100, 40, 1, 'natal-12', true)
on conflict (id) do update set season_id = excluded.season_id, title = excluded.title, final_xp = excluded.final_xp, final_coins = excluded.final_coins, final_tickets = excluded.final_tickets, final_sticker_id = excluded.final_sticker_id, active = excluded.active;

insert into public.hunt_clues (hunt_id, clue_order, riddle, hint, location_label, floor) values
  ('natal-2026', 1, 'Onde o shopping faz festa, o primeiro presente espera.', 'Procure a praça onde montam os eventos.', 'Praça de Eventos central', 'terreo'),
  ('natal-2026', 2, 'Quem vende histórias guarda um segredo na prateleira de baixo.', 'É uma livraria.', 'Leitura', 'terreo'),
  ('natal-2026', 3, 'Onde os brinquedos moram, um embrulho dourado se esconde.', 'Tem um sol sorrindo na fachada.', 'Ri Happy', 'terreo'),
  ('natal-2026', 4, 'Suba até onde a fome acaba. O presente está perto das mesas.', 'Use a escada rolante.', 'Praça de Alimentação', 'segundo'),
  ('natal-2026', 5, 'Luzes apagadas, pipoca na mão. O último presente fica na entrada.', 'É onde passam os filmes.', 'Cinemark', 'terreo')
on conflict (hunt_id, clue_order) do update set riddle = excluded.riddle, hint = excluded.hint, location_label = excluded.location_label, floor = excluded.floor;

insert into public.secrets (id, label, floor, sticker_id, active) values
  ('s1', 'Praça de Eventos central', 'terreo', 'natal-07', true),
  ('s2', 'Alameda das Cores', 'terreo', null, true),
  ('s3', 'Espaço Família', 'terreo', 'natal-08', true),
  ('s4', 'Topo da escada rolante', 'segundo', null, true),
  ('s5', 'Entrada do cinema', 'terreo', 'natal-09', true)
on conflict (id) do update set label = excluded.label, floor = excluded.floor, sticker_id = excluded.sticker_id, active = excluded.active;

insert into public.mall_area (id, polygon, note, active) values
  ('default', '[{"lat":-10.1742,"lng":-48.3352},{"lat":-10.1742,"lng":-48.3312},{"lat":-10.1778,"lng":-48.3312},{"lat":-10.1778,"lng":-48.3352}]', 'Polígono APROXIMADO do protótipo. Confirmar em campo e com o shopping.', true)
on conflict (id) do update set polygon = excluded.polygon, note = excluded.note, active = excluded.active;

commit;
