import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { PatientFilters, PatientRecord, PatientRepository } from '../db/patientRepository';
import { badRequest, notFound, unprocessable } from '../lib/errors';
import { log } from '../lib/logger';
import { isoToUsDate, normalizePhone, parseDate, sanitizeText } from '../validation/normalizers';
import {
  PATIENT_INPUT_FIELDS,
  createPatientSchema,
  toFieldErrors,
  updatePatientSchema,
} from '../validation/patientSchema';
import { zipMatchesState } from '../validation/zipRanges';

// Business rules live here so the REST routes and the Vapi tool handlers share one validation path.

export type Patient = Omit<PatientRecord, 'deleted_at'>;

const toApi = ({ deleted_at: _deleted, ...record }: PatientRecord): Patient => ({
  ...record,
  date_of_birth: isoToUsDate(record.date_of_birth),
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validate = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  if (!isPlainObject(input)) throw badRequest('Request body must be a JSON object');
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details = toFieldErrors(result.error);
  if (result.error.issues.some((i) => i.code === 'unrecognized_keys')) {
    throw badRequest('Request contains unrecognized fields', details);
  }
  throw unprocessable(details);
};

const nowIso = (): string => new Date().toISOString();

// Cross-field rule: a ZIP from another state is almost always a mishearing, so ask for it again.
const assertZipMatchesState = (zip: string, state: string): void => {
  if (!zipMatchesState(zip, state)) {
    throw unprocessable([{ field: 'zip_code', message: `zip_code ${zip} does not belong to state ${state}` }]);
  }
};

const parseFilters = (query: Record<string, unknown>): PatientFilters => {
  const single = (key: string): string | undefined => {
    const value = query[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw badRequest(`${key} must be provided once`);
    return sanitizeText(value);
  };
  const filters: PatientFilters = {};
  const lastName = single('last_name');
  const dob = single('date_of_birth');
  const phone = single('phone_number');
  if (lastName) filters.last_name = lastName;
  if (dob) {
    const iso = parseDate(dob);
    if (!iso) throw badRequest('date_of_birth filter must be MM/DD/YYYY or YYYY-MM-DD');
    filters.date_of_birth = iso;
  }
  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) throw badRequest('phone_number filter must be a valid 10-digit U.S. phone number');
    filters.phone_number = normalized;
  }
  return filters;
};

export const createPatientService = (repo: PatientRepository) => {
  const get = (id: string): Patient => {
    const record = repo.findById(id);
    if (!record) throw notFound('Patient');
    return toApi(record);
  };

  const list = (query: Record<string, unknown>): Patient[] => repo.list(parseFilters(query)).map(toApi);

  const findByPhone = (phone: string): Patient[] => {
    const normalized = normalizePhone(phone);
    if (!normalized) throw unprocessable([{ field: 'phone_number', message: 'phone_number must be a valid 10-digit U.S. phone number' }]);
    return repo.list({ phone_number: normalized }).map(toApi);
  };

  const create = (input: unknown): Patient => {
    const data = validate(createPatientSchema, input);
    assertZipMatchesState(data.zip_code, data.state);
    const timestamp = nowIso();
    const record: Omit<PatientRecord, 'deleted_at'> = {
      patient_id: randomUUID(),
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      sex: data.sex,
      phone_number: data.phone_number,
      email: data.email ?? null,
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2 ?? null,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      insurance_provider: data.insurance_provider ?? null,
      insurance_member_id: data.insurance_member_id ?? null,
      preferred_language: data.preferred_language ?? 'English',
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    repo.insert(record);
    const patient = get(record.patient_id);
    log.info('patient.created', { patient });
    return patient;
  };

  const update = (id: string, input: unknown): Patient => {
    const data = validate(updatePatientSchema, input);
    const changes = Object.fromEntries(
      PATIENT_INPUT_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field] ?? null]),
    );
    if (Object.keys(changes).length === 0) throw badRequest('Provide at least one field to update');
    if ('preferred_language' in changes && changes.preferred_language === null) changes.preferred_language = 'English';
    if (data.state !== undefined || data.zip_code !== undefined) {
      const current = repo.findById(id);
      if (!current) throw notFound('Patient');
      assertZipMatchesState(data.zip_code ?? current.zip_code, data.state ?? current.state);
    }
    if (!repo.update(id, changes, nowIso())) throw notFound('Patient');
    const patient = get(id);
    log.info('patient.updated', { patient_id: id, changed_fields: Object.keys(changes), patient });
    return patient;
  };

  const remove = (id: string): { patient_id: string; deleted_at: string } => {
    const deletedAt = nowIso();
    if (!repo.softDelete(id, deletedAt)) throw notFound('Patient');
    log.info('patient.deleted', { patient_id: id });
    return { patient_id: id, deleted_at: deletedAt };
  };

  return { get, list, findByPhone, create, update, remove };
};

export type PatientService = ReturnType<typeof createPatientService>;
