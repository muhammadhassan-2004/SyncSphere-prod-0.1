import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = FolderOpen, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[var(--color-text-secondary)]" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      {description && <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary-gradient mt-4">{actionLabel}</button>
      )}
    </div>
  );
}
