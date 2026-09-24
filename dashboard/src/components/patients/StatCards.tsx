import { CalendarClock, ShieldCheck, Users } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isThisWeek, isToday } from '@/lib/format';
import type { Patient } from '@/lib/types';

type StatCardsProps = { patients: Patient[] };

export const StatCards = ({ patients }: StatCardsProps): React.JSX.Element => {
  const total = patients.length;
  const today = patients.filter((p) => isToday(p.created_at)).length;
  const week = patients.filter((p) => isThisWeek(p.created_at)).length;
  const withInsurance = patients.filter((p) => Boolean(p.insurance_provider)).length;
  const insurancePct = total === 0 ? 0 : Math.round((withInsurance / total) * 100);

  const stats = [
    { label: 'Total patients', value: total.toLocaleString(), icon: Users, hint: `${week} registered this week` },
    { label: 'Registered today', value: today.toLocaleString(), icon: CalendarClock, hint: `${week} this week` },
    { label: 'With insurance on file', value: `${insurancePct}%`, icon: ShieldCheck, hint: `${withInsurance} of ${total} patients` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, hint }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>{label}</CardTitle>
            <Icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
