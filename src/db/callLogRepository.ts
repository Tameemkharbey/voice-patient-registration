import type { Database } from './connection';

export type CallLog = {
  call_id: string;
  patient_id: string | null;
  caller_number: string | null;
  ended_reason: string | null;
  summary: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
};

export type CallReport = {
  caller_number: string | null;
  ended_reason: string | null;
  summary: string | null;
  transcript: string | null;
};

// Upserts keep this idempotent: tool calls and the end-of-call report can arrive in any order or twice.
export const createCallLogRepository = (db: Database) => {
  const linkStmt = db.prepare(`
    INSERT INTO call_logs (call_id, patient_id, caller_number, created_at, updated_at)
    VALUES (:call_id, :patient_id, :caller_number, :now, :now)
    ON CONFLICT (call_id) DO UPDATE SET
      patient_id = excluded.patient_id,
      caller_number = COALESCE(call_logs.caller_number, excluded.caller_number),
      updated_at = excluded.updated_at`);

  const reportStmt = db.prepare(`
    INSERT INTO call_logs (call_id, caller_number, ended_reason, summary, transcript, created_at, updated_at)
    VALUES (:call_id, :caller_number, :ended_reason, :summary, :transcript, :now, :now)
    ON CONFLICT (call_id) DO UPDATE SET
      caller_number = COALESCE(excluded.caller_number, call_logs.caller_number),
      ended_reason = excluded.ended_reason,
      summary = excluded.summary,
      transcript = excluded.transcript,
      updated_at = excluded.updated_at`);

  const findByCallStmt = db.prepare('SELECT patient_id FROM call_logs WHERE call_id = ?');
  const listForPatientStmt = db.prepare('SELECT * FROM call_logs WHERE patient_id = ? ORDER BY created_at DESC');

  const linkPatient = (callId: string, patientId: string, callerNumber: string | null, now: string): void => {
    linkStmt.run({ call_id: callId, patient_id: patientId, caller_number: callerNumber, now });
  };

  const saveReport = (callId: string, report: CallReport, now: string): void => {
    reportStmt.run({ call_id: callId, ...report, now });
  };

  const patientIdForCall = (callId: string): string | null => {
    const row = findByCallStmt.get(callId) as { patient_id: string | null } | undefined;
    return row?.patient_id ?? null;
  };

  const listForPatient = (patientId: string): CallLog[] =>
    listForPatientStmt.all(patientId).map((row) => ({ ...(row as CallLog) }));

  return { linkPatient, saveReport, patientIdForCall, listForPatient };
};

export type CallLogRepository = ReturnType<typeof createCallLogRepository>;
