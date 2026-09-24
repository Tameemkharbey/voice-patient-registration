import { useCallback, useEffect, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import type { CallLog, Patient } from '@/lib/types';

type State = {
  patient: Patient | null;
  calls: CallLog[];
  loading: boolean;
  error: string | null;
};

export const usePatientDetail = (patientId: string | null) => {
  const [state, setState] = useState<State>({ patient: null, calls: [], loading: false, error: null });

  const load = useCallback(async (id: string) => {
    setState({ patient: null, calls: [], loading: true, error: null });
    try {
      const [patient, calls] = await Promise.all([api.getPatient(id), api.getPatientCalls(id)]);
      setState({ patient, calls, loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load patient details.';
      setState({ patient: null, calls: [], loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    if (patientId) void load(patientId);
  }, [patientId, load]);

  const refetch = useCallback(() => {
    if (patientId) void load(patientId);
  }, [patientId, load]);

  return { ...state, refetch };
};
