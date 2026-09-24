import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CHECK_INTERVAL_MS = 15000;

// Lightweight health ping used to drive the "Live" indicator shown in the
// voice CTA banner and the sidebar footer, independent of any single view's data hook.
export const useLiveStatus = (): boolean => {
  const [live, setLive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async (): Promise<void> => {
      try {
        await api.health();
        if (!cancelled) setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    };

    void check();
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return live;
};
