import { Phone } from 'lucide-react';
import type * as React from 'react';
import { LiveDot } from '@/components/status/LiveDot';
import { useLiveStatus } from '@/hooks/useLiveStatus';

const PHONE_DISPLAY = '+1 (732) 660-9117';
const PHONE_TEL = 'tel:+17326609117';

export const VoiceCallBanner = (): React.JSX.Element => {
  const live = useLiveStatus();

  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Register by phone</p>
            <p className="text-xs text-muted-foreground">Speak with Riley, our AI intake coordinator</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={PHONE_TEL}
            className="text-lg font-semibold tabular-nums text-primary transition-transform hover:underline active:scale-[0.98]"
          >
            {PHONE_DISPLAY}
          </a>
          <LiveDot live={live} />
        </div>
      </div>
    </div>
  );
};
