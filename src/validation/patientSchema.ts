import { z } from 'zod';
import type { FieldError } from '../lib/errors';
import {
  SEX_VALUES,
  normalizePhone,
  normalizeSex,
  normalizeZip,
  parseDate,
  sanitizeText,
  todayIsoUtc,
} from './normalizers';
import { toStateCode } from './usStates';

// Letters (any script), joined by single hyphens, apostrophes or spaces: O'Brien, Mary-Jane, De La Cruz.
const NAME_RE = /^\p{L}+(?:['\- ]\p{L}+)*$/u;
const LANGUAGE_RE = /^\p{L}+(?:[ -]\p{L}+)*$/u;

const clean = (v: unknown): unknown => (typeof v === 'string' ? sanitizeText(v) : v);

const str = (field: string) =>
  z.string({ required_error: `${field} is required`, invalid_type_error: `${field} must be text` });

const text = (field: string, max: number) =>
  z.preprocess(clean, str(field).min(1, `${field} is required`).max(max, `${field} must be at most ${max} characters`));

const name = (field: string, max: number) =>
  z.preprocess(
    clean,
    str(field)
      .min(1, `${field} is required`)
      .max(max, `${field} must be at most ${max} characters`)
      .regex(NAME_RE, `${field} may only contain letters, hyphens, apostrophes and spaces`),
  );

// Runs a normalizer after sanitizing; a null result becomes a field-specific validation issue.
const normalized = <T>(field: string, fn: (v: string) => T | null, message: string) =>
  z.preprocess(
    clean,
    str(field).transform((value, ctx) => {
      const result = fn(value);
      if (result === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return result;
    }),
  );

const dateOfBirth = z.preprocess(
  clean,
  str('date_of_birth').transform((value, ctx) => {
    const iso = parseDate(value);
    if (!iso) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date_of_birth must be a real date in MM/DD/YYYY format' });
      return z.NEVER;
    }
    if (iso > todayIsoUtc()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date_of_birth cannot be in the future' });
      return z.NEVER;
    }
    if (iso < '1900-01-01') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date_of_birth must be on or after 01/01/1900' });
      return z.NEVER;
    }
    return iso;
  }),
);

const phone = (field: string) =>
  normalized(field, normalizePhone, `${field} must be a valid 10-digit U.S. phone number`);

const email = z.preprocess(
  clean,
  str('email').max(254).email('email must be a valid email address').transform((v) => v.toLowerCase()),
);

const memberId = z.preprocess(
  clean,
  str('insurance_member_id')
    .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
    .pipe(
      z
        .string()
        .min(1, 'insurance_member_id is required')
        .max(30, 'insurance_member_id must be at most 30 characters')
        .regex(/^[A-Z0-9]+$/, 'insurance_member_id must be letters and numbers only'),
    ),
);

const language = z.preprocess(
  clean,
  str('preferred_language')
    .min(1)
    .max(50, 'preferred_language must be at most 50 characters')
    .regex(LANGUAGE_RE, 'preferred_language must be a language name'),
);

// Optional fields: missing -> untouched, null or "" -> explicitly cleared.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && sanitizeText(v) === '' ? null : v), schema.nullable()).optional();

const requiredFields = {
  first_name: name('first_name', 50),
  last_name: name('last_name', 50),
  date_of_birth: dateOfBirth,
  sex: normalized('sex', normalizeSex, `sex must be one of: ${SEX_VALUES.join(', ')}`),
  phone_number: phone('phone_number'),
  address_line_1: text('address_line_1', 100),
  city: text('city', 100),
  state: normalized('state', toStateCode, 'state must be a valid 2-letter U.S. state abbreviation'),
  zip_code: normalized('zip_code', normalizeZip, 'zip_code must be 5 digits or ZIP+4 (12345-6789)'),
};

const optionalFields = {
  email: optional(email),
  address_line_2: optional(text('address_line_2', 100)),
  insurance_provider: optional(text('insurance_provider', 100)),
  insurance_member_id: optional(memberId),
  preferred_language: optional(language),
  emergency_contact_name: optional(name('emergency_contact_name', 100)),
  emergency_contact_phone: optional(phone('emergency_contact_phone')),
};

export const createPatientSchema = z.object({ ...requiredFields, ...optionalFields }).strict();
export const updatePatientSchema = z.object(requiredFields).partial().extend(optionalFields).strict();

export type CreatePatientInput = z.output<typeof createPatientSchema>;
export type UpdatePatientInput = z.output<typeof updatePatientSchema>;

export const PATIENT_INPUT_FIELDS = Object.keys(createPatientSchema.shape) as (keyof CreatePatientInput)[];

export const toFieldErrors = (error: z.ZodError): FieldError[] =>
  error.issues.flatMap((issue): FieldError[] => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return issue.keys.map((key) => ({ field: key, message: `${key} is not a recognized field` }));
    }
    return [{ field: issue.path.join('.') || 'body', message: issue.message }];
  });
