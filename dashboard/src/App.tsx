import type * as React from 'react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import type { View } from '@/components/layout/Sidebar';
import { CallLogView } from '@/components/calls/CallLogView';
import { PatientsView } from '@/components/patients/PatientsView';
import { StatusView } from '@/components/status/StatusView';

const TITLES: Record<View, string> = {
  patients: 'Patient Registry',
  calls: 'Call Log',
  status: 'API Status',
};

export const App = (): React.JSX.Element => {
  const [view, setView] = useState<View>('patients');

  return (
    <AppShell view={view} onNavigate={setView} title={TITLES[view]}>
      {view === 'patients' ? <PatientsView /> : view === 'calls' ? <CallLogView /> : <StatusView />}
    </AppShell>
  );
};
