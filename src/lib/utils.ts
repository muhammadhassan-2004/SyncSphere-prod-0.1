import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a calendar date safely without UTC-midnight timezone shift issues.
 * Handles 'YYYY-MM-DD', ISO timestamps, or Firestore Timestamps.
 */
export function formatCalendarDate(
  dateInput?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('en-US', options);
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-US', options);
  } catch {
    return String(dateInput || '—');
  }
}

/**
 * Parses any date string/timestamp into a local Date object without timezone day-shift.
 */
export function parseLocalDate(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a raw document ID or UUID into a clean, human-readable project reference code.
 * E.g., "c5e87a2d-8b01-46bb-b714-2c676d10c12e" -> "PRJ-C5E87A"
 * "proj-demo-1" -> "PRJ-DEMO1"
 */
export function formatProjectRef(id?: string): string {
  if (!id) return 'PRJ-000000';
  if (/^PRJ-[A-Z0-9]{4,8}$/i.test(id)) return id.toUpperCase();
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const code = clean.length >= 6 ? clean.slice(0, 6) : clean.padEnd(6, '0');
  return `PRJ-${code}`;
}
