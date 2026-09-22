import React from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, BarChart3, ScrollText, ChevronRight } from 'lucide-react';
import { Card } from '@/src/components/ui/card';

const actions = [
  { label: 'Manage Users', to: '/admin/users', icon: Users },
  { label: 'View Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Platform Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'System Logs', to: '/admin/audit-logs', icon: ScrollText },
];

export function QuickActionsPanel() {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Quick Actions</h3>
      <div className="space-y-1">
        {actions.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <span className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
              <Icon className="w-4 h-4 text-cyan-400" />
              {label}
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-white transition-colors" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
