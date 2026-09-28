import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { OTPInput } from '@/src/components/ui/OTPInput';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, UserRole } from '@/src/context/AuthContext';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { firebaseUser, setRole } = useAuth();

  // Extract state passed from SignupPage or URL query params (from email magic link)
  const navState = location.state as {
    email?: string;
    uid?: string;
    role?: UserRole;
    is2FA?: boolean;
  } | null;

  // SessionStorage backup fallback in case of page reload (F5)
  const getSessionBackup = () => {
    try {
      const cached = sessionStorage.getItem('syncsphere_pending_verification');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const backupState = getSessionBackup();

  const urlEmail = searchParams.get('email');
  const urlCode = searchParams.get('code');
  const urlUid = searchParams.get('uid');
  const urlRole = searchParams.get('role') as UserRole | null;
  const is2FA = Boolean(navState?.is2FA || backupState?.is2FA || searchParams.get('is2FA') === 'true');

  const email = navState?.email || urlEmail || firebaseUser?.email || backupState?.email || '';
  const uid = navState?.uid || urlUid || firebaseUser?.uid || backupState?.uid || '';
  const role: UserRole = navState?.role || urlRole || backupState?.role || 'client';

  // Persist valid state to sessionStorage so subsequent reloads are protected
  useEffect(() => {
    if (email) {
      try {
        sessionStorage.setItem(
          'syncsphere_pending_verification',
          JSON.stringify({ email, uid, role, is2FA })
        );
      } catch (err) {
        console.warn('Could not cache pending verification to sessionStorage:', err);
      }
    }
  }, [email, uid, role, is2FA]);

  // Completion guard ref to prevent multiple executions
  const hasCompletedRef = useRef(false);

  // Redirect if no email present and no active user
  useEffect(() => {
    if (!email && !firebaseUser?.uid) {
      const timer = setTimeout(() => {
        navigate('/signup', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [email, firebaseUser?.uid, navigate]);

  // Form & Status State
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuthStatus, setCheckingAuthStatus] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Expiry Timer (15 mins = 900s)
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  // Resend Cooldown (30s)
  const [resendCooldown, setResendCooldown] = useState(0);

  // Complete verification and proceed to onboarding
  const completeVerification = useCallback(
    async (userId: string) => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      try {
        setIsVerified(true);
        setSuccessMsg('Email Verified ✓ — Setting up your workspace...');
        setError(null);

        if (userId) {
          try {
            await setDoc(
              doc(db, 'users', userId),
              {
                emailVerified: true,
                updatedAt: new Date().toISOString(),
                lastActiveAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (docErr) {
            console.warn('Notice writing verified status to doc:', docErr);
          }
        }

        // Synchronize client-side Firebase Auth token
        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
          } catch (reloadErr) {
            console.warn('Notice reloading auth user:', reloadErr);
          }
        }

        // Clean up pending verification state from sessionStorage
        try {
          sessionStorage.removeItem('syncsphere_pending_verification');
        } catch {}

        setRole(role);

        let onboardingDone = false;
        if (userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists() && userSnap.data()?.onboardingCompleted) {
              onboardingDone = true;
            }
          } catch (e) {
            console.warn('Could not check onboarding status:', e);
          }
        }

        setTimeout(() => {
          if (is2FA || onboardingDone) {
            navigate(`/${role}/dashboard`, { replace: true });
          } else {
            navigate(`/onboarding?role=${role}`, { replace: true });
          }
        }, 1200);
      } catch (err: any) {
        console.error('Failed to complete verification state:', err);
        navigate(is2FA ? `/${role}/dashboard` : `/onboarding?role=${role}`, { replace: true });
      }
    },
    [is2FA, navigate, role, setRole]
  );

  // Check real Firebase Auth verification status (supports email link clicks)
  const checkFirebaseAuthStatus = useCallback(
    async (isManual: boolean = false) => {
      if (isVerified || hasCompletedRef.current) return;
      const targetUser = auth.currentUser;
      const userId = uid || targetUser?.uid;

      if (isManual) {
        setCheckingAuthStatus(true);
        setError(null);
      }

      try {
        let verified = false;

        // Check Firebase Auth user object if available
        if (targetUser) {
          await targetUser.reload();
          if (targetUser.emailVerified) {
            verified = true;
          }
        }

        if (verified && userId) {
          await completeVerification(userId);
        } else if (isManual) {
          setError(
            'We have not detected your email confirmation yet. Please open the verification email in your inbox and enter the 6-digit code below (or click the link inside).'
          );
        }
      } catch (err: any) {
        console.warn('Error checking auth verification status:', err);
        if (isManual) {
          setError('Unable to check verification status right now. Please enter the 6-digit code or retry in a few seconds.');
        }
      } finally {
        if (isManual) setCheckingAuthStatus(false);
      }
    },
    [completeVerification, isVerified, uid]
  );

  // Auto-verify if code is provided via URL query parameter (Magic link click)
  useEffect(() => {
    if (!urlCode || urlCode.length !== 6 || isVerified || hasCompletedRef.current) return;
    setOtpValue(urlCode);

    const autoVerifyFromUrl = async () => {
      setLoading(true);
      setError(null);
      try {
        const userId = uid || firebaseUser?.uid || '';
        const targetEmail = email || firebaseUser?.email || '';

        const response = await fetch('/api/auth/verify-signup-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            code: urlCode.trim(),
            uid: userId,
          }),
        });

        const resData = await response.json();
        if (resData.success) {
          await completeVerification(resData.uid || userId);
        } else {
          setError(resData.error || 'Verification link expired or invalid. Please enter code manually.');
        }
      } catch (err: any) {
        console.warn('Auto URL verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    autoVerifyFromUrl();
  }, [urlCode, email, uid, firebaseUser?.uid, firebaseUser?.email, isVerified, completeVerification]);

  // Periodic background check for email link confirmation (every 5s)
  useEffect(() => {
    if (isVerified || hasCompletedRef.current) return;

    const interval = setInterval(() => {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        checkFirebaseAuthStatus(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkFirebaseAuthStatus, isVerified]);

  // Expiry countdown effect
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  // Resend cooldown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit Handler (OTP Code)
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpValue.length !== 6 || loading || isVerified) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const userId = uid || firebaseUser?.uid || '';
      const targetEmail = email || firebaseUser?.email || '';

      // Call server-side API to verify OTP code
      const response = await fetch('/api/auth/verify-signup-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: otpValue.trim(),
          uid: userId,
        }),
      });

      const resData = await response.json();

      if (!resData.success) {
        setError(resData.error || 'Invalid 6-digit verification code. Please check your email or request a new code.');
        setLoading(false);
        return;
      }

      await completeVerification(resData.uid || userId);
    } catch (err: any) {
      console.error('Email verification error:', err);
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification (6-Digit Code via SMTP)
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resending || isVerified) return;

    setResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const targetEmail = email || firebaseUser?.email;
      const targetUid = uid || firebaseUser?.uid;

      if (!targetEmail) {
        setError('Email address not found. Please return to sign up.');
        setResending(false);
        return;
      }

      // Request verification email dispatch via custom SMTP backend
      const resp = await fetch('/api/auth/send-signup-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          uid: targetUid,
        }),
      });

      const resData = await resp.json();
      if (resData.success) {
        setSecondsRemaining(900);
        setResendCooldown(30);
        setOtpValue('');
        setSuccessMsg('A new verification code has been dispatched to your email inbox.');
      } else {
        setError(resData.error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setError('Failed to resend verification. Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };


  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] px-4 py-8 sm:py-12 flex flex-col items-center justify-center font-sans selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)] overflow-hidden">
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[var(--color-accent-cyan)]/10 to-transparent blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Top Logo & Back to Home */}
        <div className="flex items-center justify-between pb-2">
          <Link to="/" className="flex items-center gap-2 focus:outline-none group">
            <SyncSphereLogo iconSize={32} textSize="lg" />
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="verify-back-login"
              onClick={async () => {
                try {
                  await auth.signOut();
                } catch {}
                navigate('/login');
              }}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>
        </div>

        {/* Header Block & Envelope Icon */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center mx-auto border border-[var(--color-accent-cyan)]/20 shadow-md">
            <Mail className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {is2FA ? 'Two-Factor Authentication' : 'Verify your email address'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
              {is2FA ? (
                <>
                  Enter the 6-digit security code sent to{' '}
                  <span className="font-semibold text-[var(--color-text-primary)] break-all underline decoration-[var(--color-accent-cyan)]/40 underline-offset-2">
                    {email || 'your registered email'}
                  </span>{' '}
                  to access your account.
                </>
              ) : (
                <>
                  We sent a verification email to{' '}
                  <span className="font-semibold text-[var(--color-text-primary)] break-all underline decoration-[var(--color-accent-cyan)]/40 underline-offset-2">
                    {email || 'your email address'}
                  </span>
                  . You can verify using either method below.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Verification Success Banner */}
        {isVerified && (
          <div className="p-4 rounded-xl bg-[var(--color-success-green)]/15 border border-[var(--color-success-green)]/40 text-[var(--color-success-green)] text-sm flex items-center justify-center gap-2.5 font-bold shadow-lg animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{is2FA ? 'Identity Confirmed ✓ Proceeding to dashboard...' : 'Email Verified ✓ Proceeding to workspace...'}</span>
          </div>
        )}

        {/* Status / Error Notifications */}
        {!isVerified && error && (
          <div className="p-3.5 rounded-xl bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {!isVerified && successMsg && !error && (
          <div className="p-3.5 rounded-xl bg-[var(--color-success-green)]/10 border border-[var(--color-success-green)]/30 text-[var(--color-success-green)] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* MAIN MULTI-PATH VERIFICATION CARD */}
        <Card className="p-6 sm:p-8 space-y-6 text-left border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl rounded-2xl">
          {/* METHOD 1: EMAIL LINK VERIFICATION */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-3.5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center font-bold text-xs border border-[var(--color-accent-cyan)]/20">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Option 1: Click the Link in Your Email
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Open your inbox, click the confirmation link, then check status here.
                  </p>
                </div>
              </div>
              <StatusPill variant="cyan" label="Recommended" />
            </div>

            <Button
              type="button"
              variant="secondary"
              id="check-email-verification-btn"
              onClick={() => checkFirebaseAuthStatus(true)}
              disabled={checkingAuthStatus || loading || isVerified}
              className="w-full justify-center text-xs sm:text-sm py-2.5 bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/40 hover:bg-[var(--color-accent-cyan)]/25 text-[var(--color-accent-cyan)] font-bold transition-all"
            >
              {checkingAuthStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking Verification Status...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Verification Status
                </>
              )}
            </Button>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[var(--color-border)] w-full"></div>
            <span className="bg-[var(--color-surface)] px-3 text-[10px] font-bold font-mono text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap absolute">
              or use security code
            </span>
          </div>

          {/* METHOD 2: 6-DIGIT CODE INPUT */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center font-bold text-xs border border-[var(--color-accent-cyan)]/20">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Option 2: Enter 6-Digit Security Code
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Enter the 6-digit numeric OTP provided in your verification email.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="py-1">
                <OTPInput
                  length={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={loading || isVerified}
                />
              </div>



              <Button
                type="submit"
                variant="primary"
                id="verify-code-btn"
                disabled={otpValue.length !== 6 || loading || secondsRemaining <= 0 || isVerified}
                className="w-full justify-center font-bold text-xs sm:text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
          </div>

          {/* CARD FOOTER: RESEND & CHANGE EMAIL */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              <span>Didn't receive email?</span>
              <button
                type="button"
                id="resend-verification-btn"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || resending || isVerified}
                className="text-[var(--color-accent-cyan)] font-semibold hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend link & code'}
              </button>
            </div>

            <Link
              to={`/signup?role=${role}`}
              className="hover:text-[var(--color-text-primary)] transition-colors underline-offset-4 hover:underline"
            >
              Change email address
            </Link>
          </div>
        </Card>

        {/* LIVE COUNTDOWN TIMER & BACK LINK */}
        <div className="flex flex-col items-center justify-center gap-3 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            <span>
              {secondsRemaining > 0 ? (
                <>
                  Security code expires in{' '}
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">
                    {formatTimer(secondsRemaining)}
                  </span>
                </>
              ) : (
                <span className="text-[var(--color-danger-red)] font-medium">
                  Code expired. Click "Resend link & code" above to get a new code.
                </span>
              )}
            </span>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors py-1 px-3 rounded-lg hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
