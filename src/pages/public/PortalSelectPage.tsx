import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, UserCheck, Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { db } from '@/src/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const PortalSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, userProfile, setRole } = useAuth();

  // If user is already authenticated with an existing completed role, redirect to dashboard
  useEffect(() => {
    if (firebaseUser && userProfile?.role && userProfile.onboardingCompleted === true) {
      navigate(`/${userProfile.role}/dashboard`, { replace: true });
    }
  }, [firebaseUser, userProfile, navigate]);

  const handleSelectRole = async (role: 'client' | 'symbiote') => {
    // If the user already authenticated via Google OAuth without a role:
    if (firebaseUser) {
      try {
        const nameParts = (firebaseUser.displayName || '').trim().split(' ').filter(Boolean);
        const gFirstName = nameParts[0] || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
        const gLastName = nameParts.slice(1).join(' ') || '';
        const gFullName = firebaseUser.displayName || `${gFirstName} ${gLastName}`.trim() || 'User';

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(
          userDocRef,
          {
            uid: firebaseUser.uid,
            firstName: gFirstName,
            lastName: gLastName,
            displayName: gFullName,
            fullName: gFullName,
            email: (firebaseUser.email || '').toLowerCase(),
            phoneNumber: firebaseUser.phoneNumber || undefined,
            role: role as UserRole,
            emailVerified: firebaseUser.emailVerified ?? true,
            avatarUrl: firebaseUser.photoURL || undefined,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActiveAt: serverTimestamp(),
          },
          { merge: true }
        );
        setRole(role);
        navigate(`/onboarding?role=${role}`, { replace: true });
        return;
      } catch (err) {
        console.warn('Error provisioning role after Google OAuth:', err);
      }
    }

    // Pass selected role to /signup via route state and query param
    navigate(`/signup?role=${role}`, { state: { role } });
  };

  const rolesData = [
    {
      role: 'client' as const,
      badgeLabel: 'Client',
      badgeVariant: 'blue' as const,
      icon: Briefcase,
      iconBg: 'bg-[var(--color-info-blue)]/10 text-[var(--color-info-blue)] border border-[var(--color-info-blue)]/20',
      title: 'Client Portal',
      tagline: 'Post projects & hire verified tech freelancers',
      description:
        'Synthesize briefs with PreSync AI, match with pre-vetted engineers, collaborate on tasks, and track deliverables in unified workspaces.',
      ctaText: 'Continue as Client',
      checklist: [
        'Interactive AI brief formulation with PreSync AI',
        'Top 1% pre-screened IT engineers & technical specialists',
        'Transparent milestone reviews with client inspection windows',
        'Real-time sprint boards, time tracking & itemized invoices',
      ],
      glowHover: 'group-hover:border-[var(--color-info-blue)]/50 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.12)]',
    },
    {
      role: 'symbiote' as const,
      badgeLabel: 'Freelancer',
      badgeVariant: 'green' as const,
      icon: UserCheck,
      iconBg: 'bg-[var(--color-success-green)]/10 text-[var(--color-success-green)] border border-[var(--color-success-green)]/20',
      title: 'Freelancer Portal',
      tagline: 'Find high-value technical client contracts',
      description:
        'Discover vetted enterprise opportunities, submit proposals with explainable match scores, deliver verified milestones, and receive direct settlements.',
      ctaText: 'Continue as Freelancer',
      checklist: [
        'Direct access to enterprise client projects',
        'Explainable AI match scores matching your skill taxonomy',
        'Automated time tracking & milestone invoice generation',
        'Direct settlement disbursements with verifiable records',
      ],
      glowHover: 'group-hover:border-[var(--color-success-green)]/50 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.12)]',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-between font-sans selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)] overflow-hidden">
      {/* AMBIENT BACKGROUND GLOW EFFECTS */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[var(--color-accent-cyan)]/10 via-[var(--color-info-blue)]/5 to-transparent blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[450px] h-[350px] bg-[var(--color-success-green)]/5 blur-[140px] rounded-full" />

      {/* TOP HEADER WITH LOGO AND BACK LINK */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-[var(--color-border)]/60">
        <Link to="/" className="flex items-center gap-2 focus:outline-none group">
          <SyncSphereLogo iconSize={32} textSize="lg" />
        </Link>
        <Link
          to="/"
          id="portal-select-back-home"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)]/40 hover:bg-[var(--color-surface-elevated)] transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto py-8 sm:py-12 space-y-10">
        {/* Centered Header */}
        <div className="text-center space-y-3.5 max-w-2xl mx-auto">
          <div className="inline-flex">
            <StatusPill
              variant="cyan"
              icon={<Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
              label="Select Workspace Role"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Choose Your Portal
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
            Select your account type to proceed with registration or log into your dedicated workspace environment.
          </p>
        </div>

        {/* 2-Column Role Card Grid (Admin hidden for self-registration) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {rolesData.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.role}
                id={`portal-card-${item.role}`}
                className={`group p-6 sm:p-8 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md rounded-2xl transition-all duration-300 ${item.glowHover}`}
              >
                <div>
                  {/* Icon badge & role-badge pill */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${item.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <StatusPill variant={item.badgeVariant} label={item.badgeLabel} />
                  </div>

                  {/* Title & Tagline */}
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-xs font-semibold font-mono text-[var(--color-accent-cyan)] mt-1 mb-3">
                    {item.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Divider */}
                  <div className="border-t border-[var(--color-border)]/60 pt-4 mb-4">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-[var(--color-text-secondary)]/80 block mb-3">
                      Included Capabilities
                    </span>
                    {/* Checklist */}
                    <ul className="space-y-2.5">
                      {item.checklist.map((checkText, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--color-text-primary)]">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.iconBg}`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="leading-snug">{checkText}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="pt-6 mt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    id={`portal-btn-${item.role}`}
                    className="w-full group/btn justify-center font-bold"
                    onClick={() => handleSelectRole(item.role)}
                  >
                    <span>{item.ctaText}</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-[var(--color-text-secondary)]">
          <Link
            to="/login"
            className="hover:text-[var(--color-text-primary)] transition-colors"
          >
            Already have an account? <span className="font-semibold text-[var(--color-accent-cyan)] hover:underline">Sign in</span>
          </Link>
          <span className="hidden sm:inline text-[var(--color-border)]">•</span>
          <Link
            to="/"
            className="hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to Landing Page</span>
          </Link>
        </div>
      </div>

      {/* BOTTOM LEGAL / COPYRIGHT */}
      <div className="relative z-10 w-full max-w-5xl mx-auto pt-6 border-t border-[var(--color-border)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
        <p>© 2026 SyncSphere Inc. Enterprise IT Marketplace.</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
};
