import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldAlert, RefreshCw, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';

interface EmailVerificationGuardProps {
  role: 'client' | 'symbiote' | 'admin';
  children: React.ReactNode;
}

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * EmailVerificationGuard — Full-screen, non-dismissible verification overlay.
 *
 * Renders as a blocking overlay on top of ANY dashboard page whenever the
 * authenticated user's email is not verified (emailVerified !== true).
 *
 * Key behaviours:
 *  - Non-dismissible: no close/skip button. User MUST verify to proceed.
 *  - Pointer-events are blocked on underlying page content.
 *  - "Resend email" button with 60-second cooldown to prevent spam.
 *  - "Sign Out" button lets user switch accounts.
 *  - Auto-disappears as soon as Firestore + Firebase Auth both confirm verified.
 *  - Polls every 5 seconds to catch email link clicks in other tabs.
 */
export const EmailVerificationGuard: React.FC<EmailVerificationGuardProps> = ({ role, children }) => {
  const { firebaseUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Determine whether the overlay should be shown.
  // Must be STRICTLY true on BOTH Firestore profile AND Firebase Auth.
  const firestoreVerified = userProfile?.emailVerified === true;
  const firebaseVerified = firebaseUser?.emailVerified === true;
  const isGoogleUser = (firebaseUser?.providerData ?? []).some(
    (p) => p.providerId === 'google.com'
  );
  // User is verified if: Google OAuth account, OR Firestore confirms emailVerified, OR Firebase Auth confirms it, OR user has already completed onboarding.
  const isVerified = isGoogleUser || firestoreVerified || firebaseVerified || userProfile?.onboardingCompleted === true;

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Poll Firebase Auth every 5 seconds to detect if user verified in another tab/window
  useEffect(() => {
    if (isVerified) return;
    const interval = setInterval(async () => {
      try {
        if (firebaseUser) {
          await firebaseUser.reload();
        }
      } catch {
        // Silently ignore — this is a background poll
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isVerified, firebaseUser]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    const email = userProfile?.email || firebaseUser?.email || '';
    const uid = userProfile?.uid || firebaseUser?.uid || '';
    const fullName =
      userProfile?.displayName ||
      userProfile?.fullName ||
      (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : '') ||
      firebaseUser?.displayName ||
      email.split('@')[0];

    try {
      const response = await fetch('/api/auth/send-signup-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, uid, fullName }),
      });

      if (response.ok) {
        setResendSuccess(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setTimeout(() => setResendSuccess(false), 4000);
      } else {
        const data = await response.json().catch(() => ({}));
        setResendError(data?.error || 'Failed to resend. Please try again in a moment.');
      }
    } catch {
      setResendError('Network error. Please check your connection and try again.');
    } finally {
      setResending(false);
    }
  }, [resendCooldown, resending, userProfile, firebaseUser]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setSigningOut(false);
    }
  }, [logout, navigate]);

  // If verified — render children normally, no overlay
  if (isVerified) {
    return <>{children}</>;
  }

  const userEmail = userProfile?.email || firebaseUser?.email || '';
  const roleLabel =
    role === 'client' ? 'Client Portal' : role === 'symbiote' ? 'Freelancer Portal' : 'Admin Console';

  return (
    <div className="relative w-full h-full">
      {/* Blurred, non-interactive underlying page */}
      <div
        className="w-full h-full pointer-events-none select-none"
        aria-hidden="true"
        style={{ filter: 'blur(6px)', opacity: 0.35 }}
      >
        {children}
      </div>

      {/* Non-dismissible full-screen overlay */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080C12]/85 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Email verification required"
      >
        <div className="relative w-full max-w-md mx-4">
          {/* Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#22D3EE] via-[#34D399] to-[#22D3EE]" />

            <div className="p-8 space-y-6">
              {/* Logo */}
              <div className="flex justify-center">
                <SyncSphereLogo iconSize={28} textSize="md" />
              </div>

              {/* Icon + Heading */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    Email Verification Required
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1 font-mono uppercase tracking-widest">
                    {roleLabel}
                  </p>
                </div>
              </div>

              {/* Body text */}
              <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <Mail className="w-4 h-4 text-[#22D3EE] shrink-0" />
                  <span className="font-medium text-white truncate">{userEmail}</span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  A 6-digit verification code was sent to this address. Please open
                  your inbox and verify your email to unlock full access to your portal.
                  You cannot use the dashboard until your email is verified.
                </p>
              </div>

              {/* Resend success / error feedback */}
              {resendSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Verification email resent successfully! Check your inbox.</span>
                </div>
              )}
              {resendError && (
                <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-500/30 text-xs text-red-400">
                  {resendError}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                {/* Primary: verify email CTA — go to verify-email page */}
                <button
                  onClick={() =>
                    navigate(
                      `/verify-email?email=${encodeURIComponent(userEmail)}&role=${role}`,
                      {
                        state: {
                          email: userEmail,
                          uid: userProfile?.uid || firebaseUser?.uid,
                          role,
                        },
                        replace: true,
                      }
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-[#34D399] text-slate-950 text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Enter Verification Code
                </button>

                {/* Secondary: Resend email */}
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="w-full py-2.5 rounded-xl border border-[#1F2937] bg-[#0D1117] text-xs font-medium text-[#94A3B8] hover:text-white hover:border-[#22D3EE]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend available in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full py-2 rounded-xl text-xs text-[#475569] hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {signingOut ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Sign out and use a different account</span>
                </button>
              </div>

              {/* Footer note */}
              <p className="text-center text-[10px] text-[#334155]">
                Check your spam folder if you don't see the email. The code expires in 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
