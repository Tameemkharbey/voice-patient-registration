import type { SQLInputValue } from 'node:sqlite';
import type { Database } from './connection';

export type PatientRecord = {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO YYYY-MM-DD
  sex: string;
  phone_number: string;
  email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  preferred_language: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PatientFilters = { last_name?: string; date_of_birth?: string; phone_number?: string };

type Row = Record<string, SQLInputValue>;

// Columns a caller may write; everything else (ids, timestamps) is owned by the repository.
const WRITABLE_COLUMNS = new Set([
  'first_name', 'last_name', 'date_of_birth', 'sex', 'phone_number', 'email',
  'address_line_1', 'address_line_2', 'city', 'state', 'zip_code',
  'insurance_provider', 'insurance_member_id', 'preferred_language',
  'emergency_contact_name', 'emergency_contact_phone',
]);

const INSERT_COLUMNS = ['patient_id', ...WRITABLE_COLUMNS, 'created_at', 'updated_at'];

const asRecord = (row: unknown): PatientRecord | null => (row ? ({ ...(row as PatientRecord) }) : null);

export const createPatientRepository = (db: Database) => {
  const insertStmt = db.prepare(
    `INSERT INTO patients (${INSERT_COLUMNS.join(', ')}) VALUES (${INSERT_COLUMNS.map((c) => `:${c}`).join(', ')})`,
  );
  const findByIdStmt = db.prepare('SELECT * FROM patients WHERE patient_id = ? AND deleted_at IS NULL');
  const softDeleteStmt = db.prepare(
    'UPDATE patients SET deleted_at = :now, updated_at = :now WHERE patient_id = :id AND deleted_at IS NULL',
  );

  const insert = (record: Omit<PatientRecord, 'deleted_at'>): void => {
    insertStmt.run(record as unknown as Row);
  };

  const findById = (id: string): PatientRecord | null => asRecord(findByIdStmt.get(id));

  const list = (filters: PatientFilters): PatientRecord[] => {
    const clauses = ['deleted_at IS NULL'];
    const params: Row = {};
    if (filters.last_name !== undefined) {
      clauses.push('last_name = :last_name COLLATE NOCASE');
      params.last_name = filters.last_name;
    }
    if (filters.date_of_birth !== undefined) {
      clauses.push('date_of_birth = :date_of_birth');
      params.date_of_birth = filters.date_of_birth;
    }
    if (filters.phone_number !== undefined) {
      clauses.push('phone_number = :phone_number');
      params.phone_number = filters.phone_number;
    }
    const sql = `SELECT * FROM patients WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`;
    return db.prepare(sql).all(params).map((row) => asRecord(row) as PatientRecord);
  };

  // Returns false when no live row matched (missing or soft-deleted).
  const update = (id: string, changes: Record<string, SQLInputValue>, now: string): boolean => {
    const columns = Object.keys(changes).filter((c) => WRITABLE_COLUMNS.has(c));
    const assignments = [...columns.map((c) => `${c} = :${c}`), 'updated_at = :updated_at'];
    const params: Row = { updated_at: now, patient_id: id };
    for (const c of columns) params[c] = changes[c] ?? null;
    const result = db
      .prepare(`UPDATE patients SET ${assignments.join(', ')} WHERE patient_id = :patient_id AND deleted_at IS NULL`)
      .run(params);
    return result.changes > 0;
  };

  const softDelete = (id: string, now: string): boolean => softDeleteStmt.run({ id, now }).changes > 0;

  return { insert, findById, list, update, softDelete };
};

export type PatientRepository = ReturnType<typeof createPatientRepository>;
