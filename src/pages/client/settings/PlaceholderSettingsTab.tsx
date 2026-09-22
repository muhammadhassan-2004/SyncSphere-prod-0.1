import React from 'react';
import { SettingsLeftNav } from '@/src/components/settings/SettingsLeftNav';
import { Card } from '@/src/components/ui/card';
import { Bell, Shield, CreditCard, Sparkles } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  icon: 'notifications' | 'security' | 'billing';
}

export const PlaceholderSettingsTab: React.FC<Props> = ({ title, description, icon }) => {
  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              {icon === 'notifications' && <Bell className="w-5 h-5" />}
              {icon === 'security' && <Shield className="w-5 h-5" />}
              {icon === 'billing' && <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                {title}
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 sticky top-20">
          <SettingsLeftNav />
        </div>

        <div className="lg:col-span-8">
          <Card className="p-12 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] text-center space-y-4 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] flex items-center justify-center mx-auto">
              {icon === 'notifications' && <Bell className="w-6 h-6" />}
              {icon === 'security' && <Shield className="w-6 h-6" />}
              {icon === 'billing' && <CreditCard className="w-6 h-6" />}
            </div>
            <h3 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
              {title} Section
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
              {description}. This section configuration panel is initialized and ready for customization.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
