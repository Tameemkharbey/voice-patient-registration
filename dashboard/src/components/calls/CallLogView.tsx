import type * as React from 'react';
import { useMemo, useState } from 'react';
import { CallDetailSheet } from './CallDetailSheet';
import { CallListItem } from './CallListItem';
import { CallsSkeleton } from './CallsSkeleton';
import { OUTCOME_FILTERS } from './CallOutcomeBadge';
import { ErrorState } from '@/components/patients/ErrorState';
import { PatientDetailSheet } from '@/components/patients/PatientDetailSheet';
import { Button } from '@/components/ui/button';
import { useCalls } from '@/hooks/useCalls';
import { cn } from '@/lib/utils';
import type { CallOutcome, CallSummary } from '@/lib/types';

const CALL_LOG_LIMIT = 100;

type OutcomeFilterKey = 'all' | CallOutcome | 'none';

export const CallLogView = (): React.JSX.Element => {
  const { calls, loading, error, justAddedIds, refetch } = useCalls(CALL_LOG_LIMIT);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilterKey>('all');
  const [selectedCall, setSelectedCall] = useState<CallSummary | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const visibleCalls = useMemo(() => {
    if (outcomeFilter === 'all') return calls;
    if (outcomeFilter === 'none') return calls.filter((c) => !c.outcome && !c.patient_id);
    return calls.filter((c) => c.outcome === outcomeFilter);
  }, [calls, outcomeFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {OUTCOME_FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={outcomeFilter === key ? 'default' : 'outline'}
            className={cn('rounded-full')}
            onClick={() => setOutcomeFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <CallsSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : visibleCalls.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No calls match this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleCalls.map((call) => (
            <CallListItem
              key={call.call_id}
              call={call}
              isNew={justAddedIds.has(call.call_id)}
              onOpenCall={setSelectedCall}
              onOpenPatient={setSelectedPatientId}
            />
          ))}
        </div>
      )}

      <CallDetailSheet
        callId={selectedCall?.call_id ?? null}
        patientName={selectedCall?.patient_name}
        onOpenChange={(open) => !open && setSelectedCall(null)}
        onOpenPatient={(patientId) => {
          setSelectedCall(null);
          setSelectedPatientId(patientId);
        }}
      />

      <PatientDetailSheet
        patientId={selectedPatientId}
        onOpenChange={(open) => !open && setSelectedPatientId(null)}
        onPatientUpdated={() => undefined}
        onPatientDeleted={() => setSelectedPatientId(null)}
      />
    </div>
  );
};
