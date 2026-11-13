# API do Capim Dourado Experience (`@cde/api`)

API Node em **Hono**, com arquitetura em camadas organizada por módulo. Implementa as rotas de `ROUTES` e os formatos de `@cde/shared` (o contrato manda). Todas as regras de pontos e antifraude rodam aqui, nunca no app.

## Rodar localmente

```bash
npm run dev -w @cde/api        # http://localhost:8787, recarrega ao salvar
```

Com zero configuração, a API sobe **em memória**, com `AUTH_MODE=dev` e os dados do seed do `@cde/shared`. Os dados somem quando o processo reinicia. Para demonstrar fora do horário e com os QR de demonstração:

```bash
ALLOW_DEMO_QR=true SKIP_OPENING_HOURS=true npm run dev -w @cde/api
```

O servidor lê `apps/api/.env` se existir (copie de `.env.example`).

No modo dev, o usuário vem do cabeçalho `x-demo-user` (1 a 64 letras, números, `-` ou `_`), sem senha:

```bash
curl -H 'x-demo-user: demo1' -H 'content-type: application/json' \
  -d '{"name":"Ana","trail":"kids","character":"capi","locationConsent":true}' \
  http://localhost:8787/v1/me
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run test -w @cde/api` | Testes (Vitest, repositórios em memória e relógio falso) |
| `npm run typecheck -w @cde/api` | Tipos |
| `npm run build -w @cde/api` | Compila para `dist/` |
| `npm run start -w @cde/api` | Roda `dist/server.js` |
| `npm run qr -w @cde/api -- --kind secret --id s1 [--exp 30d]` | Gera um token de QR assinado |
| `npm run seed:sql -w @cde/api` | Regenera `supabase/seed.sql` a partir do seed do shared |

## Arquitetura

```text
src/
  app.ts            createApp(deps): monta middlewares e os controllers de cada módulo
  container.ts      raiz de composição: escolhe memória ou Supabase e liga os services
  server.ts         servidor local (@hono/node-server)
  vercel.ts         entrada da função da Vercel (compilada em dist/vercel.js)
  config/env.ts     leitura e validação das variáveis de ambiente (zod)
  shared/           erros (AppError), http (erros no formato ApiErrorBody, validação, logs),
                    auth, relógio, ids, logger, horário de funcionamento, datas
  modules/
    users/          perfil, status do dia, primeiro acesso do dia, histórico, exclusão (LGPD)
    points/         ledger, teto diário de XP, sequência e baú; Rewarder (fluxo comum de pontuação)
    checkin/        check-in por GPS e plano B pelo QR da entrada
    qr/             token assinado (token.ts) e leitura de QR de loja, segredo, pista e entrada
    missions/       progresso derivado dos eventos e crédito único por período
    hunts/          caça ao tesouro com pistas em ordem
    stores/         catálogo de lojas
    rewards/        cupons e resgates
    raffles/        bilhetes de sorteio (simulado)
    album/          figurinhas por temporada
  infra/
    memory/         repositórios em memória (padrão sem Supabase)
    supabase/       repositórios com supabase-js (chave secreta) e verificação do JWT
```

Cada módulo tem `controller.ts`, `service.ts` e `repository.ts`:

- **Controller**: recebe, valida com os schemas zod do `@cde/shared` e responde. Sem regra de negócio.
- **Service**: regras de negócio. Recebe repositórios, relógio (`Clock`) e gerador de ids por injeção. Nenhum service importa `supabase-js`.
- **Repository**: interface com duas implementações (`infra/memory` e `infra/supabase`).

Os services conversam só por interfaces. O `Rewarder` (módulo `points`) recebe as missões e o álbum por portas (`MissionRewardSource`, `StickerGranter`), sem ciclo entre módulos. O módulo `raffles` não tem repositório: o bilhete é um lançamento do ledger (no Supabase, `apply_points` grava também uma linha em `raffle_tickets`).

## Regras implementadas

| Regra | Onde |
|---|---|
| Primeiro acesso do dia (uma vez, data local de Palmas), sequência com folga, baú de 7 dias (`streak_7`) | `users`, `points` |
| Check-in: precisão até `MAX_GPS_ACCURACY_M`, polígono, horário, um por dia; guarda só dentro/fora e data | `checkin` |
| Consentimento de localização: sem ele, o check-in por GPS é recusado (`validation`); o QR da entrada continua valendo | `checkin` |
| QR de loja: no máximo 5 lojas por dia, uma vez por loja por dia | `qr` |
| QR de segredo: uma vez por usuário, pode dar figurinha | `qr` |
| Pistas em ordem (`clue_out_of_order`); a última credita a recompensa final e a figurinha | `hunts`, `qr` |
| Horário de funcionamento vale para check-in e para todos os QR (RN02) | `shared/opening-hours.ts` |
| Missões: progresso derivado dos eventos, recompensa creditada uma vez por período (dia, semana de segunda a domingo, temporada) | `missions` |
| Teto diário de XP (`DAILY_LIMITS.xp`); moedas e bilhetes não têm teto | `points` |
| XP nunca diminui; toda mudança gera um `PointEvent` imutável com chave de idempotência | `points` |
| `leveledUp` quando a ação cruza um nível | `points` |
| Cupons por trilha (sempre com os de `todos`), resgate com débito, código legível (`CDE-XXXX-XXXX`) e validade por `validDays` | `rewards` |
| Bilhete custa `TICKET_COST` moedas | `raffles` |
| Apagar conta remove perfil e dados (no Supabase, também o usuário do Auth) | `users` |

Decisões que o contrato não fixa:

- `POST /v1/me` é idempotente: se o perfil já existe, devolve o atual sem alterar nada (as boas-vindas entram uma vez). Para mudar dados, use `PATCH /v1/me`.
- `reward` em `PointsResult` é a soma de tudo que a ação creditou: a ação, as missões concluídas por ela e o baú. O XP já vem cortado pelo teto diário.
- No check-in, o visitante ganha a próxima figurinha comum da temporada que ainda não tem (`COMMON_STICKER_POOL`).
- A missão `m-natal` é o espelho da caça: mostra o progresso, mas a recompensa é a final da caça, creditada uma vez.
- Na caça, o `locationLabel` das pistas ainda não encontradas vem vazio (`''`).
- `DELETE /v1/me` responde `204` sem corpo. `POST /v1/me/daily-open` repetido no dia responde `200` com `null`.

## QR codes

Formato do token assinado (versão 1):

```text
cde1.<payload>.<assinatura>
```

- `payload`: JSON de `QrPayload` em base64url, por exemplo `{"k":"secret","id":"s1","exp":1797171371}`. `k` é `checkin`, `store`, `secret` ou `clue`; para pista, `id` é `<huntId>:<ordem>` (`natal-2026:3`); `exp` é opcional, em segundos desde 1970.
- `assinatura`: HMAC-SHA256 de `cde1.<payload>` com `QR_SECRET`, em base64url.

Gerar um token (o token vai para a saída padrão, pronto para virar QR code):

```bash
npm run qr -w @cde/api -- --kind secret --id s1 --exp 30d
npm run qr -w @cde/api -- --kind clue --id natal-2026:1
npm run qr -w @cde/api -- --kind store --id leitura --exp 12h
npm run qr -w @cde/api -- --kind checkin --id entrada-subsolo
```

Use o mesmo `QR_SECRET` da API publicada. Trocar o segredo invalida todos os QR impressos.

Os códigos de demonstração `cde:<tipo>:<id>` (`cde:secret:s1`, `cde:clue:natal-2026:3`) só são aceitos com `ALLOW_DEMO_QR=true`.

## Erros

Toda falha responde `{ "error": { "code", "message", "details"? } }`, no formato `ApiErrorBody`.

| Código | Status |
|---|---|
| `validation`, `qr_invalid` | 400 |
| `unauthorized` | 401 |
| `profile_not_found`, `coupon_not_found`, `not_found` | 404 |
| `already_checked_in`, `qr_already_used`, `clue_out_of_order` | 409 |
| `qr_expired` | 410 |
| `outside_area`, `low_accuracy`, `mall_closed`, `insufficient_coins` | 422 |
| `daily_limit` | 429 |
| `internal` (falha inesperada; não está em `ERROR_CODES`) | 500 |

## Variáveis de ambiente

Referência completa e comentada em `.env.example`.

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `8787` | Porta do servidor local |
| `SUPABASE_URL` | vazio | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | vazio | Chave **secret** (`sb_secret_...`). Só na API |
| `AUTH_MODE` | `supabase` com Supabase; `dev` sem | `dev` aceita `x-demo-user`; `supabase` exige `Authorization: Bearer <JWT>` |
| `QR_SECRET` | segredo de desenvolvimento | Assina os QR. Obrigatório em produção (16+ caracteres) |
| `CORS_ORIGIN` | `*` fora de produção | Origens permitidas, separadas por vírgula. Obrigatório em produção |
| `ALLOW_DEMO_QR` | `false` | Aceita `cde:<tipo>:<id>`. `false` em produção |
| `SKIP_OPENING_HOURS` | `false` | Ignora o horário do shopping. **Só para demonstração** |
| `MALL_AREA_JSON` | vazio | Polígono da área de check-in; tem prioridade sobre a tabela `mall_area` e sobre `MALL_AREA_APPROX` |

Proteções:

- Com `NODE_ENV=production` e sem Supabase, a API não sobe, a menos que `AUTH_MODE=dev` esteja explícito.
- Em produção, `QR_SECRET` e `CORS_ORIGIN` são obrigatórios.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` precisam vir juntas.
- `AUTH_MODE=dev` com o Supabase como banco exige que `x-demo-user` seja o UUID de um usuário existente no Supabase Auth (a tabela `profiles` referencia `auth.users`).

## Publicar na Vercel

> **O deploy na Vercel NÃO foi testado.** A configuração abaixo segue a documentação da Vercel para funções Node, mas ninguém a executou neste projeto. A primeira publicação é o teste. Se não funcionar, a alternativa é um serviço de servidor contínuo (Render, Railway) com `npm run build -w @cde/shared && npm run build -w @cde/api` e `npm run start -w @cde/api`.

A API é um **segundo projeto** na Vercel, ligado ao mesmo repositório.

| Campo | Valor |
|---|---|
| Root Directory | `apps/api` |
| Framework Preset | **Other** (o `vercel.json` já define `"framework": null`) |
| Include files outside of the Root Directory in the Build Step | ligado (a API depende de `packages/shared`) |
| Node.js Version | 24.x |
| Install Command | padrão (a Vercel detecta os workspaces do npm e instala pela raiz) |
| Build Command | já definido no `vercel.json` |

O que o `vercel.json` faz:

- `buildCommand`: `cd ../.. && npm run build -w @cde/shared && npm run build -w @cde/api && mkdir -p apps/api/public`. Compila o shared (o `dist` dele não está no git), depois a API, e cria uma pasta `public` vazia, porque a Vercel espera uma pasta de saída estática.
- `rewrites`: manda todas as rotas (`/health`, `/v1/...`) para a função `/api`.

A função é `api/index.js`, que reexporta os handlers de `dist/vercel.js` (um por método HTTP: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`, no formato Web `Request` → `Response`). Assim a Vercel não precisa compilar TypeScript nem resolver o workspace por conta própria.

Variáveis em **Production** e **Preview**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `QR_SECRET`, `CORS_ORIGIN` (endereço do app), `ALLOW_DEMO_QR=false`, e `MALL_AREA_JSON` quando o polígono for conferido. Não definam `SKIP_OPENING_HOURS` em produção.

Pontos a conferir no primeiro deploy:

1. `https://<api>.vercel.app/health` responde `{"status":"ok","storage":"supabase","authMode":"supabase",...}`.
2. A função enxerga `dist/vercel.js` e `packages/shared/dist` (se a Vercel empacotar a função antes do build, o import de `../dist/vercel.js` falha).
3. A reescrita preserva o caminho original (`/v1/me` chega como `/v1/me` ao Hono). Se chegar como `/api`, ajustem o `vercel.json` ou usem `app.basePath`.
4. O preflight de CORS (`OPTIONS`) responde `204` com `access-control-allow-origin` igual ao app.

## O que não foi testado

- **Repositórios Supabase** (`src/infra/supabase`) e o SQL de `supabase/`: escritos sem um projeto Supabase real. A verificação do JWT foi testada só com um cliente falso.
- **Deploy na Vercel**: não executado.
- Corridas de concorrência: no Supabase, as restrições de unicidade e a função `apply_points` seguram duplicidades e saldo negativo, mas o limite de 5 lojas por dia é conferido antes de gravar e pode passar em leituras simultâneas. O débito do resgate e a gravação do resgate são duas operações (sem transação única).
