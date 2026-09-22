import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { PasswordInput } from '@/src/components/ui/input';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { PasswordRequirementChecklist } from '@/src/components/ui/PasswordRequirementChecklist';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { verifyResetCode, completePasswordReset, extractOobCode } from '@/src/lib/auth/passwordReset';

export const ResetNewPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setRole, login } = useAuth();

  // Extract oobCode from URL parameters or location state
  const rawCode =
    searchParams.get('oobCode') ||
    searchParams.get('token') ||
    searchParams.get('code') ||
    (location.state as any)?.oobCode ||
    '';

  const stateEmail = (location.state as any)?.email || '';
  const urlEmail = searchParams.get('email') || '';
  const initialEmail = (stateEmail || urlEmail).trim().toLowerCase();

  const stateRole = (location.state as any)?.role as UserRole | undefined;

  const oobCode = extractOobCode(rawCode);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string>(initialEmail);
  const [resolvedRole, setResolvedRole] = useState<UserRole>(stateRole || 'client');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate reset token on initial mount using Firebase Auth
  useEffect(() => {
    let isMounted = true;

    const validateAccess = async () => {
      setVerifyingToken(true);
      setTokenError(null);

      if (!oobCode) {
        if (isMounted) {
          setVerifyingToken(false);
          setTokenError(
            'Missing password reset authorization. For your account security, password changes require clicking the link in your email.'
          );
        }
        return;
      }

      try {
        const result = await verifyResetCode(oobCode, initialEmail || verifiedEmail);
        if (!isMounted) return;

        if (!result.valid || !result.email) {
          setTokenError(
            result.error ||
              'This password reset link is invalid, expired, or has already been used. Please request a new password reset link.'
          );
        } else {
          setVerifiedEmail(result.email);
          if (result.role) {
            setResolvedRole(result.role);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Token validation error:', err);
          setTokenError('Invalid or expired password reset link. Please request a new one.');
        }
      } finally {
        if (isMounted) setVerifyingToken(false);
      }
    };

    validateAccess();

    return () => {
      isMounted = false;
    };
  }, [oobCode, initialEmail]);

  // Live Requirement Checklist Validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;
  const isFormValid = isPasswordValid && passwordsMatch && !loading && !verifyingToken && !tokenError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !verifiedEmail || !oobCode) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const resetResult = await completePasswordReset(
        oobCode,
        verifiedEmail,
        newPassword
      );

      if (!resetResult.success) {
        setSubmitError(
          resetResult.error || 'Failed to update password. Please check the requirements and try again.'
        );
        setLoading(false);
        return;
      }

      const finalRole: UserRole = resetResult.role || resolvedRole || 'client';
      setSuccess(true);

      // Establish pure authenticated session in AuthContext
      setRole(finalRole);

      // Redirect user to their own role-based dashboard
      setTimeout(() => {
        navigate(`/${finalRole}/dashboard`, { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error('Reset new password error:', err);
      setSubmitError(err?.message || 'An unexpected error occurred while resetting your password.');
    } finally {
      setLoading(false);
    }
  };

  // State 1: Verifying Reset Token Loader
  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <SyncSphereLogo iconSize={36} textSize="xl" className="justify-center mb-4" />
          <Card className="p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-cyan)] mx-auto" />
            <div className="space-y-1">
              <h2 className="text-h3 font-bold text-[var(--color-text-primary)]">Verifying Reset Authorization...</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Validating your secure reset link with Firebase Authentication.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // State 2: Invalid or Missing Token Error State
  if (tokenError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 focus:outline-none">
              <SyncSphereLogo iconSize={32} textSize="lg" />
            </Link>
            <Link
              to="/login"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Login</span>
            </Link>
          </div>

          <Card className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger-red)]/10 text-[var(--color-danger-red)] flex items-center justify-center mx-auto border border-[var(--color-danger-red)]/20 shadow-md">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-h2 font-bold text-[var(--color-text-primary)]">
                Invalid or Expired Reset Link
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
                {tokenError}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-left space-y-1.5 text-xs text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text-primary)]">Security Notice:</p>
              <p className="leading-relaxed">
                To protect user accounts from unauthorized access, password changes require clicking the verified link sent to your email. Please request a fresh reset link below.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link to="/forgot-password" className="block w-full">
                <Button variant="primary" className="w-full justify-center font-bold gap-2">
                  <span>Request New Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login" className="block w-full">
                <Button variant="secondary" className="w-full justify-center text-xs">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // State 3: Valid Token Form View
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Top Logo & Navigation Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 focus:outline-none">
            <SyncSphereLogo iconSize={32} textSize="lg" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Login</span>
            </Link>
            <span className="text-[var(--color-border)]">•</span>
            <Link
              to="/"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <span>Home</span>
            </Link>
          </div>
        </div>

        {/* Header Block & Green Checkmark-Circle Badge */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-success-green)]/10 text-[var(--color-success-green)] flex items-center justify-center mx-auto border border-[var(--color-success-green)]/20 shadow-lg shadow-[var(--color-success-green)]/5">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-h1 font-bold tracking-tight text-[var(--color-text-primary)]">
              Set a new password
            </h1>
            <p className="text-body text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
              Email verified for{' '}
              <span className="font-semibold text-[var(--color-text-primary)] break-all">
                {verifiedEmail}
              </span>
              . Enter your new password below.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {submitError && (
          <div className="p-3.5 rounded-lg bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{submitError}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-lg bg-[var(--color-success-green)]/10 border border-[var(--color-success-green)]/30 text-[var(--color-success-green)] text-xs flex items-center justify-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Password updated successfully! Directing you to your dashboard...</span>
          </div>
        )}

        {/* Main Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Live Password Requirement Checklist */}
            <PasswordRequirementChecklist
              password={newPassword}
              confirmPassword={confirmPassword}
            />

            {/* Submit Action Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={!isFormValid || success}
              className="w-full mt-2 justify-center font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                <>
                  Save New Password & Sign In
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer link inside card */}
          <div className="pt-2 text-center text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-[var(--color-accent-cyan)] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
