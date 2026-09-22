import React, { useRef } from 'react';
import { cn } from '@/src/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  className,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Convert value string to array of chars padding up to length
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) {
      // Empty
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    // Take last entered character if multiple typed
    const singleDigit = val.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto focus next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back and delete previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      // Focus the input corresponding to length or last pasted position
      const nextFocus = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-3', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className={cn(
            'w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold rounded-lg border transition-all duration-150 outline-none select-none',
            'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]',
            'focus:border-[var(--color-accent-cyan)] focus:ring-2 focus:ring-[var(--color-accent-cyan)]/20',
            disabled && 'opacity-50 cursor-not-allowed',
            digits[index] && 'border-[var(--color-accent-cyan)]/60 bg-[var(--color-surface-elevated)]'
          )}
        />
      ))}
    </div>
  );
};
