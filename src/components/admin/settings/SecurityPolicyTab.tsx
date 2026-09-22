import React, { useEffect, useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
  getSecurityPolicySettings,
  setSecurityPolicySettings,
  type SecurityPolicySettings,
} from '@/src/lib/firestore/adminSettings';
import { useAuth } from '@/src/context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  KeyRound,
  Fingerprint,
  RefreshCw,
  FileCheck,
  Check,
} from 'lucide-react';

export function SecurityPolicyTab() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityPolicySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSecurityPolicySettings()
      .then((res) => setData(res))
      .catch((err) => {
        console.error('Failed to load security policy settings:', err);
        setError('Failed to load security policy configuration.');
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await setSecurityPolicySettings(data, user.uid);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error('Save security settings error:', err);
      setError(err?.message || 'Failed to persist security policies.');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400 animate-spin" />
        <span>Loading security governance policies…</span>
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
            <span>Platform security policies updated and synchronized.</span>
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

      {/* SECTION 1: AUTHENTICATION & PASSWORD COMPLEXITY */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-5 shadow-md">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Authentication & Password Complexity</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Enforced requirements for user account credentials across registration and reset flows.
            </p>
          </div>
          <Badge variant="cyan" className="text-[11px]">
            Policy Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              Minimum Password Length
            </label>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Minimum character threshold for client, freelancer, and administrator passcodes.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min="6"
                max="32"
                value={data.passwordMinLength}
                onChange={(e) =>
                  setData({ ...data, passwordMinLength: parseInt(e.target.value, 10) || 8 })
                }
                className="input-field w-28 font-mono text-sm"
                required
              />
              <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
                (Standard: 8 chars)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              Enforced Complexity Rules
            </label>
            <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Uppercase & lowercase alphabetical characters</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>At least one numerical digit (0–9)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Progressive brute-force lockout throttling</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* SECTION 2: IDENTITY VERIFICATION POLICY */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span>Mandatory Email Verification</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
              Requires new users to verify their email address before they can submit proposals or approve milestone contracts.
            </p>
          </div>

          {/* Clean Solid Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-xs font-mono font-semibold ${
                data.requireEmailVerification ? 'text-cyan-400' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {data.requireEmailVerification ? 'Enforced' : 'Optional'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={data.requireEmailVerification}
              onClick={() =>
                setData({ ...data, requireEmailVerification: !data.requireEmailVerification })
              }
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 p-0.5 ${
                data.requireEmailVerification ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <span
                className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  data.requireEmailVerification ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* SECTION 3: CRYPTOGRAPHIC SESSION INTEGRITY */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <div className="border-b border-[var(--color-border)] pb-3">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>Cryptographic Session Integrity</span>
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Real-time token lifecycle and transport security configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--color-text-tertiary)]">
              Token Architecture
            </span>
            <p className="text-sm font-mono font-semibold text-emerald-400">
              Firebase JWT (RS256)
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              60-minute automatic rotation
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--color-text-tertiary)]">
              Revocation Protocol
            </span>
            <p className="text-sm font-mono font-semibold text-cyan-400">
              Immediate Invalidation
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Triggered on password reset
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--color-text-tertiary)]">
              Transport Security
            </span>
            <p className="text-sm font-mono font-semibold text-purple-400">
              TLS 1.3 / HTTPS
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Strict-Transport-Security
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              Refresh Token Maximum Retention Window
            </label>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Maximum days an idle session remains valid before requiring full re-authentication.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="90"
              value={data.sessionExpiryDays}
              onChange={(e) =>
                setData({ ...data, sessionExpiryDays: parseInt(e.target.value, 10) || 30 })
              }
              className="input-field w-20 text-center font-mono text-sm"
              required
            />
            <span className="text-xs font-mono text-[var(--color-text-tertiary)]">Days</span>
          </div>
        </div>
      </Card>

      {/* SECTION 4: ADMINISTRATIVE AUDIT COMPLIANCE */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Administrative Privilege Tier: Super Administrator
            </h3>
          </div>
          <Badge variant="green" className="text-[11px]">
            Audited & Active
          </Badge>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          All configuration changes and security policy modifications are cryptographically tied to your administrator UID and written directly into the immutable platform audit trail (<code className="text-cyan-400 font-mono">admin_audit_logs</code>).
        </p>
      </Card>

      {/* SAVE ACTION BUTTON */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary-gradient px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? 'Saving Security Policies…' : 'Save Security Policies'}
        </button>
      </div>
    </form>
  );
}
