import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-success/15 text-success',
        outline: 'border-border text-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        info: 'border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300',
        violet: 'border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps): React.JSX.Element => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
