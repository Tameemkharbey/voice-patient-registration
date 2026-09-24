import type * as React from 'react';
import { cn } from '@/lib/utils';

type LiveDotProps = {
  live: boolean;
  label?: boolean;
  className?: string;
};

export const LiveDot = ({ live, label = true, className }: LiveDotProps): React.JSX.Element => (
  <span className={cn('inline-flex items-center gap-1.5', className)}>
    <span className="relative flex h-2 w-2">
      {live && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 motion-reduce:animate-none" />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-success' : 'bg-muted-foreground')} />
    </span>
    {label && (
      <span className={cn('text-xs font-medium', live ? 'text-success' : 'text-muted-foreground')}>
        {live ? 'Live' : 'Offline'}
      </span>
    )}
  </span>
);
