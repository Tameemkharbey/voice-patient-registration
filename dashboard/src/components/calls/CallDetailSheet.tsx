import { MessageSquareOff } from 'lucide-react';
import type * as React from 'react';
import { CallOutcomeBadge } from './CallOutcomeBadge';
import { TranscriptView } from '@/components/patients/CallLogList';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCallDetail } from '@/hooks/useCallDetail';
import { formatDateTime, formatDuration, humanizeEndedReason, maskCallerNumber } from '@/lib/format';

type CallDetailSheetProps = {
  callId: string | null;
  patientName?: string | null | undefined;
  onOpenChange: (open: boolean) => void;
  onOpenPatient?: ((patientId: string) => void) | undefined;
};

export const CallDetailSheet = ({ callId, patientName, onOpenChange, onOpenPatient }: CallDetailSheetProps): React.JSX.Element => {
  const { call, loading, error, refetch } = useCallDetail(callId);

  return (
    <Sheet open={Boolean(callId)} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        <SheetHeader>
          <SheetTitle>{patientName ?? (call ? maskCallerNumber(call.caller_number) : 'Call details')}</SheetTitle>
          <SheetDescription>{call ? formatDateTime(call.created_at) : 'Loading call…'}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
              <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
                Retry
              </Button>
            </div>
          )}

          {call && !loading && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <CallOutcomeBadge outcome={call.outcome} patientId={call.patient_id} />
                <span className="text-xs text-muted-foreground">{humanizeEndedReason(call.ended_reason)}</span>
                <span className="text-xs text-muted-foreground">· {formatDuration(call.duration_seconds)}</span>
                {call.patient_id && onOpenPatient && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-auto h-auto p-0"
                    onClick={() => onOpenPatient(call.patient_id!)}
                  >
                    View patient
                  </Button>
                )}
              </div>

              {call.summary && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">Summary</h3>
                  <p className="text-sm text-muted-foreground">{call.summary}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Transcript</h3>
                {call.transcript ? (
                  <TranscriptView transcript={call.transcript} />
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    <MessageSquareOff className="h-5 w-5" />
                    No transcript available for this call.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
