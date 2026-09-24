import type * as React from 'react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import type { View } from '@/components/layout/Sidebar';
import { PatientsView } from '@/components/patients/PatientsView';
import { StatusView } from '@/components/status/StatusView';

const TITLES: Record<View, string> = {
  patients: 'Patient Registry',
  status: 'API Status',
};

export const App = (): React.JSX.Element => {
  const [view, setView] = useState<View>('patients');
  const [search, setSearch] = useState('');

  return (
    <AppShell
      view={view}
      onNavigate={setView}
      title={TITLES[view]}
      search={view === 'patients' ? search : undefined}
      onSearchChange={view === 'patients' ? setSearch : undefined}
    >
      {view === 'patients' ? <PatientsView search={search} /> : <StatusView />}
    </AppShell>
  );
};
