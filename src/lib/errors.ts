export type FieldError = { field: string; message: string };

export type AppError = Error & {
  status: number;
  code: string;
  details?: FieldError[];
};

export const appError = (
  status: number,
  code: string,
  message: string,
  details?: FieldError[],
): AppError => Object.assign(new Error(message), { status, code, details });

export const isAppError = (err: unknown): err is AppError =>
  err instanceof Error && typeof (err as AppError).status === 'number' && typeof (err as AppError).code === 'string';

export const notFound = (what: string): AppError => appError(404, 'NOT_FOUND', `${what} not found`);
export const badRequest = (message: string, details?: FieldError[]): AppError =>
  appError(400, 'BAD_REQUEST', message, details);
export const unprocessable = (details: FieldError[]): AppError =>
  appError(422, 'VALIDATION_ERROR', 'One or more fields are invalid', details);
