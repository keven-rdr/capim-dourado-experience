import type { ApiErrorBody, ErrorCode } from '@cde/shared';

/** Código de erro de regra de negócio, mais `network` para falhas de conexão (só no app). */
export type AppErrorCode = ErrorCode | 'network';

/** Erro das implementações de `GameApi`. Mesmo formato do `ApiErrorBody` da API. */
export class GameApiError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;
  readonly status?: number;

  constructor(code: AppErrorCode, message: string, details?: unknown, status?: number) {
    super(message);
    this.name = 'GameApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }

  static fromBody(body: ApiErrorBody, status?: number): GameApiError {
    return new GameApiError(body.error.code, body.error.message, body.error.details, status);
  }
}

export function isGameApiError(error: unknown): error is GameApiError {
  return error instanceof GameApiError;
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
}

/** Mensagens que nunca culpam quem está jogando. */
const FRIENDLY: Record<AppErrorCode, { title: string; message: string }> = {
  unauthorized: { title: 'Sessão expirou', message: 'Vamos entrar de novo rapidinho.' },
  profile_not_found: {
    title: 'Perfil não encontrado',
    message: 'Bora criar o seu, leva 20 segundos.',
  },
  validation: { title: 'Algo não fechou', message: 'Confere os campos e tenta mais uma vez.' },
  outside_area: {
    title: 'Ainda não te vimos por aqui',
    message: 'Chegando ao shopping, é só tocar de novo.',
  },
  low_accuracy: {
    title: 'O GPS está tímido',
    message: 'Aqui dentro o sinal oscila. Leia o QR da entrada e pronto.',
  },
  mall_closed: {
    title: 'O shopping está fechado agora',
    message: 'Check-in e QR valem no horário das lojas: seg. a sáb. 10h–22h, dom. 14h–20h.',
  },
  already_checked_in: {
    title: 'Check-in de hoje feito',
    message: 'Volte amanhã e mantenha a sequência!',
  },
  daily_limit: {
    title: 'Limite do dia alcançado',
    message: 'Hoje já valeu muito. Amanhã tem mais pontos.',
  },
  qr_invalid: {
    title: 'Esse código não abriu nada',
    message: 'Pode ser um QR de outra coisa. Tenta outro ou digite o código impresso.',
  },
  qr_expired: {
    title: 'Esse QR já trocou',
    message: 'Os códigos mudam de tempos em tempos. Leia o da hora.',
  },
  qr_already_used: {
    title: 'Esse você já achou',
    message: 'Ele já está na sua coleção. Que tal procurar o próximo?',
  },
  clue_out_of_order: {
    title: 'Opa, esse presente é de outra pista',
    message: 'A caça vai em ordem. Resolva a pista atual primeiro.',
  },
  insufficient_coins: {
    title: 'Faltam algumas moedas',
    message: 'Uma missão rápida resolve.',
  },
  coupon_not_found: { title: 'Cupom saiu do catálogo', message: 'Tem outros esperando por você.' },
  no_spins: {
    title: 'Sem giros por agora',
    message: 'O check-in do dia libera os giros. Volte amanhã para mais.',
  },
  coupon_used: { title: 'Cupom já usado', message: 'Cada cupom vale uma vez só.' },
  coupon_expired: { title: 'Cupom vencido', message: 'O prazo acabou. A roleta tem outros.' },
  coupon_wrong_store: { title: 'Cupom de outra loja', message: 'Esse cupom vale em outra loja.' },
  forbidden: { title: 'Chave da loja não confere', message: 'Confira a chave com o shopping.' },
  not_found: { title: 'Não achamos isso', message: 'Pode ter mudado de lugar. Tenta de novo.' },
  network: {
    title: 'Sem conexão com o servidor',
    message: 'Confere a internet. O que você já ganhou está guardado.',
  },
};

export function friendlyError(error: unknown): {
  code: AppErrorCode;
  title: string;
  message: string;
} {
  const code: AppErrorCode = isGameApiError(error) ? error.code : 'network';
  return { code, ...FRIENDLY[code] };
}
