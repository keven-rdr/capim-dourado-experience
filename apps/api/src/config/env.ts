import {
  GOLDEN_WINDOWS,
  type GoldenWindow,
  type LatLng,
  MALL_AREA_APPROX,
  parseClock,
} from '@cde/shared';
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
  /** Janelas da hora dourada (`GOLDEN_HOURS_JSON`) ou as de exemplo do `@cde/shared`. */
  goldenWindows: GoldenWindow[];
  /** Chave de cada loja para o painel (`STORE_KEYS_JSON`): `{ "<idDaLoja>": "<chave>" }`. */
  storeKeys: Record<string, string>;
  /**
   * Só em demonstração (`AUTH_MODE=dev` sem `STORE_KEYS_JSON`): qualquer loja aceita a chave
   * `demo`. Nunca fica ligado quando há chaves configuradas.
   */
  demoStoreKey: boolean;
  /** Avisos de configuração para registrar na subida. */
  warnings: string[];
}

/** Chave que o painel aceita para qualquer loja no modo demonstração. */
export const DEMO_STORE_KEY = 'demo';

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
  GOLDEN_HOURS_JSON: optionalText,
  STORE_KEYS_JSON: optionalText,
  AUTH_MODE: optionalText.pipe(z.enum(['dev', 'supabase']).optional()),
});

const polygonSchema = z
  .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
  .min(3);

const clockText = z.string().refine((text) => parseClock(text) !== null, 'use HH:MM');
const goldenWindowsSchema = z
  .array(
    z
      .object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        from: clockText,
        to: clockText,
      })
      .refine(
        (w) => (parseClock(w.from) ?? 0) < (parseClock(w.to) ?? 0),
        'from deve ser antes de to',
      ),
  )
  .max(14);

const storeKeysSchema = z.record(z.string().min(1), z.string().min(8));

function parseJson(name: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ConfigError(`${name} não é um JSON válido.`);
  }
}

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

  let goldenWindows: GoldenWindow[] = GOLDEN_WINDOWS.map((window) => ({
    ...window,
    days: [...window.days],
  }));
  if (raw.GOLDEN_HOURS_JSON) {
    const parsedWindows = goldenWindowsSchema.safeParse(
      parseJson('GOLDEN_HOURS_JSON', raw.GOLDEN_HOURS_JSON),
    );
    if (!parsedWindows.success) {
      throw new ConfigError(
        'GOLDEN_HOURS_JSON deve ser uma lista de { "days": [0 a 6], "from": "HH:MM", "to": "HH:MM" }, com from antes de to.',
      );
    }
    goldenWindows = parsedWindows.data;
  }

  let storeKeys: Record<string, string> = {};
  if (raw.STORE_KEYS_JSON) {
    const parsedKeys = storeKeysSchema.safeParse(parseJson('STORE_KEYS_JSON', raw.STORE_KEYS_JSON));
    if (!parsedKeys.success) {
      throw new ConfigError(
        'STORE_KEYS_JSON deve ser um objeto { "<idDaLoja>": "<chave com 8 ou mais caracteres>" }.',
      );
    }
    storeKeys = parsedKeys.data;
  }
  const demoStoreKey = authMode === 'dev' && Object.keys(storeKeys).length === 0;
  if (demoStoreKey) {
    warnings.push(
      `Painel da loja em demonstração: qualquer loja aceita a chave "${DEMO_STORE_KEY}". Defina STORE_KEYS_JSON para valer de verdade.`,
    );
  } else if (Object.keys(storeKeys).length === 0) {
    warnings.push('STORE_KEYS_JSON ausente: o painel da loja fica desligado.');
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
    goldenWindows,
    storeKeys,
    demoStoreKey,
    warnings,
  };
}

/** Polígono padrão quando não há configuração: aproximado, a confirmar em campo. */
export const DEFAULT_MALL_AREA: readonly LatLng[] = MALL_AREA_APPROX;
