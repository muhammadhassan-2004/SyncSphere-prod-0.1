import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import {
  Shield,
  ArrowLeft,
  Lock,
  Eye,
  CheckCircle2,
  Server,
  UserCheck,
  FileText,
  Mail,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');

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
    { id: 'overview', title: '1. Overview & Scope' },
    { id: 'data-collection', title: '2. Information We Collect' },
    { id: 'ai-processing', title: '3. PreSync AI & Explainability' },
    { id: 'rbac', title: '4. Role-Based Data Access' },
    { id: 'security', title: '5. Security & Encryption' },
    { id: 'rights', title: '6. Your Rights & Portability' },
    { id: 'contact', title: '7. Privacy Inquiries' },
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
              id="privacy-back-btn"
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
                Privacy
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusPill
              variant="cyan"
              icon={<Shield className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
              label="Privacy & Data Governance"
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
              label="Data Protection & AI Transparency"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-[1.2]">
            Privacy <span className="text-accent-gradient">Policy</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
            This Privacy Policy describes how SyncSphere collects, processes, and protects your personal and project information. We strictly prioritize enterprise confidentiality and ethical AI governance.
          </p>
          <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-secondary)] pt-1">
            <span>Effective: January 1, 2026</span>
            <span>•</span>
            <span>GDPR & CCPA Compliant</span>
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
                <Lock className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <span>Zero Public Model Training</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Your proprietary briefs, codebase references, and messages are never fed into public AI training datasets.
              </p>
            </Card>
          </div>

          {/* RIGHT COLUMN: DETAILED LEGAL CLAUSES */}
          <div className="lg:col-span-8 space-y-6 text-left">
            {/* SECTION 1 */}
            <Card id="overview" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 01
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Overview & Platform Scope
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                SyncSphere ("we", "our", or "the Platform") operates a B2B collaboration marketplace connecting enterprise clients with pre-vetted independent IT professionals ("Symbiotes"). This Privacy Policy explains what personal and organizational information we collect, how we use it, how PreSync AI processes project briefs, and how your data is protected.
              </p>
            </Card>

            {/* SECTION 2 */}
            <Card id="data-collection" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 02
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Information We Collect
                </h2>
              </div>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Account & Profile Information
                  </strong>
                  <span>
                    Name, email address, contact phone number, company name, industry, professional titles, skills taxonomy, hourly rates, and avatar imagery.
                  </span>
                </li>
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Project & Scope Data
                  </strong>
                  <span>
                    Project descriptions, tech stack tags, budget parameters, milestone schedules, and conversational inputs provided during PreSync AI brief synthesis.
                  </span>
                </li>
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Workspace & Collaboration Records
                  </strong>
                  <span>
                    Messages sent between Clients and Symbiotes, Kanban task statuses, logged work hours, and deliverables uploaded to active contracts.
                  </span>
                </li>
                <li className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1">
                  <strong className="text-[var(--color-text-primary)] block font-semibold">
                    Billing & Invoicing Metadata
                  </strong>
                  <span>
                    Invoicing history, milestone settlement states, payment timestamps, and transaction reference numbers.
                  </span>
                </li>
              </ul>
            </Card>

            {/* SECTION 3 */}
            <Card id="ai-processing" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 03
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  PreSync AI Processing & Explainability
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                PreSync AI processes project parameters and conversation transcripts solely to generate structured executive project briefs and calculate candidate neural fit scores.
              </p>
              <div className="p-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-2.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-2 font-bold text-[var(--color-text-primary)] pb-1 border-b border-[var(--color-border)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-green)]" />
                  <span>AI Governance Guarantees</span>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 pt-1">
                  <li>User-provided project data is never sold or utilized to train general external public models.</li>
                  <li>In accordance with PRD AI Governance rules, AI suggestions and brief drafts are never auto-committed without explicit human approval.</li>
                  <li>Match recommendations always include transparent explanation rationale.</li>
                </ul>
              </div>
            </Card>

            {/* SECTION 4 */}
            <Card id="rbac" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 04
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Role-Based Data Access & Isolation
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                SyncSphere enforces strict multi-role access control (RBAC):
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <li><strong className="text-[var(--color-text-primary)]">Clients</strong> can view their own projects, team members, invited specialists, and milestone invoices.</li>
                <li><strong className="text-[var(--color-text-primary)]">Symbiotes</strong> can view public project listings, contracts they are assigned to, and their personal earnings records.</li>
                <li><strong className="text-[var(--color-text-primary)]">Administrators</strong> maintain governance oversight, platform audit logging, and dispute resolution access.</li>
              </ul>
            </Card>

            {/* SECTION 5 */}
            <Card id="security" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 05
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Data Security & Encryption
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                We implement industry-standard technical measures to safeguard information, including transport-layer encryption (HTTPS/TLS), firewalled database isolation, and role-restricted security rules.
              </p>
            </Card>

            {/* SECTION 6 */}
            <Card id="rights" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 06
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Your Rights & Data Portability
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                You may access, modify, export, or delete your account information at any time via your portal settings. If you require complete account removal or data export under GDPR/CCPA regulations, contact our Data Protection Officer.
              </p>
            </Card>

            {/* SECTION 7 */}
            <Card id="contact" className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                  Section 07
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                  Contact Privacy Team
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                For privacy inquiries or compliance requests, reach us at{' '}
                <a href="mailto:privacy@syncsphere.io" className="text-[var(--color-accent-cyan)] font-mono font-semibold hover:underline">
                  privacy@syncsphere.io
                </a>{' '}
                or submit an inquiry.
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
                to="/terms"
                className="text-[var(--color-accent-cyan)] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Read Terms of Service</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
