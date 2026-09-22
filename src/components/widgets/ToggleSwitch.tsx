import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ToggleSwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
}

export const ToggleSwitch = React.forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  (
    {
      className,
      checked,
      onChange,
      label,
      description,
      size = 'md',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const trackSize = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
    const knobSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
    const knobTranslate = size === 'sm' ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');

    return (
      <div className={cn('inline-flex items-center justify-between gap-3 select-none', className)}>
        {(label || description) && (
          <div className="flex flex-col text-left">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  'text-sm font-medium text-[var(--color-text-primary)] cursor-pointer',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-caption text-[var(--color-text-secondary)]">{description}</span>
            )}
          </div>
        )}

        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex items-center shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-cyan)] border border-[var(--color-border)]',
            trackSize,
            checked ? 'bg-[var(--accent-gradient)] border-transparent' : 'bg-[var(--color-surface)]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        >
          <span
            className={cn(
              'inline-block rounded-full bg-white shadow-none transition-transform duration-200 ease-in-out',
              knobSize,
              knobTranslate
            )}
          />
        </button>
      </div>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';
