import React from 'react';
import { cn } from '@/src/lib/utils';

interface SyncSphereLogoIconProps {
  className?: string;
  size?: number | string;
  src?: string;
}

export const SyncSphereLogoIcon: React.FC<SyncSphereLogoIconProps> = ({
  className,
  size = 28,
  src = '/logo/Logo-V1.png',
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={src}
      alt="SyncSphere Logo"
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{ width: pixelSize, height: pixelSize }}
      className={cn(
        "shrink-0 object-contain transition-transform duration-200 hover:scale-105 select-none pointer-events-auto",
        className
      )}
      loading="eager"
      decoding="async"
    />
  );
};
