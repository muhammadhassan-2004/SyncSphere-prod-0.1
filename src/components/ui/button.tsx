import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'text-link' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none cursor-pointer';

    const variantStyles = {
      primary:
        'bg-accent-gradient !text-white !font-bold rounded-[10px] hover:opacity-95 hover:brightness-105 active:scale-[0.98]',
      secondary:
        'border border-[var(--color-accent-cyan)]/60 text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 hover:bg-[var(--color-accent-cyan)]/20 hover:border-[var(--color-accent-cyan)] rounded-[10px] active:scale-[0.98]',
      destructive:
        'border border-[var(--color-danger-red)]/60 text-[var(--color-danger-red)] bg-[var(--color-danger-red)]/10 hover:bg-[var(--color-danger-red)]/20 hover:border-[var(--color-danger-red)] rounded-[10px] active:scale-[0.98]',
      'text-link':
        'text-[var(--color-accent-cyan)] bg-transparent hover:underline p-0 h-auto font-medium rounded-none',
      'icon-only':
        'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/60 border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]/50 rounded-[10px] active:scale-[0.98]',
    };

    const sizeStyles = {
      sm: variant === 'text-link' ? '' : variant === 'icon-only' ? 'w-8 h-8 p-0 text-xs' : 'px-3 py-1.5 text-xs h-8',
      md: variant === 'text-link' ? '' : variant === 'icon-only' ? 'w-10 h-10 p-0 text-sm' : 'px-4 py-2 text-sm h-10',
      lg: variant === 'text-link' ? '' : variant === 'icon-only' ? 'w-12 h-12 p-0 text-base' : 'px-6 py-2.5 text-sm sm:text-base h-12',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
