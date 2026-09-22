import React, { useEffect, useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
  getPlatformOperationsSettings,
  setPlatformOperationsSettings,
  type PlatformOperationsSettings,
} from '@/src/lib/firestore/adminSettings';
import { useAuth } from '@/src/context/AuthContext';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Sparkles,
  UploadCloud,
  Power,
  CreditCard,
  Crown,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export function PlatformOperationsTab() {
  const { user } = useAuth();
  const [data, setData] = useState<PlatformOperationsSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformOperationsSettings()
      .then((settings) => setData(settings))
      .catch((err) => {
        console.error('Failed to load platform operations settings:', err);
        setError('Failed to load settings from database.');
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await setPlatformOperationsSettings(data, user.uid);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error('Save operations settings error:', err);
      setError(err?.message || 'Failed to persist platform settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
        <Sliders className="w-4 h-4 text-cyan-400 animate-spin" />
        <span>Loading platform operational parameters…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Toast Notifications */}
      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Platform operations and subscription plans successfully updated.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400">Saved</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: MARKETPLACE & PLATFORM ECONOMICS */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-5 shadow-md">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span>Marketplace & Platform Economics</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Financial commission structure, AI semantic matching threshold, and media upload caps.
            </p>
          </div>
          <Badge variant="cyan" className="gap-1 text-[11px]">
            Live Parameters
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Commission Rate */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Marketplace Fee</span>
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {data.commissionRatePercent}%
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
              Platform processing fee deducted upon client milestone invoice settlements.
            </p>
            <div className="pt-1">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={data.commissionRatePercent}
                onChange={(e) =>
                  setData({ ...data, commissionRatePercent: parseFloat(e.target.value) || 0 })
                }
                className="input-field w-full font-mono text-sm"
                required
              />
            </div>
          </div>

          {/* AI Matching Min Score */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Matching Min Score</span>
              </label>
              <span className="text-xs font-mono font-bold text-purple-400">
                {data.aiMatchingMinScore}%
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
              Strict compatibility filter; candidates scoring lower are completely hidden from recommendations.
            </p>
            <div className="pt-1">
              <input
                type="number"
                min="10"
                max="100"
                value={data.aiMatchingMinScore}
                onChange={(e) =>
                  setData({ ...data, aiMatchingMinScore: parseInt(e.target.value, 10) || 70 })
                }
                className="input-field w-full font-mono text-sm"
                required
              />
            </div>
          </div>

          {/* Max File Upload Size */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Max Upload Cap</span>
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {data.maxFileUploadSizeMb} MB
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
              Single document & media upload cap for project briefs and submissions.
            </p>
            <div className="pt-1">
              <input
                type="number"
                min="5"
                max="100"
                value={data.maxFileUploadSizeMb}
                onChange={(e) =>
                  setData({ ...data, maxFileUploadSizeMb: parseInt(e.target.value, 10) || 25 })
                }
                className="input-field w-full font-mono text-sm"
                required
              />
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 2: PLATFORM PLANS & SUBSCRIPTION TIERS (SAAS MONETIZATION) */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>Platform Plans & Subscription Tiers</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Configure recurring SaaS subscription plans for freelancers and enterprise clients.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--color-text-secondary)]">
              {data.enableSubscriptions ? 'Subscriptions Active' : 'Free Platform Mode'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={data.enableSubscriptions}
              onClick={() => setData({ ...data, enableSubscriptions: !data.enableSubscriptions })}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 p-0.5 ${
                data.enableSubscriptions ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <span
                className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  data.enableSubscriptions ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Freelancer Pro Plan */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Freelancer Pro Membership
                </span>
              </div>
              <Badge variant="amber" className="text-[10px]">
                Specialist Tier
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
              Monthly fee charged to specialists for verified badge, unlimited applications, and priority AI matching.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-bold font-mono text-[var(--color-text-primary)]">$</span>
              <input
                type="number"
                min="0"
                max="999"
                value={data.freelancerProMonthlyFee ?? 29}
                onChange={(e) =>
                  setData({ ...data, freelancerProMonthlyFee: parseInt(e.target.value, 10) || 0 })
                }
                className="input-field w-28 font-mono text-sm"
                required
              />
              <span className="text-xs font-mono text-[var(--color-text-tertiary)]">/ Month</span>
            </div>
          </div>

          {/* Client Enterprise Plan */}
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Client Enterprise Tier
                </span>
              </div>
              <Badge variant="purple" className="text-[10px]">
                Organization Tier
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
              Monthly organization fee for dedicated account management, custom billing invoices, and 0% project fee.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-bold font-mono text-[var(--color-text-primary)]">$</span>
              <input
                type="number"
                min="0"
                max="4999"
                value={data.clientEnterpriseMonthlyFee ?? 199}
                onChange={(e) =>
                  setData({ ...data, clientEnterpriseMonthlyFee: parseInt(e.target.value, 10) || 0 })
                }
                className="input-field w-28 font-mono text-sm"
                required
              />
              <span className="text-xs font-mono text-[var(--color-text-tertiary)]">/ Month</span>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 3: SYSTEM AVAILABILITY & MAINTENANCE */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Power className={`w-4 h-4 ${data.maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>Platform Maintenance Mode</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
              When enabled, incoming public traffic receives a graceful maintenance notice.
              Super Administrators retain complete access to all panels and database consoles.
            </p>
          </div>

          {/* Clean Solid Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-xs font-mono font-semibold ${
                data.maintenanceMode ? 'text-amber-400' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {data.maintenanceMode ? 'Maintenance ACTIVE' : 'Normal Operation'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={data.maintenanceMode}
              onClick={() => setData({ ...data, maintenanceMode: !data.maintenanceMode })}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 p-0.5 ${
                data.maintenanceMode ? 'bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <span
                className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  data.maintenanceMode ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {data.maintenanceMode && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Warning: Non-admin users attempting to connect will see a maintenance notice.</span>
          </div>
        )}
      </Card>

      {/* SAVE ACTION BUTTON */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary-gradient px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? 'Saving Operations Settings…' : 'Save Operations Settings'}
        </button>
      </div>
    </form>
  );
}
