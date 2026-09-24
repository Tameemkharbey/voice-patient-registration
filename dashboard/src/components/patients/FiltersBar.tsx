import { AnimatePresence, motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PatientFilters } from '@/lib/types';

const DEBOUNCE_MS = 400;
const COMPLETE_DOB = /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;

type FiltersBarProps = {
  search: string;
  onSearchChange: (search: string) => void;
  filters: PatientFilters;
  onFiltersChange: (filters: PatientFilters) => void;
  refreshing?: boolean;
};

type ActiveBadge = { key: string; label: string; onRemove: () => void };

export const FiltersBar = ({ search, onSearchChange, filters, onFiltersChange, refreshing }: FiltersBarProps): React.JSX.Element => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<PatientFilters>(filters);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Only send server filters once they're complete; a half-typed DOB or phone would be rejected with 400.
  const toServerFilters = (next: PatientFilters): PatientFilters => ({
    last_name: next.last_name?.trim() || undefined,
    date_of_birth: next.date_of_birth && COMPLETE_DOB.test(next.date_of_birth.trim()) ? next.date_of_birth.trim() : undefined,
    phone_number: next.phone_number && next.phone_number.replace(/\D/g, '').length >= 10 ? next.phone_number : undefined,
  });

  const scheduleCommit = (next: PatientFilters): void => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onFiltersChange(toServerFilters(next)), DEBOUNCE_MS);
  };

  const clearAll = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDraft({});
    onFiltersChange({});
    onSearchChange('');
  };

  const activeBadges: ActiveBadge[] = [];
  if (search.trim()) {
    activeBadges.push({ key: 'search', label: `Search: "${search.trim()}"`, onRemove: () => onSearchChange('') });
  }
  if (draft.last_name) {
    activeBadges.push({
      key: 'last_name',
      label: `Last name: ${draft.last_name}`,
      onRemove: () => scheduleCommit({ ...draft, last_name: undefined }),
    });
  }
  if (draft.date_of_birth) {
    activeBadges.push({
      key: 'dob',
      label: `DOB: ${draft.date_of_birth}`,
      onRemove: () => scheduleCommit({ ...draft, date_of_birth: undefined }),
    });
  }
  if (draft.phone_number) {
    activeBadges.push({
      key: 'phone',
      label: `Phone: ${draft.phone_number}`,
      onRemove: () => scheduleCommit({ ...draft, phone_number: undefined }),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g. Maria Rivera or 4155550142"
            aria-label="Search patients by name or phone"
            className="pl-8"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPanelOpen((v) => !v)}
          className="gap-1.5"
          aria-expanded={panelOpen}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeBadges.length > 0 && (
            <Badge variant="default" className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">
              {activeBadges.length}
            </Badge>
          )}
        </Button>

        {activeBadges.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {refreshing && <span className="ml-auto text-[11px] text-muted-foreground">Refreshing…</span>}
      </div>

      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-last-name">Last name</Label>
                <Input
                  id="filter-last-name"
                  placeholder="e.g. Rivera"
                  value={draft.last_name ?? ''}
                  onChange={(e) => scheduleCommit({ ...draft, last_name: e.target.value || undefined })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-dob">Date of birth</Label>
                <Input
                  id="filter-dob"
                  placeholder="e.g. 04/12/1990"
                  value={draft.date_of_birth ?? ''}
                  onChange={(e) => scheduleCommit({ ...draft, date_of_birth: e.target.value || undefined })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-phone">Phone number</Label>
                <Input
                  id="filter-phone"
                  placeholder="e.g. 4155550142"
                  value={draft.phone_number ?? ''}
                  onChange={(e) => scheduleCommit({ ...draft, phone_number: e.target.value || undefined })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeBadges.map(({ key, label, onRemove }) => (
            <Badge key={key} variant="outline" className="gap-1 pr-1">
              {label}
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove filter: ${label}`}
                className="rounded-full p-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
