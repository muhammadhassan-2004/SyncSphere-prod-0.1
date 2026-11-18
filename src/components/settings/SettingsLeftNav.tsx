import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Building2, Bell, Shield, ChevronRight } from 'lucide-react';
// CreditCard reserved — Billing & Subscriptions tab on hold for client requirement

export interface SettingsNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'company-profile',
    label: 'Company Profile',
    path: '/client/settings/company-profile',
    icon: <Building2 className="w-4 h-4" />,
    description: 'Logo, business info, & timezone',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/client/settings/notifications',
    icon: <Bell className="w-4 h-4" />,
    description: 'Email, push, & alert preferences',
  },
  {
    id: 'security',
    label: 'Security',
    path: '/client/settings/security',
    icon: <Shield className="w-4 h-4" />,
    description: 'Password, 2FA, & active sessions',
  },
];

/** Billing & Subscriptions nav item is on hold for client requirement. */
const HIDDEN_SETTINGS_NAV_IDS = new Set(['billing']);

export const SettingsLeftNav: React.FC = () => {
  const location = useLocation();
  const visibleItems = SETTINGS_NAV_ITEMS.filter((item) => !HIDDEN_SETTINGS_NAV_IDS.has(item.id));

  return (
    <Card className="p-3 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-1 shadow-md">
      <div className="px-3 py-2 border-b border-[var(--color-border)]/60 mb-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-secondary)] block font-semibold">
          Organization Settings
        </span>
      </div>

      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.id === 'company-profile' && location.pathname === '/client/settings');

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={`flex items-center justify-between p-3 rounded-[10px] font-mono text-xs transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--color-accent-cyan)]/20 to-blue-500/15 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] font-bold shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isActive
                    ? 'text-[var(--color-accent-cyan)] translate-x-0.5'
                    : 'text-[var(--color-text-secondary)] opacity-40'
                }`}
              />
            </NavLink>
          );
        })}
      </nav>
    </Card>
  );
};
