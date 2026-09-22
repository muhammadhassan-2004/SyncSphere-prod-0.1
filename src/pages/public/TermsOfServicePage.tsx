import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import {
  Scale,
  ArrowLeft,
  Shield,
  CheckCircle2,
  Lock,
  AlertTriangle,
  FileText,
  Mail,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('acceptance');

  const handleBack = () => {
    // Navigate back to where the user came from (e.g. signup, login, landing)
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/signup');
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = [
    { id: 'acceptance', title: '1. Acceptance & Description' },
    { id: 'accounts', title: '2. User Accounts & Portals' },
    { id: 'ai-governance', title: '3. PreSync AI Governance' },
    { id: 'invoicing', title: '4. Milestone Billing & Invoicing' },
    { id: 'ip', title: '5. Intellectual Property' },
    { id: 'liability', title: '6. Limitation of Liability' },
    { id: 'contact', title: '7. Legal Inquiries' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)] relative overflow-hidden py-6 sm:py-10">
      {/* AMBIENT BACKGROUND GLOWS (MATCHING LANDING PAGE) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-[var(--color-accent-cyan)]/10 via-[var(--color-accent-blue)]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[400px] bg-[var(--color-accent-purple)]/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* TOP BAR WITH BACK BUTTON & BRANDING */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]/60">
          <div className="flex items-center gap-4">
            <button
              type="button"
              id="terms-back-btn"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all shadow-sm hover:shadow-cyan-500/10 cursor-pointer group"
              aria-label="Go back to previous screen"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--color-accent-cyan)] transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>

            <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <SyncSphereLogo iconSize={26} textSize="md" />
              </Link>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 font-bold uppercase tracking-wider">
                Terms
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusPill
              variant="cyan"
              icon={<Scale className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
              label="Terms of Service"
            />
            <span className="text-xs font-mono text-[var(--color-text-secondary)] hidden md:inline">
              Updated August 2026
            </span>
          </div>
        </div>

        {/* HERO TITLE SECTION */}
        <div className="space-y-3 text-left">
          <div className="inline-flex">
            <StatusPill
              variant="blue"
              icon={<Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-blue)]" />}
              label="Platform Legal Framework"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-[1.2]">
            Terms of <span className="text-accent-gradient">Service</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
            Please read these terms carefully before accessing or using the SyncSphere platform. This agreement governs all client briefs, AI matching operations, specialist contracts, and milestone invoicing transactions.
          </p>
          <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-secondary)] pt-1">
            <span>Effective: January 1, 2026</span>
            <span>•</span>
            <span>Version: 3.2.0</span>
          </div>
        </div>

        {/* MAIN 2-COLUMN GRID (MATCHING LANDING PAGE WIDTH) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: TABLE OF CONTENTS (STICKY ON DESKTOP) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-8">
            <Card className="p-5 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
              <h3 className="text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      activeSection === sec.id
                        ? 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-bold border border-[var(--color-accent-cyan)]/30'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
                    }`}
                  >
                    <span>{sec.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </nav>
            </Card>

            <Card className="p-5 border-[var(--color-border)] bg-[var(--color-surface)]/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
                <Shield className="w-4 h-4 text-[var(--color-success-green)]" />
                <span>Enterprise Grade Security</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                All platform contracts are backed by verified identities, transparent milestone tracking, and AI audit trails.
              </p>
            </Card>
          </div>

          {/* RIGHT COLUMN: DETAILED LEGAL CLAUSES */}
          <div className="lg:col-span-8 space-y-6 text-left">
            {/* SECTION 1 */}
            <Card id="acceptance" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 01
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Acceptance & Platform Description
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                By registering for an account, accessing, or using the SyncSphere platform ("SyncSphere", "we", "us"), you agree to be bound by these Terms of Service. SyncSphere provides an enterprise B2B collaboration ecosystem facilitating AI-augmented talent discovery, project scope synthesis via PreSync AI, milestone contracting, and collaborative delivery management.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                If you are entering into this agreement on behalf of a company, organization, or other legal entity, you represent and warrant that you have the authority to bind such entity to these Terms.
              </p>
            </Card>

            {/* SECTION 2 */}
            <Card id="accounts" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 02
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  User Accounts & Portal Responsibilities
                </h2>
              </div>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Enterprise Clients
                  </strong>
                  <span>
                    Clients represent and warrant that they possess lawful authority to post project requirements, contract independent specialists, approve milestone deliverables, and settle invoices in good faith.
                  </span>
                </li>
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Symbiote Specialists
                  </strong>
                  <span>
                    Specialists represent that their technical credentials, skills taxonomy, hourly rates, and portfolio claims are accurate and up-to-date. Specialists operate as independent technical contractors.
                  </span>
                </li>
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Account Confidentiality
                  </strong>
                  <span>
                    You are solely responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account.
                  </span>
                </li>
              </ul>
            </Card>

            {/* SECTION 3 */}
            <Card id="ai-governance" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 03
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  PreSync AI Governance & Human Authority
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                SyncSphere integrates PreSync AI to facilitate scope synthesis, candidate matching, and timeline estimation. Under platform governance mandates:
              </p>
              <div className="p-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-2.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-green)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--color-text-primary)]">No Auto-Commit:</strong> PreSync AI generated project briefs and recommendations are advisory drafts until explicitly reviewed and approved by a human client.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-green)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--color-text-primary)]">No Autonomous Binding:</strong> PreSync AI cannot enter into contracts or execute financial settlements on behalf of any party.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-green)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--color-text-primary)]">Explainable Matches:</strong> Candidate match scores reflect algorithmic heuristics and do not guarantee specific project outcomes.
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4 */}
            <Card id="invoicing" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 04
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Milestone Payments & Invoicing
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <li>
                  <strong className="text-[var(--color-text-primary)]">Milestone Delivery:</strong> Clients and Specialists structure projects into measurable milestone deliverables and agreed hourly estimates.
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">Deliverable Inspection:</strong> Upon milestone completion by the Symbiote specialist, the client is granted a review window to inspect code, approve the milestone, or request revisions.
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">Dispute Resolution:</strong> If a milestone dispute cannot be resolved between Client and Specialist, either party may escalate to SyncSphere Platform Administrators for mediation based on documented brief specifications.
                </li>
              </ul>
            </Card>

            {/* SECTION 5 */}
            <Card id="ip" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 05
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Intellectual Property & Deliverables
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Unless otherwise explicitly agreed in writing between Client and Specialist, upon full payment and settlement of milestone invoices, all intellectual property rights in the custom deliverables created under that milestone transfer completely to the Client.
              </p>
            </Card>

            {/* SECTION 6 */}
            <Card id="liability" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 06
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Limitation of Liability
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                SyncSphere operates as a talent marketplace and collaboration workspace platform. SyncSphere is not liable for indirect, incidental, or consequential damages resulting from technical service interruptions or independent contractor performance discrepancies.
              </p>
            </Card>

            {/* SECTION 7 */}
            <Card id="contact" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 07
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Contact Legal Department
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                For legal notices or questions regarding these Terms, contact{' '}
                <a href="mailto:legal@syncsphere.io" className="text-[var(--color-accent-cyan)] font-mono font-semibold hover:underline">
                  legal@syncsphere.io
                </a>{' '}
                or reach our compliance desk.
              </p>
            </Card>

            {/* BOTTOM NAV */}
            <div className="pt-4 flex items-center justify-between border-t border-[var(--color-border)]/60 text-xs font-mono">
              <button
                type="button"
                onClick={handleBack}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to previous</span>
              </button>

              <Link
                to="/privacy"
                className="text-[var(--color-accent-cyan)] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Read Privacy Policy</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
