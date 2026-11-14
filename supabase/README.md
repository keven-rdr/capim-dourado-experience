# Supabase: banco e login

> **Nada aqui foi executado em um projeto Supabase real.** O SQL e os repositórios Supabase da API (`apps/api/src/infra/supabase`) foram escritos sem projeto para testar. A primeira execução é o teste: se o SQL falhar, copiem a mensagem de erro e corrijam a migração neste repositório.

## Arquivos

| Arquivo | O que é |
|---|---|
| `migrations/0001_init.sql` | Tabelas, chaves, índices, restrições de unicidade, função `apply_points`, RLS e políticas |
| `migrations/0002_roulette.sql` | Roleta de cupons: tabela `roulette_spins` (um giro por linha, vaga única por usuário, dia e nº do giro), RLS e índices do painel da loja |
| `seed.sql` | Dados iniciais (temporadas, figurinhas, lojas, cupons, missões, caça, segredos e área do shopping). **Gerado** a partir de `packages/shared/src/seed.ts` |

Não editem o `seed.sql` à mão. Depois de mudar o seed do shared:

```bash
npm run seed:sql -w @cde/api
```

O seed é idempotente (upsert por id): pode rodar de novo.

Nomes de lojas são reais; **descontos, prêmios, parcerias e locais de QR são exemplos**. A área do shopping (`mall_area`) é o polígono **aproximado** do protótipo, a confirmar em campo.

## Aplicar

### Pelo painel (SQL Editor)

1. **SQL Editor → New query**.
2. Colem o conteúdo de `migrations/0001_init.sql` e executem.
3. Colem o conteúdo de `migrations/0002_roulette.sql` e executem.
4. Colem o conteúdo de `seed.sql` e executem.
5. Em **Table Editor**, confiram se as tabelas apareceram e se todas mostram **RLS enabled**.

### Pela Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push                      # aplica supabase/migrations
psql "<connection string>" -f supabase/seed.sql
```

A CLI não é dependência do repositório (rodem com `npx` ou instalem à parte). Em ambiente local (`npx supabase start`), `npx supabase db reset` aplica a migração e o `seed.sql` juntos.

## Chaves que a API usa

Em **Project Settings → API Keys**. O Supabase trocou as chaves antigas pelas novas:

| Chave nova | Antiga equivalente | Onde usar |
|---|---|---|
| **Publishable** (`sb_publishable_...`) | `anon` | No app (`VITE_SUPABASE_ANON_KEY`). Pode ser pública |
| **Secret** (`sb_secret_...`) | `service_role` | Só na API, em `SUPABASE_SERVICE_ROLE_KEY`. Ignora o RLS. **Nunca no app, nunca no repositório** |

A API também precisa de `SUPABASE_URL` (Project URL, em **Project Settings → Data API**). Com as duas definidas, a API usa o banco e valida o `Authorization: Bearer <JWT>` pelo Supabase Auth (`auth.getUser`).

## Modelo

| Tabela | Conteúdo | Leitura pelo cliente |
|---|---|---|
| `seasons`, `stickers`, `stores`, `coupons`, `missions`, `hunts` | Catálogos | Pública |
| `hunt_clues`, `secrets`, `mall_area` | Locais dos QR e polígono do check-in | Ninguém (só a API) |
| `profiles` | Perfil, consentimento, carteira (XP, moedas, bilhetes) e sequência | Dono |
| `point_events` | Ledger imutável de pontos (bloqueio de UPDATE por trigger) | Dono |
| `checkins` | Só o resultado (dentro ou fora, data e hora), nunca a coordenada | Dono |
| `qr_scans` | Leituras de loja, segredo e pista | Dono |
| `hunt_progress`, `mission_progress` | Progresso da caça e conclusão de missões por período | Dono |
| `redemptions` | Resgates com código único, validade e uso | Dono |
| `raffle_tickets` | Um registro por bilhete (sorteio simulado) | Dono |
| `user_stickers` | Figurinhas do usuário | Dono |

Restrições que reforçam as regras de negócio:

- Um check-in válido por usuário por dia (índice único parcial em `checkins` onde `inside`).
- Uma leitura por (usuário, tipo, id, escopo) em `qr_scans`: o escopo é a data para lojas e `once` para segredos e pistas.
- Um crédito por chave de idempotência por usuário em `point_events` (`daily_open:<data>`, `welcome`, `secret:<id>`, `mission:<id>:<período>` etc.).
- Moedas, bilhetes e XP nunca negativos (`check` em `profiles`); XP de cada evento nunca negativo.
- Código de resgate único; `expires_at` depois de `redeemed_at`.
- No máximo uma temporada ativa.

`apply_points(...)` grava o evento e atualiza a carteira na mesma transação, devolve `null` quando a chave de idempotência já existe e falha com `23514` se as moedas ficariam negativas (a API traduz para `insufficient_coins`). Só a `service_role` pode executá-la.

## Acesso (RLS)

- RLS ligado em **todas** as tabelas.
- Usuário autenticado só **lê** os próprios dados (`auth.uid() = user_id`).
- Catálogos têm leitura pública.
- **Nenhuma escrita direta pelo cliente**: não há políticas de escrita, e `insert`, `update`, `delete` e `truncate` foram revogados de `anon` e `authenticated`. Toda escrita passa pela API, com a chave secreta.

Apagar a conta (`DELETE /v1/me`) remove o perfil, o que apaga em cascata todos os dados do usuário, e depois remove o usuário do Supabase Auth.

Antes de um piloto, rodem **Advisors → Security Advisor** no painel e corrijam o que ele apontar.
