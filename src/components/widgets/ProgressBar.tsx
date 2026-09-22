import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: 'inline-with-label' | 'compact' | 'milestone-row';
  color?: 'gradient' | 'cyan' | 'green';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercent?: boolean;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = 'inline-with-label',
      color = 'gradient',
      size = 'md',
      label,
      showPercent = true,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.min(Math.max(0, value || 0), max);
    const percentage = Math.round((clampedValue / max) * 100);
    const isCompleted = percentage >= 100;

    const getFillBackground = () => {
      if (isCompleted || color === 'green') {
        return 'linear-gradient(90deg, #10B981, #34D399)';
      }
      if (color === 'cyan') {
        return 'linear-gradient(90deg, #06B6D4, #22D3EE)';
      }
      return 'linear-gradient(90deg, #22D3EE, #34D399)';
    };

    const getFillClasses = () => {
      if (isCompleted || color === 'green') {
        return 'bg-gradient-to-r from-emerald-500 to-teal-400';
      }
      if (color === 'cyan') {
        return 'bg-gradient-to-r from-cyan-500 to-cyan-400';
      }
      return 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400';
    };

    const trackHeight = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-3' : 'h-2.5';

    if (variant === 'compact') {
      return (
        <div ref={ref} className={cn('flex items-center gap-2.5 w-full', className)} {...props}>
          <div className={cn('flex-1 bg-slate-800/90 border border-slate-700/60 rounded-full overflow-hidden shadow-inner', trackHeight)}>
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                getFillClasses(),
                isCompleted && 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              )}
              style={{
                width: `${percentage}%`,
                backgroundImage: getFillBackground(),
              }}
            />
          </div>
          {showPercent && (
            <span
              className={cn(
                'text-[11px] font-mono min-w-[32px] text-right font-semibold',
                isCompleted ? 'text-emerald-400' : 'text-[var(--color-text-secondary)]'
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
      );
    }

    if (variant === 'milestone-row') {
      return (
        <div ref={ref} className={cn('space-y-1.5 w-full', className)} {...props}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-text-primary)]">{label || 'Progress'}</span>
            {showPercent && (
              <span
                className={cn(
                  'font-mono font-semibold',
                  isCompleted ? 'text-emerald-400' : 'text-[var(--color-text-secondary)]'
                )}
              >
                {clampedValue}/{max} ({percentage}%)
              </span>
            )}
          </div>
          <div className={cn('bg-slate-800/90 border border-slate-700/60 rounded-full overflow-hidden shadow-inner', trackHeight)}>
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                getFillClasses(),
                isCompleted && 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              )}
              style={{
                width: `${percentage}%`,
                backgroundImage: getFillBackground(),
              }}
            />
          </div>
        </div>
      );
    }

    // Default: inline-with-label
    return (
      <div ref={ref} className={cn('space-y-1.5 w-full', className)} {...props}>
        <div className="flex items-center justify-between text-caption">
          {label && <span className="font-medium text-[var(--color-text-secondary)]">{label}</span>}
          {showPercent && (
            <span
              className={cn(
                'font-mono font-bold ml-auto',
                isCompleted ? 'text-emerald-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400'
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
        <div className={cn('bg-slate-800/90 border border-slate-700/60 rounded-full overflow-hidden shadow-inner', trackHeight)}>
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              getFillClasses(),
              isCompleted && 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'
            )}
            style={{
              width: `${percentage}%`,
              backgroundImage: getFillBackground(),
            }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
