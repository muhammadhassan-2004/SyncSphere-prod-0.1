import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Lock,
  User,
  Building,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Briefcase,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { createAdminUser, CreateAdminUserParams } from '@/src/lib/firestore/adminUsers';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; role: string; displayName: string }) => void;
  currentAdminUid: string;
  currentAdminEmail?: string;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAdminUid,
  currentAdminEmail,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'symbiote' | 'admin'>('client');
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleCopyCredentials = () => {
    const text = `Email: ${email}\nTemporary Password: ${password}\nRole: ${role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createAdminUser({
        email: email.trim(),
        password,
        displayName: displayName.trim() || email.split('@')[0],
        role,
        companyName: role === 'client' ? companyName.trim() : undefined,
        title: role === 'symbiote' ? title.trim() : undefined,
        adminUid: currentAdminUid,
        adminEmail: currentAdminEmail,
      });

      onSuccess({
        email: email.trim(),
        role,
        displayName: displayName.trim() || email.split('@')[0],
      });
      handleClose();
    } catch (err: any) {
      console.error('Error creating user account:', err);
      let msg = err.message || 'Failed to create user account';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered in the system.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'The email address format is invalid.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please use at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setRole('client');
    setCompanyName('');
    setTitle('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <Card className="w-full max-w-lg bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Platform User</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Create a verified Firebase Auth account and profile document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[var(--color-text-secondary)] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Account Role *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  role === 'client'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                    : 'border-[var(--color-border)] bg-black/20 text-[var(--color-text-secondary)] hover:border-white/20'
                }`}
              >
                <Building className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Client</span>
                <span className="text-[10px] opacity-70">Hires freelancers</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('symbiote')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  role === 'symbiote'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                    : 'border-[var(--color-border)] bg-black/20 text-[var(--color-text-secondary)] hover:border-white/20'
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Freelancer</span>
                <span className="text-[10px] opacity-70">Delivers work</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'border-red-500 bg-red-500/15 text-red-200'
                    : 'border-[var(--color-border)] bg-black/20 text-[var(--color-text-secondary)] hover:border-white/20'
                }`}
              >
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold">Admin</span>
                <span className="text-[10px] opacity-70">Full platform control</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
              Full Name / Display Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
              <input
                type="email"
                name="newEmail"
                autoComplete="off"
                required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>
          </div>

          {/* Temporary Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Temporary Password *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>
            <PasswordInput
              name="newPassword"
              autoComplete="new-password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-[var(--color-text-secondary)]" />}
              extraRightAction={
                password ? (
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="p-1 text-[var(--color-text-secondary)] hover:text-white rounded cursor-pointer"
                    title="Copy credentials"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                ) : null
              }
              className="py-2 bg-black/40 border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] font-mono"
            />
          </div>

          {/* Role-Specific Customization */}
          {role === 'client' && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Company / Organization Name (Optional)
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="e.g. Acme Innovations Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>
          )}

          {role === 'symbiote' && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Professional Title / Headline (Optional)
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="e.g. Senior AI / LLM Architect"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-accent-gradient text-white hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Creating User...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
