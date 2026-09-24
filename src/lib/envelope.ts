import type { Response } from 'express';
import type { FieldError } from './errors';

// Every API response uses the same shape: { data, error }.
export type ApiError = { code: string; message: string; details?: FieldError[] };

export const sendData = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ data, error: null });
};

export const sendError = (res: Response, status: number, error: ApiError): void => {
  res.status(status).json({ data: null, error });
};
