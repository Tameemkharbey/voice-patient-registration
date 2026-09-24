import { CalendarClock, CheckCircle2, PhoneCall, Repeat, Users } from 'lucide-react';
import type * as React from 'react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isThisWeek, isToday, isWithinDays } from '@/lib/format';
import type { CallSummary, Patient } from '@/lib/types';

type StatCardsProps = {
  patients: Patient[];
  calls: CallSummary[];
};

export const StatCards = ({ patients, calls }: StatCardsProps): React.JSX.Element => {
  const total = patients.length;
  const week = patients.filter((p) => isThisWeek(p.created_at)).length;

  const callsToday = calls.filter((c) => isToday(c.created_at)).length;

  const recentCalls = calls.filter((c) => isWithinDays(c.created_at, 7));
  const endedRecentCalls = recentCalls.filter((c) => c.ended_reason !== null);
  const completedRecentCalls = recentCalls.filter((c) => c.outcome === 'registered' || c.outcome === 'updated');
  const completionRate =
    endedRecentCalls.length === 0 ? null : Math.round((completedRecentCalls.length / endedRecentCalls.length) * 100);

  const returningCallers = calls.filter((c) => c.outcome === 'existing' || c.outcome === 'updated').length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Patients</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={total} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">+{week} this week</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Calls today</CardTitle>
          <PhoneCall className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={callsToday} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Answered by Riley</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Completion rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">
            {completionRate === null ? '—' : <AnimatedNumber value={completionRate} formatter={(v) => `${v}%`} />}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Returning callers</CardTitle>
          <Repeat className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={returningCallers} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> Recognized on callback
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
