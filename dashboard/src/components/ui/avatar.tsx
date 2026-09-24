import type * as React from 'react';
import { cn } from '@/lib/utils';

const PALETTE = [
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
];

const paletteFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0]!;
};

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & { initials: string; seed: string };

export const Avatar = ({ initials, seed, className, ...props }: AvatarProps): React.JSX.Element => (
  <div
    className={cn(
      'flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold',
      paletteFor(seed),
      className,
    )}
    aria-hidden="true"
    {...props}
  >
    {initials}
  </div>
);
