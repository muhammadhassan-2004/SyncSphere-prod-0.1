import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ResponsiveStatValueProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number | undefined | null;
  prefix?: string;
  suffix?: string;
  unit?: string;
  tooltip?: string;
  mono?: boolean;
  className?: string;
}

/**
 * Returns dynamic responsive font-size classes based on rendered character length.
 * Prevents large numbers (e.g. "$100,000", "12 ($124,500)") from overflowing or
 * colliding with adjacent elements on laptop/tablet viewports (~768px - 1280px).
 */
export function getResponsiveStatSizeClass(length: number): string {
  if (length <= 4) {
    // e.g. "12", "98%", "4.9", "$0"
    return 'text-2xl sm:text-3xl';
  }
  if (length <= 7) {
    // e.g. "$1,200", "40.5h", "$9,999"
    return 'text-xl sm:text-2xl lg:text-xl xl:text-2xl';
  }
  if (length <= 11) {
    // e.g. "$100,000", "$999,999", "120.5 hrs"
    return 'text-lg sm:text-xl md:text-lg lg:text-base xl:text-xl';
  }
  // e.g. "12 ($124,500)", "$1,250,000,000"
  return 'text-base sm:text-lg md:text-base lg:text-sm xl:text-base';
}

export const ResponsiveStatValue: React.FC<ResponsiveStatValueProps> = ({
  value,
  prefix,
  suffix,
  unit,
  tooltip,
  mono = false,
  className,
  ...props
}) => {
  const displayVal = value !== undefined && value !== null ? String(value) : '—';
  const fullText = `${prefix || ''}${displayVal}${suffix || ''}${unit ? ` ${unit}` : ''}`;
  const sizeClass = getResponsiveStatSizeClass(fullText.length);
  const hoverTooltip = tooltip || (displayVal !== '—' ? fullText : undefined);

  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0 font-bold leading-tight tracking-tight text-[var(--color-text-primary)] truncate whitespace-nowrap overflow-hidden text-ellipsis',
        sizeClass,
        mono && 'font-mono',
        className
      )}
      title={hoverTooltip}
      {...props}
    >
      {prefix && <span className="opacity-90">{prefix}</span>}
      <span>{displayVal}</span>
      {suffix && <span className="text-xs sm:text-sm font-normal opacity-80 ml-0.5">{suffix}</span>}
      {unit && <span className="text-xs sm:text-sm font-normal text-[var(--color-text-secondary)] ml-1">{unit}</span>}
    </div>
  );
};
