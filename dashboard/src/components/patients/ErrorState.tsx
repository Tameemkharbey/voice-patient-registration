import { AlertTriangle, RefreshCw } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export const ErrorState = ({ message, onRetry }: ErrorStateProps): React.JSX.Element => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
    <AlertTriangle className="h-8 w-8 text-destructive" />
    <div>
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
      <RefreshCw className="h-3.5 w-3.5" />
      Retry
    </Button>
  </div>
);
