import type * as React from 'react';
import { useMemo, useState } from 'react';
import { CallDetailSheet } from '@/components/calls/CallDetailSheet';
import { RecentCallsPanel } from '@/components/calls/RecentCallsPanel';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { FiltersBar } from './FiltersBar';
import { PatientDetailSheet } from './PatientDetailSheet';
import { PatientTable } from './PatientTable';
import { StatCards } from './StatCards';
import { TableSkeleton } from './TableSkeleton';
import { VoiceCallBanner } from './VoiceCallBanner';
import { useCalls } from '@/hooks/useCalls';
import { usePatients } from '@/hooks/usePatients';
import type { CallSummary, PatientFilters } from '@/lib/types';

const CALLS_LIMIT = 100;

export const PatientsView = (): React.JSX.Element => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PatientFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallSummary | null>(null);

  const { patients, loading, refreshing, error, refetch, justAddedIds } = usePatients(filters);
  const { calls, loading: callsLoading, error: callsError, justAddedIds: newCallIds } = useCalls(CALLS_LIMIT);

  const visiblePatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(query) || p.phone_number.includes(query.replace(/\D/g, ''));
    });
  }, [patients, search]);

  const hasFilters = Boolean(search.trim() || filters.last_name || filters.date_of_birth || filters.phone_number);

  return (
    <div className="flex flex-col gap-6">
      <VoiceCallBanner />

      <StatCards patients={patients} calls={calls} />

      <FiltersBar search={search} onSearchChange={setSearch} filters={filters} onFiltersChange={setFilters} refreshing={refreshing} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : visiblePatients.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onResetFilters={() => setFilters({})} />
          ) : (
            <PatientTable patients={visiblePatients} onSelect={(p) => setSelectedId(p.patient_id)} justAddedIds={justAddedIds} />
          )}
        </div>

        <div className="xl:col-span-1">
          <RecentCallsPanel
            calls={calls}
            loading={callsLoading}
            error={callsError}
            justAddedIds={newCallIds}
            onOpenCall={setSelectedCall}
            onOpenPatient={setSelectedId}
          />
        </div>
      </div>

      <PatientDetailSheet
        patientId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onPatientUpdated={() => refetch()}
        onPatientDeleted={() => {
          setSelectedId(null);
          refetch();
        }}
      />

      <CallDetailSheet
        callId={selectedCall?.call_id ?? null}
        patientName={selectedCall?.patient_name}
        onOpenChange={(open) => !open && setSelectedCall(null)}
        onOpenPatient={(patientId) => {
          setSelectedCall(null);
          setSelectedId(patientId);
        }}
      />
    </div>
  );
};
