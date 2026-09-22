import React from 'react';

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (!names || names.length === 0) {
    return <span className="text-[var(--color-text-tertiary)] text-xs">Unassigned</span>;
  }
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;

  return (
    <div className="flex -space-x-2 items-center">
      {visible.map((name, i) => {
        const initials = name
          ? name
              .split(' ')
              .filter(Boolean)
              .map((s) => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : '??';
        return (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 border-2 border-[var(--color-background,#0B0F17)] flex items-center justify-center text-[10px] font-bold text-black shrink-0"
            title={name}
          >
            {initials}
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[var(--color-background,#0B0F17)] flex items-center justify-center text-[10px] text-[var(--color-text-primary)] shrink-0 font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
}
