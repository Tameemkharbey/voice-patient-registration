import type { CallLogRepository, CallOutcome } from '../db/callLogRepository';
import { isAppError } from '../lib/errors';
import { log } from '../lib/logger';
import type { Patient, PatientService } from '../services/patientService';
import { PATIENT_INPUT_FIELDS } from '../validation/patientSchema';

// Tool results are read by the LLM, not by a human: each carries a machine-readable `status`
// plus an `instruction` telling the agent exactly what to say or do next. This keeps error
// handling deterministic instead of relying on the model to interpret raw HTTP errors.

export type ToolContext = { callId: string | null; callerNumber: string | null };
export type ToolResult = { status: string; instruction: string } & Record<string, unknown>;
type Handler = (args: Record<string, unknown>, ctx: ToolContext) => ToolResult;

const summarize = (p: Patient) => ({
  patient_id: p.patient_id,
  first_name: p.first_name,
  last_name: p.last_name,
  date_of_birth: p.date_of_birth,
});

const pickPatientFields = (args: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(PATIENT_INPUT_FIELDS.filter((f) => args[f] !== undefined).map((f) => [f, args[f]]));

// Converts service errors into agent instructions; a DB failure must never become silence.
const handleFailure = (err: unknown, tool: string, ctx: ToolContext): ToolResult => {
  if (isAppError(err) && err.status === 422) {
    return {
      status: 'validation_error',
      errors: err.details ?? [],
      instruction:
        'Nothing was saved. Politely explain what was wrong in plain language, re-ask ONLY for the listed field(s), then call the tool again with the corrected values. Keep all other collected values.',
    };
  }
  if (isAppError(err) && err.status === 404) {
    return {
      status: 'not_found',
      instruction: 'That patient record no longer exists. Offer to register the caller as a new patient instead.',
    };
  }
  log.error('vapi.tool_failed', {
    tool,
    call_id: ctx.callId,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
  });
  return {
    status: 'system_error',
    instruction:
      'The record could NOT be saved because of a technical problem. Apologize briefly, clearly tell the caller their information was not saved, and offer to try once more; if it fails again, ask them to call back later. Never say it was saved.',
  };
};

const linkCall = (calls: CallLogRepository, ctx: ToolContext, patientId: string, outcome: CallOutcome): void => {
  if (!ctx.callId) return;
  try {
    calls.linkPatient(ctx.callId, patientId, ctx.callerNumber, outcome, new Date().toISOString());
  } catch (err) {
    // Linking is bookkeeping; the patient write already succeeded, so don't fail the caller over it.
    log.warn('vapi.call_link_failed', { call_id: ctx.callId, patient_id: patientId, error: String(err) });
  }
};

export const createToolHandlers = (patients: PatientService, calls: CallLogRepository): Record<string, Handler> => ({
  find_patient_by_phone: (args, ctx) => {
    const phone = typeof args.phone_number === 'string' && args.phone_number.trim() ? args.phone_number : ctx.callerNumber;
    if (!phone) {
      return { status: 'no_phone', instruction: 'No phone number is available yet. Continue the registration normally.' };
    }
    try {
      const matches = patients.findByPhone(phone);
      if (matches.length === 0) {
        return { status: 'not_found', instruction: 'No existing record. Continue with a new registration.' };
      }
      return {
        status: 'found',
        patients: matches.map(summarize),
        instruction:
          'Say: "It looks like we already have a record for <first name> <last name>. Would you like to update your information instead?" Before changing anything, confirm the caller\'s date of birth matches. If several records match, ask which person is calling. If they want a separate new registration, continue normally.',
      };
    } catch (err) {
      if (isAppError(err) && err.status === 422) {
        return { status: 'invalid_phone', instruction: 'That phone number is not valid. Continue normally; collect the number from the caller.' };
      }
      return handleFailure(err, 'find_patient_by_phone', ctx);
    }
  },

  create_patient: (args, ctx) => {
    const input = pickPatientFields(args);
    try {
      // Idempotency guard: a retried or duplicated tool call must not create a second record.
      if (typeof input.phone_number === 'string') {
        const existing = patients
          .findByPhone(input.phone_number)
          .find(
            (p) =>
              p.first_name.toLowerCase() === String(input.first_name ?? '').trim().toLowerCase() &&
              p.last_name.toLowerCase() === String(input.last_name ?? '').trim().toLowerCase(),
          );
        if (existing) {
          linkCall(calls, ctx, existing.patient_id, 'existing');
          return {
            status: 'already_exists',
            patient: summarize(existing),
            instruction:
              'A record with this name and phone number already exists, so no duplicate was created. Ask whether they want to update it; if yes, use update_patient with this patient_id.',
          };
        }
      }
      const patient = patients.create(input);
      linkCall(calls, ctx, patient.patient_id, 'registered');
      return {
        status: 'success',
        patient: summarize(patient),
        instruction: `Registration saved. Tell the caller they're all set, using their first name (${patient.first_name}), then close the call warmly.`,
      };
    } catch (err) {
      return handleFailure(err, 'create_patient', ctx);
    }
  },

  update_patient: (args, ctx) => {
    const patientId = typeof args.patient_id === 'string' ? args.patient_id.trim() : '';
    if (!patientId) {
      return { status: 'validation_error', instruction: 'patient_id is required. Call find_patient_by_phone first to get it.' };
    }
    try {
      const patient = patients.update(patientId, pickPatientFields(args));
      linkCall(calls, ctx, patient.patient_id, 'updated');
      return {
        status: 'success',
        patient: summarize(patient),
        instruction: `Update saved. Tell the caller their information is updated, using their first name (${patient.first_name}).`,
      };
    } catch (err) {
      if (isAppError(err) && err.status === 400) {
        return { status: 'validation_error', errors: err.details ?? [], instruction: `${err.message}. Fix the request and try again.` };
      }
      return handleFailure(err, 'update_patient', ctx);
    }
  },
});
