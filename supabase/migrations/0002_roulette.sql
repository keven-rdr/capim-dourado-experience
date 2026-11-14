-- Roleta de cupons e painel da loja.
--
-- Cada giro é uma linha. A unicidade (usuário, data, nº do giro) impede gastar o mesmo giro
-- duas vezes quando duas requisições chegam juntas. Os giros do dia vêm do check-in (1, ou 2 na
-- hora dourada); essa conta é feita pela API, que só confere aqui quantos já foram gastos.
--
-- O prêmio de cada giro é um resgate (public.redemptions) de um cupom do catálogo, com validade
-- curta. O painel da loja dá baixa preenchendo redemptions.used_at.
--
-- ATENÇÃO: este SQL ainda não foi executado em um projeto Supabase real.

create table public.roulette_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  spin_no integer not null check (spin_no > 0),
  slice_index integer not null check (slice_index >= 0),
  coupon_id text not null references public.coupons (id),
  created_at timestamptz not null default now(),
  unique (user_id, local_date, spin_no)
);

-- Painel da loja: giros que caíram em cupons da loja.
create index roulette_spins_coupon on public.roulette_spins (coupon_id);

-- Painel da loja: cupons usados por cupom, e visitas por loja.
create index redemptions_coupon_used on public.redemptions (coupon_id) where used_at is not null;
create index qr_scans_kind_ref on public.qr_scans (kind, ref_id);

alter table public.roulette_spins enable row level security;

create policy "dono lê" on public.roulette_spins for select to authenticated
  using ((select auth.uid()) = user_id);

-- Nenhuma escrita direta pelo cliente: só a API (service role) grava.
revoke insert, update, delete, truncate on public.roulette_spins from anon, authenticated;
