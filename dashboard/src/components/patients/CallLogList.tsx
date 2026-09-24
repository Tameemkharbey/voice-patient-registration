import { ChevronDown, PhoneOff } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type { CallLog } from '@/lib/types';

type TranscriptLine = { speaker: 'AI' | 'User' | 'Other'; text: string };

const parseTranscript = (transcript: string): TranscriptLine[] =>
  transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(AI|User)\s*:\s*(.*)$/i.exec(line);
      if (!match) return { speaker: 'Other', text: line };
      const speaker = match[1]!.toLowerCase() === 'ai' ? 'AI' : 'User';
      return { speaker, text: match[2] ?? '' };
    });

const TranscriptView = ({ transcript }: { transcript: string }): React.JSX.Element => {
  const lines = parseTranscript(transcript);
  const isChatFormat = lines.some((l) => l.speaker !== 'Other');

  if (!isChatFormat) {
    return <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">{transcript}</pre>;
  }

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => (
        <div
          key={`${line.speaker}-${i}`}
          className={cn('flex flex-col gap-0.5', line.speaker === 'User' ? 'items-end' : 'items-start')}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{line.speaker}</span>
          <p
            className={cn(
              'max-w-[85%] rounded-2xl px-3 py-1.5 text-sm',
              line.speaker === 'User' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            )}
          >
            {line.text}
          </p>
        </div>
      ))}
    </div>
  );
};

const CallLogItem = ({ call }: { call: CallLog }): React.JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{formatDateTime(call.created_at)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Call ID: {call.call_id}</p>
        </div>
        {call.ended_reason && <Badge variant="outline">{call.ended_reason.replace(/-/g, ' ')}</Badge>}
      </div>

      {call.summary && <p className="mt-2 text-sm text-muted-foreground">{call.summary}</p>}

      {call.transcript && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Hide transcript' : 'Show transcript'}
        </button>
      )}

      {expanded && call.transcript && (
        <div className="mt-3 max-h-72 overflow-y-auto scrollbar-thin">
          <TranscriptView transcript={call.transcript} />
        </div>
      )}
    </div>
  );
};

export const CallLogList = ({ calls }: { calls: CallLog[] }): React.JSX.Element => {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        <PhoneOff className="h-6 w-6" />
        No calls linked to this patient yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {calls.map((call) => (
        <CallLogItem key={call.call_id} call={call} />
      ))}
    </div>
  );
};
