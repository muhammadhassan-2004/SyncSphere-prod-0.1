import React from 'react';

/**
 * Strips any characters that are not digits, +, -, (, ), or spaces.
 * Completely blocks alphabetic characters and symbols from being entered.
 */
export const sanitizePhoneNumber = (val: string): string => {
  return val.replace(/[^0-9+\-()\s]/g, '');
};

/**
 * Keyboard event listener that blocks alphabetic and disallowed characters
 * before they can be entered into the DOM.
 * Permits: 0-9, +, -, (, ), space, and standard control/navigation keys.
 */
export const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  // Allow navigation, deletion, copy/paste, selection, tab
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.key === 'Home' ||
    e.key === 'End'
  ) {
    return;
  }

  // If a printable single character is pressed, ensure it's a valid phone character
  if (e.key.length === 1 && !/[0-9+\-()\s]/.test(e.key)) {
    e.preventDefault();
  }
};

export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
  errors: string[];
}

export const validateStrongPassword = (password: string): PasswordValidationResult => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('At least 8 characters');
  if (!hasUppercase) errors.push('At least one uppercase letter (A-Z)');
  if (!hasLowercase) errors.push('At least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('At least one number (0-9)');
  if (!hasSpecialChar) errors.push('At least one special character (!@#$%^&*...)');

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
    errors,
  };
};

export const validators = {
  required: (v: string) => (v.trim() ? null : 'This field is required'),
  email: (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email'),
  minLength: (min: number) => (v: string) => (v.length >= min ? null : `Must be at least ${min} characters`),
  passwordMatch: (other: string) => (v: string) => (v === other ? null : 'Passwords do not match'),
  passwordStrength: (v: string) => {
    if (v.length < 8) return 'Min. 8 characters';
    if (!/[A-Z]/.test(v)) return 'At least one uppercase letter (A-Z)';
    if (!/[a-z]/.test(v)) return 'At least one lowercase letter (a-z)';
    if (!/[0-9]/.test(v)) return 'At least one number (0-9)';
    if (!/[^A-Za-z0-9]/.test(v)) return 'At least one special character (!@#$%^&*...)';
    return null;
  },
  phone: (v: string) => {
    if (!v || !v.trim()) return null;
    const digits = v.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      return 'Phone number must contain between 8 and 15 digits';
    }
    return null;
  },
  phoneRequired: (v: string) => {
    if (!v || !v.trim()) return 'Phone number is required';
    const digits = v.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      return 'Phone number must contain between 8 and 15 digits';
    }
    return null;
  },
};

export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, (v: string) => string | null>>
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key in rules) {
    const err = rules[key]?.(values[key] ?? '');
    if (err) errors[key] = err;
  }
  return errors;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}
