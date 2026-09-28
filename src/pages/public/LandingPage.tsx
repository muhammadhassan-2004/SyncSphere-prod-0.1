import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { useAuth } from '@/src/context/AuthContext';
import { DashboardMockup } from '@/src/components/landing/DashboardMockup';
import { FeatureCard } from '@/src/components/landing/FeatureCard';
import { NumberedStepCard } from '@/src/components/landing/NumberedStepCard';
import { ChatMockup } from '@/src/components/landing/ChatMockup';
import { FaqAccordion } from '@/src/components/landing/FaqAccordion';
import { LiveTestimonialsSection } from '@/src/components/landing/LiveTestimonialsSection';
import { PublicNavbar } from '@/src/components/layout/PublicNavbar';
import { PublicFooter } from '@/src/components/layout/PublicFooter';
import { Card } from '@/src/components/ui/card';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  BarChart3,
  Globe,
  Lock,
  CheckCircle2,
  Database,
  ExternalLink,
  Users,
  Briefcase,
  Award,
} from 'lucide-react';
import { getLivePlatformMetrics, PlatformMetrics } from '@/src/lib/firestore/landingData';

export const LandingPage: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const { firebaseUser, authenticatedUser, userProfile, currentRole } = useAuth();

  const activeUser = authenticatedUser || userProfile;
  const isAuthenticated = Boolean(firebaseUser || activeUser || currentRole);
  const rawRole = activeUser?.role || currentRole || 'client';
  const effectiveRole = (rawRole === 'freelancer' ? 'symbiote' : rawRole) as 'client' | 'symbiote' | 'admin';
  const dashboardPath = `/${effectiveRole}/dashboard`;

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const data = await getLivePlatformMetrics();
        if (isMounted) setMetrics(data);
      } catch (e) {
        console.warn('Failed to load metrics:', e);
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const symbiotesCount = metrics && metrics.totalSymbiotes >= 100 ? `${metrics.totalSymbiotes}+` : '1,500+';
  const projectsCount = metrics && metrics.totalProjects >= 50 ? `${metrics.totalProjects}+` : '1,200+';
  const totalUsersCount = metrics && metrics.totalUsers >= 1000 ? metrics.totalUsers : 12500;
  const isLiveDb = Boolean(metrics && metrics.isLiveFirestore && metrics.totalUsers >= 1000);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)] flex flex-col">
      {/* UNIFIED TOP NAV */}
      <PublicNavbar />

      {/* HERO SECTION */}
      <main className="flex-1 space-y-16 lg:space-y-24 pb-20">
        <section className="relative py-12 lg:py-20 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <div className="space-y-8 text-left">
              {/* Eyebrow Badge */}
              <div className="inline-flex">
                <button
                  type="button"
                  onClick={() => scrollToSection('ai-showcase')}
                  className="cursor-pointer focus:outline-none"
                  title="Explore PreSync AI Matching"
                >
                  <StatusPill
                    variant="blue"
                    icon={<Sparkles className="w-3.5 h-3.5 text-[var(--color-info-blue)]" />}
                    label="AI-Powered Talent Matching • Explore"
                  />
                </button>
              </div>

              {/* H1 3-line stack */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-[var(--color-text-primary)]">
                Connect With Elite <br />
                <span className="text-accent-gradient">IT Professionals</span> <br />
                Using AI
              </h1>

              {/* Subtext Paragraph */}
              <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
                SyncSphere is the B2B collaboration marketplace that uses PreSync AI to match your business with pre-vetted tech professionals — faster, smarter, and with 94% accuracy.
              </p>

              {/* 2 CTAs side-by-side */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {isAuthenticated ? (
                  <Link to={dashboardPath} id="hero-dashboard-cta">
                    <Button variant="primary" size="lg" className="font-bold gap-2">
                      Go to Dashboard <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/portal-select" id="hero-get-started-cta">
                    <Button variant="primary" size="lg" className="font-bold gap-2">
                      Get Started Free <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}

                <Button
                  variant="secondary"
                  size="lg"
                  className="font-medium"
                  onClick={() => scrollToSection('mockup')}
                >
                  Explore Dashboard
                </Button>
              </div>

              {/* Stat Trio Row (Curated Platform Benchmarks) */}
              <div className="pt-6 border-t border-[var(--color-border)]/60 grid grid-cols-3 gap-4">
                <Link
                  to="/portal-select"
                  className="space-y-1 block group hover:opacity-90 transition-opacity"
                  title="Explore Verified Specialists"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                    1,500+
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Verified Specialists</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    Pre-vetted engineering network
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection('ai-showcase')}
                  className="space-y-1 block text-left group hover:opacity-90 transition-opacity cursor-pointer"
                  title="View AI Match Benchmark"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-accent-cyan)]">
                    98%
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Match Accuracy</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    PreSync AI architecture score
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="space-y-1 block text-left group hover:opacity-90 transition-opacity cursor-pointer"
                  title="View Delivery Timeline Benchmark"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-success-green)]">
                    48 Hours
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Avg. Placement Time</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    Fast-track sprint SLA
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column (Live Browser-Chrome Dashboard Mockup) */}
            <div id="mockup" className="relative lg:pl-4">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* TRUSTED-BY STRIP (Live Interactive Partner Integrations) */}
        <section className="py-10 border-y border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-6 text-center">
            <span className="text-xs font-mono tracking-widest text-[var(--color-text-secondary)] uppercase font-semibold">
              COMPATIBLE CLOUD INFRASTRUCTURE & INTEGRATIONS
            </span>

            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-14 opacity-80">
              {/* Google Cloud */}
              <a
                href="https://cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="Google Cloud Infrastructure"
              >
                <svg className="h-6 w-auto fill-current text-sky-400" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                </svg>
                <span className="text-sm font-bold tracking-tight font-sans">Google Cloud</span>
              </a>

              {/* Microsoft */}
              <a
                href="https://azure.microsoft.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="Microsoft Azure Infrastructure"
              >
                <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                  <div className="bg-red-500 rounded-[1px]" />
                  <div className="bg-emerald-500 rounded-[1px]" />
                  <div className="bg-blue-500 rounded-[1px]" />
                  <div className="bg-amber-400 rounded-[1px]" />
                </div>
                <span className="text-sm font-bold tracking-tight font-sans">Microsoft</span>
              </a>

              {/* Stripe */}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="Stripe & SaaS Billing"
              >
                <svg className="h-5 w-5 fill-current text-indigo-400" viewBox="0 0 24 24">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.633.5 6.775.5 2.8 3.612 2.8 8.847c0 5.485 5.228 6.557 8.356 7.701 2.502.915 3.395 1.642 3.395 2.673 0 .963-.847 1.542-2.31 1.542-2.527 0-5.32-1.196-7.147-2.18l-.946 5.568C5.816 24.847 8.784 25.5 12.062 25.5c6.262 0 10.338-3.03 10.338-8.497 0-5.59-5.267-6.662-8.424-7.853z"/>
                </svg>
                <span className="text-sm font-bold tracking-tight font-sans">Stripe</span>
              </a>

              {/* Amazon Web Services */}
              <a
                href="https://aws.amazon.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="AWS Cloud Architecture"
              >
                <svg className="h-5 w-auto fill-current text-amber-400" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="text-sm font-bold tracking-tight font-sans">AWS Cloud</span>
              </a>

              {/* Datadog */}
              <a
                href="https://datadoghq.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="Datadog Observability"
              >
                <svg className="h-5 w-auto fill-current text-purple-400" viewBox="0 0 24 24">
                  <path d="M12 12c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3zm0-8C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                <span className="text-sm font-bold tracking-tight font-sans">Datadog</span>
              </a>

              {/* Snowflake */}
              <a
                href="https://snowflake.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:scale-105 transition-all group"
                title="Snowflake Telemetry"
              >
                <svg className="h-5 w-auto fill-current text-cyan-400" viewBox="0 0 24 24">
                  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-sm font-bold tracking-tight font-sans">Snowflake</span>
              </a>
            </div>
          </div>
        </section>

        {/* PLATFORM FEATURES SECTION */}
        <section id="features" className="py-8 px-6 lg:px-12 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          {/* Header */}
          <div className="text-center space-y-3">
            <span className="text-xs font-mono tracking-widest text-[var(--color-accent-cyan)] uppercase font-bold">
              PLATFORM CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
              Everything you need to build <br />
              <span className="text-accent-gradient">your ideal tech team</span>
            </h2>
          </div>

          {/* 6-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="AI-Powered Matching"
              description="PreSync AI analyzes 50+ data points to deliver 94% accurate professional matches, eliminating weeks of manual screening."
              badgeStyle="bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30"
              href="/portal-select"
            />

            <FeatureCard
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Verified Specialists"
              description="Every specialist profile is background-checked, skill-assessed, and rated with transparent milestone delivery history."
              badgeStyle="bg-[var(--color-info-blue)]/15 text-[var(--color-info-blue)] border-[var(--color-info-blue)]/30"
              href="/portal-select"
            />

            <FeatureCard
              icon={<Layers className="w-5 h-5" />}
              title="Full Collaboration Suite"
              description="Manage project milestones, track live billable hours, share files, and manage milestone disbursements seamlessly."
              badgeStyle="bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30"
              href="/portal-select"
            />

            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Real-Time Analytics"
              description="Track milestone velocity, engineering output, budget spend, and delivery health with live platform dashboards."
              badgeStyle="bg-[var(--color-warning-amber)]/15 text-[var(--color-warning-amber)] border-[var(--color-warning-amber)]/30"
              href="/portal-select"
            />

            <FeatureCard
              icon={<Globe className="w-5 h-5" />}
              title="Global Talent Network"
              description="Access top-tier software engineers, AI architects, DevOps leads, and UI/UX specialists ready in your timezone."
              badgeStyle="bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border-[var(--color-success-green)]/30"
              href="/portal-select"
            />

            <FeatureCard
              icon={<Lock className="w-5 h-5" />}
              title="Enterprise Security"
              description="Hardened Firestore security rules, encrypted communications, and role-based access control (RBAC)."
              badgeStyle="bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30"
              href="/privacy"
            />
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-8 px-6 lg:px-12 max-w-7xl mx-auto space-y-12 scroll-mt-24">
          {/* Header */}
          <div className="text-center space-y-3">
            <span className="text-xs font-mono tracking-widest text-[var(--color-accent-cyan)] uppercase font-bold">
              STREAMLINED WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-xl mx-auto">
              How SyncSphere works
            </h2>
          </div>

          {/* 4-Card Numbered Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <NumberedStepCard
              stepNumber="01"
              title="Post Your Project"
              description="Describe your technical vision with our AI intake assistant. It structures requirements into an unambiguous scope brief."
              href="/portal-select"
            />

            <NumberedStepCard
              stepNumber="02"
              title="Get AI-Matched"
              description="PreSync AI recommends pre-vetted specialists with explainable compatibility scores, skill alignment, and rate transparency."
              href="/portal-select"
            />

            <NumberedStepCard
              stepNumber="03"
              title="Review & Hire"
              description="Inspect verified profiles, previous code reviews, and milestone track records before finalizing direct engagement agreements."
              href="/portal-select"
            />

            <NumberedStepCard
              stepNumber="04"
              title="Collaborate & Pay"
              description="Execute in a dedicated workspace with Kanban tasks, file exchanges, time tracking, and direct milestone settlements."
              href="/portal-select"
            />
          </div>
        </section>

        {/* PRESYNC AI SHOWCASE SECTION (Live Interactive Chat) */}
        <section id="ai-engine" className="py-8 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
          <div id="ai-showcase" className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <div className="space-y-6 text-left">
              {/* Eyebrow badge */}
              <div className="inline-flex">
                <StatusPill
                  variant="purple"
                  icon={<Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />}
                  label="PreSync AI Technology"
                />
              </div>

              {/* H2 Heading */}
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Meet <span className="text-accent-gradient">PreSync AI</span>, <br />
                your intelligent project architect
              </h2>

              {/* Paragraph */}
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                PreSync AI transforms raw ideas into actionable project briefs, matches top talent with explainable precision, and predicts timeline & budget constraints before you hire.
              </p>

              {/* 4-Item Checklist */}
              <div className="space-y-3 pt-2">
                {[
                  'Generates structured project requirements & technical specifications',
                  'Recommends optimal engineering team compositions',
                  'Predicts timeline and budget ranges with historical accuracy',
                  'Mitigates architectural risks before committing resources',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success-green)] shrink-0" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="pt-4">
                <Link to="/portal-select">
                  <Button variant="primary" size="lg" className="font-bold gap-2 px-6">
                    Try PreSync AI Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column (Interactive Chat Demo) */}
            <div className="w-full">
              <ChatMockup />
            </div>
          </div>
        </section>

        {/* LIVE TESTIMONIALS & REVIEWS SECTION (Firestore Connected) */}
        <LiveTestimonialsSection />

        {/* FAQ SECTION */}
        <section id="faq" className="py-8 px-6 lg:px-12 max-w-7xl mx-auto space-y-10 scroll-mt-24">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono tracking-widest text-[var(--color-accent-cyan)] uppercase font-bold">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
              Have other questions? Visit our{' '}
              <Link to="/help" className="text-[var(--color-accent-cyan)] underline underline-offset-4 hover:opacity-80">
                Help Center
              </Link>{' '}
              or{' '}
              <Link to="/contact" className="text-[var(--color-accent-cyan)] underline underline-offset-4 hover:opacity-80">
                Contact Support
              </Link>.
            </p>
          </div>

          <FaqAccordion />
        </section>

        {/* BOTTOM CTA BANNER (Dynamic Registered User Count) */}
        <section id="cta" className="py-8 px-6 lg:px-12 max-w-7xl mx-auto">
          <Card className="relative overflow-hidden p-8 sm:p-12 lg:p-16 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl space-y-6">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-cyan)]/10 via-transparent to-[#A855F7]/10 pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                Ready to build your dream team?
              </h2>
              <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
                Join {totalUsersCount.toLocaleString()}+ businesses and professionals collaborating on SyncSphere.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath} id="bottom-cta-dashboard">
                      <Button variant="primary" size="lg" className="font-bold gap-2">
                        Open Your Dashboard <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to={`/${effectiveRole}/profile`} id="bottom-cta-profile">
                      <Button variant="secondary" size="lg" className="font-semibold">
                        View Profile
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/login" id="bottom-cta-login">
                      <Button variant="secondary" size="lg" className="font-semibold">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/portal-select" id="bottom-cta-get-started">
                      <Button variant="primary" size="lg" className="font-bold gap-2">
                        Get Started Free <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="font-medium">
                    Contact Enterprise
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
};
