import { type LatLng, MALL_AREA_APPROX } from '@cde/shared';
import { z } from 'zod';

/**
 * Segredo usado só em desenvolvimento quando `QR_SECRET` não está definido.
 * Em produção a API se recusa a subir sem `QR_SECRET`.
 */
export const DEV_QR_SECRET = 'dev-only-qr-secret-troque-em-producao';

export type AuthMode = 'dev' | 'supabase';
export type StorageMode = 'memory' | 'supabase';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  authMode: AuthMode;
  storage: StorageMode;
  supabase: { url: string; serviceRoleKey: string } | null;
  qrSecret: string;
  /** `*` libera qualquer origem; senão, lista de origens permitidas. */
  corsOrigins: '*' | string[];
  allowDemoQr: boolean;
  skipOpeningHours: boolean;
  /** Polígono da área de check-in vindo de `MALL_AREA_JSON`, ou `null` para usar o padrão. */
  mallAreaOverride: LatLng[] | null;
  /** Avisos de configuração para registrar na subida. */
  warnings: string[];
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const booleanFlag = z
  .string()
  .optional()
  .transform((value) => ['true', '1'].includes((value ?? '').trim().toLowerCase()));

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SUPABASE_URL: optionalText.pipe(z.url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: optionalText,
  QR_SECRET: optionalText,
  CORS_ORIGIN: optionalText,
  ALLOW_DEMO_QR: booleanFlag,
  SKIP_OPENING_HOURS: booleanFlag,
  MALL_AREA_JSON: optionalText,
  AUTH_MODE: optionalText.pipe(z.enum(['dev', 'supabase']).optional()),
});

const polygonSchema = z
  .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
  .min(3);

/** Lê e valida as variáveis de ambiente. Lança `ConfigError` com mensagem em português. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = rawEnvSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new ConfigError(`Variáveis de ambiente inválidas: ${fields}.`);
  }
  const raw = parsed.data;
  const nodeEnv = raw.NODE_ENV ?? 'development';
  const production = nodeEnv === 'production';
  const warnings: string[] = [];

  const hasUrl = Boolean(raw.SUPABASE_URL);
  const hasKey = Boolean(raw.SUPABASE_SERVICE_ROLE_KEY);
  if (hasUrl !== hasKey) {
    throw new ConfigError(
      'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY juntas, ou nenhuma das duas.',
    );
  }
  const supabase =
    raw.SUPABASE_URL && raw.SUPABASE_SERVICE_ROLE_KEY
      ? { url: raw.SUPABASE_URL, serviceRoleKey: raw.SUPABASE_SERVICE_ROLE_KEY }
      : null;

  let authMode: AuthMode;
  if (raw.AUTH_MODE) {
    authMode = raw.AUTH_MODE;
  } else if (supabase) {
    authMode = 'supabase';
  } else if (production) {
    throw new ConfigError(
      'Em produção, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, ou defina AUTH_MODE=dev explicitamente (só para demonstração).',
    );
  } else {
    authMode = 'dev';
  }
  if (authMode === 'supabase' && !supabase) {
    throw new ConfigError('AUTH_MODE=supabase exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (authMode === 'dev') {
    warnings.push(
      'AUTH_MODE=dev: o usuário é identificado pelo cabeçalho x-demo-user, sem senha. Use só em demonstração.',
    );
  }

  let qrSecret = raw.QR_SECRET;
  if (!qrSecret) {
    if (production) throw new ConfigError('Em produção, QR_SECRET é obrigatório.');
    qrSecret = DEV_QR_SECRET;
    warnings.push('QR_SECRET ausente: usando o segredo de desenvolvimento.');
  } else if (qrSecret.length < 16) {
    throw new ConfigError('QR_SECRET precisa ter pelo menos 16 caracteres.');
  }

  let corsOrigins: AppConfig['corsOrigins'];
  if (!raw.CORS_ORIGIN) {
    if (production) {
      throw new ConfigError('Em produção, CORS_ORIGIN é obrigatório (endereço do app).');
    }
    corsOrigins = '*';
  } else if (raw.CORS_ORIGIN === '*') {
    corsOrigins = '*';
  } else {
    corsOrigins = raw.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  let mallAreaOverride: LatLng[] | null = null;
  if (raw.MALL_AREA_JSON) {
    let json: unknown;
    try {
      json = JSON.parse(raw.MALL_AREA_JSON);
    } catch {
      throw new ConfigError('MALL_AREA_JSON não é um JSON válido.');
    }
    const polygon = polygonSchema.safeParse(json);
    if (!polygon.success) {
      throw new ConfigError(
        'MALL_AREA_JSON deve ser uma lista com pelo menos 3 pontos { "lat": número, "lng": número }.',
      );
    }
    mallAreaOverride = polygon.data;
  }

  if (raw.SKIP_OPENING_HOURS) {
    warnings.push('SKIP_OPENING_HOURS=true: horário do shopping ignorado. Só para demonstração.');
  }
  if (raw.ALLOW_DEMO_QR) {
    warnings.push('ALLOW_DEMO_QR=true: códigos cde:<tipo>:<id> aceitos sem assinatura.');
  }

  return {
    nodeEnv,
    port: raw.PORT ?? 8787,
    authMode,
    storage: supabase ? 'supabase' : 'memory',
    supabase,
    qrSecret,
    corsOrigins,
    allowDemoQr: raw.ALLOW_DEMO_QR,
    skipOpeningHours: raw.SKIP_OPENING_HOURS,
    mallAreaOverride,
    warnings,
  };
}

/** Polígono padrão quando não há configuração: aproximado, a confirmar em campo. */
export const DEFAULT_MALL_AREA: readonly LatLng[] = MALL_AREA_APPROX;
