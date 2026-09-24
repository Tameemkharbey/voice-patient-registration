import { createApp } from './app';
import { config } from './config/env';
import { openDatabase } from './db/connection';
import { log } from './lib/logger';

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
