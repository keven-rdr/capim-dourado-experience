# Apresentação para os jurados

Material para o grupo ensaiar. Pesquisa feita em 13/11/2026.

Regras deste roteiro:
- Nada de número de resultado inventado. Onde for **projeção**, a conta aparece. Onde for dado de terceiros, a fonte está ao lado.
- Descontos, prêmios e parcerias que aparecem na demonstração são **exemplos** e precisam estar marcados assim na tela.
- "Pessoa 1..4" são papéis. O grupo troca os nomes.
- Fatos do shopping estão em [capim-dourado-shopping.md](capim-dourado-shopping.md); dados de mercado, em [argumentos-de-negocio.md](argumentos-de-negocio.md); regras legais, em [regras-legais.md](regras-legais.md).

---

## (a) Três opções de frase de abertura

1. **"Em Palmas, o shopping já é o lugar do passeio. O que falta é um motivo para voltar na semana seguinte."**
   Funciona porque parte de um fato: a pesquisa Abrasce/Talk diz que lazer é o papel do shopping para 92% dos frequentadores ([Mercado&Consumo, 26/06/2026](https://mercadoeconsumo.com.br/26/06/2026/shopping-centers/brasileiro-passa-mais-de-3-horas-no-shopping-que-se-consolida-como-espaco-de-experiencia/amp/)).
2. **"O Capim Dourado virou um mapa. E cada andar tem um segredo."**
   Mais visual. Boa se a primeira tela for o mapa dos pavimentos com a Capi.
3. **"A Marina veio ao shopping em outubro, levou o filho ao cinema e não voltou mais. Hoje a gente vai dar a ela um motivo: volte amanhã, tem baú."**
   Mais narrativa. Boa se a Pessoa 1 tiver segurança para contar uma cena.

Sugestão: usar a 3 na abertura e a 2 como frase de fechamento ("O Capim Dourado virou um mapa").

---

## (b) Roteiro de 5 minutos

Divisão de papéis:
- **Pessoa 1**: abre e fecha. Conta a cena e a solução.
- **Pessoa 2**: opera o celular na demonstração (não fala muito; foca na tela).
- **Pessoa 3**: narra a demonstração e apresenta o valor para o shopping.
- **Pessoa 4**: apresenta a componentização e responde perguntas técnicas.

| Tempo | Bloco | Quem fala | Fala sugerida (curta) | O que aparece na tela |
|---|---|---|---|---|
| 0:00 – 0:35 | **A cena** | Pessoa 1 | "A Marina veio ao Capim Dourado em outubro. Cinema, praça de alimentação, e foi embora. O shopping não sabe quando ela volta. O desafio 05 pergunta isso: como transformar a visita pontual em vínculo." | Slide 1: foto ou ilustração da entrada do shopping, uma frase: "Veio. Gostou. Não voltou." |
| 0:35 – 1:10 | **A solução em uma frase** | Pessoa 1 | "O Capim Dourado Experience transforma a visita em jogo. Você chega, faz check-in, procura presentes escondidos e troca moedas por cupons. Quem guia é a Capi e a turma de capivaras. Funciona no navegador: lê o QR da entrada e já está jogando." | Slide 2: a Capi, as três moedas (XP, capicoins, bilhetes) e a frase "Abre por QR. Sem baixar nada." |
| 1:10 – 1:35 | **Demo: chegada e check-in** | Pessoa 3 narra, Pessoa 2 opera | "A Marina toca em 'Cheguei!'. O app confere se ela está na área do shopping. Ganhou XP e moedas, e começou a sequência de dias." | Celular espelhado: Home, botão "Cheguei!", animação de sucesso, chip "1 dia seguido". |
| 1:35 – 1:55 | **Demo: a missão** | Pessoa 3 | "A missão de Natal: achar os presentes da Fábrica de Presentes. A primeira pista é uma charada." | Tela de Missões e cartão da pista. |
| 1:55 – 2:35 | **MOMENTO DE DESTAQUE: o QR e a revelação** | Pessoa 3 fala pouco; **pausa** | "Ela achou o QR escondido perto do Papai Noel." *(Pessoa 2 aponta o celular para o QR impresso na mão da Pessoa 1.)* *(silêncio de 2 segundos enquanto o presente abre)* "Presente aberto. Peça do mapa, figurinha nova e moedas." | Scanner lendo o QR impresso, caixa de presente abrindo, figurinha rara aparecendo. É a única animação longa da apresentação. |
| 2:35 – 3:00 | **Demo: a recompensa** | Pessoa 3 | "Com as moedas, ela troca por um cupom. Exemplo: um sorvete para o filho. O cupom tem código, validade e só vale uma vez." | Carteira, cupom em formato de ingresso com selo "exemplo". |
| 3:00 – 3:50 | **COMPONENTIZAÇÃO** | Pessoa 4 | "Tudo o que vocês viram são peças de uma biblioteca só. Este é o catálogo: botão, cartão de missão, cupom, figurinha, cada um com seus estados. Agora eu troco a temporada." *(troca Natal → Halloween → Páscoa)* "Nenhuma tela foi reescrita. Mudaram só os tokens de design: cores, fantasia da Capi e textos. A API segue a mesma ideia: um módulo por função, check-in, missões, QR, recompensas." | Rota `/catalogo` no notebook ou celular, com o seletor de temporada. Depois, um slide com o desenho do monorepo e dos módulos da API. |
| 3:50 – 4:30 | **Valor para o shopping e as lojas** | Pessoa 3 | "O shopping ganha três números que hoje não tem: quem volta em 7 dias, quantos cupons viram venda nas lojas e quantas lojas cada visitante passa. A loja cria o cupom no painel e confere o uso. O jogo completa o app do shopping, que já cuida de estacionamento, lojas e cinema." | Slide com os 3 indicadores (marcados como "o que vamos medir", sem valores inventados) e uma captura do painel. |
| 4:30 – 5:00 | **Riscos tratados e fechamento** | Pessoa 1 | "Pensamos no que pode dar errado. GPS erra dentro do prédio: por isso o QR confirma o local. Sorteio exige autorização federal: no MVP ele é simulado. Localização é dado pessoal: guardamos só 'estava ou não no shopping'. Próximo passo: um piloto no Natal. O Capim Dourado virou um mapa. Obrigado." | Slide final: três riscos com a solução de cada um, "Piloto: Natal" e o QR para testar o protótipo. |

Dicas de ensaio:
- Cronometrar cada bloco. Se passar de 5:00, cortar o bloco "a missão" (1:35 – 1:55) e ir direto ao QR.
- O momento de destaque precisa de silêncio. Ninguém fala enquanto o presente abre.
- Pessoa 2 nunca vira as costas para a banca. Espelhamento do celular testado antes.
- Não dizer "gamificação" em geral. Dizer "o Natal do Capim Dourado", "a Capi", "o presente escondido".
- O Papai Noel do shopping fica no trono a partir de 07/11/2026 ([site oficial](https://www.capimdouradosc.com.br/evento/?evento=natal-2026)). Citar isso conecta o jogo a uma atração que já existe.

---

## (c) Estrutura dos slides (ou da página de apresentação)

Se o grupo usar a página rolável sugerida no guia (subida pelos pavimentos), cada slide abaixo vira uma "parada" da página. A ordem é a mesma.

| # | Título | Conteúdo |
|---|---|---|
| 1 | **Veio. Gostou. Não voltou.** | Cena da Marina em uma frase. Fundo: Subsolo e estacionamento (a chegada). |
| 2 | **O desafio 05** | O problema nas palavras do edital: a relação com o shopping fica na visita ou no consumo pontual, sem vínculo contínuo. Um dado de contexto: 471 milhões de visitas por mês nos shoppings do Brasil em 2025, queda de 1% sobre 2024 ([Abrasce via Mercado&Consumo, 04/02/2026](https://mercadoeconsumo.com.br/04/02/2026/shopping-centers/faturamento-dos-shoppings-cresce-12-em-2025-para-r-2009-bi-diz-abrasce/)). |
| 3 | **Capim Dourado Experience** | A Capi, a frase da solução e "Abre por QR, sem baixar nada". Fundo: Térreo. |
| 4 | **Como o jogo funciona** | Quatro ícones: check-in, missão, QR escondido, cupom. Três moedas: XP (nível), capicoins (troca), bilhetes (sorteio simulado). |
| 5 | **Demonstração** | Só o título e o QR para a banca testar. A demonstração acontece no celular espelhado. |
| 6 | **Uma biblioteca, três temporadas** | Componentização: catálogo + troca ao vivo (pode ser a própria rota `/catalogo`). Lista curta dos componentes: botão, cartão de missão, barra de XP, chip de sequência, cupom-ingresso, figurinha, pin do mapa, aviso de conquista. |
| 7 | **Por dentro** | Diagrama: `apps/web` e painel usam `packages/ui`; API em módulos (check-in, missões, QR, recompensas, sorteios, lojas), cada um com controller, service e repository; Supabase. Uma frase: "pontos calculados só no servidor". |
| 8 | **O que o shopping ganha** | Os 3 indicadores e como cada um é medido (seção f). Captura do painel. A frase "o jogo completa o app que o shopping já tem". |
| 9 | **Riscos que já tratamos** | GPS interno → QR; sorteio → simulado e com autorização no piloto; LGPD → só o resultado da verificação; crianças → conta do responsável, sem ranking. |
| 10 | **Próximo passo: piloto de Natal** | O que falta (seção e, pergunta 11) e o convite. Frase de fechamento. |

---

## (d) Roteiro da demonstração

### Preparação (antes de entrar na sala)

- App aberto no **modo demonstração** (funciona sem API, sem GPS e sem câmera). A forma exata de ativar é definida pelo front. **[A CONFIRMAR com o agente front]**
- Usuário de demonstração com sequência de 6 dias, para o baú do 7º dia aparecer se der tempo.
- QR da pista impresso em papel firme, tamanho de pelo menos 8 cm, preso a um enfeite de Natal. Um segundo QR reserva no bolso da Pessoa 1.
- Notebook com a rota `/catalogo` aberta em outra aba.
- Vídeo de backup baixado no notebook **e** no celular da Pessoa 4 (não depender de internet).

### Passo a passo (no modo demonstração)

1. Abrir a Home já logada com a trilha "Para todos" e a temporada Natal.
2. Tocar em **"Cheguei!"**. No modo demonstração a área do shopping é simulada, então o check-in dá certo mesmo sem GPS. Mostrar XP, moedas e o chip da sequência.
3. Abrir **Missões** → missão de Natal → primeira pista.
4. Abrir o **Scanner** e ler o QR impresso. Se a câmera não abrir, usar o botão de leitura simulada do modo demonstração. **[A CONFIRMAR com o front que esse botão existe]**
5. **Revelação**: presente abre, peça do mapa, figurinha. Pausa.
6. Ir a **Recompensas**, trocar moedas por um cupom marcado como exemplo. Mostrar código e validade.
7. Trocar para o notebook: rota **`/catalogo`**, mostrar 3 componentes e trocar a temporada (Natal → Halloween → Páscoa).
8. (Opcional, se sobrar tempo) mostrar o painel com os indicadores de exemplo.

### Plano B

| Falha | O que fazer |
|---|---|
| Espelhamento do celular não funciona | Rodar a mesma sequência no notebook, em janela de celular (ferramenta de desenvolvedor do navegador). |
| Câmera não lê o QR | Usar a leitura simulada do modo demonstração. Não insistir mais de 5 segundos. |
| App não abre ou trava | Pessoa 4 dá play no **vídeo gravado** (2 minutos, mesma sequência). Pessoa 3 narra por cima, igual ao ensaio. |
| Internet da sala cai | O modo demonstração não depende da API. Se o app não estiver em cache, ir para o vídeo. |
| Troca de temporada falha | Mostrar as três capturas (Natal, Páscoa, Halloween) lado a lado no slide 6. |

Frase pronta para a falha: "A internet resolveu entrar no jogo. Vou mostrar a gravação do mesmo fluxo." Sem pedir desculpas longas.

### Checklist do que testar antes (no dia, no local)

- [ ] Celular carregado, modo avião desligado, notificações silenciadas, brilho no máximo.
- [ ] App aberto no modo demonstração, com dados zerados para a sequência ensaiada.
- [ ] Leitura do QR impresso testada com a luz da sala.
- [ ] Leitura simulada testada (plano B da câmera).
- [ ] Espelhamento do celular no projetor testado.
- [ ] Rota `/catalogo` aberta e troca de temporada testada nas três temporadas.
- [ ] Vídeo de backup abre offline no notebook e no celular reserva.
- [ ] Animação de revelação funciona com "reduzir movimento" desligado no celular da demo.
- [ ] Todos os cupons e prêmios na tela têm o selo "exemplo".
- [ ] Ensaio cronometrado completo pelo menos duas vezes, com a troca de pessoas.

---

## (e) 12 perguntas prováveis dos jurados

Respostas curtas e honestas. Quem responde: Pessoa 4 nas técnicas, Pessoa 3 nas de negócio, Pessoa 1 nas legais.

1. **Quanto custa?**
   No MVP, perto de zero em infraestrutura: Vercel e Supabase têm planos gratuitos que bastam para um piloto pequeno. O custo real é de operação: imprimir e repor QR codes, criar missões a cada temporada e os prêmios. Valores dos planos pagos e da equipe de operação: **[A CONFIRMAR]**.

2. **Quem paga os prêmios?**
   As lojas bancam os descontos dos cupons, porque ganham visita e venda. O shopping banca os prêmios da temporada e do sorteio. No protótipo, todos os valores são exemplo. **[A CONFIRMAR com o shopping]**

3. **E a fraude? Dá para pegar pontos de casa?**
   Os pontos são calculados só no servidor. O GPS confirma "estou na área do shopping", e a área é um polígono, não um raio. O QR confirma "estou neste ponto", e o token do QR expira para reduzir foto compartilhada. Há limite diário e o cupom é de uso único, conferido pela loja. Não é infalível: GPS falso existe. Por isso a recompensa maior vem do QR físico.

4. **E a LGPD?**
   A localização é dado pessoal. Pedimos consentimento específico, com uma tela que explica antes do aviso do celular. Guardamos só o resultado ("dentro ou fora", data e hora), não o trajeto. O usuário apaga a conta e os dados no perfil. Detalhes em [regras-legais.md](regras-legais.md).

5. **Por que web app e não app nativo?**
   Porque a pessoa entra lendo um QR, sem ir à loja de aplicativos. A persona não instala app novo com facilidade. O custo é não ter notificação em segundo plano no iPhone sem instalar na tela inicial, e aceitamos isso.

6. **O shopping já tem aplicativo. Para que outro?**
   O app oficial resolve conveniência: localizar as mais de 170 lojas, pagar o estacionamento, ver o cinema e os eventos ([App Store](https://apps.apple.com/br/app/capim-dourado-shopping/id6474587476)). O nosso dá o motivo para voltar. Os dois se completam: o app oficial pode ter um botão "Jogar", e o jogo pode mandar para o pagamento do estacionamento. Integração técnica com o app oficial: **[A CONFIRMAR com o shopping e o fornecedor do app]**.

7. **Como vocês vão medir sucesso?**
   Com três números: retorno em 7 dias, cupons usados nas lojas e lojas visitadas por visita (seção f). As metas são combinadas com o shopping no piloto. Não temos resultado ainda e não vamos inventar.

8. **Por que componentização?**
   Porque um shopping vive de calendário: Natal, Páscoa, Dia das Crianças, Halloween. Com uma biblioteca de componentes, cada temporada troca só os tokens de design, sem reescrever telas. E o mesmo componente serve ao app do visitante e ao painel das lojas. Acabamos de mostrar a troca ao vivo.

9. **Isso escala?**
   Escala em duas direções. Em conteúdo: nova temporada é um novo conjunto de tokens, missões e figurinhas. Em número de shoppings: a área de check-in vem do banco, então outro shopping é outro polígono e outro catálogo. No MVP, só o Capim Dourado. A rede administra outros shoppings, mas não validamos isso. **[A CONFIRMAR]**

10. **O sorteio é legal?**
    Sorteio com finalidade promocional precisa de autorização prévia da Secretaria de Prêmios e Apostas do Ministério da Fazenda (Lei 5.768/1971, art. 1º; [serviço oficial no gov.br](https://www.gov.br/pt-br/servicos/obter-autorizacao-para-atividades-de-distribuicao-gratuita-de-premios-a-titulo-de-propaganda-ou-de-captacao-de-poupanca-popular)). Por isso, no MVP o sorteio é simulado. O shopping já faz sorteios autorizados (Natal 2025 e Dia dos Pais 2026, ver [capim-dourado-shopping.md](capim-dourado-shopping.md)), então no piloto os bilhetes do jogo podem virar números da sorte de uma promoção que o shopping já autoriza. A outra saída é trocar o sorteio por recompensa garantida a quem cumprir a missão. **[A CONFIRMAR com o jurídico do shopping]**

11. **O que falta para o piloto?**
    Cinco coisas: aprovação da Operação para os locais dos QR; lojas parceiras e cupons reais; conferência em campo da área de check-in (a área provisória do código está deslocada cerca de 1,8 km e já temos uma proposta pelo OpenStreetMap); texto de privacidade revisado pelo jurídico e encarregado de dados definido; e decisão sobre o sorteio (autorização ou troca por prêmio garantido). Também falta testar o GPS no estacionamento e no Subsolo 1.

12. **E as crianças?**
    A trilha Kids fica dentro da conta do responsável, sem ranking e sem localização exata. A LGPD (art. 14) exige que o tratamento de dados de criança respeite o melhor interesse dela, e o ECA Digital (Lei 15.211/2025), em vigor desde 17/03/2026, proíbe caixas de recompensa pagas em jogos acessados por crianças. O nosso baú não é vendido e não se compra moeda com dinheiro, mas vamos validar com o jurídico. **[A CONFIRMAR]**

---

## (f) Os 3 indicadores para mostrar

Os três saem do registro de pontos (`point_events`) e das tabelas de check-in e resgate, sem dado extra do visitante.

| Indicador | O que mostra | Como medir | Por que é o certo |
|---|---|---|---|
| **Retorno em 7 dias** | Se o jogo cria hábito | Dos visitantes que fizeram o primeiro check-in numa semana, quantos % fizeram outro check-in em até 7 dias. Conta: `visitantes com 2º check-in em ≤ 7 dias ÷ visitantes com 1º check-in na semana`. | É a resposta direta ao desafio 05: vínculo contínuo, não visita pontual. |
| **Cupons usados nas lojas** | Se o jogo vira venda para o lojista | Cupons marcados como usados pela loja no painel ÷ cupons resgatados no app, por loja e por semana. | Mostra o valor para quem banca os descontos. |
| **Lojas visitadas por visita** | Se o visitante circula mais | Média de QR de loja lidos por dia de check-in, por visitante. | Mostra que o jogo espalha o fluxo pelo shopping, não só pela praça de alimentação. |

### Exemplo de projeção (só para mostrar a conta)

Os números abaixo são **hipotéticos**. O fluxo mensal do Capim Dourado não foi encontrado em fonte pública recente **[A CONFIRMAR com o shopping]**. A única cifra pública achada é antiga: mais de 7 milhões de pessoas em um ano, em 2012 ([Conexão Tocantins, 17/08/2012](https://conexaoto.com.br/2012/08/17/capim-dourado-shopping-registra-r-297-milhoes-em-vendas-mais-de-7-milhoes-de-pessoas-circularam-no-empreendimento)), que não serve para hoje.

> **Projeção** (hipotética): se o shopping recebe **V** visitas por mês e **a%** delas leem o QR da entrada e fazem check-in, o jogo tem **V × a** jogadores no mês. Se **r%** voltam em 7 dias, são **V × a × r** visitas de retorno ligadas ao jogo.
> Exemplo com valores inventados só para ilustrar a fórmula: V = 500.000, a = 1%, r = 20% → 5.000 jogadores e 1.000 retornos em 7 dias. **Nenhum desses três valores é dado real.**

Na apresentação, mostrar a fórmula e dizer: "A meta de cada número a gente define com vocês no piloto."
