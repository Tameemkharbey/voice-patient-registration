import type * as React from 'react';
import { useState } from 'react';
import { Header } from './Header';
import { type View, SidebarNav } from './Sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

type AppShellProps = {
  view: View;
  onNavigate: (view: View) => void;
  title: string;
  search?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  children: React.ReactNode;
};

export const AppShell = ({ view, onNavigate, title, search, onSearchChange, children }: AppShellProps): React.JSX.Element => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card px-4 py-6 lg:block">
        <SidebarNav view={view} onNavigate={onNavigate} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="w-72 p-4 sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav
            view={view}
            onNavigate={(v) => {
              onNavigate(v);
              setMobileNavOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} search={search} onSearchChange={onSearchChange} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
};
