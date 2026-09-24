import { Menu } from 'lucide-react';
import type * as React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';

type HeaderProps = {
  title: string;
  onMenuClick: () => void;
};

export const Header = ({ title, onMenuClick }: HeaderProps): React.JSX.Element => (
  <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
      <Menu className="h-5 w-5" />
    </Button>

    <h1 className="text-lg font-semibold">{title}</h1>

    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />
    </div>
  </header>
);
