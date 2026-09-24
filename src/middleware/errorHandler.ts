import type { ErrorRequestHandler, RequestHandler } from 'express';
import { sendError } from '../lib/envelope';
import { isAppError } from '../lib/errors';
import { log } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (isAppError(err)) {
    sendError(res, err.status, { code: err.code, message: err.message, ...(err.details && { details: err.details }) });
    return;
  }
  // body-parser signals malformed/oversized JSON with a `type` and `status`.
  const bodyError = err as { type?: string; status?: number };
  if (bodyError.type === 'entity.parse.failed') {
    sendError(res, 400, { code: 'BAD_REQUEST', message: 'Request body is not valid JSON' });
    return;
  }
  if (bodyError.type === 'entity.too.large') {
    sendError(res, 413, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' });
    return;
  }
  log.error('unhandled.error', {
    method: req.method,
    path: req.originalUrl,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
  });
  sendError(res, 500, { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
};
