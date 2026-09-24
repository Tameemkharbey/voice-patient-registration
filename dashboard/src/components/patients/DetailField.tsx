import type * as React from 'react';

export const DetailField = ({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</span>
  </div>
);

export const DetailGroup = ({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element => (
  <section className="flex flex-col gap-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  </section>
);
