# Guia para agentes (e pessoas) neste repositório

## O projeto

**Capim Dourado Experience**: web app (PWA) que transforma a visita ao Capim Dourado Shopping (Palmas, TO) em um jogo. O visitante faz check-in por localização, cumpre missões, lê QR codes escondidos e troca pontos por cupons. É uma extensão do shopping, feita em um hackathon financiado por ele.

- Desafio: 05, engajamento e fidelização dos visitantes.
- **Tecnologia obrigatória na apresentação: componentização.** A mesma biblioteca de componentes (`packages/ui`) serve ao app e ao painel, e as temporadas (Natal, Páscoa, Halloween) trocam só tokens de design.
- Foco atual: a apresentação. O que aparece na demonstração vem primeiro.

Leia antes de começar:
- `docs/planejamento-tecnico-inicial.md`: escopo, requisitos, regras de negócio e arquitetura.
- `docs/guia/guia-gamificacao-shopping.html`: mecânica explicada e os prompts de cada tela (blocos `<pre class="prompt">`).
- `packages/shared/src`: tipos, regras de pontos, dados iniciais e o contrato da API.

## Estrutura e donos

| Pasta | O que é | Dono |
|---|---|---|
| `apps/web` | PWA do visitante (React, Vite, Tailwind) | agente **front** |
| `packages/ui` | Biblioteca de componentes e temas por temporada | agente **front** |
| `apps/api` | API Node (Hono) em camadas, por módulo | agente **back** |
| `supabase/` | Migrações SQL, políticas e seed | agente **back** |
| `docs/pesquisa` | Pesquisa, fontes e material da apresentação | agente **pesquisa** |
| `packages/shared` | Tipos, regras, seed e contrato | **orquestrador** |
| raiz, `.github/`, demais `docs/` | Configuração, CI e documentos | **orquestrador** |

## Regras de orquestração

1. **Fique na sua pasta.** Não edite arquivos de outro dono. Se precisar de mudança em `packages/shared` ou na raiz, descreva no relatório final o que falta e por quê, e contorne localmente.
2. **Não rode `npm install` nem altere dependências.** Vários agentes trabalham na mesma árvore, e instalações simultâneas corrompem o `node_modules`. As dependências já estão instaladas. Se faltar alguma, relate.
3. **Não faça commit, push nem troque de branch.** O orquestrador integra e versiona.
4. **Rode só as verificações do seu pacote**, direto no workspace e sem Turborepo (o `packages/shared` já está compilado em `dist`): `npm run typecheck -w <pacote>`, `npm run test -w <pacote>`, `npm run build -w <pacote>` e `npx biome ci <sua pasta>`. Para formatar, `npx biome check --write <sua pasta>`, nunca fora dela.
5. **O contrato manda.** App e API se entendem por `GameApi`, `ROUTES` e os tipos de `@cde/shared`. Não invente formato paralelo.
6. **Relatório final**: o que foi entregue, o que foi verificado (com o resultado dos comandos), o que ficou de fora e as lacunas no contrato.
7. **Componentização obrigatória para todos os agentes.** Antes de criar ou alterar uma interface, procure em `packages/ui` e nos componentes existentes uma peça que já resolva a mesma necessidade. Reutilize-a; se o comportamento ou visual for compartilhado e a peça não existir, extraia um componente reutilizável em `packages/ui` ou proponha essa mudança ao responsável quando estiver fora da sua pasta. Não duplique implementações para telas diferentes. Variações de aparência devem usar tokens de tema e propriedades explícitas.
8. **Revise a componentização em toda entrega de interface.** Confira telas relacionadas para identificar componentes duplicados, diferenças de comportamento e estilos fora dos tokens. Corrija o que estiver no escopo e relate as demais oportunidades com arquivos e motivos no relatório final, sem transformar toda diferença visual em componente obrigatório.

## Convenções

- TypeScript estrito, ESM. Identificadores em inglês; textos de interface e documentação em português do Brasil.
- Formatação e lint: Biome (`biome.json` na raiz). Aspas simples, ponto e vírgula, 100 colunas.
- Commits e títulos de PR: Conventional Commits (`feat(web): ...`, `fix(api): ...`).
- Sem segredos no repositório. Variáveis de ambiente ficam em `.env` (ignorado) e são documentadas em `.env.example`.
- Dados do shopping: nomes de lojas e pavimentos são reais; **descontos, prêmios, parcerias e números são exemplos** e devem aparecer marcados como tais. Nada de métricas inventadas apresentadas como reais.
- A planta do shopping é material interno: nunca entra no repositório. Mapas mostram só áreas públicas, redesenhados.
- Privacidade: a localização só serve para validar presença; guardar apenas o resultado da verificação. Trilha Kids sem ranking.
- Acessibilidade: contraste AA, alvo de toque de 44 px, foco visível, respeito a `prefers-reduced-motion`.
- Animação: o GSAP (`gsap` + `@gsap/react`) está instalado para animações da página de apresentação (fora do celular). Use sempre `useGSAP` com `scope`, só `transform`/`opacity`, e envolva loops em `gsap.matchMedia()` com `(prefers-reduced-motion: no-preference)`. As skills oficiais estão em `.claude/skills/gsap-*` (origem: `greensock/gsap-skills`). Animações já existentes continuam em `motion`/CSS.

## Comandos

```bash
npm install          # uma vez
npm run dev:web      # app do visitante
npm run dev:api      # API
npm run check        # lint, tipos, testes e build de tudo (o mesmo do CI)
```
