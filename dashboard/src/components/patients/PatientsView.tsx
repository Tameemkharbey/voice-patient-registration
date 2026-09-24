import type * as React from 'react';
import { useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { FiltersBar } from './FiltersBar';
import { PatientDetailSheet } from './PatientDetailSheet';
import { PatientTable } from './PatientTable';
import { StatCards } from './StatCards';
import { TableSkeleton } from './TableSkeleton';
import { usePatients } from '@/hooks/usePatients';
import type { PatientFilters } from '@/lib/types';

type PatientsViewProps = {
  search: string;
};

export const PatientsView = ({ search }: PatientsViewProps): React.JSX.Element => {
  const [filters, setFilters] = useState<PatientFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { patients, loading, refreshing, error, refetch } = usePatients(filters);

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
      <StatCards patients={patients} />

      <FiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : visiblePatients.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onResetFilters={() => setFilters({})} />
      ) : (
        <div className="relative">
          {refreshing && (
            <div className="absolute -top-3 right-0 text-[11px] text-muted-foreground">Refreshing…</div>
          )}
          <PatientTable patients={visiblePatients} onSelect={(p) => setSelectedId(p.patient_id)} />
        </div>
      )}

      <PatientDetailSheet
        patientId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onPatientUpdated={() => refetch()}
        onPatientDeleted={() => {
          setSelectedId(null);
          refetch();
        }}
      />
    </div>
  );
};
