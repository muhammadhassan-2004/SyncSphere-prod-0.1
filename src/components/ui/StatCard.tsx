import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { ResponsiveStatValue } from './ResponsiveStatValue';

export interface StatCardProps {
  label: string;
  value: string | number | undefined;
  loading?: boolean;
  icon: LucideIcon;
  accent: 'blue' | 'green' | 'cyan' | 'amber' | 'red' | 'purple';
  note?: string;
}

const accentClasses: Record<StatCardProps['accent'], string> = {
  blue: 'bg-blue-500/15 text-blue-400',
  green: 'bg-green-500/15 text-green-400',
  cyan: 'bg-cyan-500/15 text-cyan-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
  purple: 'bg-purple-500/15 text-purple-400',
};

export function StatCard({ label, value, loading, icon: Icon, accent, note }: StatCardProps) {
  return (
    <Card className="p-4 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm text-[var(--color-text-secondary)] truncate font-medium">{label}</span>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${accentClasses[accent]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="min-w-0 max-w-full">
        {loading ? (
          <span className="inline-block w-16 h-8 bg-white/10 rounded animate-pulse" />
        ) : (
          <ResponsiveStatValue value={value} />
        )}
      </div>
      {note && <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5 truncate">{note}</p>}
    </Card>
  );
}

