import { Activity, HeartPulse, PhoneCall, Users, type LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { LiveDot } from '@/components/status/LiveDot';
import { useLiveStatus } from '@/hooks/useLiveStatus';
import { cn } from '@/lib/utils';

export type View = 'patients' | 'calls' | 'status';

const NAV_ITEMS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'calls', label: 'Call Log', icon: PhoneCall },
  { id: 'status', label: 'API Status', icon: Activity },
];

type SidebarProps = {
  view: View;
  onNavigate: (view: View) => void;
  className?: string;
};

export const SidebarNav = ({ view, onNavigate, className }: SidebarProps): React.JSX.Element => {
  const live = useLiveStatus();

  return (
    <div className={cn('flex h-full flex-col gap-6', className)}>
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Sunrise Health</p>
          <p className="text-xs text-muted-foreground">Patient Registry</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={view === id ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              view === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        <LiveDot live={live} />
        <p className="mt-1.5">{live ? 'Auto-refreshing every 15s' : 'Reconnecting…'}</p>
      </div>
    </div>
  );
};
