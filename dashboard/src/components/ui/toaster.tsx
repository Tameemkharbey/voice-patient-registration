import { Toaster as Sonner } from 'sonner';
import type * as React from 'react';

export const Toaster = (): React.JSX.Element => (
  <Sonner
    theme="system"
    position="top-right"
    closeButton
    toastOptions={{
      classNames: {
        toast: 'bg-card text-card-foreground border border-border shadow-lg',
        description: 'text-muted-foreground',
        actionButton: 'bg-primary text-primary-foreground',
        cancelButton: 'bg-muted text-muted-foreground',
      },
    }}
  />
);
