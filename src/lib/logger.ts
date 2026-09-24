// Structured JSON-lines logger to stdout/stderr (Railway captures both).
type Level = 'info' | 'warn' | 'error';

const write = (level: Level, msg: string, meta: Record<string, unknown> = {}): void => {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta });
  (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
};

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
