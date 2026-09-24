import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const CallsSkeleton = ({ rows = 5 }: { rows?: number }): React.JSX.Element => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={`call-skeleton-${i}`} className="flex items-center gap-3 rounded-md border border-border p-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
);
