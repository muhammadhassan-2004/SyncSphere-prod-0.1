import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminProfileTab } from '@/src/components/admin/settings/AdminProfileTab';
import { PlatformOperationsTab } from '@/src/components/admin/settings/PlatformOperationsTab';
import { SecurityPolicyTab } from '@/src/components/admin/settings/SecurityPolicyTab';
import { Settings, User, Sliders, ShieldCheck } from 'lucide-react';

const tabs = [
  { key: 'adminProfile', label: 'My Admin Profile', icon: User, component: AdminProfileTab },
  { key: 'operations', label: 'Platform & Marketplace', icon: Sliders, component: PlatformOperationsTab },
  { key: 'security', label: 'Security Policy', icon: ShieldCheck, component: SecurityPolicyTab },
] as const;

type TabKey = typeof tabs[number]['key'];

export function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  
  // Safe tab resolver: fallback safely to 'adminProfile' if tab param is invalid, unknown, or legacy
  const resolvedTab: TabKey = tabs.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'adminProfile';
  const [active, setActive] = useState<TabKey>(resolvedTab);

  // Sync state if URL query param changes externally
  useEffect(() => {
    if (rawTab && tabs.some((t) => t.key === rawTab)) {
      setActive(rawTab as TabKey);
    }
  }, [rawTab]);

  const handleTabChange = (key: TabKey) => {
    setActive(key);
    setSearchParams({ tab: key });
  };

  // Safe component resolver with default fallback to AdminProfileTab to prevent runtime undefined crashes
  const ActiveComponent = tabs.find((t) => t.key === active)?.component || AdminProfileTab;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            <span>Admin Settings</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Official administrative identity, platform & marketplace parameters, and security policies.
          </p>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 rounded-t-lg'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="pt-2">
        <ActiveComponent />
      </div>
    </div>
  );
}
