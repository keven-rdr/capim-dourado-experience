import { TICKET_COST, type Wallet } from '@cde/shared';
import type { PointsService } from '../points/service.js';

/**
 * Bilhetes de sorteio (RF13). O sorteio é simulado no MVP.
 * O bilhete é um lançamento no ledger (moedas -TICKET_COST, bilhetes +1); no Supabase,
 * a função `apply_points` também grava uma linha em `raffle_tickets` para cada bilhete.
 * Por isso este módulo não tem repositório próprio.
 */
export class RafflesService {
  constructor(private readonly points: PointsService) {}

  buyTicket(userId: string): Promise<Wallet> {
    return this.points.spend(userId, 'raffle_ticket', 'Bilhete de sorteio', {
      coins: TICKET_COST,
      tickets: 1,
    });
  }
}
