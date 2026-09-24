import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import type { Patient, PatientFilters } from '@/lib/types';

const REFRESH_INTERVAL_MS = 15000;

type State = {
  patients: Patient[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export const usePatients = (filters: PatientFilters) => {
  const [state, setState] = useState<State>({ patients: [], loading: true, refreshing: false, error: null });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (isBackground: boolean) => {
    setState((prev) => ({
      ...prev,
      loading: isBackground ? prev.loading : prev.patients.length === 0,
      refreshing: isBackground,
    }));
    try {
      const patients = await api.listPatients(filtersRef.current);
      setState({ patients, loading: false, refreshing: false, error: null });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load patients.';
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void load(false);
    const interval = setInterval(() => void load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, filters.last_name, filters.date_of_birth, filters.phone_number]);

  const refetch = useCallback(() => load(false), [load]);

  return { ...state, refetch };
};
