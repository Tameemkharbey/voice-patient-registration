import type { RequestHandler } from 'express';
import { log } from '../lib/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    log.info('http.request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Number(process.hrtime.bigint() - started) / 1e6,
    });
  });
  next();
};
