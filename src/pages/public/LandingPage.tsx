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

  const symbiotesCount = metrics && metrics.totalSymbiotes > 0 ? `${metrics.totalSymbiotes}+` : '50K+';
  const projectsCount = metrics && metrics.totalProjects > 0 ? `${metrics.totalProjects}+` : '1,200+';
  const totalUsersCount = metrics && metrics.totalUsers > 0 ? metrics.totalUsers : 12000;
  const isLiveDb = metrics && metrics.isLiveFirestore && metrics.totalUsers > 0;

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

              {/* Stat Trio Row (Live Dynamic Firestore Connected) */}
              <div className="pt-6 border-t border-[var(--color-border)]/60 grid grid-cols-3 gap-4">
                <Link
                  to="/portal-select"
                  className="space-y-1 block group hover:opacity-90 transition-opacity"
                  title="Explore Verified Specialists"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                    {symbiotesCount}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Verified Specialists</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    {isLiveDb ? '● Live Firestore query' : '○ Verified benchmark'}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection('ai-showcase')}
                  className="space-y-1 block text-left group hover:opacity-90 transition-opacity cursor-pointer"
                  title="View AI Match Benchmark"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-accent-cyan)]">
                    94%
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Match Accuracy</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    PreSync AI model score
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="space-y-1 block text-left group hover:opacity-90 transition-opacity cursor-pointer"
                  title="View Delivery Timeline Benchmark"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-success-green)]">
                    4 Days
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-medium leading-tight flex items-center gap-1">
                    <span>Avg. Hire Time</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] block">
                    Estimated SLA
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
                <svg className="h-5 w-auto fill-current text-indigo-400" viewBox="0 0 60 25">
                  <path d="M59.6 10.8c0-4.2-2-6.1-5.8-6.1-4.2 0-6.8 2.8-6.8 7.3 0 5.4 3.3 7.1 7.8 7.1 2.3 0 4.3-.4 5.4-1v-2.8c-1.1.5-2.7.8-4.4.8-2.6 0-4.5-.8-4.6-3.3h8.3c0-.3.1-1.3.1-2zm-8.2-1.3c0-1.7 1.1-2.5 2.5-2.5 1.4 0 2.4.8 2.4 2.5h-4.9zm-9.3-4.8c-2.1 0-3.5 1.1-4.2 1.8v-1.5h-3.9v14.1h4.1v-8.2c0-2.3 1.5-3.3 3.1-3.3 1.1 0 1.9.3 2.3.6l.8-3.4c-.6-.3-1.4-.8-2.2-.8zm-11.4 0c-1.5 0-2.9.5-3.7 1.2v-5.6h-4.1v18.5h4.1v-1.7c.9.8 2.2 1.4 3.8 1.4 3.3 0 6.2-2.7 6.2-6.9 0-4.4-2.9-6.9-6.3-6.9zm-.8 10.7c-1.7 0-2.9-.8-3.3-1.4v-4.4c.5-.7 1.7-1.4 3.3-1.4 2.2 0 3.5 1.8 3.5 3.6 0 1.9-1.3 3.6-3.5 3.6zm-14.7-4.1c0-1.8 1.4-2.5 3.7-2.5 1.7 0 3.3.4 4.3.9v-3.1c-1.2-.5-3-.8-4.7-.8-4.5 0-7.3 2.1-7.3 5.9 0 5.2 6.6 4.4 6.6 6.7 0 .8-.8 1.3-2.1 1.3-1.8 0-3.8-.7-5.1-1.5v3.2c1.4.8 3.5 1.2 5.3 1.2 4.7 0 7.7-2 7.7-5.8 0-5.6-6.7-4.6-6.7-6.8z"/>
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
