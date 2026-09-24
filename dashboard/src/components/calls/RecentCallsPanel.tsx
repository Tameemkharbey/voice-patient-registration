import { PhoneOff } from 'lucide-react';
import type * as React from 'react';
import { CallListItem } from './CallListItem';
import { CallsSkeleton } from './CallsSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CallSummary } from '@/lib/types';

type RecentCallsPanelProps = {
  calls: CallSummary[];
  loading: boolean;
  error: string | null;
  justAddedIds: Set<string>;
  onOpenCall: (call: CallSummary) => void;
  onOpenPatient: (patientId: string) => void;
};

export const RecentCallsPanel = ({
  calls,
  loading,
  error,
  justAddedIds,
  onOpenCall,
  onOpenPatient,
}: RecentCallsPanelProps): React.JSX.Element => {
  const recent = calls.slice(0, 5);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Recent calls</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <CallsSkeleton rows={5} />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            <PhoneOff className="h-6 w-6" />
            No calls yet. New calls from Riley will show up here.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((call) => (
              <CallListItem
                key={call.call_id}
                call={call}
                isNew={justAddedIds.has(call.call_id)}
                onOpenCall={onOpenCall}
                onOpenPatient={onOpenPatient}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
