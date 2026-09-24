import dotenv from 'dotenv';
import { ASSISTANT_NAME, buildAssistant } from '../vapi/assistantConfig';

// Idempotent provisioning: creates or updates the Vapi assistant, then ensures a phone number points at it.
// Usage: npm run vapi:setup   (reads VAPI_API_KEY, PUBLIC_BASE_URL, VAPI_WEBHOOK_SECRET from .env)

dotenv.config({ quiet: true });

const VAPI = 'https://api.vapi.ai';

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const requireEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required env var ${key}`);
  return value;
};

const vapi = async <T>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${VAPI}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi ${method} ${path} failed (${res.status}): ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
};

type Assistant = { id: string; name?: string };
type PhoneNumber = { id: string; number?: string; assistantId?: string; status?: string };

const main = async (): Promise<void> => {
  const apiKey = requireEnv('VAPI_API_KEY');
  const baseUrl = requireEnv('PUBLIC_BASE_URL').replace(/\/+$/, '');
  const assistant = buildAssistant({
    webhookUrl: `${baseUrl}/vapi/webhook`,
    webhookSecret: requireEnv('VAPI_WEBHOOK_SECRET'),
    model: process.env.VAPI_MODEL ?? 'gpt-4.1',
    voiceId: process.env.VAPI_VOICE_ID ?? 'Elliot',
    transcriberLanguage: process.env.VAPI_TRANSCRIBER_LANGUAGE ?? 'multi',
  });

  const existing = (await vapi<Assistant[]>(apiKey, 'GET', '/assistant?limit=100')).find((a) => a.name === ASSISTANT_NAME);
  const saved = existing
    ? await vapi<Assistant>(apiKey, 'PATCH', `/assistant/${existing.id}`, assistant)
    : await vapi<Assistant>(apiKey, 'POST', '/assistant', assistant);
  out(`Assistant ${existing ? 'updated' : 'created'}: ${saved.id}`);

  const numbers = await vapi<PhoneNumber[]>(apiKey, 'GET', '/phone-number?limit=100');
  const attached = numbers.find((n) => n.assistantId === saved.id);
  if (attached) {
    out(`Phone number already attached: ${attached.number ?? attached.id}`);
    return;
  }
  const areaCode = process.env.VAPI_PHONE_AREA_CODE;
  if (!areaCode) {
    out('No phone number attached. Set VAPI_PHONE_AREA_CODE (e.g. 415) and re-run to provision a free Vapi number.');
    return;
  }
  const created = await vapi<PhoneNumber>(apiKey, 'POST', '/phone-number', {
    provider: 'vapi',
    numberDesiredAreaCode: areaCode,
    assistantId: saved.id,
    name: 'Patient Registration Line',
  });
  out(`Phone number provisioned: ${created.number ?? `(pending, id ${created.id}, status ${created.status ?? 'unknown'})`}`);
};

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
