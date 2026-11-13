-- Capim Dourado Experience: esquema inicial.
--
-- Regras de acesso:
--   * RLS ligado em todas as tabelas.
--   * Usuário autenticado só LÊ os próprios dados.
--   * Catálogos (temporadas, lojas, cupons, figurinhas, missões, caças) têm leitura pública.
--   * Nenhuma escrita direta pelo cliente: toda escrita passa pela API, com a chave secreta
--     (service role), que ignora o RLS.
--
-- ATENÇÃO: este SQL ainda não foi executado em um projeto Supabase real.

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

create table public.seasons (
  id text primary key check (id in ('natal', 'pascoa', 'halloween')),
  name text not null,
  theme text not null,
  tagline text not null,
  active boolean not null default false
);

-- No máximo uma temporada ativa.
create unique index seasons_one_active on public.seasons (active) where active;

create table public.stickers (
  id text primary key,
  season_id text not null references public.seasons (id),
  name text not null,
  rarity text not null check (rarity in ('comum', 'rara')),
  sort_order integer not null default 0
);

create table public.stores (
  id text primary key,
  name text not null,
  floor text not null check (floor in ('terreo', 'segundo', 'subsolo')),
  category text not null,
  trails text[] not null default '{}'
    check (trails <@ array['kids', 'ela', 'ele', 'todos']::text[]),
  map_x numeric(5, 2) not null check (map_x between 0 and 100),
  map_y numeric(5, 2) not null check (map_y between 0 and 100),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.coupons (
  id text primary key,
  title text not null,
  store_name text not null,
  store_id text references public.stores (id),
  cost integer not null check (cost > 0),
  trail text not null check (trail in ('kids', 'ela', 'ele', 'todos')),
  valid_days integer not null check (valid_days > 0),
  -- Todas as ofertas do protótipo são exemplos.
  example boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.missions (
  id text primary key,
  kind text not null check (kind in ('daily', 'weekly', 'season', 'store')),
  title text not null,
  description text not null,
  season_id text references public.seasons (id),
  target integer not null check (target > 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  reward_coins integer not null default 0 check (reward_coins >= 0),
  reward_tickets integer not null default 0 check (reward_tickets >= 0),
  reward_sticker_id text references public.stickers (id),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.hunts (
  id text primary key,
  season_id text not null references public.seasons (id),
  title text not null,
  final_xp integer not null default 0 check (final_xp >= 0),
  final_coins integer not null default 0 check (final_coins >= 0),
  final_tickets integer not null default 0 check (final_tickets >= 0),
  final_sticker_id text references public.stickers (id),
  active boolean not null default true
);

-- Pistas: o local de cada QR só aparece depois de encontrado, então não há leitura pública.
create table public.hunt_clues (
  hunt_id text not null references public.hunts (id) on delete cascade,
  clue_order integer not null check (clue_order > 0),
  riddle text not null,
  hint text not null,
  location_label text not null,
  floor text not null check (floor in ('terreo', 'segundo', 'subsolo')),
  primary key (hunt_id, clue_order)
);

-- Segredos: QR escondidos em áreas públicas. Sem leitura pública.
create table public.secrets (
  id text primary key,
  label text not null,
  floor text not null check (floor in ('terreo', 'segundo', 'subsolo')),
  sticker_id text references public.stickers (id),
  active boolean not null default true
);

-- Área de check-in: polígono [{ "lat": n, "lng": n }, ...]. Sem leitura pública.
create table public.mall_area (
  id text primary key default 'default',
  polygon jsonb not null
    check (jsonb_typeof(polygon) = 'array' and jsonb_array_length(polygon) >= 3),
  note text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dados do usuário
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  trail text not null check (trail in ('kids', 'ela', 'ele', 'todos')),
  character text not null check (char_length(character) between 1 and 40),
  location_consent boolean not null default false,
  -- Carteira. XP nunca diminui (garantido pelo ledger); moedas e bilhetes nunca negativos.
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  tickets integer not null default 0 check (tickets >= 0),
  -- Sequência de dias (data local de Palmas).
  streak_days integer not null default 0 check (streak_days >= 0),
  streak_last_date date,
  streak_freeze boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ledger imutável de pontos: só recebe inserções.
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  label text not null,
  xp integer not null check (xp >= 0),
  coins integer not null,
  tickets integer not null,
  local_date date not null,
  -- Idempotência: o mesmo crédito (ex.: daily_open:2026-11-13) entra uma vez por usuário.
  dedupe_key text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index point_events_user_date on public.point_events (user_id, local_date);
create index point_events_user_created on public.point_events (user_id, created_at desc);

-- Check-in: só o resultado (dentro ou fora, data e hora). A coordenada nunca é gravada.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  method text not null check (method in ('gps', 'qr')),
  inside boolean not null,
  created_at timestamptz not null default now()
);

-- RN01: um check-in válido por usuário por dia.
create unique index checkins_one_per_day on public.checkins (user_id, local_date) where inside;

-- Leituras de QR. scope_key = data (lojas: uma vez por loja por dia) ou 'once' (segredos e pistas).
create table public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('store', 'secret', 'clue')),
  ref_id text not null,
  scope_key text not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id, scope_key)
);

create index qr_scans_user_kind_date on public.qr_scans (user_id, kind, local_date);

create table public.hunt_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hunt_id text not null references public.hunts (id),
  solved integer not null default 0 check (solved >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, hunt_id)
);

-- Conclusão de missão por período (d:<data>, w:<segunda-feira>, s:<temporada>).
create table public.mission_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id text not null references public.missions (id),
  period_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id, period_key)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  coupon_id text not null references public.coupons (id),
  title text not null,
  store_name text not null,
  -- RN07: código único, com validade e uso único (used_at preenchido pela loja no painel).
  code text not null unique,
  redeemed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > redeemed_at),
  check (used_at is null or used_at >= redeemed_at)
);

create index redemptions_user on public.redemptions (user_id, redeemed_at desc);

-- Bilhetes de sorteio (simulado no MVP). Uma linha por bilhete, criada por apply_points.
create table public.raffle_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id text references public.seasons (id),
  source text not null,
  point_event_id uuid not null references public.point_events (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index raffle_tickets_user on public.raffle_tickets (user_id);

create table public.user_stickers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sticker_id text not null references public.stickers (id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

-- ---------------------------------------------------------------------------
-- Ledger imutável: bloqueia UPDATE (DELETE só acontece em cascata, ao apagar a conta).
-- ---------------------------------------------------------------------------

create function public.forbid_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'A tabela % é imutável.', tg_table_name using errcode = '42501';
end;
$$;

create trigger point_events_immutable
  before update on public.point_events
  for each row execute function public.forbid_update();

-- ---------------------------------------------------------------------------
-- apply_points: grava o evento e atualiza a carteira na mesma transação.
-- Devolve null quando a dedupe_key já existe. Moedas negativas violam o CHECK (23514).
-- ---------------------------------------------------------------------------

create function public.apply_points(
  p_user uuid,
  p_action text,
  p_label text,
  p_xp integer,
  p_coins integer,
  p_tickets integer,
  p_local_date date,
  p_at timestamptz default now(),
  p_dedupe_key text default null
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_event public.point_events;
  v_profile public.profiles;
  v_season text;
begin
  if p_xp < 0 then
    raise exception 'XP não pode diminuir.' using errcode = '22023';
  end if;

  insert into public.point_events (user_id, action, label, xp, coins, tickets, local_date, dedupe_key, created_at)
  values (p_user, p_action, p_label, p_xp, p_coins, p_tickets, p_local_date, p_dedupe_key, p_at)
  on conflict (user_id, dedupe_key) do nothing
  returning * into v_event;

  if v_event.id is null then
    return null;
  end if;

  update public.profiles
     set xp = xp + p_xp,
         coins = coins + p_coins,
         tickets = tickets + p_tickets,
         updated_at = now()
   where id = p_user
  returning * into v_profile;

  if not found then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if p_tickets > 0 then
    select id into v_season from public.seasons where active limit 1;
    insert into public.raffle_tickets (user_id, season_id, source, point_event_id)
    select p_user, v_season, p_action, v_event.id from generate_series(1, p_tickets);
  end if;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'wallet', jsonb_build_object('xp', v_profile.xp, 'coins', v_profile.coins, 'tickets', v_profile.tickets)
  );
end;
$$;

revoke all on function public.apply_points(uuid, text, text, integer, integer, integer, date, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.apply_points(uuid, text, text, integer, integer, integer, date, timestamptz, text)
  to service_role;

revoke all on function public.forbid_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.seasons enable row level security;
alter table public.stickers enable row level security;
alter table public.stores enable row level security;
alter table public.coupons enable row level security;
alter table public.missions enable row level security;
alter table public.hunts enable row level security;
alter table public.hunt_clues enable row level security;
alter table public.secrets enable row level security;
alter table public.mall_area enable row level security;
alter table public.profiles enable row level security;
alter table public.point_events enable row level security;
alter table public.checkins enable row level security;
alter table public.qr_scans enable row level security;
alter table public.hunt_progress enable row level security;
alter table public.mission_progress enable row level security;
alter table public.redemptions enable row level security;
alter table public.raffle_tickets enable row level security;
alter table public.user_stickers enable row level security;

-- Catálogos: leitura pública.
create policy "leitura pública" on public.seasons for select to anon, authenticated using (true);
create policy "leitura pública" on public.stickers for select to anon, authenticated using (true);
create policy "leitura pública" on public.stores for select to anon, authenticated using (active);
create policy "leitura pública" on public.coupons for select to anon, authenticated using (active);
create policy "leitura pública" on public.missions for select to anon, authenticated using (active);
create policy "leitura pública" on public.hunts for select to anon, authenticated using (active);
-- hunt_clues, secrets e mall_area: sem política, só a API (service role) lê.

-- Dados do usuário: cada um lê só os próprios.
create policy "dono lê" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "dono lê" on public.point_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.checkins for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.qr_scans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.hunt_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.mission_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.redemptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.raffle_tickets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono lê" on public.user_stickers for select to authenticated
  using ((select auth.uid()) = user_id);

-- Nenhuma escrita direta pelo cliente (além da falta de políticas de escrita).
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
