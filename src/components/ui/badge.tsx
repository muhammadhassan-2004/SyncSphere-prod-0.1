import React from 'react';
import { cn } from '@/src/lib/utils';

export type BadgeVariant = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'gray';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, label, variant = 'gray', children, ...props }, ref) => {
    const variantStyles: Record<BadgeVariant, string> = {
      blue: 'bg-[var(--color-info-blue)]/15 text-[var(--color-info-blue)] border-[var(--color-info-blue)]/30',
      green: 'bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border-[var(--color-success-green)]/30',
      amber: 'bg-[var(--color-warning-amber)]/15 text-[var(--color-warning-amber)] border-[var(--color-warning-amber)]/30',
      purple: 'bg-[var(--color-review-purple)]/15 text-[var(--color-review-purple)] border-[var(--color-review-purple)]/30',
      red: 'bg-[var(--color-danger-red)]/15 text-[var(--color-danger-red)] border-[var(--color-danger-red)]/30',
      gray: 'bg-[var(--color-text-secondary)]/15 text-[var(--color-text-secondary)] border-[var(--color-text-secondary)]/30',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-none select-none tracking-wide whitespace-nowrap',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {label || children}
      </span>
    );
  }
);

StatusPill.displayName = 'StatusPill';

export const Badge = StatusPill;
