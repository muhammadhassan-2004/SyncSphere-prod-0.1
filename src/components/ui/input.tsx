import React, { useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
export { PasswordInput, type PasswordInputProps } from './PasswordInput';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  variant?: 'text' | 'email' | 'password' | 'search';
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'text', label, error, helperText, containerClassName, disabled, id, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const actualType = variant === 'password' ? (showPassword ? 'text' : 'password') : variant === 'email' ? 'email' : 'text';

    return (
      <div className={cn('flex flex-col w-full text-left', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {variant === 'search' && (
            <Search className="absolute left-3 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            value={value}
            onChange={onChange}
            className={cn(
              'w-full bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] text-sm rounded-[10px] border border-[var(--color-border)] px-3 py-2 transition-colors duration-150',
              'focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variant === 'search' && 'pl-9',
              variant === 'password' && 'pr-10',
              error && 'border-[var(--color-danger-red)] focus:border-[var(--color-danger-red)] focus:ring-[var(--color-danger-red)]',
              className
            )}
            {...props}
          />

          {variant === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              className="absolute right-3 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none transition-colors cursor-pointer rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password (currently visible)' : 'Show password (currently hidden)'}
            >
              {showPassword ? <EyeOff className="w-4 h-4 text-[var(--color-accent-cyan)]" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
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

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  maxLength?: number;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, maxLength, error, helperText, containerClassName, disabled, id, value, onChange, ...props }, ref) => {
    const [internalVal, setInternalVal] = useState('');
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    const currentString = value !== undefined ? String(value) : internalVal;
    const charCount = currentString.length;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalVal(e.target.value);
      if (onChange) onChange(e);
    };

    return (
      <div className={cn('flex flex-col w-full text-left', containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            onChange={handleChange}
            className={cn(
              'w-full bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] text-sm rounded-[10px] border border-[var(--color-border)] px-3 py-2 min-h-[90px] transition-colors duration-150 resize-y',
              'focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              maxLength && 'pb-7',
              error && 'border-[var(--color-danger-red)] focus:border-[var(--color-danger-red)] focus:ring-[var(--color-danger-red)]',
              className
            )}
            {...props}
          />
          {maxLength && (
            <div className="absolute bottom-2 right-3 text-[11px] font-mono text-[var(--color-text-secondary)] pointer-events-none select-none">
              {charCount}/{maxLength}
            </div>
          )}
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

Textarea.displayName = 'Textarea';
