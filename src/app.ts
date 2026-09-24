import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { config } from './config/env';
import { createCallLogRepository } from './db/callLogRepository';
import type { Database } from './db/connection';
import { createPatientRepository } from './db/patientRepository';
import { sendData } from './lib/envelope';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { patientsRouter } from './routes/patients';
import { createPatientService } from './services/patientService';
import { vapiRouter } from './vapi/webhook';

export const createApp = (db: Database, vapiSecret: string = config.vapiWebhookSecret): Express => {
  const patients = createPatientService(createPatientRepository(db));
  const calls = createCallLogRepository(db);
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  // Vapi end-of-call reports carry the full message history and routinely exceed 100kb.
  app.use('/vapi', express.json({ limit: '5mb' }), vapiRouter(patients, calls, vapiSecret));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => sendData(res, { status: 'ok' }));
  app.use('/patients', patientsRouter(patients, calls));

  // Serve the built dashboard SPA when present; absent in test/build environments without a dashboard build.
  const dashboardDist = path.resolve(__dirname, '../dashboard/dist');
  if (fs.existsSync(dashboardDist)) {
    app.get('/', (_req, res) => res.redirect('/dashboard/'));
    app.use('/dashboard', express.static(dashboardDist));
    app.get('/dashboard/*splat', (_req, res) => res.sendFile(path.join(dashboardDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
