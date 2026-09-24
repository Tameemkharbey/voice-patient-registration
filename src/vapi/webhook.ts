import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type RequestHandler } from 'express';
import type { CallLogRepository } from '../db/callLogRepository';
import { sendError } from '../lib/envelope';
import { log } from '../lib/logger';
import type { PatientService } from '../services/patientService';
import { createToolHandlers, type ToolContext } from './toolHandlers';

// Vapi server-message webhook. Vapi owns telephony/STT/TTS/LLM; this adapter only translates
// its tool calls into service-layer calls and records end-of-call reports.

// Vapi documents `name` + `parameters`; OpenAI-style `function.{name,arguments}` is also accepted.
type VapiToolCall = { id?: string; name?: string; parameters?: unknown; function?: { name?: string; arguments?: unknown } };
type VapiMessage = {
  type?: string;
  call?: { id?: string; customer?: { number?: string } };
  customer?: { number?: string };
  toolCallList?: VapiToolCall[];
  toolWithToolCallList?: { toolCall?: VapiToolCall }[];
  endedReason?: string;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  transcript?: string;
  analysis?: { summary?: string };
  artifact?: { transcript?: string };
};

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// Accepts the shared secret via X-Vapi-Secret or a Bearer token; open if no secret is configured (local dev).
const verifySecret =
  (secret: string): RequestHandler =>
  (req, res, next) => {
    if (!secret) return next();
    const header = req.get('x-vapi-secret') ?? req.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (safeEqual(header, secret)) return next();
    log.warn('vapi.unauthorized', { ip: req.ip });
    sendError(res, 401, { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' });
  };

const parseArgs = (raw: unknown): Record<string, unknown> => {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
};

const contextOf = (message: VapiMessage): ToolContext => ({
  callId: message.call?.id ?? null,
  callerNumber: message.call?.customer?.number ?? message.customer?.number ?? null,
});

const durationOf = (message: VapiMessage): number | null => {
  if (typeof message.durationSeconds === 'number') return message.durationSeconds;
  const started = Date.parse(message.startedAt ?? '');
  const ended = Date.parse(message.endedAt ?? '');
  return Number.isNaN(started) || Number.isNaN(ended) ? null : Math.max(0, (ended - started) / 1000);
};

const toolCallsOf = (message: VapiMessage): VapiToolCall[] =>
  message.toolCallList ?? message.toolWithToolCallList?.flatMap((t) => (t.toolCall ? [t.toolCall] : [])) ?? [];

export const vapiRouter = (patients: PatientService, calls: CallLogRepository, secret: string): Router => {
  const handlers = createToolHandlers(patients, calls);
  const router = Router();

  router.post('/webhook', verifySecret(secret), (req: Request, res) => {
    const message: VapiMessage = (req.body as { message?: VapiMessage } | undefined)?.message ?? {};
    const ctx = contextOf(message);

    if (message.type === 'tool-calls') {
      const results = toolCallsOf(message).map((call) => {
        const name = call.name ?? call.function?.name ?? '';
        const args = parseArgs(call.parameters ?? call.function?.arguments);
        const handler = handlers[name];
        const result = handler
          ? handler(args, ctx)
          : { status: 'unknown_tool', instruction: 'That action is unavailable. Continue the conversation without it.' };
        log.info('vapi.tool_call', { call_id: ctx.callId, tool: name, args, result_status: result.status });
        return { toolCallId: call.id ?? '', result: JSON.stringify(result) };
      });
      res.json({ results });
      return;
    }

    if (message.type === 'end-of-call-report') {
      const report = {
        caller_number: ctx.callerNumber,
        ended_reason: message.endedReason ?? null,
        summary: message.analysis?.summary ?? message.summary ?? null,
        transcript: message.artifact?.transcript ?? message.transcript ?? null,
        duration_seconds: durationOf(message),
      };
      const patientId = ctx.callId ? calls.patientIdForCall(ctx.callId) : null;
      if (ctx.callId) calls.saveReport(ctx.callId, report, new Date().toISOString());
      // A call that ends with no linked patient covers the dropped-call case: logged, nothing half-saved.
      log.info('vapi.call_ended', {
        call_id: ctx.callId,
        ended_reason: report.ended_reason,
        registered_patient: patientId ? patients.list({}).find((p) => p.patient_id === patientId) ?? null : null,
        outcome: patientId ? 'patient_saved' : 'no_record_saved',
        summary: report.summary,
        transcript: report.transcript,
      });
      res.json({});
      return;
    }

    log.info('vapi.event', { type: message.type ?? 'unknown', call_id: ctx.callId });
    res.json({});
  });

  return router;
};
