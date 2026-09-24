import { useCallback, useEffect, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import type { CallLog } from '@/lib/types';

type State = {
  call: CallLog | null;
  loading: boolean;
  error: string | null;
};

export const useCallDetail = (callId: string | null) => {
  const [state, setState] = useState<State>({ call: null, loading: false, error: null });

  const load = useCallback(async (id: string) => {
    setState({ call: null, loading: true, error: null });
    try {
      const call = await api.getCall(id);
      setState({ call, loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load call details.';
      setState({ call: null, loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    if (callId) void load(callId);
  }, [callId, load]);

  const refetch = useCallback(() => {
    if (callId) void load(callId);
  }, [callId, load]);

  return { ...state, refetch };
};
