import { RotateCcw } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isoInputToUsDate, usDateToIsoInput } from '@/lib/format';
import type { PatientFilters } from '@/lib/types';

type FiltersBarProps = {
  filters: PatientFilters;
  onChange: (filters: PatientFilters) => void;
};

export const FiltersBar = ({ filters, onChange }: FiltersBarProps): React.JSX.Element => {
  const hasFilters = Boolean(filters.last_name || filters.date_of_birth || filters.phone_number);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-last-name">Last name</Label>
        <Input
          id="filter-last-name"
          placeholder="Rivera"
          value={filters.last_name ?? ''}
          onChange={(e) => onChange({ ...filters, last_name: e.target.value || undefined })}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-dob">Date of birth</Label>
        <Input
          id="filter-dob"
          type="date"
          value={filters.date_of_birth ? usDateToIsoInput(filters.date_of_birth) : ''}
          onChange={(e) => onChange({ ...filters, date_of_birth: e.target.value ? (isoInputToUsDate(e.target.value) ?? undefined) : undefined })}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-phone">Phone number</Label>
        <Input
          id="filter-phone"
          placeholder="4155550142"
          value={filters.phone_number ?? ''}
          onChange={(e) => onChange({ ...filters, phone_number: e.target.value || undefined })}
          className="w-40"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset filters
        </Button>
      )}
    </div>
  );
};
