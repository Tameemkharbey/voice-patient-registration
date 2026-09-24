import express, { type Express } from 'express';
import type { Database } from './db/connection';
import { createPatientRepository } from './db/patientRepository';
import { sendData } from './lib/envelope';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { patientsRouter } from './routes/patients';
import { createPatientService } from './services/patientService';

export const createApp = (db: Database): Express => {
  const patients = createPatientService(createPatientRepository(db));
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => sendData(res, { status: 'ok' }));
  app.use('/patients', patientsRouter(patients));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
