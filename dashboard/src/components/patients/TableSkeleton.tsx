import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const TableSkeleton = ({ rows = 8 }: { rows?: number }): React.JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-border">
    <div className="border-b border-border bg-muted/40 px-4 py-3">
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skeleton-row-${i}`} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28 hidden sm:block" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);
