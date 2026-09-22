import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { OTPInput } from '@/src/components/ui/OTPInput';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { requestPasswordReset, verifyResetCode, extractOobCode } from '@/src/lib/auth/passwordReset';

export const ResetVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const navState = location.state as {
    email?: string;
    uid?: string;
    role?: string;
    oobCode?: string;
  } | null;

  const urlEmail = searchParams.get('email') || '';
  const urlOobCode =
    searchParams.get('oobCode') ||
    searchParams.get('code') ||
    searchParams.get('token') ||
    '';

  const email = (navState?.email || urlEmail || '').trim().toLowerCase();
  const rawCode = (navState?.oobCode || urlOobCode || '').trim();
  const oobCode = extractOobCode(rawCode);

  const [otpCode, setOtpCode] = useState('');
  const [directCodeInput, setDirectCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleVerify = async (codeToVerify: string) => {
    const clean = extractOobCode(codeToVerify);
    if (!clean) {
      setError('Please enter a valid reset code or full reset link.');
      return;
    }

    setVerifying(true);
    setError(null);

    const result = await verifyResetCode(clean, email);
    if (result.valid && result.email) {
      navigate('/reset/new-password', {
        state: {
          email: result.email,
          oobCode: clean,
          role: result.role,
        },
        replace: true,
      });
    } else {
      setError(
        result.error ||
          'This password reset link or code is invalid, expired, or has already been used. Please request a new code.'
      );
      setVerifying(false);
    }
  };

  // 1. If an oobCode is present in URL or state, verify and redirect to /reset/new-password immediately
  useEffect(() => {
    if (!oobCode) return;
    handleVerify(oobCode);
  }, [oobCode]);

  // 2. Automatically trigger verification when 6 digits are typed into the OTPInput
  useEffect(() => {
    if (otpCode.length === 6 && !verifying) {
      handleVerify(otpCode);
    }
  }, [otpCode]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Resend reset email
  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      // Trigger SMTP password reset dispatch
      const result = await requestPasswordReset(email);
      if (result.success) {
        setResendSuccess(true);
        setCooldown(30);
      } else {
        setError(result.error || 'Failed to resend reset email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend reset email.');
    } finally {
      setResending(false);
    }
  };

  // Manual code / link submission handler
  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = (directCodeInput || otpCode).trim();
    if (!rawInput) return;
    handleVerify(rawInput);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <SyncSphereLogo iconSize={36} textSize="xl" className="justify-center mb-4" />
          <Card className="p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-cyan)] mx-auto" />
            <div className="space-y-1">
              <h2 className="text-h3 font-bold text-[var(--color-text-primary)]">Verifying Reset Code...</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Validating your security credentials with Firebase Authentication.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Top Logo & Back Navigation */}
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

        {/* Main Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          {/* Header & Icon */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center mx-auto border border-[var(--color-accent-cyan)]/20 shadow-md">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-h2 font-bold tracking-tight text-[var(--color-text-primary)]">
                Enter Verification Code
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                We sent a 6-digit security code and reset link to:
              </p>
              <div className="inline-block px-3 py-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm font-semibold text-[var(--color-text-primary)]">
                {email || 'your registered email'}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-lg bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resend Success Banner */}
          {resendSuccess && (
            <div className="p-3.5 rounded-lg bg-[var(--color-accent-teal)]/10 border border-[var(--color-accent-teal)]/30 text-[var(--color-accent-teal)] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>New 6-digit code has been dispatched to your email inbox.</span>
            </div>
          )}

          {/* 6-Digit OTP Input Form */}
          <form onSubmit={handleManualCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-center text-xs font-medium text-[var(--color-text-secondary)]">
                Enter the 6-digit code from your email
              </label>
              <div className="flex justify-center py-1">
                <OTPInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={verifying}
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={otpCode.length < 6 || verifying}
              className="w-full justify-center text-xs"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                <>
                  Verify Code & Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Direct Link / Code Input Option */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <label className="block text-xs text-[var(--color-text-secondary)]">
              Or paste the full reset link from email:
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="https://... or paste code"
                value={directCodeInput}
                onChange={(e) => setDirectCodeInput(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!directCodeInput.trim() || verifying}
                onClick={() => directCodeInput.trim() && handleVerify(directCodeInput.trim())}
                className="whitespace-nowrap text-xs"
              >
                Verify
              </Button>
            </div>
          </div>

          {/* Resend Action */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
            <span className="text-[var(--color-text-secondary)]">Didn't receive the email?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-[var(--color-accent-cyan)] font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Resend Code
                </>
              )}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
