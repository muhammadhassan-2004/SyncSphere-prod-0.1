import React, { useState, useEffect } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { Badge } from '@/src/components/ui/badge';
import { useAuth } from '@/src/context/AuthContext';
import { updateUserProfile, subscribeToUserProfile } from '@/src/lib/firestore/users';
import { uploadAvatarFile } from '@/src/lib/firebase';
import { requestPasswordReset } from '@/src/lib/auth/passwordReset';
import { Camera, Upload, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, User, KeyRound, Mail } from 'lucide-react';

export function AdminProfileTab() {
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || userProfile?.uid || '';

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [title, setTitle] = useState<string>('Platform Super Administrator');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Reset State
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUserProfile(userId, (p) => {
      if (p) {
        const full = p.fullName || p.displayName || '';
        const parts = full.split(' ').filter(Boolean);
        setAvatarUrl(p.avatarUrl || '');
        setFirstName(p.firstName || parts[0] || 'Admin');
        setLastName(p.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : ''));
        setEmail(p.email || firebaseUser?.email || '');
        setTitle(p.title || p.jobTitle || 'Platform Super Administrator');
      } else {
        const full = userProfile?.fullName || firebaseUser?.displayName || 'Admin';
        const parts = full.split(' ').filter(Boolean);
        setAvatarUrl(userProfile?.avatarUrl || '');
        setFirstName(userProfile?.firstName || parts[0] || 'Admin');
        setLastName(userProfile?.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : ''));
        setEmail(firebaseUser?.email || 'admin@syncsphere.io');
        setTitle('Platform Super Administrator');
      }
    });
    return () => unsub();
  }, [userId, firebaseUser, userProfile]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar image size must be less than 5MB.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatarFile(userId, file);
      setAvatarUrl(url);
      await updateUserProfile(userId, { avatarUrl: url });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.warn('Avatar upload fallback error:', err);
      setError(err?.message || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    try {
      await updateUserProfile(userId, { avatarUrl: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError('Failed to remove avatar.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateUserProfile(userId, {
        displayName,
        fullName: displayName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim(),
        jobTitle: title.trim(),
        avatarUrl: avatarUrl || '',
        avatarInitials: `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase(),
        role: 'admin',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save admin profile.');
    } finally {
      setSaving(false);
    }
  };

  // Dispatches reset code via Teams SMTP (replacing legacy sendPasswordResetEmail)
  const handleSendPasswordReset = async () => {
    if (!email) return;
    setSendingReset(true);
    setError(null);
    setResetSent(false);
    try {
      const result = await requestPasswordReset(email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to dispatch password reset email via Teams SMTP.');
      }
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      console.error('Password reset dispatch failed:', err);
      setError(err?.message || 'Failed to dispatch password reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || 'Admin User';

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Administrator profile updated successfully.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400">Saved</span>
        </div>
      )}

      {resetSent && (
        <div className="p-4 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Password reset link dispatched to {email}. Check your inbox.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-cyan-400">Dispatched</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AVATAR & IDENTITY SECTION */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Administrator Profile & Identity</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Your official administrator profile appears across the topbar, audit trails, and platform logs.
            </p>
          </div>
          <Badge variant="cyan" className="gap-1.5 py-1 px-3">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Super Administrator</span>
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <Avatar
              name={fullName}
              src={avatarUrl}
              size="lg"
              className="w-24 h-24 text-2xl border-2 border-cyan-400 shadow-lg"
            />
            <label
              htmlFor="admin-avatar-input"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-cyan-400 text-slate-950 cursor-pointer shadow-md hover:scale-110 transition-transform"
              title="Upload New Photo"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="admin-avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
          </div>

          {/* Buttons */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <label
                htmlFor="admin-avatar-input"
                className={`h-9 px-4 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] hover:border-cyan-400 text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-2 cursor-pointer transition-colors ${
                  uploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>{uploading ? 'Uploading Photo…' : 'Change Avatar'}</span>
              </label>

              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  className="h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Supported formats: JPG, PNG. Image will be centered and scaled cleanly.
            </p>
          </div>
        </div>
      </Card>

      {/* ADMIN DETAILS SECTION */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          Account Credentials
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field w-full mt-1.5"
              placeholder="First Name"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field w-full mt-1.5"
              placeholder="Last Name"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Administrator Login Email</label>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">🔒 Fixed / Read-Only</span>
            </div>
            <input
              type="email"
              value={email}
              readOnly
              className="input-field w-full mt-1.5 cursor-not-allowed opacity-80 bg-[var(--color-background)]/50"
            />
            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
              Primary cryptographic login identity.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Department / Administrative Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full mt-1.5"
              placeholder="e.g. Platform Super Administrator"
            />
          </div>
        </div>
      </Card>

      {/* SECURITY & PASSWORD RESET SECTION */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Password & Authentication</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Update your administrator password securely via email verification link.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={sendingReset || !email}
            onClick={handleSendPasswordReset}
            className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
          >
            {sendingReset ? 'Dispatching…' : 'Send Password Reset Email'}
          </Button>
        </div>

        {resetSent && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Password reset OTP code dispatched to {email} via Teams SMTP.</span>
          </div>
        )}
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary-gradient px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-sm"
        >
          {saving ? 'Saving Profile…' : 'Save Admin Profile'}
        </button>
      </div>
    </form>
  );
}
