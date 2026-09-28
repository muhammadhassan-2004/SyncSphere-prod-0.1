import React from 'react';
import { SyncSphereLogoIcon } from './SyncSphereLogoIcon';
import { cn } from '@/src/lib/utils';

interface SyncSphereLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitle?: string;
  iconSrc?: string;
}

export const SyncSphereLogo: React.FC<SyncSphereLogoProps> = ({
  className,
  iconSize = 28,
  textSize = 'lg',
  showSubtitle = false,
  subtitle,
  iconSrc,
}) => {
  const textSizeClasses = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl font-extrabold tracking-tight',
  }[textSize];

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <SyncSphereLogoIcon size={iconSize} src={iconSrc} />
      <div className="flex flex-col">
        <div className={cn('flex items-center leading-none', textSizeClasses)}>
          <span className="text-[var(--color-text-primary)] font-bold">Sync</span>
          <span className="text-accent-gradient font-bold ml-[1px]">Sphere</span>
        </div>
        {showSubtitle && subtitle && (
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
