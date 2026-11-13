import { MALL_AREA_APPROX } from '@cde/shared';
import { describe, expect, it } from 'vitest';
import { ConfigError, DEV_QR_SECRET, loadConfig } from '../src/config/env.js';

const SUPABASE = {
  SUPABASE_URL: 'https://exemplo.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_exemplo',
};
const PROD = {
  NODE_ENV: 'production',
  QR_SECRET: 'x'.repeat(32),
  CORS_ORIGIN: 'https://app.exemplo',
};

describe('configuração', () => {
  it('zero configuração: memória, modo dev, segredo de desenvolvimento', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      storage: 'memory',
      authMode: 'dev',
      qrSecret: DEV_QR_SECRET,
      corsOrigins: '*',
      allowDemoQr: false,
      skipOpeningHours: false,
      mallAreaOverride: null,
      port: 8787,
    });
  });

  it('com Supabase, usa autenticação Supabase por padrão', () => {
    const config = loadConfig(SUPABASE);
    expect(config).toMatchObject({ storage: 'supabase', authMode: 'supabase' });
  });

  it('em produção nunca liga o modo dev sozinho', () => {
    expect(() => loadConfig(PROD)).toThrow(ConfigError);
    expect(loadConfig({ ...PROD, AUTH_MODE: 'dev' }).authMode).toBe('dev');
    expect(loadConfig({ ...PROD, ...SUPABASE }).authMode).toBe('supabase');
  });

  it('em produção exige QR_SECRET e CORS_ORIGIN', () => {
    expect(() => loadConfig({ ...PROD, ...SUPABASE, QR_SECRET: '' })).toThrow(/QR_SECRET/);
    expect(() => loadConfig({ ...PROD, ...SUPABASE, CORS_ORIGIN: '' })).toThrow(/CORS_ORIGIN/);
  });

  it('recusa configuração incoerente', () => {
    expect(() => loadConfig({ SUPABASE_URL: SUPABASE.SUPABASE_URL })).toThrow(ConfigError);
    expect(() => loadConfig({ AUTH_MODE: 'supabase' })).toThrow(ConfigError);
    expect(() => loadConfig({ QR_SECRET: 'curto' })).toThrow(ConfigError);
    expect(() => loadConfig({ MALL_AREA_JSON: '[{"lat":1}]' })).toThrow(ConfigError);
    expect(() => loadConfig({ MALL_AREA_JSON: 'não é json' })).toThrow(ConfigError);
  });

  it('lê flags, origens e polígono', () => {
    const config = loadConfig({
      ALLOW_DEMO_QR: 'true',
      SKIP_OPENING_HOURS: '1',
      CORS_ORIGIN: 'http://localhost:5173/, https://app.exemplo',
      MALL_AREA_JSON: JSON.stringify(MALL_AREA_APPROX),
      PORT: '3000',
    });
    expect(config.allowDemoQr).toBe(true);
    expect(config.skipOpeningHours).toBe(true);
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://app.exemplo']);
    expect(config.mallAreaOverride).toEqual(MALL_AREA_APPROX);
    expect(config.port).toBe(3000);
    expect(config.warnings.length).toBeGreaterThan(0);
  });
});
