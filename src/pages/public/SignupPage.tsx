import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  Shield,
  Zap,
  Lock,
  Award,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input, PasswordInput } from '@/src/components/ui/input';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { PasswordRequirementChecklist } from '@/src/components/ui/PasswordRequirementChecklist';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { sanitizePhoneNumber, handlePhoneKeyDown, validators } from '@/src/lib/validation/formValidators';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setRole } = useAuth();

  // Extract role from query param or route state (defaulting to client)
  const rawRole = searchParams.get('role') || location.state?.role;
  const role: 'client' | 'symbiote' | 'admin' =
    rawRole === 'symbiote' || rawRole === 'admin' ? rawRole : 'client';

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live password requirement checklist
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Form validity check
  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    isPasswordValid &&
    passwordsMatch &&
    agreeToTerms &&
    !loading;

  // Left Panel Content by Role with safe fallback
  const roleContentMap = {
    client: {
      badgeLabel: 'CLIENT PORTAL',
      badgeVariant: 'blue' as const,
      headline: 'Formulate briefs with PreSync AI & hire elite IT talent',
      features: [
        {
          icon: Zap,
          title: 'Interactive AI Brief Formulation',
          desc: 'PreSync AI synthesizes deliverables, budget bandwidth, and stack requirements in minutes.',
        },
        {
          icon: Lock,
          title: 'Milestone & Task Protection',
          desc: 'Task hours are tracked and invoices settled only upon your explicit milestone approval.',
        },
        {
          icon: Award,
          title: 'Pre-Vetted Technical Specialists',
          desc: 'Access top-tier verified engineers with explainable match scores tailored to your stack.',
        },
      ],
      socialProof: 'Trusted by over 10,000+ businesses and technology leaders worldwide.',
    },
    symbiote: {
      badgeLabel: 'FREELANCER PORTAL',
      badgeVariant: 'green' as const,
      headline: 'Find funded enterprise projects and grow your tech practice',
      features: [
        {
          icon: Briefcase,
          title: 'Funded Client Contracts',
          desc: 'Engage directly with verified business leaders on high-impact technical initiatives.',
        },
        {
          icon: Lock,
          title: 'Guaranteed Milestone Payouts',
          desc: 'Automated milestone disbursements with zero payout delays or hidden deduction fees.',
        },
        {
          icon: UserCheck,
          title: 'Explainable Match Scoring',
          desc: 'High-signal skill taxonomy matching delivers opportunities matched to your expertise.',
        },
      ],
      socialProof: 'Join 25,000+ elite engineers, architects, and technical specialists.',
    },
    admin: {
      badgeLabel: 'ADMIN PORTAL',
      badgeVariant: 'red' as const,
      headline: 'Streamline platform governance and oversight',
      features: [
        {
          icon: Shield,
          title: 'Full System Oversight',
          desc: 'Oversee user accounts, role permissions, and platform security policies.',
        },
        {
          icon: Zap,
          title: 'Real-Time Audit Logs',
          desc: 'Monitor transaction flows, dispute resolutions, and system health metrics.',
        },
        {
          icon: Award,
          title: 'Verification Engine',
          desc: 'Evaluate Symbiote credentials and ensure strict enterprise compliance.',
        },
      ],
      socialProof: 'Internal governance shell for SyncSphere platform operations.',
    },
  };

  const roleContent = roleContentMap[role] || roleContentMap.client;

  const handleGoogleSignUp = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        const rawRole = existingData.role;
        const matchedRole: UserRole =
          rawRole === 'freelancer' ? 'symbiote' : rawRole === 'client' || rawRole === 'symbiote' || rawRole === 'admin' ? rawRole : role;
        
        setRole(matchedRole);
        await setDoc(
          userDocRef,
          {
            lastActiveAt: serverTimestamp(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (existingData.onboardingCompleted === false) {
          navigate(`/onboarding?role=${matchedRole}`, { replace: true });
        } else {
          navigate(`/${matchedRole}/dashboard`, { replace: true });
        }
      } else {
        // Create fresh user doc with the chosen role
        const nameParts = (user.displayName || '').trim().split(' ').filter(Boolean);
        const gFirstName = nameParts[0] || (user.email ? user.email.split('@')[0] : 'User');
        const gLastName = nameParts.slice(1).join(' ') || '';
        const gFullName = user.displayName || `${gFirstName} ${gLastName}`.trim() || 'User';

        const newUserData = {
          uid: user.uid,
          firstName: gFirstName,
          lastName: gLastName,
          displayName: gFullName,
          fullName: gFullName,
          email: (user.email || '').toLowerCase(),
          phoneNumber: user.phoneNumber || undefined,
          role: role,
          emailVerified: user.emailVerified ?? true,
          avatarUrl: user.photoURL || undefined,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: serverTimestamp(),
        };

        await setDoc(userDocRef, newUserData);
        setRole(role);
        navigate(`/onboarding?role=${role}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User closed or cancelled the popup - expected user cancellation
        console.warn('Google signup popup was dismissed by the user.');
      } else if (err?.code === 'auth/popup-blocked') {
        console.warn('Google signup popup was blocked by browser/iframe policy.');
        setError('Sign-up popup was blocked by your browser. Please allow popups for this site or open the app in a new tab to continue with Google.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        console.warn('Google signup unauthorized domain:', err?.message);
        setError('This domain is not authorized for Google Sign-In in Firebase. Please complete registration using the form below.');
      } else {
        console.error('Google signup error:', err);
        setError(err?.message || 'Failed to complete Google registration. Please try again or use the registration form below.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (phoneNumber.trim()) {
      const phoneErr = validators.phone(phoneNumber.trim());
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Dispatch real verification email with 6-digit OTP via custom SMTP backend
      try {
        await fetch('/api/auth/send-signup-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            uid: user.uid,
            fullName: computedFullName,
          }),
        });
      } catch (emailErr) {
        console.warn('Backend SMTP verification dispatch notice:', emailErr);
      }

      // 3. Write user document to Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: computedFullName,
          displayName: computedFullName,
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim() || undefined,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: serverTimestamp(),
          emailVerified: false,
          onboardingCompleted: false,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      // 4. Update AuthContext role state
      setRole(role);

      // 5. Store pending verification in sessionStorage to protect against F5 page reload
      try {
        sessionStorage.setItem(
          'syncsphere_pending_verification',
          JSON.stringify({
            email: email.trim().toLowerCase(),
            uid: user.uid,
            role: role,
            fullName: computedFullName,
          })
        );
      } catch (storageErr) {
        console.warn('SessionStorage verification backup notice:', storageErr);
      }

      // 6. Navigate to /verify-email with state
      navigate('/verify-email', {
        state: {
          email: email.trim(),
          uid: user.uid,
          role: role,
        },
      });

    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        console.warn('Signup attempt with existing email:', err?.code);
        setError('An account with this email address already exists. Please sign in instead.');
      } else if (err?.code === 'auth/weak-password') {
        console.warn('Signup attempt with weak password:', err?.code);
        setError('The password is too weak. Please choose a stronger password.');
      } else if (err?.code === 'auth/invalid-email') {
        console.warn('Signup attempt with invalid email:', err?.code);
        setError('Please enter a valid email address.');
      } else if (err?.code === 'auth/network-request-failed') {
        console.warn('Signup network request failed:', err?.code);
        setError('Unable to reach the registration service. Please check your internet connection or reload and try again.');
      } else {
        console.error('Signup error:', err);
        setError(err?.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex flex-col lg:flex-row font-sans selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)]">
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="pointer-events-none absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--color-accent-cyan)]/5 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--color-info-blue)]/5 blur-[150px] rounded-full" />

      {/* LEFT PANEL - Split Screen Brand Feature Showcase (~50/50) */}
      <div className="relative z-10 lg:w-1/2 bg-gradient-to-b from-[var(--color-surface)] via-[var(--color-surface-elevated)]/60 to-[var(--color-surface)] border-b lg:border-b-0 lg:border-r border-[var(--color-border)] p-6 sm:p-10 lg:p-14 flex flex-col justify-between">
        <div className="space-y-8 max-w-lg mx-auto lg:mx-0 w-full">
          {/* Top Logo & Back to Home button */}
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 focus:outline-none">
              <SyncSphereLogo iconSize={32} textSize="lg" />
            </Link>
            <Link
              to="/"
              id="signup-back-home"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)]/40 transition-all group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to home</span>
            </Link>
          </div>

          {/* Role Status & Headline */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <StatusPill variant={roleContent.badgeVariant} label={roleContent.badgeLabel} />
              <Link
                to="/portal-select"
                className="text-xs font-mono text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1"
              >
                <span>Change role</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text-primary)] leading-tight">
              {roleContent.headline}
            </h1>
          </div>

          {/* Feature Rows */}
          <div className="space-y-4 pt-1">
            {roleContent.features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--color-surface)]/80 border border-[var(--color-border)]/80 flex items-start gap-4 hover:border-[var(--color-accent-cyan)]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--color-accent-cyan)]/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Social Proof Line */}
        <div className="pt-8 border-t border-[var(--color-border)]/60 mt-8 max-w-lg mx-auto lg:mx-0 w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-secondary)]">
            {roleContent.socialProof}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Create Account Form */}
      <div className="relative z-10 lg:w-1/2 p-6 sm:p-10 lg:p-16 flex items-center justify-center bg-[var(--color-background)]/80">
        <div className="w-full max-w-md space-y-6">
          {/* Card Wrapper for Visual Polish */}
          <Card className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg rounded-2xl space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  Create your account
                </h2>
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                  {role === 'symbiote' ? 'Freelancer' : role === 'client' ? 'Client' : 'Admin'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                Complete your details to set up your {role === 'client' ? 'Client' : 'Freelancer'} workspace.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
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
                    <span>Continue with Google as {role === 'client' ? 'Client' : 'Freelancer'}</span>
                  </>
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[var(--color-border)] w-full"></div>
              <span className="bg-[var(--color-surface)] px-3 text-[10px] font-bold font-mono text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap absolute">
                or register with email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                    First Name *
                  </label>
                  <Input
                    name="firstName"
                    autoComplete="given-name"
                    type="text"
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                    Last Name *
                  </label>
                  <Input
                    name="lastName"
                    autoComplete="family-name"
                    type="text"
                    placeholder="Morgan"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                  Work Email Address *
                </label>
                <Input
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
              </div>

              {/* Contact Phone Number (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                    Phone Number
                  </label>
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">Optional</span>
                </div>
                <Input
                  name="phoneNumber"
                  autoComplete="tel"
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={phoneNumber}
                  onKeyDown={handlePhoneKeyDown}
                  onChange={(e) => setPhoneNumber(sanitizePhoneNumber(e.target.value))}
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
                {phoneNumber.trim().length > 0 && phoneNumber.replace(/\D/g, '').length < 8 && (
                  <p className="text-[11px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                    <span>• Minimum 8 digits required for a valid phone number</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                  Password *
                </label>
                <PasswordInput
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                  Confirm Password *
                </label>
                <PasswordInput
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[var(--color-surface-elevated)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)] text-sm"
                />
              </div>

              {/* Live Password Requirement Checklist */}
              <PasswordRequirementChecklist
                password={password}
                confirmPassword={confirmPassword}
              />

              {/* Terms & Privacy Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)] bg-[var(--color-surface-elevated)] cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-[var(--color-text-secondary)] leading-relaxed cursor-pointer select-none">
                  I agree to the{' '}
                  <Link to="/terms" className="text-[var(--color-accent-cyan)] hover:underline font-semibold">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-[var(--color-accent-cyan)] hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* Create Account Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!isFormValid}
                className="w-full mt-2 justify-center font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Sign In Link */}
            <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[var(--color-accent-cyan)] font-bold hover:underline"
              >
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
