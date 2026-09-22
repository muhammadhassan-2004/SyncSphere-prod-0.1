import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from '@/src/components/layout/PublicNavbar';
import { PublicFooter } from '@/src/components/layout/PublicFooter';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Bot,
  Users,
  Layers,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Cpu,
  Workflow,
  Scale,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased flex flex-col selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)]">
      <PublicNavbar />

      <main className="flex-1 space-y-12 pb-20">
        {/* BACK NAVIGATION */}
        <div className="pt-6 px-6 lg:px-12 max-w-7xl mx-auto w-full text-left">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="about-back-btn"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group cursor-pointer px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 bg-[var(--color-surface)]"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>
            <span className="text-[var(--color-border)]">•</span>
            <Link
              to="/"
              className="text-xs font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* HERO HEADER */}
        <section className="relative pt-2 px-6 lg:px-12 max-w-7xl mx-auto text-left">
          <div className="space-y-6 max-w-3xl">
            <div className="inline-flex">
              <StatusPill
                variant="cyan"
                icon={<Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
                label="About SyncSphere"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-text-primary)] leading-[1.15]">
              Bridging the gap between enterprises and elite tech talent with{' '}
              <span className="text-accent-gradient">PreSync AI</span>.
            </h1>
            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
              SyncSphere was engineered to solve the most painful bottleneck in modern enterprise technology delivery: finding, vetting, aligning, and securely executing high-stakes engineering contracts without costly project mismatches.
            </p>
          </div>
        </section>

        {/* CORE STATS GRID */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <span className="text-3xl lg:text-4xl font-black font-mono text-[var(--color-accent-cyan)]">
                94%
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Match Accuracy
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                PreSync AI evaluates 50+ multidimensional data points for zero-friction project staffing.
              </p>
            </Card>

            <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <span className="text-3xl lg:text-4xl font-black font-mono text-[var(--color-accent-cyan)]">
                80%
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Screening Reduction
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Automated brief synthesis eliminates weeks of ambiguity before the first line of code is written.
              </p>
            </Card>

            <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <span className="text-3xl lg:text-4xl font-black font-mono text-[var(--color-accent-cyan)]">
                100%
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Transparent Delivery
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Every milestone is backed by itemized time tracking and explicit human approval gates.
              </p>
            </Card>

            <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <span className="text-3xl lg:text-4xl font-black font-mono text-[var(--color-accent-cyan)]">
                3 Portals
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Unified Ecosystem
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Dedicated interfaces for Enterprise Clients, Symbiote Specialists, and Platform Governance.
              </p>
            </Card>
          </div>
        </section>

        {/* MISSION & THE THREE PILLARS */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-accent-cyan)]">
              Our Core Philosophy
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
              Engineered for absolute certainty in technical execution
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 flex items-center justify-center text-[var(--color-accent-cyan)]">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                PreSync AI Architecture
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Traditional job boards rely on static resumes. PreSync AI conducts dynamic, conversational scope discovery, synthesizes comprehensive technical briefs, and calculates neural fit scores with full explainability.
              </p>
            </Card>

            <Card className="p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                Human-in-the-Loop Governance
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                AI proposes, humans decide. In strict compliance with SyncSphere AI Governance rules, all AI outputs require explicit human verification and approval before contract binding, milestone release, or deployment.
              </p>
            </Card>

            <Card className="p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Workflow className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                Integrated Delivery Workspace
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                From real-time messaging and collaborative Kanban boards to automated invoice generation and milestone verification, the entire project lifecycle happens seamlessly within a unified environment.
              </p>
            </Card>
          </div>
        </section>

        {/* HOW WE ARE DIFFERENT */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto">
          <Card className="p-8 sm:p-12 border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-elevated)] to-[var(--color-surface)] space-y-8">
            <div className="max-w-2xl space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                The Symbiote Specialist Standard
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                We call our verified professionals "Symbiotes" because they don't simply complete tasks—they integrate harmoniously into your engineering culture and product architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-cyan)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-sm font-semibold text-[var(--color-text-primary)]">Rigorous Technical Vetting</h5>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">Specialists undergo architecture evaluations and verified credential auditing.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-cyan)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-sm font-semibold text-[var(--color-text-primary)]">Explainable Neural Matching</h5>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">Know exactly why each candidate was recommended with quantified fit scores.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-cyan)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-sm font-semibold text-[var(--color-text-primary)]">Itemized Milestone Invoicing</h5>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">Invoices are generated upon verified task hours and client review.</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* BOTTOM CTA */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto text-center">
          <Card className="p-10 sm:p-14 border border-[var(--color-accent-cyan)]/30 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-background)] space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
              Ready to experience modern B2B tech collaboration?
            </h3>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Join leading tech teams and certified specialists already delivering mission-critical software on SyncSphere.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link to="/portal-select">
                <Button variant="primary" size="lg" className="font-bold gap-2">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="secondary" size="lg" className="font-semibold">
                  Contact Our Team
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
