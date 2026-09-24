import { createApp } from './app';
import { config } from './config/env';
import { openDatabase } from './db/connection';
import { log } from './lib/logger';

// Without a secret the Vapi webhook is unauthenticated; that is only acceptable for local development.
const isDeployed = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT_NAME);
if (isDeployed && !config.vapiWebhookSecret) {
  log.error('config.missing_secret', { variable: 'VAPI_WEBHOOK_SECRET' });
  process.exit(1);
}

const db = openDatabase(config.dbPath);
const server = createApp(db).listen(config.port, () => {
  log.info('server.started', { port: config.port, db_path: config.dbPath });
});

const shutdown = (signal: string): void => {
  log.info('server.stopping', { signal });
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
