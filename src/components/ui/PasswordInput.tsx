import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  showLockIcon?: boolean;
  extraRightAction?: React.ReactNode;
  showPasswordState?: boolean;
  onToggleShowPassword?: (visible: boolean) => void;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      containerClassName,
      leftIcon,
      showLockIcon = false,
      extraRightAction,
      showPasswordState,
      onToggleShowPassword,
      disabled,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalShow, setInternalShow] = useState(false);
    const isControlled = typeof showPasswordState === 'boolean';
    const isVisible = isControlled ? showPasswordState : internalShow;

    const generatedId = React.useId();
    const inputId = id || generatedId;

    const handleToggle = () => {
      if (disabled) return;
      const nextVal = !isVisible;
      if (onToggleShowPassword) {
        onToggleShowPassword(nextVal);
      }
      if (!isControlled) {
        setInternalShow(nextVal);
      }
    };

    return (
      <div className={cn('flex flex-col w-full text-left', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center pointer-events-none text-[var(--color-text-secondary)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={isVisible ? 'text' : 'password'}
            disabled={disabled}
            value={value}
            onChange={onChange}
            className={cn(
              'w-full bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] text-sm rounded-[10px] border border-[var(--color-border)] px-3 py-2 transition-colors duration-150',
              'focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-9.5' : 'pl-3',
              extraRightAction ? 'pr-20' : 'pr-10',
              error && 'border-[var(--color-danger-red)] focus:border-[var(--color-danger-red)] focus:ring-[var(--color-danger-red)]',
              className
            )}
            {...props}
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {extraRightAction}
            <button
              type="button"
              onClick={handleToggle}
              disabled={disabled}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none transition-colors cursor-pointer rounded"
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              title={isVisible ? 'Hide password (currently visible)' : 'Show password (currently hidden)'}
            >
              {isVisible ? (
                <EyeOff className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {(error || helperText) && (
          <p className={cn('text-xs mt-1', error ? 'text-[var(--color-danger-red)]' : 'text-[var(--color-text-secondary)]')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
