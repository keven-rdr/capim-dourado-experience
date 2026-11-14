# Proposta: chat da Capi e promoções dos lojistas

Status: proposta para implementação. Chat, gestão de promoções e autorização de lojistas
ainda não foram implementados. Branch: `feature/eduardo/chat-promocoes`.

## O que já existe

- `packages/shared/src/contract.ts`: `GameApi`, `ROUTES`, leitura de lojas e cupons,
  resgate e histórico. Não existem operações de chat nem de gestão pelo lojista.
- `packages/shared/src/domain.ts`: `Store`, `Coupon` e `Redemption`. Cupom já tem vínculo
  opcional com loja, custo em moedas, trilha e validade após o resgate.
- `packages/shared/src/seed.ts`: lojas e cupons de exemplo.
- `apps/web/src/data/createApi.ts`: seleciona `LocalGameApi` ou `HttpGameApi`.
- `apps/web/src/data/LocalGameApi.ts`: jogo offline com persistência no navegador;
  consulta e resgate de cupons ainda usam diretamente o catálogo constante `COUPONS`.
- `apps/web/src/App.tsx`: rotas do visitante; não há chat nem painel de lojista.
- `packages/ui`: componentes e temas reutilizáveis, incluindo `SpeechBubble`, `Card`,
  `Button`, `CouponTicket`, `Sheet` e `SystemNote`.
- `apps/api/src/modules/rewards/repository.ts`: leitura de cupons e registro de resgates;
  não há escrita no catálogo de ofertas.
- `apps/api/src/shared/auth.ts`: identifica o usuário, mas não estabelece vínculo de lojista
  com uma loja. O identificador demonstrativo não é autorização de produção.
- `supabase/migrations/0001_init.sql`: lojas, cupons, resgates e políticas de leitura;
  escritas são feitas pela API. Não existe associação entre dono e loja.

O painel aparece no planejamento como `apps/admin`, mas esse aplicativo ainda não existe.

## Experiência proposta

O visitante abre “Conversar com a Capi” na Home ou na página de uma loja. A conversa começa
com opções: “Ver promoções”, “Encontrar loja”, “Como ganhar moedas” e “Como resgatar”.
Também pode digitar perguntas curtas. A resposta vem de regras e textos predefinidos,
preenchidos com os dados do catálogo; não depende de IA generativa ou serviço externo.

Exemplo de demonstração, com oferta fictícia:

1. O lojista cadastra “10% em um livro”, com regras e período da campanha.
2. O visitante pergunta “Tem promoção na Leitura?”.
3. O motor identifica a intenção e a loja, busca ofertas publicadas e vigentes e responde:
   “Encontrei estas promoções de exemplo na Leitura”.
4. A resposta mostra cartões com benefício, condições, validade e acesso à loja.
5. Quando houver cupom associado, o botão leva a Recompensas. O resgate continua pelo
   fluxo existente, com cobrança de moedas e emissão de código.

Se não houver oferta, a resposta informa isso. Se a pergunta não for reconhecida, mostra
“Ainda não sei responder essa pergunta. Escolha uma das opções abaixo”. Nunca inventa
descontos, horários ou condições. Perguntas ambíguas pedem seleção da loja ou assunto.

## Promoção e cupom

Proposta: separar `Promotion` de `Coupon`. Uma promoção pode apenas divulgar uma oferta;
um cupom representa uma recompensa resgatável com moedas. Isso permite ao lojista divulgar
uma campanha sem obrigar o visitante a gastar pontos.

Campos propostos para `Promotion`:

| Campo | Finalidade |
|---|---|
| `id`, `storeId` | Identidade e loja responsável |
| `title`, `description`, `terms` | Benefício e condições da oferta |
| `startsAt`, `endsAt` | Período de divulgação e validade da campanha |
| `status` | `draft`, `published` ou `paused` |
| `couponId` opcional | Vínculo com recompensa já existente |
| `example: true` | Identificação obrigatória no protótipo |
| `createdAt`, `updatedAt` | Registro das alterações |

Datas da campanha são diferentes de `Coupon.validDays`, que conta a validade após o resgate.
No MVP, cada promoção pode apontar para um cupom de exemplo já existente da mesma loja.
Criar e alterar cupons pelo painel é uma etapa posterior, com regras próprias.

## Chat determinístico

Definir intenções tipadas: `promotions`, `store_location`, `earn_coins`, `redeem_help`
e `fallback`. Usar normalização de acentos, espaços e caixa, aliases de lojas e regras
com prioridade explícita. Botões enviam intenção e loja diretamente; texto livre passa
pelo reconhecimento. Não usar correspondência vaga que escolha uma loja arbitrariamente.

Separar o reconhecimento da montagem da resposta. A saída contém intenção reconhecida,
texto, promoções/lojas tipadas e sugestões de próximas ações. Os modelos de resposta são
fixos; título, condições e datas vêm dos registros. Conteúdo cadastrado é exibido como
texto, sem interpretar HTML ou instruções do lojista.

O motor deve ser compartilhado entre demonstração e API para evitar respostas diferentes.
O histórico fica apenas na sessão no MVP; não há necessidade de persistir conversas.

## Integração e contratos propostos

Estas operações ainda precisam entrar em `@cde/shared`, sem formatos paralelos no front:

| Operação proposta | Rota proposta | Acesso |
|---|---|---|
| `listPromotions` | `GET /v1/promotions` | Visitante, apenas publicadas e vigentes |
| `sendChatMessage` | `POST /v1/chat/messages` | Visitante |
| `listManagedStores` | `GET /v1/merchant/stores` | Lojista |
| `listManagedPromotions` | `GET /v1/merchant/promotions` | Lojista, próprias lojas |
| `createPromotion` | `POST /v1/merchant/promotions` | Lojista, loja autorizada |
| `updatePromotion` | `PATCH /v1/merchant/promotions/:id` | Lojista, loja autorizada |

Acrescentar tipos e schemas de entrada/saída, limites de texto, intervalo de datas válido,
filtro por loja e erro de acesso negado. `GameApi` recebe leitura pública e chat; um
`MerchantApi` compartilhado concentra gestão, usando o mesmo mapa `ROUTES`.

Proposta de responsabilidades, respeitando os donos do repositório:

- Orquestrador: tipos, schemas, contratos, dados iniciais e motor determinístico em
  `packages/shared`; documentação e coordenação das interfaces.
- Front: tela `/chat` e painel `/lojista` em `apps/web` no primeiro recorte, aproveitando
  Vite e os componentes existentes. O painel fica fora da navegação do visitante.
  Componentes de apresentação reutilizáveis entram em `packages/ui`.
- Front: implementar os dois contratos nos adaptadores local e HTTP e atualizar o
  catálogo após salvar/pausar uma promoção.
- Back: módulo `promotions` em controller/service/repository; módulo `chat` consultando
  catálogos e o motor compartilhado; autorização por associação usuário–loja.
- Back: migração com `promotions` e `store_members`, índices, integridade e políticas
  de acesso. O vínculo com loja nunca pode ser concedido pelo próprio visitante.

## Dados mockados e persistência

Para a apresentação, estender a implementação local com catálogo mutável e versionado
no `localStorage`, inicializado a partir do seed. Chat, painel e listagem de ofertas
devem usar essa mesma fonte. Salvar dispara atualização das consultas; entre abas,
tratar o evento `storage`. Recarregar mantém as ofertas; oferecer reinício explícito
dos dados de demonstração, separado da exclusão de conta do visitante.

Uma tela de seleção de lojista de exemplo pode simular o acesso, identificada como
demonstração. Essa seleção não constitui segurança. O armazenamento local só compartilha
dados no mesmo navegador e origem; cadastro em um computador não aparece em outro celular.
Se a apresentação exigir dispositivos diferentes, usar API com repositório em memória
compartilhado, ciente de que reiniciar o processo apaga os dados, ou Supabase.

No modo HTTP, operações novas só ficam disponíveis quando a API correspondente estiver
implementada; não gravar localmente enquanto o chat consulta o servidor.

## Regras mínimas

- Apenas ofertas publicadas e dentro do período aparecem ao visitante ou no chat.
- Lojista lista e altera apenas promoções das lojas às quais está associado.
- A API verifica a associação em toda escrita, inclusive ao alterar o `storeId`.
- Cupom vinculado precisa pertencer à mesma loja; não permite contornar regras de resgate.
- Pausar campanha remove sua divulgação; não invalida automaticamente cupons já emitidos.
- Todas as ofertas do protótipo mostram “Promoção de exemplo”.
- Nenhum ponto é concedido por conversar ou cadastrar promoções.
- Chat com foco visível, alvos de 44 px, mensagens anunciadas de forma acessível e
  respeito aos temas e à preferência por movimento reduzido.

## Ordem de implementação e aceite

1. Contratos, seed e motor: testar intenções, acentos, ambiguidade, ausência de ofertas
   e limites das datas com relógio injetável.
2. Catálogo local e painel demonstrativo: cadastrar, editar e pausar; verificar persistência
   ao recarregar e atualização na conversa, inclusive entre abas.
3. Chat do visitante: perguntas sugeridas, texto livre, cartões e navegação para mapa/recompensas.
4. API e banco: implementar os contratos HTTP e testar que um lojista não altera ofertas
   de outra loja, mesmo enviando IDs manualmente.
5. Ensaiar: cadastrar oferta, consultar pelo chat, pausar e consultar novamente;
   mostrar a mesma interface em outra temporada.

Executar typecheck, testes e build diretamente nos workspaces alterados, além de Biome
nas respectivas pastas. Não adicionar dependências para esse recorte.

## Limite desta entrega

Esta entrega registra a análise e a proposta. Nenhum comportamento do app, API, banco
ou contrato foi alterado. Permanecem para implementação o chat, o catálogo mutável,
o painel, os contratos novos e a autorização de lojistas.
