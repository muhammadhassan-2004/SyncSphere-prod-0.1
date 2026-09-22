import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { subscribeToUserProfile, updateNotificationPreference } from '@/src/lib/firestore/users';
import { NotificationPreferences } from '@/src/types/firestore';
import { SettingsLeftNav } from '@/src/components/settings/SettingsLeftNav';
import { Card } from '@/src/components/ui/card';
import {
  Bell,
  UserCheck,
  MessageSquare,
  CreditCard,
  CheckSquare,
  Sparkles,
  Mail,
  Check,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface NotificationOption {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'newApplications',
    title: 'New Applications & Proposals',
    description: 'Receive immediate alerts when a Symbiote applies to your posted project briefs or submits a proposal.',
    icon: <UserCheck className="w-5 h-5 text-[var(--color-accent-cyan)]" />,
    category: 'Talent Acquisition',
  },
  {
    key: 'messages',
    title: 'Direct Messages & Comments',
    description: 'Instant notifications for new direct messages, project comments, and team workspace chats.',
    icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
    category: 'Communication',
  },
  {
    key: 'invoiceAlerts',
    title: 'Invoice & Payment Alerts',
    description: 'Alerts for incoming invoices, milestone settlement updates, and billing receipts.',
    icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
    category: 'Finance & Billing',
  },
  {
    key: 'milestoneUpdates',
    title: 'Milestone & Deliverable Updates',
    description: 'Updates when project deliverables are submitted for review or milestones are completed.',
    icon: <CheckSquare className="w-5 h-5 text-purple-400" />,
    category: 'Project Execution',
  },
  {
    key: 'aiMatching',
    title: 'AI Matching & Talent Recommendations',
    description: 'Alerts when our AI algorithm finds high-compatibility Symbiotes matched to your project briefs.',
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    category: 'AI Engine',
  },
  {
    key: 'weeklyDigest',
    title: 'Weekly Activity & Progress Digest',
    description: 'An aggregated weekly summary of project velocity, open briefs, total expenditure, and upcoming deadlines.',
    icon: <Mail className="w-5 h-5 text-indigo-400" />,
    category: 'Reports & Analytics',
  },
];

export const NotificationsSettingsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const userId = firebaseUser?.uid || '';

  // Preferences state default to true if undefined
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    newApplications: true,
    messages: true,
    invoiceAlerts: true,
    milestoneUpdates: true,
    aiMatching: true,
    weeklyDigest: true,
  });

  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [lastSavedKey, setLastSavedKey] = useState<string | null>(null);

  // Subscribe to user profile to initialize and keep preferences in sync
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToUserProfile(userId, (profile) => {
      if (profile && profile.notificationPreferences) {
        setPrefs((prev) => ({
          ...prev,
          ...profile.notificationPreferences,
        }));
      }
    });

    return () => unsub();
  }, [userId]);

  // Handle auto-save toggle directly on click
  const handleToggle = async (key: keyof NotificationPreferences) => {
    const currentValue = prefs[key] ?? true;
    const newValue = !currentValue;

    // Optimistic UI update
    setPrefs((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    setSavingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      await updateNotificationPreference(userId, key, newValue);
      setLastSavedKey(key);

      // Reset last saved banner after 3 seconds
      setTimeout(() => {
        setLastSavedKey(null);
      }, 3000);
    } catch (err) {
      console.error(`Failed to auto-save preference for ${key}:`, err);
      // Revert optimistic update on error
      setPrefs((prev) => ({
        ...prev,
        [key]: currentValue,
      }));
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                Notification Preferences
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Configure real-time notifications, event triggers, and automated report frequency.
              </p>
            </div>
          </div>
        </div>

        {/* AUTO-SAVE STATUS INDICATOR */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auto-saves instantly on toggle</span>
        </div>
      </div>

      {/* 2. TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAV PANEL (4 COLS) */}
        <div className="lg:col-span-4 sticky top-20">
          <SettingsLeftNav />
        </div>

        {/* RIGHT CONTENT PANEL (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* TOAST FEEDBACK FOR AUTO-SAVE */}
          {lastSavedKey && (
            <div className="p-3 rounded-[10px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center justify-between gap-2 shadow-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  Preference for{' '}
                  <strong className="font-semibold underline">
                    {NOTIFICATION_OPTIONS.find((o) => o.key === lastSavedKey)?.title}
                  </strong>{' '}
                  updated & saved to Firestore.
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Auto-saved
              </span>
            </div>
          )}

          {/* MAIN TOGGLE LIST CARD */}
          <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] divide-y divide-[var(--color-border)]/60 shadow-md">
            {NOTIFICATION_OPTIONS.map((option) => {
              const isEnabled = prefs[option.key] ?? true;
              const isSaving = savingKeys[option.key] || false;

              return (
                <div
                  key={option.key}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 max-w-xl">
                    <div className="p-2.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] shrink-0 mt-0.5 group-hover:border-[var(--color-accent-cyan)]/40 transition-colors">
                      {option.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-mono text-[var(--color-text-primary)]">
                          {option.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-secondary)]">
                          {option.category}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[var(--color-text-secondary)] leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  {/* CUSTOM ACCESSIBLE TOGGLE SWITCH */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {isSaving && <Loader2 className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] animate-spin" />}
                    
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => handleToggle(option.key)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] ${
                        isEnabled
                          ? 'bg-[var(--color-accent-cyan)]'
                          : 'bg-slate-700/60'
                      }`}
                    >
                      <span className="sr-only">Toggle {option.title}</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* INFORMATIONAL FOOTER */}
          <div className="p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-start gap-3">
            <Bell className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-[var(--color-text-secondary)] leading-relaxed">
              <span className="font-bold text-[var(--color-text-primary)]">Auto-Save Notice:</span> Changes made on this page take effect immediately across all client devices and email notification services. No manual confirmation is required.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
