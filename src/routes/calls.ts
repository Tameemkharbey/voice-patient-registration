import { Router } from 'express';
import type { CallLogRepository } from '../db/callLogRepository';
import { sendData } from '../lib/envelope';
import { badRequest, notFound } from '../lib/errors';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const parseLimit = (raw: unknown): number => {
  if (raw === undefined) return DEFAULT_LIMIT;
  const limit = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw badRequest(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
};

// Read-only call history written by the Vapi webhook: newest first, transcript only on the detail route.
export const callsRouter = (calls: CallLogRepository): Router => {
  const router = Router();

  router.get('/', (req, res) => sendData(res, calls.listRecent(parseLimit(req.query.limit))));
  router.get('/:callId', (req, res) => {
    const { callId } = req.params;
    if (!/^[\w-]{1,100}$/.test(callId)) throw badRequest('Invalid call id');
    const call = calls.findById(callId);
    if (!call) throw notFound('Call');
    sendData(res, call);
  });

  return router;
};
