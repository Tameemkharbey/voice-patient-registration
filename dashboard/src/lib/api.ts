import type {
  ApiEnvelope,
  ApiError,
  CallLog,
  CallSummary,
  Patient,
  PatientFilters,
  UpdatePatientInput,
} from './types';

export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: ApiError['details'];
  readonly status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiRequestError(0, { code: 'NETWORK_ERROR', message: 'Unable to reach the server. Check your connection.' });
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiRequestError(response.status, { code: 'PARSE_ERROR', message: 'Received an unreadable response from the server.' });
  }

  if (envelope.error) throw new ApiRequestError(response.status, envelope.error);
  return envelope.data;
};

const toQuery = (filters: PatientFilters): string => {
  const params = new URLSearchParams();
  if (filters.last_name) params.set('last_name', filters.last_name);
  if (filters.date_of_birth) params.set('date_of_birth', filters.date_of_birth);
  if (filters.phone_number) params.set('phone_number', filters.phone_number);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const api = {
  health: () => request<{ status: string }>('/health'),
  listPatients: (filters: PatientFilters = {}) => request<Patient[]>(`/patients${toQuery(filters)}`),
  getPatient: (id: string) => request<Patient>(`/patients/${id}`),
  getPatientCalls: (id: string) => request<CallLog[]>(`/patients/${id}/calls`),
  listCalls: (limit = 50) => request<CallSummary[]>(`/calls?limit=${limit}`),
  getCall: (callId: string) => request<CallLog>(`/calls/${encodeURIComponent(callId)}`),
  updatePatient: (id: string, input: UpdatePatientInput) =>
    request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePatient: (id: string) =>
    request<{ patient_id: string; deleted_at: string }>(`/patients/${id}`, { method: 'DELETE' }),
};
