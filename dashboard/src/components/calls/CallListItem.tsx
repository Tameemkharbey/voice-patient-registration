import { motion } from 'framer-motion';
import type * as React from 'react';
import { CallOutcomeBadge } from './CallOutcomeBadge';
import { cn } from '@/lib/utils';
import { formatDuration, humanizeEndedReason, maskCallerNumber, relativeTime } from '@/lib/format';
import type { CallSummary } from '@/lib/types';

type CallListItemProps = {
  call: CallSummary;
  isNew: boolean;
  onOpenCall: (call: CallSummary) => void;
  onOpenPatient: (patientId: string) => void;
};

export const CallListItem = ({ call, isNew, onOpenCall, onOpenPatient }: CallListItemProps): React.JSX.Element => {
  const displayName = call.patient_name ?? maskCallerNumber(call.caller_number);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-accent/60',
        isNew && 'animate-highlight',
      )}
      role="button"
      tabIndex={0}
      onClick={() => onOpenCall(call)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenCall(call);
        }
      }}
      aria-label={`Call from ${displayName}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <CallOutcomeBadge outcome={call.outcome} patientId={call.patient_id} />
          {call.patient_id ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPatient(call.patient_id!);
              }}
              className="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {call.patient_name ?? 'View patient'}
            </button>
          ) : (
            <span className="truncate text-sm font-medium text-muted-foreground">{displayName}</span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{humanizeEndedReason(call.ended_reason)}</p>
      </div>

      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p className="tabular-nums">{formatDuration(call.duration_seconds)}</p>
        <p className="mt-1">{relativeTime(call.created_at)}</p>
      </div>
    </motion.div>
  );
};
