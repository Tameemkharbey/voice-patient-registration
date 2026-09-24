import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiRequestError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

type Status = { state: 'checking' | 'ok' | 'error'; message?: string; checkedAt?: string };

export const StatusView = (): React.JSX.Element => {
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  const check = useCallback(async () => {
    setStatus({ state: 'checking' });
    try {
      await api.health();
      setStatus({ state: 'ok', checkedAt: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Health check failed.';
      setStatus({ state: 'error', message, checkedAt: new Date().toISOString() });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
          API Health
          <Button variant="ghost" size="icon" onClick={() => void check()} aria-label="Recheck API health">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {status.state === 'ok' && <CheckCircle2 className="h-5 w-5 text-success" />}
          {status.state === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
          {status.state === 'checking' && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
          <span className="text-sm font-medium">
            {status.state === 'ok' ? 'Operational' : status.state === 'error' ? 'Unavailable' : 'Checking…'}
          </span>
        </div>
        {status.message && <p className="text-sm text-destructive">{status.message}</p>}
        {status.checkedAt && <p className="text-xs text-muted-foreground">Last checked {formatDateTime(status.checkedAt)}</p>}
      </CardContent>
    </Card>
  );
};
