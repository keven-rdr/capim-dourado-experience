# Capim Dourado Experience

Web app (PWA) que transforma a visita ao **Capim Dourado Shopping** (Palmas, TO) em um jogo: check-in ao chegar, missões, caça ao tesouro com QR codes, moedas trocadas por cupons e temporadas que mudam ao longo do ano.

Projeto de hackathon. Desafio 05: engajamento e fidelização dos visitantes. Tecnologia sorteada: **componentização**.

> Descontos, prêmios, parcerias e números que aparecem no app são exemplos para o protótipo.

## Como rodar

Requisitos: Node 24 (veja `.nvmrc`) e npm.

```bash
npm install
npm run dev:web
```

O app abre em modo demonstração, com dados locais, sem precisar de API nem de banco.

```bash
npm run dev:api      # API em memória, sem configuração
npm run check        # lint, tipos, testes e build (o mesmo do CI)
```

## Estrutura

```text
apps/
  web/        PWA do visitante (React, Vite, Tailwind)
  api/        API Node (Hono) em camadas, um módulo por funcionalidade
packages/
  ui/         biblioteca de componentes e temas por temporada
  shared/     tipos, regras de pontos, dados iniciais e contrato da API
supabase/     migrações SQL, políticas de acesso e seed
docs/         documentos da entrega, guia, pesquisa e decisões
.github/      pipelines, modelos de issue e de pull request
```

## Componentização

- **`packages/ui`** concentra os componentes (botão, cartão de missão, barra de XP, cupom em formato de ingresso, figurinha, pin do mapa e outros). As telas só compõem esses componentes.
- **Temporadas** (Natal, Páscoa, Halloween) trocam apenas tokens de design. A rota `/catalogo` do app mostra todos os componentes e a troca de tema ao vivo.
- **`packages/shared`** é a fonte única de tipos, regras e contrato, usada pelo app e pela API.
- **A API** é dividida em módulos independentes, cada um com controller, service e repository.

## Documentos

| Documento | Para quê |
|---|---|
| [Planejamento técnico inicial](docs/planejamento-tecnico-inicial.md) | Primeira entrega: telas, requisitos, arquitetura e tecnologias |
| [Guia da Caça no Shopping](docs/guia/guia-gamificacao-shopping.html) | Mecânica explicada do zero e prompts de cada tela |
| [Guia de Vercel e Supabase](docs/guia-vercel-supabase.md) | Passo a passo de publicação e configuração |
| [Orquestração de agentes](docs/agentes.md) | Como o trabalho é dividido entre agentes e pessoas |
| [Pesquisa](docs/pesquisa/README.md) | Casos, dados de mercado, regras legais e roteiro da apresentação |
| [AGENTS.md](AGENTS.md) | Regras para quem (ou o que) escreve código aqui |

## Fluxo de trabalho

1. Cada tarefa vira uma issue.
2. Crie uma branch a partir da `main` (`feat/checkin`, `fix/cupom-expirado`).
3. Abra um pull request com título no padrão Conventional Commits (`feat(web): adiciona a tela de check-in`).
4. O CI roda lint, tipos, testes e build. A Vercel publica uma prévia do pull request.
5. Merge por squash na `main`. A Vercel publica em produção.

## Pipelines (GitHub Actions)

| Workflow | Quando roda | O que faz |
|---|---|---|
| `ci` | Pull request e push na `main` | Biome, `typecheck`, testes e build de todos os pacotes. O check obrigatório é o `ci-gate`. |
| `pr-title` | Pull request | Valida o título no padrão Conventional Commits. |
| `security` | Pull request, push na `main` e toda segunda | Gitleaks (segredos). CodeQL e revisão de dependências rodam só em repositório público. |

O deploy não passa pelo GitHub Actions: é feito pela integração da Vercel com o GitHub.
