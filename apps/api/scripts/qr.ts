/**
 * Gera um token de QR assinado com QR_SECRET.
 *
 *   npm run qr -w @cde/api -- --kind secret --id s1 [--exp 30d]
 *
 * Tipos: checkin | store | secret | clue. Para pista, o id é `<huntId>:<ordem>` (ex.: natal-2026:3).
 * `--exp` aceita 30d, 12h, 90m ou segundos. Sem `--exp`, o token não expira.
 * O token vai para a saída padrão (para virar QR code); avisos vão para a saída de erro.
 */
import { parseArgs } from 'node:util';
import type { QrKind, QrPayload } from '@cde/shared';
import { DEV_QR_SECRET } from '../src/config/env.js';
import { parseDuration, signQr } from '../src/modules/qr/token.js';

const KINDS: readonly QrKind[] = ['checkin', 'store', 'secret', 'clue'];

try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env: usa as variáveis do ambiente.
}

const { values } = parseArgs({
  options: {
    kind: { type: 'string' },
    id: { type: 'string' },
    exp: { type: 'string' },
  },
});

function exit(message: string): never {
  console.error(message);
  console.error(
    'Uso: npm run qr -w @cde/api -- --kind <checkin|store|secret|clue> --id <id> [--exp 30d]',
  );
  process.exit(1);
}

const kind = values.kind as QrKind | undefined;
if (!kind || !KINDS.includes(kind)) exit('Informe --kind (checkin, store, secret ou clue).');
if (!values.id) exit('Informe --id.');

const secret = process.env.QR_SECRET?.trim();
if (!secret) console.error('Aviso: QR_SECRET ausente; usando o segredo de desenvolvimento.');

const payload: QrPayload = { k: kind, id: values.id };
if (values.exp) {
  try {
    payload.exp = Math.floor(Date.now() / 1000) + parseDuration(values.exp);
  } catch (error) {
    exit((error as Error).message);
  }
  console.error(`Expira em ${new Date(payload.exp * 1000).toISOString()}.`);
}

try {
  console.log(signQr(payload, secret || DEV_QR_SECRET));
} catch {
  exit('Id inválido: use letras, números, -, _ ou :, com até 100 caracteres.');
}
