import { Menu, Search } from 'lucide-react';
import type * as React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type HeaderProps = {
  title: string;
  search?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  onMenuClick: () => void;
};

export const Header = ({ title, search, onSearchChange, onMenuClick }: HeaderProps): React.JSX.Element => (
  <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
      <Menu className="h-5 w-5" />
    </Button>

    <h1 className="text-lg font-semibold">{title}</h1>

    <div className="ml-auto flex items-center gap-2">
      {onSearchChange && (
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or phone…"
            aria-label="Search patients by name or phone"
            className="w-64 pl-8"
          />
        </div>
      )}
      <ThemeToggle />
    </div>
  </header>
);
