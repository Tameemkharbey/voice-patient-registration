import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiRequestError, api } from '@/lib/api';
import type { CallSummary } from '@/lib/types';

const REFRESH_INTERVAL_MS = 15000;
const HIGHLIGHT_DURATION_MS = 3200;

type State = {
  calls: CallSummary[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const outcomeToastLabel = (call: CallSummary): string => {
  if (call.outcome === 'registered') return 'Registered';
  if (call.outcome === 'updated') return 'Updated';
  if (call.outcome === 'existing') return 'Returning caller';
  if (call.patient_id) return 'Linked';
  return 'No record saved';
};

export const useCalls = (limit: number) => {
  const [state, setState] = useState<State>({ calls: [], loading: true, refreshing: false, error: null });
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string> | null>(null);

  const load = useCallback(async (isBackground: boolean) => {
    setState((prev) => ({
      ...prev,
      loading: isBackground ? prev.loading : prev.calls.length === 0,
      refreshing: isBackground,
    }));
    try {
      const calls = await api.listCalls(limit);

      if (seenIdsRef.current) {
        const newOnes = calls.filter((c) => !seenIdsRef.current!.has(c.call_id));
        if (newOnes.length > 0) {
          setJustAddedIds((prev) => {
            const next = new Set(prev);
            newOnes.forEach((c) => next.add(c.call_id));
            return next;
          });
          newOnes.forEach((c) => toast.success(`Call ended: ${outcomeToastLabel(c)}`));
          setTimeout(() => {
            setJustAddedIds((prev) => {
              const next = new Set(prev);
              newOnes.forEach((c) => next.delete(c.call_id));
              return next;
            });
          }, HIGHLIGHT_DURATION_MS);
        }
      }
      seenIdsRef.current = new Set(calls.map((c) => c.call_id));

      setState({ calls, loading: false, refreshing: false, error: null });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load calls.';
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: message }));
    }
  }, [limit]);

  useEffect(() => {
    seenIdsRef.current = null;
    void load(false);
    const interval = setInterval(() => void load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const refetch = useCallback(() => load(false), [load]);

  return { ...state, justAddedIds, refetch };
};
