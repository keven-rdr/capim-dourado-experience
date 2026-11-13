import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { buildDeps } from './container.js';
import { consoleLogger } from './shared/logger.js';

/**
 * Entrada para a Vercel (função Node em `api/index.js`, que reexporta este módulo compilado).
 * Cada método HTTP vira um handler Web padrão (`Request` → `Response`).
 * NÃO TESTADO na Vercel: veja o README.
 */
const config = loadConfig();
for (const warning of config.warnings) consoleLogger.warn(warning);
const app = createApp(buildDeps(config));

const handler = (request: Request): Response | Promise<Response> => app.fetch(request);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
