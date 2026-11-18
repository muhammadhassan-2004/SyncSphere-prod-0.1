import React from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { validateStrongPassword } from '@/src/lib/validation/formValidators';

interface PasswordRequirementChecklistProps {
  password: string;
  confirmPassword?: string;
  className?: string;
}

export function PasswordRequirementChecklist({
  password,
  confirmPassword,
  className = '',
}: PasswordRequirementChecklistProps) {
  const {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  } = validateStrongPassword(password);

  const passwordsMatch =
    confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <Card className={`p-3.5 space-y-2 bg-[var(--color-surface)]/60 border-[var(--color-border)] ${className}`}>
      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
        Password Requirements
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            hasMinLength
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {hasMinLength ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5 opacity-40" />
          )}
          <span>8+ characters</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            hasUppercase
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {hasUppercase ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5 opacity-40" />
          )}
          <span>Uppercase (A-Z)</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            hasLowercase
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {hasLowercase ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5 opacity-40" />
          )}
          <span>Lowercase (a-z)</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            hasNumber
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {hasNumber ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5 opacity-40" />
          )}
          <span>Number (0-9)</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            hasSpecialChar
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {hasSpecialChar ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5 opacity-40" />
          )}
          <span>Special (!@#$...)</span>
        </div>
      </div>

      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div
          className={`pt-1.5 border-t border-[var(--color-border)] text-xs flex items-center gap-1.5 transition-colors ${
            passwordsMatch
              ? 'text-[var(--color-success-green)] font-medium'
              : 'text-[var(--color-danger-red)]'
          }`}
        >
          {passwordsMatch ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
      )}
    </Card>
  );
}
