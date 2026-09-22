import React from 'react';
import { Card } from '@/src/components/ui/card';
import type { ServiceHealth } from '@/src/lib/firestore/systemHealth';

const dotColor: Record<ServiceHealth['status'], string> = {
  healthy: 'bg-green-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-400',
  not_monitored: 'bg-gray-500',
};

export function SystemHealthPanel({ services, loading }: { services: ServiceHealth[] | null; loading: boolean }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">System Health</h3>
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Checking…</p>}
      {!loading &&
        services?.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <span className={`w-2 h-2 rounded-full ${dotColor[s.status]}`} />
              {s.name}
            </span>
            <span className="text-[var(--color-text-secondary)]">
              {s.status === 'not_monitored' ? 'Not monitored yet' : s.detail ?? s.status}
            </span>
          </div>
        ))}
    </Card>
  );
}
