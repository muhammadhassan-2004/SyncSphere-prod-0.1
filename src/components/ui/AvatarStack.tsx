import React from 'react';
import { Avatar } from '@/src/components/ui/avatar';

export interface AvatarStackUser {
  name: string;
  avatarUrl?: string;
  src?: string;
  initials?: string;
  role?: string;
}

export interface AvatarStackProps {
  names?: string[];
  items?: (AvatarStackUser | string)[];
  max?: number;
  size?: 'xs' | 'sm';
}

export function AvatarStack({ names, items, max = 3, size = 'xs' }: AvatarStackProps) {
  // Normalize items from either `items` or `names` prop
  const sourceList = items || names || [];
  const normalized: AvatarStackUser[] = sourceList.map((item) => {
    if (typeof item === 'string') {
      return { name: item };
    }
    return item;
  });

  if (!normalized || normalized.length === 0) {
    return <span className="text-[var(--color-text-tertiary)] text-xs italic">Unassigned</span>;
  }

  const visible = normalized.slice(0, max);
  const overflow = normalized.length - visible.length;

  const sizeDimensions = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[10px]';

  return (
    <div className="flex -space-x-2 items-center">
      {visible.map((user, i) => {
        const imageSrc = user.avatarUrl || user.src;
        return (
          <div
            key={i}
            className="relative rounded-full ring-2 ring-[var(--color-background,#0A0E14)] shrink-0 transition-transform hover:scale-105 hover:z-10"
            title={user.name + (user.role ? ` (${user.role})` : '')}
          >
            <Avatar
              name={user.name}
              initials={user.initials}
              src={imageSrc}
              size={size}
              className={`${sizeDimensions} border border-white/10`}
            />
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className={`${sizeDimensions} rounded-full bg-white/10 ring-2 ring-[var(--color-background,#0A0E14)] border border-white/10 flex items-center justify-center text-[10px] text-[var(--color-text-primary)] shrink-0 font-bold`}
          title={`${overflow} more team members`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
