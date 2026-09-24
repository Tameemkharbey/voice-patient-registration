export type Patient = {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // MM/DD/YYYY
  sex: string;
  phone_number: string; // 10 digits
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
};

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

export type FieldError = { field: string; message: string };

export type ApiError = { code: string; message: string; details?: FieldError[] };

export type ApiEnvelope<T> = { data: T; error: null } | { data: null; error: ApiError };

export type PatientFilters = {
  last_name?: string | undefined;
  date_of_birth?: string | undefined;
  phone_number?: string | undefined;
};

export type UpdatePatientInput = Partial<
  Omit<Patient, 'patient_id' | 'created_at' | 'updated_at'>
>;
