import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { buildDeps } from './container.js';
import { consoleLogger } from './shared/logger.js';

/** Servidor local (`npm run dev -w @cde/api`). Lê `apps/api/.env` se existir. */
try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env: segue com as variáveis do ambiente.
}

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    consoleLogger.error(error.message);
    process.exit(1);
  }
  throw error;
}

for (const warning of config.warnings) consoleLogger.warn(warning);
const app = createApp(buildDeps(config));

serve({ fetch: app.fetch, port: config.port }, (info) => {
  consoleLogger.info(`API ouvindo em http://localhost:${info.port}`, {
    storage: config.storage,
    authMode: config.authMode,
  });
});
