import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const parsePort = (raw: string | undefined): number => {
  const port = Number(raw ?? 3000);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${raw}`);
  return port;
};

export const config = {
  port: parsePort(process.env.PORT),
  dbPath: process.env.DB_PATH ?? './data/patients.db',
  vapiWebhookSecret: process.env.VAPI_WEBHOOK_SECRET ?? '',
} as const;
