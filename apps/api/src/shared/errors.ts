import type { ErrorCode } from '@cde/shared';

/**
 * Código de erro da API. Usa os códigos do contrato e acrescenta `internal`
 * para falhas inesperadas (o contrato não define um código para isso).
 */
export type ApiErrorCode = ErrorCode | 'internal';

type HttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 422 | 429 | 500;

const STATUS: Record<ApiErrorCode, HttpErrorStatus> = {
  unauthorized: 401,
  profile_not_found: 404,
  validation: 400,
  outside_area: 422,
  low_accuracy: 422,
  mall_closed: 422,
  already_checked_in: 409,
  daily_limit: 429,
  qr_invalid: 400,
  qr_expired: 410,
  qr_already_used: 409,
  clue_out_of_order: 409,
  insufficient_coins: 422,
  coupon_not_found: 404,
  no_spins: 409,
  coupon_used: 409,
  coupon_expired: 410,
  coupon_wrong_store: 422,
  forbidden: 403,
  not_found: 404,
  internal: 500,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  unauthorized: 'Faça login para continuar.',
  profile_not_found: 'Perfil não encontrado. Crie o seu perfil primeiro.',
  validation: 'Dados inválidos.',
  outside_area: 'Você parece estar fora da área do shopping.',
  low_accuracy: 'A localização está imprecisa. Tente de novo ou use o QR da entrada.',
  mall_closed: 'O shopping está fechado agora.',
  already_checked_in: 'Você já fez check-in hoje.',
  daily_limit: 'Limite diário atingido. Volte amanhã.',
  qr_invalid: 'QR code inválido.',
  qr_expired: 'Este QR code expirou.',
  qr_already_used: 'Você já leu este QR code.',
  clue_out_of_order: 'Esta pista ainda não é a próxima. Resolva as anteriores primeiro.',
  insufficient_coins: 'Moedas insuficientes.',
  coupon_not_found: 'Cupom não encontrado.',
  no_spins: 'Você não tem giros disponíveis.',
  coupon_used: 'Este cupom já foi usado.',
  coupon_expired: 'Este cupom venceu.',
  coupon_wrong_store: 'Este cupom vale em outra loja.',
  forbidden: 'Chave da loja inválida.',
  not_found: 'Recurso não encontrado.',
  internal: 'Erro interno. Tente de novo em instantes.',
};

/** Erro de regra de negócio, convertido em `ApiErrorBody` pelo handler HTTP. */
export class AppError extends Error {
  override name = 'AppError';
  readonly code: ApiErrorCode;
  readonly status: HttpErrorStatus;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message?: string, details?: unknown) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.code = code;
    this.status = STATUS[code];
    if (details !== undefined) this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
