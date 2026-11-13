import { createHmac, timingSafeEqual } from 'node:crypto';
import { DEMO_QR_PREFIX, type QrKind, type QrPayload } from '@cde/shared';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';

/**
 * Formato do QR assinado (versão 1):
 *
 *   cde1.<payload>.<assinatura>
 *
 * - `payload`: JSON de `QrPayload` (`{ "k": tipo, "id": id, "exp"?: epoch em segundos }`) em base64url.
 * - `assinatura`: HMAC-SHA256 de `cde1.<payload>` com `QR_SECRET`, em base64url (43 caracteres).
 *
 * Exemplo de payload: `{"k":"secret","id":"s1","exp":1767225600}`.
 * Códigos de demonstração (`cde:<tipo>:<id>`) só valem com `ALLOW_DEMO_QR=true`.
 */
export const QR_TOKEN_VERSION = 'cde1';

const QR_KINDS = ['checkin', 'store', 'secret', 'clue'] as const satisfies readonly QrKind[];

const payloadSchema = z.object({
  k: z.enum(QR_KINDS),
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_:-]+$/),
  exp: z.number().int().positive().optional(),
});

function base64url(data: Buffer | string): string {
  return Buffer.from(data).toString('base64url');
}

function hmac(secret: string, data: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

export function signQr(payload: QrPayload, secret: string): string {
  const parsed = payloadSchema.parse(payload);
  const body = `${QR_TOKEN_VERSION}.${base64url(JSON.stringify(parsed))}`;
  return `${body}.${base64url(hmac(secret, body))}`;
}

export interface QrDecodeOptions {
  secret: string;
  allowDemo: boolean;
  now: Date;
}

/** Valida o token e devolve o payload. Lança `qr_invalid` ou `qr_expired`. */
export function decodeQr(token: string, options: QrDecodeOptions): QrPayload {
  const raw = token.trim();
  if (raw.startsWith(DEMO_QR_PREFIX)) {
    if (!options.allowDemo) throw new AppError('qr_invalid', 'Código de demonstração desativado.');
    return parseDemo(raw);
  }

  const parts = raw.split('.');
  const [version, encodedPayload, signature] = parts;
  if (parts.length !== 3 || version !== QR_TOKEN_VERSION || !encodedPayload || !signature) {
    throw new AppError('qr_invalid');
  }
  const expected = hmac(options.secret, `${version}.${encodedPayload}`);
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new AppError('qr_invalid');
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new AppError('qr_invalid');
  }
  const payload = payloadSchema.safeParse(json);
  if (!payload.success) throw new AppError('qr_invalid');
  if (payload.data.exp !== undefined && payload.data.exp * 1000 <= options.now.getTime()) {
    throw new AppError('qr_expired');
  }
  return payload.data;
}

/** `cde:<tipo>:<id>`; o id da pista tem dois-pontos (`natal-2026:3`). */
function parseDemo(token: string): QrPayload {
  const rest = token.slice(DEMO_QR_PREFIX.length);
  const separator = rest.indexOf(':');
  const payload = payloadSchema.safeParse({
    k: rest.slice(0, separator),
    id: separator > 0 ? rest.slice(separator + 1) : '',
  });
  if (separator <= 0 || !payload.success) throw new AppError('qr_invalid');
  return payload.data;
}

/** Converte `30d`, `12h`, `90m` ou `3600` (segundos) em segundos. */
export function parseDuration(value: string): number {
  const match = value.trim().match(/^(\d+)([dhms]?)$/);
  if (!match) throw new Error(`Duração inválida: ${value}. Use 30d, 12h, 90m ou segundos.`);
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { d: 86_400, h: 3_600, m: 60, s: 1 }[unit] ?? 1;
  return amount * factor;
}
