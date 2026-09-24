import type { Database } from './connection';

export type CallOutcome = 'registered' | 'updated' | 'existing';

export type CallLog = {
  call_id: string;
  patient_id: string | null;
  caller_number: string | null;
  outcome: CallOutcome | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  summary: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
};

// List view: no transcript (can be large), plus the linked patient's name for display.
export type CallSummary = Omit<CallLog, 'transcript'> & { patient_name: string | null };

export type CallReport = {
  caller_number: string | null;
  ended_reason: string | null;
  summary: string | null;
  transcript: string | null;
  duration_seconds: number | null;
};

const SUMMARY_COLUMNS = `
  c.call_id, c.patient_id, c.caller_number, c.outcome, c.duration_seconds, c.ended_reason, c.summary,
  c.created_at, c.updated_at,
  CASE WHEN p.patient_id IS NULL THEN NULL ELSE p.first_name || ' ' || p.last_name END AS patient_name`;

// Upserts keep this idempotent: tool calls and the end-of-call report can arrive in any order or twice.
export const createCallLogRepository = (db: Database) => {
  const linkStmt = db.prepare(`
    INSERT INTO call_logs (call_id, patient_id, caller_number, outcome, created_at, updated_at)
    VALUES (:call_id, :patient_id, :caller_number, :outcome, :now, :now)
    ON CONFLICT (call_id) DO UPDATE SET
      patient_id = excluded.patient_id,
      outcome = excluded.outcome,
      caller_number = COALESCE(call_logs.caller_number, excluded.caller_number),
      updated_at = excluded.updated_at`);

  const reportStmt = db.prepare(`
    INSERT INTO call_logs (call_id, caller_number, ended_reason, summary, transcript, duration_seconds, created_at, updated_at)
    VALUES (:call_id, :caller_number, :ended_reason, :summary, :transcript, :duration_seconds, :now, :now)
    ON CONFLICT (call_id) DO UPDATE SET
      caller_number = COALESCE(excluded.caller_number, call_logs.caller_number),
      ended_reason = excluded.ended_reason,
      summary = excluded.summary,
      transcript = excluded.transcript,
      duration_seconds = excluded.duration_seconds,
      updated_at = excluded.updated_at`);

  const findByCallStmt = db.prepare('SELECT patient_id FROM call_logs WHERE call_id = ?');
  const findStmt = db.prepare('SELECT * FROM call_logs WHERE call_id = ?');
  const listForPatientStmt = db.prepare('SELECT * FROM call_logs WHERE patient_id = ? ORDER BY created_at DESC');
  const listRecentStmt = db.prepare(`
    SELECT ${SUMMARY_COLUMNS}
    FROM call_logs c LEFT JOIN patients p ON p.patient_id = c.patient_id AND p.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ?`);

  const linkPatient = (
    callId: string,
    patientId: string,
    callerNumber: string | null,
    outcome: CallOutcome,
    now: string,
  ): void => {
    linkStmt.run({ call_id: callId, patient_id: patientId, caller_number: callerNumber, outcome, now });
  };

  const saveReport = (callId: string, report: CallReport, now: string): void => {
    reportStmt.run({ call_id: callId, ...report, now });
  };

  const patientIdForCall = (callId: string): string | null => {
    const row = findByCallStmt.get(callId) as { patient_id: string | null } | undefined;
    return row?.patient_id ?? null;
  };

  const findById = (callId: string): CallLog | null => {
    const row = findStmt.get(callId);
    return row ? { ...(row as CallLog) } : null;
  };

  const listForPatient = (patientId: string): CallLog[] =>
    listForPatientStmt.all(patientId).map((row) => ({ ...(row as CallLog) }));

  const listRecent = (limit: number): CallSummary[] =>
    listRecentStmt.all(limit).map((row) => ({ ...(row as CallSummary) }));

  return { linkPatient, saveReport, patientIdForCall, findById, listForPatient, listRecent };
};

export type CallLogRepository = ReturnType<typeof createCallLogRepository>;
