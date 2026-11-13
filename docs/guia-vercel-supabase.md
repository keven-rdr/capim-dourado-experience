# Guia de configuração: GitHub, Vercel e Supabase

Passo a passo para publicar o Capim Dourado Experience. Leia a ordem recomendada primeiro: nem tudo é necessário para a apresentação.

> **Estado deste guia:** os passos foram escritos a partir da documentação atual da Vercel e do Supabase, mas **ainda não foram executados neste projeto**. Os nomes de menus podem variar um pouco no painel. Se algo não bater, anote e ajuste aqui.

## O que é necessário e quando

| Etapa | Precisa para a apresentação? | Tempo |
|---|---|---|
| 1. Repositório no GitHub | Sim | 5 min |
| 2. App na Vercel (`apps/web`) | Sim. É o link que a banca abre. | 10 min |
| 3. Supabase (banco e login) | Não. O app roda em modo demonstração, com dados locais. | 20 min |
| 4. API na Vercel (`apps/api`) | Não. Só quando forem sair do modo demonstração. | 15 min |

Recomendação: façam as etapas 1 e 2 agora. Deixem 3 e 4 para depois que a demonstração estiver ensaiada.

---

## 1. GitHub

### 1.1 Visibilidade do repositório

Esta escolha afeta a Vercel e as pipelines:

| | Repositório público | Repositório privado |
|---|---|---|
| Deploy na Vercel (plano Hobby) | Funciona para commits de qualquer pessoa do grupo | **Só commits do dono da conta Vercel geram deploy.** Commits de colegas são bloqueados. |
| CodeQL e revisão de dependências | Rodam de graça | Ficam pulados (exigem plano pago) |
| Proteção da `main` (rulesets) | Disponível no plano gratuito | Exige plano pago |
| Código visível para todos | Sim | Não |

A Vercel documenta essa limitação em [Troubleshoot project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration): o plano Hobby não permite colaboração em repositório privado. As saídas são tornar o repositório público ou assinar o plano Pro.

Se o repositório for público, lembrem que **a planta do shopping e qualquer material interno nunca entram no repositório** (o `.gitignore` já bloqueia PDFs com "planta" no nome).

### 1.2 Colaboradores e proteção da `main`

1. **Settings → Collaborators**: adicionem os colegas.
2. **Settings → Rules → Rulesets → New branch ruleset** (repositório público ou plano pago):
   - Target: `main`.
   - Exigir pull request antes do merge.
   - Exigir os checks `ci-gate` e `pr-title`.
   - Bloquear force push.
3. **Settings → General → Pull Requests**: deixem só **Allow squash merging** marcado e usem o título do PR como mensagem do commit.
4. Editem `.github/CODEOWNERS` com os usuários de cada pessoa.

### 1.3 Segredos no GitHub

Nenhum segredo é necessário no GitHub. O deploy é feito pela integração da Vercel, e não pelo GitHub Actions.

---

## 2. Vercel: o app (`apps/web`)

### 2.1 Criar o projeto

1. Entrem em <https://vercel.com> com a conta do GitHub de quem é dono do repositório.
2. **Add New → Project → Import Git Repository** e escolham o repositório. Se ele não aparecer, cliquem em **Adjust GitHub App Permissions** e deem acesso a ele.
3. Em **Configure Project**:

| Campo | Valor |
|---|---|
| Project Name | `capim-dourado-experience` |
| Framework Preset | **Vite** |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && npx turbo run build --filter=@cde/web` |
| Output Directory | `dist` |
| Install Command | deixar o padrão (a Vercel detecta os workspaces do npm e instala pela raiz) |

4. Em **Settings → General → Root Directory**, confirmem que **Include files outside of the Root Directory in the Build Step** está ligado. O app depende de `packages/ui` e `packages/shared`.
5. **Settings → General → Node.js Version**: 24.x.
6. Cliquem em **Deploy**.

O comando de build usa o Turborepo para compilar primeiro o `packages/shared` e depois o app. A Vercel descreve esse arranjo em [Deploying Turborepo to Vercel](https://vercel.com/docs/monorepos/turborepo).

### 2.2 Variáveis de ambiente do app

Em **Settings → Environment Variables**. Para a apresentação, **nenhuma é obrigatória**: sem elas o app usa o modo demonstração.

| Variável | Quando preencher | Valor |
|---|---|---|
| `VITE_API_URL` | Quando a API estiver publicada (etapa 4) | URL da API, sem barra no fim |
| `VITE_SUPABASE_URL` | Quando o Supabase existir (etapa 3) | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Idem | A chave **publishable** (pública) |

Tudo que começa com `VITE_` vai para o navegador e é público. **Nunca coloquem a chave secreta do Supabase em variável `VITE_`.**

Marquem os ambientes **Production** e **Preview**. Depois de mudar uma variável, é preciso fazer um novo deploy (**Deployments → ⋯ → Redeploy**).

### 2.3 O que conferir depois do primeiro deploy

- A página abre no celular e a rota `/catalogo` funciona ao recarregar (o `vercel.json` do app faz o redirecionamento de rotas).
- O navegador pede a localização na tela de check-in. Geolocalização e câmera só funcionam em **HTTPS**, que a Vercel já fornece.
- Cada pull request ganha um link de prévia comentado pela Vercel.

### 2.4 Domínio

O endereço padrão é `<nome-do-projeto>.vercel.app`. Para a apresentação ele basta. Um domínio próprio do shopping pode ser ligado depois em **Settings → Domains**.

---

## 3. Supabase: banco e login

### 3.1 Criar o projeto

1. Entrem em <https://supabase.com> → **New project**.
2. **Region**: South America (São Paulo), a mais próxima de Palmas.
3. Guardem a senha do banco em um gerenciador de senhas. Ela não vai para o repositório.

### 3.2 Chaves

Em **Project Settings → API Keys**. O Supabase está trocando as chaves antigas pelas novas ([documentação](https://supabase.com/docs/guides/getting-started/api-keys)):

| Chave nova | Chave antiga equivalente | Onde usar |
|---|---|---|
| **Publishable** (`sb_publishable_...`) | `anon` | No app (`VITE_SUPABASE_ANON_KEY`). Pode ser pública. |
| **Secret** (`sb_secret_...`) | `service_role` | Só na API. Ignora as políticas de acesso. **Nunca no app, nunca no repositório.** |

Usem as chaves novas: as antigas estão sendo descontinuadas.

A **Project URL** fica em **Project Settings → Data API**.

### 3.3 Criar as tabelas

1. **SQL Editor → New query**.
2. Colem o conteúdo de `supabase/migrations/0001_init.sql` e executem.
3. Colem o conteúdo de `supabase/seed.sql` e executem.
4. Em **Table Editor**, confiram se as tabelas apareceram e se todas mostram **RLS enabled**.

O `supabase/README.md` traz os detalhes e a alternativa pela Supabase CLI.

> As migrações e os repositórios Supabase da API **ainda não foram testados em um projeto real**. A primeira execução é o teste. Se o SQL falhar, copiem a mensagem de erro e corrijam a migração no repositório.

### 3.4 Login

1. **Authentication → Sign In / Providers**: liguem **Anonymous Sign-Ins**. O visitante entra sem cadastro e pode vincular um e-mail depois.
2. Com login anônimo ligado, ativem a proteção contra abuso em **Authentication → Attack Protection** (CAPTCHA) antes de um piloto com público real.
3. **Authentication → URL Configuration**:
   - **Site URL**: o endereço de produção do app na Vercel.
   - **Redirect URLs**: `http://localhost:5173/**` e `https://*-<seu-usuario-vercel>.vercel.app/**` para as prévias.

### 3.5 Políticas de acesso (RLS)

A migração liga o RLS em todas as tabelas. A regra do projeto:

- O visitante autenticado **lê** apenas os próprios dados.
- Catálogos (lojas, cupons, figurinhas) são leitura pública.
- **Nenhuma escrita vem direto do app.** Toda pontuação passa pela API, que usa a chave secreta.

Antes de um piloto, rodem **Advisors → Security Advisor** no painel do Supabase e corrijam o que ele apontar.

### 3.6 LGPD

- A localização só valida a presença: o banco guarda o resultado (dentro ou fora) e a data, e não a coordenada.
- O perfil tem a opção de apagar a conta e os dados.
- O consentimento de localização é pedido dentro do app, antes do aviso do navegador.

---

## 4. Vercel: a API (`apps/api`)

A API é um **segundo projeto** na Vercel, ligado ao mesmo repositório.

1. **Add New → Project**, mesmo repositório.
2. **Root Directory**: `apps/api`.
3. Build, saída e demais ajustes: sigam o `apps/api/README.md`, que descreve a configuração escolhida para a API.
4. Variáveis de ambiente (**Production** e **Preview**):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | A chave **secret** do Supabase |
| `QR_SECRET` | Um texto longo e aleatório, usado para assinar os QR codes |
| `CORS_ORIGIN` | O endereço do app na Vercel |
| `ALLOW_DEMO_QR` | `false` em produção. `true` só em ambiente de demonstração |
| `SKIP_OPENING_HOURS` | Não definir em produção. `true` só para demonstrar fora do horário do shopping |
| `MALL_AREA_JSON` | Opcional. O polígono da área de check-in, depois de conferido em campo |

Confiram os nomes exatos no `apps/api/.env.example`: ele é a referência.

5. Depois do deploy, abram `https://<api>.vercel.app/health`. Deve responder com sucesso.
6. Voltem ao projeto do app, preencham `VITE_API_URL` com o endereço da API e refaçam o deploy.

> O deploy da API na Vercel **não foi testado**. Se a Vercel não reconhecer a função, a alternativa é hospedar a API em um serviço de servidor contínuo (Render ou Railway), com `npm run build -w @cde/api` e `npm run start -w @cde/api`.

Para gerar o `QR_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Depois de tudo ligado

| Ação | Onde |
|---|---|
| Abrir pull request | A Vercel publica uma prévia do app e da API |
| Merge na `main` | A Vercel publica em produção |
| Mudar o banco | Nova migração em `supabase/migrations`, aplicada no painel ou pela CLI |
| Gerar QR codes reais | `npm run qr -w @cde/api`, conforme o `apps/api/README.md` |

## 6. Checklist para o dia da apresentação

- [ ] O link de produção abre no celular e no notebook.
- [ ] O modo demonstração funciona sem internet estável (dados locais).
- [ ] A rota `/catalogo` mostra a troca de temporada.
- [ ] A leitura de QR simulada dispara a revelação.
- [ ] Há um vídeo gravado da demonstração como plano B.
- [ ] O navegador do notebook está com a localização e a câmera liberadas para o site, ou o modo demonstração está ligado.
