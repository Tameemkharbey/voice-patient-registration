import type * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { CallOutcome } from '@/lib/types';

export const outcomeLabel = (outcome: CallOutcome | null, hasPatient: boolean): string => {
  if (outcome === 'registered') return 'Registered';
  if (outcome === 'updated') return 'Updated';
  if (outcome === 'existing') return 'Returning';
  if (hasPatient) return 'Linked';
  return 'No record saved';
};

type CallOutcomeBadgeProps = {
  outcome: CallOutcome | null;
  patientId: string | null;
};

export const CallOutcomeBadge = ({ outcome, patientId }: CallOutcomeBadgeProps): React.JSX.Element => {
  const label = outcomeLabel(outcome, Boolean(patientId));

  if (outcome === 'registered') return <Badge variant="success">{label}</Badge>;
  if (outcome === 'updated') return <Badge variant="info">{label}</Badge>;
  if (outcome === 'existing') return <Badge variant="violet">{label}</Badge>;
  if (patientId) return <Badge variant="info">{label}</Badge>;
  return <Badge variant="warning">{label}</Badge>;
};

export const OUTCOME_FILTERS: { key: 'all' | CallOutcome | 'none'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'registered', label: 'Registered' },
  { key: 'updated', label: 'Updated' },
  { key: 'existing', label: 'Returning' },
  { key: 'none', label: 'No record saved' },
];
