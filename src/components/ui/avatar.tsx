import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  initials?: string;
  src?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  statusDot?: 'online' | 'offline' | 'busy' | 'away' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, initials, src, avatarUrl, size = 'sm', statusDot, ...props }, ref) => {
    const [imgError, setImgError] = useState(false);
    const rawSource = src || avatarUrl;
    const imageSource =
      typeof rawSource === 'string' &&
      rawSource.trim().length > 5 &&
      rawSource !== 'null' &&
      rawSource !== 'undefined'
        ? rawSource.trim()
        : null;

    useEffect(() => {
      setImgError(false);
    }, [imageSource]);

    // Derive initials if not provided
    const derivedInitials = React.useMemo(() => {
      if (initials) return initials.slice(0, 2).toUpperCase();
      if (!name) return 'SS';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }, [name, initials]);

    const sizeClasses = {
      xs: 'w-6 h-6 text-[10px] font-bold',
      sm: 'w-8 h-8 text-xs font-bold',
      md: 'w-10 h-10 text-sm font-bold',
      lg: 'w-16 h-16 text-xl font-bold',
    };

    const dotSizeClasses = {
      xs: 'w-2 h-2 border',
      sm: 'w-2.5 h-2.5 border',
      md: 'w-3 h-3 border',
      lg: 'w-4 h-4 border-2',
    };

    const statusDotColors: Record<string, string> = {
      online: 'bg-[var(--color-success-green)]',
      green: 'bg-[var(--color-success-green)]',
      busy: 'bg-[var(--color-danger-red)]',
      red: 'bg-[var(--color-danger-red)]',
      away: 'bg-[var(--color-warning-amber)]',
      amber: 'bg-[var(--color-warning-amber)]',
      blue: 'bg-[var(--color-info-blue)]',
      purple: 'bg-[var(--color-review-purple)]',
      offline: 'bg-[var(--color-text-secondary)]',
      gray: 'bg-[var(--color-text-secondary)]',
    };

    return (
      <div
        className={cn('relative inline-flex items-center justify-center select-none shrink-0', sizeClasses[size], className)}
        {...props}
      >
        <div
          ref={ref}
          className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 via-cyan-300 to-emerald-400 text-slate-950 flex items-center justify-center font-extrabold tracking-wider shadow-none aspect-square overflow-hidden"
        >
          {imageSource && !imgError ? (
            <img
              src={imageSource}
              alt={name || 'Avatar'}
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-full block"
            />
          ) : (
            derivedInitials
          )}
        </div>

        {statusDot && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-[var(--color-background)]',
              dotSizeClasses[size],
              statusDotColors[statusDot] || 'bg-[var(--color-success-green)]'
            )}
            title={`Status: ${statusDot}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
