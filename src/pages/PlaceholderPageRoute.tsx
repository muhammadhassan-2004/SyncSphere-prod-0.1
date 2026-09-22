import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import { Sparkles, Layers } from 'lucide-react';

interface PlaceholderPageRouteProps {
  title: string;
  role: 'client' | 'symbiote' | 'admin';
}

export const PlaceholderPageRoute: React.FC<PlaceholderPageRouteProps> = ({ title, role }) => {
  const location = useLocation();

  const variantMap = {
    client: 'blue' as const,
    symbiote: 'green' as const,
    admin: 'red' as const,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-h1">{title}</h1>
          <p className="text-caption font-mono">Route: {location.pathname}</p>
        </div>
        <StatusPill variant={variantMap[role]} label={`${role.toUpperCase()} PORTAL`} />
      </div>

      <Card className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-accent-cyan)]">
          <Layers className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-h2">{title} Workspace</h2>
          <p className="text-caption max-w-md mx-auto">
            This nested view (<span className="font-mono text-[var(--color-accent-cyan)]">{location.pathname}</span>) is rendered cleanly inside the {role.toUpperCase()} PortalShell with full persistent navigation.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <StatusPill variant="gray" label="Placeholder View - Prepared for Next Phase" />
        </div>
      </Card>
    </div>
  );
};
