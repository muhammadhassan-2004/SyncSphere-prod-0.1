import React from 'react';
import { Card } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BadgeVariant } from '@/src/components/ui/badge';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';

export interface KPIStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
  iconVariant?: BadgeVariant;
  trend?: {
    value: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  isLoading?: boolean;
}

export const KPIStatCard = React.forwardRef<HTMLDivElement, KPIStatCardProps>(
  ({ className, label, value, icon, iconVariant = 'blue', trend, isLoading = false, ...props }, ref) => {
    const iconBgVariants: Record<BadgeVariant, string> = {
      blue: 'bg-[var(--color-info-blue)]/15 text-[var(--color-info-blue)] border-[var(--color-info-blue)]/30',
      green: 'bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border-[var(--color-success-green)]/30',
      amber: 'bg-[var(--color-warning-amber)]/15 text-[var(--color-warning-amber)] border-[var(--color-warning-amber)]/30',
      purple: 'bg-[var(--color-review-purple)]/15 text-[var(--color-review-purple)] border-[var(--color-review-purple)]/30',
      red: 'bg-[var(--color-danger-red)]/15 text-[var(--color-danger-red)] border-[var(--color-danger-red)]/30',
      gray: 'bg-[var(--color-text-secondary)]/15 text-[var(--color-text-secondary)] border-[var(--color-text-secondary)]/30',
    };

    if (isLoading) {
      return (
        <Card ref={ref} className={cn('space-y-4 animate-pulse min-w-0', className)} {...props}>
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-[var(--color-border)]/60 rounded-[4px]" />
            <div className="w-9 h-9 rounded-full bg-[var(--color-border)]/60" />
          </div>
          <div className="h-8 w-32 bg-[var(--color-border)]/60 rounded-[6px]" />
          <div className="h-3 w-28 bg-[var(--color-border)]/40 rounded-[4px]" />
        </Card>
      );
    }

    return (
      <Card ref={ref} className={cn('space-y-3 min-w-0 overflow-hidden', className)} {...props}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption font-medium text-[var(--color-text-secondary)] truncate">
            {label}
          </span>
          {icon && (
            <div
              className={cn(
                'w-9 h-9 rounded-full border flex items-center justify-center shrink-0',
                iconBgVariants[iconVariant]
              )}
            >
              {icon}
            </div>
          )}
        </div>

        <div className="py-0.5">
          <ResponsiveStatValue value={value} />
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 text-xs font-medium truncate">
            {trend.direction === 'up' && (
              <span className="inline-flex items-center gap-1 text-[var(--color-success-green)] truncate">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{trend.value}</span>
              </span>
            )}
            {trend.direction === 'down' && (
              <span className="inline-flex items-center gap-1 text-[var(--color-danger-red)] truncate">
                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{trend.value}</span>
              </span>
            )}
            {(!trend.direction || trend.direction === 'neutral') && (
              <span className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] truncate">
                <Minus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{trend.value}</span>
              </span>
            )}
          </div>
        )}
      </Card>
    );
  }
);

KPIStatCard.displayName = 'KPIStatCard';
