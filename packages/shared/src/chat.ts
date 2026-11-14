import type { ChatIntent, ChatMessageInput, ChatReply, Promotion, Store } from './domain.js';

const SUGGESTIONS = ['Ver promoções', 'Encontrar loja', 'Como ganhar moedas', 'Como resgatar'];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function recognize(text: string): ChatIntent {
  const normalized = normalize(text);
  if (/\b(moeda|moedas|capicoin|capicoins|ganhar ponto|ganhar pontos)\b/.test(normalized)) {
    return 'earn_coins';
  }
  if (/\b(resgatar|resgate|usar cupom|cupom|recompensa)\b/.test(normalized)) return 'redeem_help';
  if (/\b(onde fica|localizacao|local|endereco|mapa|fica)\b/.test(normalized)) {
    return 'store_location';
  }
  if (
    /\b(promocao|promocoes|oferta|ofertas|desconto|descontos|tem na|tem promocao)\b/.test(
      normalized,
    )
  ) {
    return 'promotions';
  }
  return 'fallback';
}

function findStore(text: string, stores: readonly Store[], storeId?: string): Store | undefined {
  if (storeId) return stores.find((store) => store.id === storeId);
  const normalized = normalize(text);
  return stores.find((store) =>
    normalize(store.name)
      .split(' ')
      .some((word) => word.length > 2 && normalized.includes(word)),
  );
}

function isCurrent(promotion: Promotion, now: number): boolean {
  return (
    promotion.status === 'published' &&
    Date.parse(promotion.startsAt) <= now &&
    Date.parse(promotion.endsAt) >= now
  );
}

/** Respostas por regras e modelos fixos. Nunca cria fatos que não estejam no catálogo. */
export function answerChat(
  input: ChatMessageInput,
  stores: readonly Store[],
  catalog: readonly Promotion[],
): ChatReply {
  const intent = input.intent ?? recognize(input.text);
  const store = findStore(input.text, stores, input.storeId);
  const now = Date.parse(input.now ?? new Date().toISOString());
  const suggestions = SUGGESTIONS;

  if (intent === 'promotions') {
    const promotions = catalog.filter(
      (promotion) => isCurrent(promotion, now) && (!store || promotion.storeId === store.id),
    );
    if (!promotions.length) {
      return {
        intent,
        text: store
          ? `Não encontrei promoções ativas de exemplo na ${store.name} agora.`
          : 'Não encontrei promoções ativas de exemplo agora.',
        promotions: [],
        ...(store ? { store } : {}),
        suggestions,
      };
    }
    return {
      intent,
      text: `Encontrei ${promotions.length === 1 ? 'esta promoção' : 'estas promoções'} de exemplo${store ? ` na ${store.name}` : ''}.`,
      promotions,
      ...(store ? { store } : {}),
      suggestions,
    };
  }

  if (intent === 'store_location') {
    return store
      ? {
          intent,
          text: `${store.name} fica no ${store.floor}. Veja no mapa do shopping.`,
          promotions: [],
          store,
          suggestions,
        }
      : {
          intent: 'fallback',
          text: 'Qual loja você quer encontrar? Diga o nome dela.',
          promotions: [],
          suggestions,
        };
  }
  if (intent === 'earn_coins') {
    return {
      intent,
      text: 'Você ganha capicoins fazendo check-in, visitando lojas parceiras por QR e concluindo missões.',
      promotions: [],
      suggestions,
    };
  }
  if (intent === 'redeem_help') {
    return {
      intent,
      text: 'Abra Recompensas, escolha um cupom de exemplo e toque em Resgatar. O código fica na sua carteira.',
      promotions: [],
      suggestions,
    };
  }
  return {
    intent: 'fallback',
    text: 'Ainda não sei responder isso. Escolha uma das opções para eu ajudar.',
    promotions: [],
    suggestions,
  };
}
