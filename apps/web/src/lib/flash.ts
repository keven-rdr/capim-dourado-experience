import type { Trail } from '@cde/shared';

/** Hora do Capi: ofertas relâmpago às 12h, 18h e 20h, cada uma aberta por 30 minutos. */
export const FLASH_HOURS = [12, 18, 20] as const;
const FLASH_MINUTES = 30;

export interface FlashOffer {
  title: string;
  storeName: string;
}

/** Ofertas de exemplo por trilha, em lojas reais do shopping. Descontos são ilustrativos. */
export const FLASH_OFFERS: Record<Trail, FlashOffer[]> = {
  ele: [
    { title: 'Tênis de corrida −30%', storeName: 'Centauro' },
    { title: 'Camiseta dry-fit: leve 2, pague 1', storeName: 'Hering' },
    { title: 'Jaqueta corta-vento −25%', storeName: 'Renner' },
  ],
  ela: [
    { title: 'Coleção nova −25%', storeName: 'Marisa' },
    { title: 'Brincos com 15% off', storeName: 'Vivara' },
    { title: 'Bolsas a partir de R$ 59,90', storeName: 'Riachuelo' },
  ],
  kids: [
    { title: 'Blocos de montar −20%', storeName: 'Ri Happy' },
    { title: '30 minutos extras no parque', storeName: 'Wow Park' },
    { title: 'Combo kids por R$ 19,90', storeName: 'Cinemark' },
  ],
  todos: [
    { title: 'Combo pipoca + refri por R$ 15', storeName: 'Cinemark' },
    { title: 'Sobremesa grátis no almoço', storeName: 'Outback' },
    { title: 'Livros de bolso: leve 3, pague 2', storeName: 'Leitura' },
  ],
};

export interface FlashWindow {
  start: Date;
  end: Date;
  live: boolean;
  offer: FlashOffer;
}

/** A oferta aberta agora ou a próxima. A oferta muda a cada horário e a cada dia. */
export function currentFlash(now: Date, trail: Trail): FlashWindow {
  const day = new Date(now);
  for (let extraDays = 0; extraDays < 2; extraDays++) {
    for (const [slot, hour] of FLASH_HOURS.entries()) {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() + extraDays, hour);
      const end = new Date(start.getTime() + FLASH_MINUTES * 60_000);
      if (now < end) {
        const dayIndex = Math.floor(
          (start.getTime() - start.getTimezoneOffset() * 60_000) / 86_400_000,
        );
        const offers = FLASH_OFFERS[trail];
        const offer = offers[(dayIndex * FLASH_HOURS.length + slot) % offers.length] ?? offers[0];
        return { start, end, live: now >= start, offer: offer as FlashOffer };
      }
    }
  }
  throw new Error('sem horário da Hora do Capi'); // inalcançável: amanhã sempre tem 12h
}

/** "01:42:09" até o instante `target`. */
export function countdown(now: Date, target: Date): string {
  const s = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}
