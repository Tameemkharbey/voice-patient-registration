import { Router, type Request } from 'express';
import { sendData } from '../lib/envelope';
import { badRequest } from '../lib/errors';
import type { PatientService } from '../services/patientService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patientId = (req: Request<{ id: string }>): string => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) throw badRequest('Patient id must be a valid UUID');
  return id.toLowerCase();
};

export const patientsRouter = (service: PatientService): Router => {
  const router = Router();

  router.get('/', (req, res) => sendData(res, service.list(req.query)));
  router.get('/:id', (req, res) => sendData(res, service.get(patientId(req))));
  router.post('/', (req, res) => sendData(res, service.create(req.body), 201));
  router.put('/:id', (req, res) => sendData(res, service.update(patientId(req), req.body)));
  router.delete('/:id', (req, res) => sendData(res, service.remove(patientId(req))));

  return router;
};
