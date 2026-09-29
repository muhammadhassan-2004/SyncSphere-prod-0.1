import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Eye,
  EyeOff,
  Bell,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Briefcase,
  UserCheck,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input, PasswordInput } from '@/src/components/ui/input';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { CopyrightText } from '@/src/components/ui/CopyrightText';
import { FieldError, validators } from '@/src/lib/validation/formValidators';
import { auth, db } from '@/src/lib/firebase';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { getUserProfile } from '@/src/lib/firestore/users';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setRole, firebaseUser, authenticatedUser, userProfile, currentRole } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Auto-redirect if user already has an active valid auth token / session with completed onboarding
  useEffect(() => {
    if (firebaseUser && currentRole && userProfile?.role) {
      if (userProfile.onboardingCompleted === false) {
        navigate(`/onboarding?role=${currentRole}`, { replace: true });
        return;
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      if (from && from.startsWith(`/${currentRole}`)) {
        navigate(from, { replace: true });
      } else {
        navigate(`/${currentRole}/dashboard`, { replace: true });
      }
    }
  }, [firebaseUser, currentRole, userProfile, navigate, location.state]);

  // 2. Load remembered email/preference on mount (passwords never persisted to storage)
  useEffect(() => {
    try {
      // Purge any legacy plaintext/base64 passwords stored in previous versions
      localStorage.removeItem('syncsphere_remember_password');

      const savedEmail = localStorage.getItem('syncsphere_remember_email');
      const savedPref = localStorage.getItem('syncsphere_remember_me');

      if (savedPref !== null) {
        setKeepSignedIn(savedPref === 'true');
      }

      if ((savedPref === 'true' || savedPref === null) && savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}

    // Standards-compliant Credential Management API (silent fill from browser keychain if permitted)
    if (typeof window !== 'undefined' && 'credentials' in navigator && (navigator.credentials as any)?.get) {
      (navigator.credentials as any)
        .get({
          password: true,
          mediation: 'silent',
        })
        .then((cred: any) => {
          if (cred && cred.id) {
            setEmail(cred.id);
            if (cred.password) {
              setPassword(cred.password);
            }
          }
        })
        .catch(() => {
          // Graceful fallback if silent credential retrieval is restricted
        });
    }
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validators.email(email.trim());
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    if (!email || !password || loading) return;

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Configure Firebase Auth session persistence based on user choice
      try {
        await setPersistence(
          auth,
          keepSignedIn ? browserLocalPersistence : browserSessionPersistence
        );
      } catch (persistErr) {
        console.warn('Firebase setPersistence notice:', persistErr);
      }

      // 2. Primary authentication via Firebase Auth with single retry on transient network glitch
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (firstErr: any) {
        if (firstErr?.code === 'auth/network-request-failed') {
          // Wait 600ms and attempt one automatic retry for transient network recovery
          await new Promise((r) => setTimeout(r, 600));
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } else {
          throw firstErr;
        }
      }
      const user = userCredential.user;

      // 3. Persist or clear remembered email in browser & Credential Management API
      try {
        localStorage.removeItem('syncsphere_remember_password');
        if (keepSignedIn) {
          localStorage.setItem('syncsphere_remember_email', cleanEmail);
          localStorage.setItem('syncsphere_remember_me', 'true');

          // Securely pass to browser's native PasswordCredential store if supported
          if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials?.store) {
            try {
              const cred = new (window as any).PasswordCredential({
                id: cleanEmail,
                password: password,
                name: cleanEmail,
              });
              await navigator.credentials.store(cred);
            } catch {
              // Ignore if browser policy restricts
            }
          }
        } else {
          localStorage.removeItem('syncsphere_remember_email');
          localStorage.setItem('syncsphere_remember_me', 'false');

          if (typeof window !== 'undefined' && navigator.credentials?.preventSilentAccess) {
            try {
              navigator.credentials.preventSilentAccess();
            } catch {}
          }
        }
      } catch {}

      // Read user profile from Firestore
      let userRole: UserRole = 'client';
      let profileData: any = null;
      try {
        profileData = await getUserProfile(user.uid, user.email || cleanEmail);
        if (profileData?.role) {
          const rawRole = profileData.role;
          userRole = rawRole === 'freelancer' ? 'symbiote' : (rawRole as UserRole);
        }

        // Update lastActiveAt on user doc
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(
          userDocRef,
          {
            lastActiveAt: serverTimestamp(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (docErr) {
        console.warn('Could not update user doc or read role on login:', docErr);
      }

      // Clear stale local sessions, mock roles, and demo modes
      localStorage.removeItem('syncsphere_demo_mode');
      localStorage.removeItem('syncsphere_mock_role');
      localStorage.removeItem('syncsphere_user_session');
      localStorage.setItem(
        'syncsphere_user_session',
        JSON.stringify({
          uid: user.uid,
          email: user.email || cleanEmail,
          displayName: profileData?.displayName || user.displayName || cleanEmail.split('@')[0],
          role: userRole,
          avatarUrl: profileData?.avatarUrl,
        })
      );
      setRole(userRole);

      // Redirect back to protected route, onboarding, or verify-email
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      const isEmailVerified = user.emailVerified || profileData?.emailVerified;
      const needsOnboarding = profileData?.onboardingCompleted === false;

      if (!isEmailVerified) {
        navigate('/verify-email', {
          state: {
            email: user.email || cleanEmail,
            uid: user.uid,
            role: userRole,
          },
          replace: true,
        });
      } else if (profileData?.mfaEnabled) {
        // Trigger Email 2FA security OTP dispatch
        try {
          await fetch('/api/auth/send-signup-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email || cleanEmail,
              uid: user.uid,
            }),
          });
        } catch (mfaSendErr) {
          console.warn('Could not auto-send 2FA code:', mfaSendErr);
        }

        navigate('/verify-email', {
          state: {
            email: user.email || cleanEmail,
            uid: user.uid,
            role: userRole,
            is2FA: true,
          },
          replace: true,
        });
      } else if (needsOnboarding) {
        navigate(`/onboarding?role=${userRole}`, { replace: true });
      } else if (from && from.startsWith(`/${userRole}`)) {
        navigate(from, { replace: true });
      } else {
        navigate(`/${userRole}/dashboard`, { replace: true });
      }

    } catch (err: any) {
      if (
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential'
      ) {
        console.warn('Sign in attempted with invalid credentials:', err?.code);
        setError('Invalid email address or password. Please check your credentials.');
      } else if (err?.code === 'auth/too-many-requests') {
        console.warn('Sign in rate limited:', err?.code);
        setError('Too many failed attempts. Please reset your password or try again later.');
      } else if (err?.code === 'auth/invalid-email') {
        console.warn('Invalid email format:', err?.code);
        setError('Please enter a valid email address.');
      } else if (err?.code === 'auth/network-request-failed') {
        console.warn('Sign in network request failed:', err?.code);
        setError('Unable to reach the authentication service. Please check your internet connection or reload and try again.');
      } else {
        console.error('Sign in unexpected error:', err);
        setError(err?.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError(null);

    try {
      try {
        await setPersistence(
          auth,
          keepSignedIn ? browserLocalPersistence : browserSessionPersistence
        );
      } catch (persistErr) {
        console.warn('Google setPersistence notice:', persistErr);
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Persist or clear remembered email in localStorage
      try {
        if (keepSignedIn && user.email) {
          localStorage.setItem('syncsphere_remember_email', user.email.toLowerCase());
          localStorage.setItem('syncsphere_remember_me', 'true');
        } else if (!keepSignedIn) {
          localStorage.removeItem('syncsphere_remember_email');
          localStorage.removeItem('syncsphere_remember_password');
          localStorage.setItem('syncsphere_remember_me', 'false');
        }
      } catch {}

      // Clear demo mode and mock role on authentic Google sign-in
      localStorage.removeItem('syncsphere_demo_mode');
      localStorage.removeItem('syncsphere_mock_role');

      // Check user document
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      if (userData && userData.role) {
        const rawRole = userData.role;
        const userRole: UserRole =
          rawRole === 'freelancer' ? 'symbiote' : rawRole === 'client' || rawRole === 'symbiote' || rawRole === 'admin' ? rawRole : 'client';
        setRole(userRole);

        // Touch lastActiveAt
        await setDoc(
          userDocRef,
          {
            lastActiveAt: serverTimestamp(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (userData.onboardingCompleted !== true) {
          navigate(`/onboarding?role=${userRole}`, { replace: true });
        } else {
          navigate(`/${userRole}/dashboard`, { replace: true });
        }
      } else {
        // User has NO role yet (brand new or role pending selection)
        const urlParams = new URLSearchParams(location.search);
        const specifiedRole = (urlParams.get('role') || location.state?.role) as UserRole;

        const nameParts = (user.displayName || '').trim().split(' ').filter(Boolean);
        const gFirstName = nameParts[0] || (user.email ? user.email.split('@')[0] : 'User');
        const gLastName = nameParts.slice(1).join(' ') || '';
        const gFullName = user.displayName || `${gFirstName} ${gLastName}`.trim() || 'User';

        if (specifiedRole === 'client' || specifiedRole === 'symbiote' || specifiedRole === 'admin') {
          await setDoc(userDocRef, {
            uid: user.uid,
            firstName: gFirstName,
            lastName: gLastName,
            displayName: gFullName,
            fullName: gFullName,
            email: (user.email || '').toLowerCase(),
            phoneNumber: user.phoneNumber || undefined,
            role: specifiedRole,
            emailVerified: user.emailVerified ?? true,
            avatarUrl: user.photoURL || undefined,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActiveAt: serverTimestamp(),
          }, { merge: true });
          setRole(specifiedRole);
          navigate(`/onboarding?role=${specifiedRole}`, { replace: true });
        } else {
          // Brand new OAuth user with NO preselected role:
          // Create document with profile details so user appears in Admin panel,
          // but leave role unset until user chooses on /portal-select!
          await setDoc(userDocRef, {
            uid: user.uid,
            firstName: gFirstName,
            lastName: gLastName,
            displayName: gFullName,
            fullName: gFullName,
            email: (user.email || '').toLowerCase(),
            phoneNumber: user.phoneNumber || undefined,
            emailVerified: user.emailVerified ?? true,
            avatarUrl: user.photoURL || undefined,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActiveAt: serverTimestamp(),
          }, { merge: true });

          navigate('/portal-select');
        }
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User closed or cancelled the popup - expected user cancellation
        console.warn('Google sign-in popup was dismissed by the user.');
      } else if (err?.code === 'auth/popup-blocked') {
        console.warn('Google sign-in popup was blocked by browser/iframe policy.');
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site or open the app in a new tab to continue with Google.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        console.warn('Google auth unauthorized domain:', err?.message);
        setError('This domain is not authorized for Google Sign-In in Firebase. Please sign in with your email and password.');
      } else {
        console.error('Google auth error:', err);
        setError(err?.message || 'Failed to sign in with Google. Please try again or use email sign-in.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex flex-col lg:flex-row font-sans selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)]">
      {/* AMBIENT BACKGROUND LIGHTING */}
      <div className="pointer-events-none absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--color-accent-cyan)]/5 blur-[130px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--color-info-blue)]/5 blur-[150px] rounded-full" />

      {/* LEFT PANEL - Split Screen Brand Notification Showcase (~50/50) */}
      <div className="relative z-10 lg:w-1/2 bg-gradient-to-b from-[var(--color-surface)] via-[var(--color-surface-elevated)]/60 to-[var(--color-surface)] border-b lg:border-b-0 lg:border-r border-[var(--color-border)] p-6 sm:p-10 lg:p-14 flex flex-col justify-between">
        <div className="space-y-8 max-w-lg mx-auto lg:mx-0 w-full">
          {/* Top Logo & Back to Home button */}
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 focus:outline-none">
              <SyncSphereLogo iconSize={32} textSize="lg" />
            </Link>
            <Link
              to="/"
              id="login-back-home"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)]/40 transition-all group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to home</span>
            </Link>
          </div>

          {/* Headline & Badge */}
          <div className="space-y-3 pt-2">
            <div className="inline-flex">
              <StatusPill
                variant="cyan"
                icon={<Lock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
                label="Enterprise Authentication"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text-primary)] leading-tight">
              Welcome back to SyncSphere
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
              Sign in to manage your active projects, synthesize scopes with PreSync AI, and collaborate with verified tech specialists.
            </p>
          </div>

          {/* 3x Live Notification Preview Cards Stack */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                Live Activity Feed
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-success-green)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success-green)] animate-pulse" />
                <span>Real-Time Sync</span>
              </div>
            </div>

            <Card className="p-4 bg-[var(--color-surface)]/90 backdrop-blur-sm border-[var(--color-border)] flex items-start gap-3.5 hover:border-[var(--color-accent-cyan)]/40 transition-all duration-200 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-info-blue)]/10 text-[var(--color-info-blue)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--color-info-blue)]/20">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    PreSync AI Match Found
                  </h4>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-mono shrink-0">Just now</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
                  Senior Full-Stack Cloud Architect matched at 96% fit for Microservices Project.
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--color-surface)]/90 backdrop-blur-sm border-[var(--color-border)] flex items-start gap-3.5 hover:border-[var(--color-success-green)]/40 transition-all duration-200 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-success-green)]/10 text-[var(--color-success-green)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--color-success-green)]/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    Milestone Delivered & Settled
                  </h4>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-mono shrink-0">1h ago</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
                  Sprint 3 deliverables verified & settled upon review.
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-[var(--color-surface)]/90 backdrop-blur-sm border-[var(--color-border)] flex items-start gap-3.5 hover:border-[var(--color-accent-cyan)]/40 transition-all duration-200 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--color-accent-cyan)]/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    Automated Invoicing Complete
                  </h4>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-mono shrink-0">3h ago</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
                  Bi-weekly timesheets verified and processed with transparent itemized logs.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="pt-8 border-t border-[var(--color-border)]/60 mt-8 max-w-lg mx-auto lg:mx-0 w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
          <p>
            <CopyrightText />
          </p>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Sign In Form Card */}
      <div className="relative z-10 lg:w-1/2 p-6 sm:p-10 lg:p-16 flex items-center justify-center bg-[var(--color-background)]/80">
        <div className="w-full max-w-md space-y-6">
          {/* Card Wrapper for Visual Polish */}
          <Card className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg rounded-2xl space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Sign in to your account
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                Enter your registered credentials to access your workspace.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailSignIn} method="post" action="#" className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="loginEmail"
                  className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer"
                >
                  Email Address
                </label>
                <Input
                  id="loginEmail"
                  name="email"
                  type="email"
                  autoComplete="username email"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  required
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
                <FieldError message={emailError || undefined} />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="loginPassword"
                    className="text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[var(--color-accent-cyan)] font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="loginPassword"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
              </div>

              {/* Keep me signed in checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setKeepSignedIn(checked);
                    try {
                      localStorage.setItem('syncsphere_remember_me', checked ? 'true' : 'false');
                      localStorage.removeItem('syncsphere_remember_password');
                      if (!checked) {
                        localStorage.removeItem('syncsphere_remember_email');
                      } else {
                        if (email.trim()) {
                          localStorage.setItem('syncsphere_remember_email', email.trim().toLowerCase());
                        }
                      }
                    } catch {}
                  }}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)] bg-[var(--color-surface-elevated)] cursor-pointer accent-[var(--color-accent-cyan)]"
                />
                <label
                  htmlFor="keepSignedIn"
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none font-medium"
                >
                  Remember my email on this device
                </label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full mt-2 justify-center font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-[var(--color-border)] w-full"></div>
              <span className="bg-[var(--color-surface)] px-3 text-[10px] font-bold font-mono text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap absolute">
                or continue with
              </span>
            </div>

            {/* Google OAuth Button */}
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full justify-center py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/80 hover:border-[var(--color-accent-cyan)]/40 transition-all font-semibold text-xs sm:text-sm"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connecting Google Account...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </Button>
            </div>

            {/* Footer Registration Link */}
            <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]/60">
              Don't have an account yet?{' '}
              <Link
                to="/portal-select"
                className="text-[var(--color-accent-cyan)] font-bold hover:underline"
              >
                Choose portal & register
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
