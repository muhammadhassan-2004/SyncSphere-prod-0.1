import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from '@/src/components/layout/PublicNavbar';
import { PublicFooter } from '@/src/components/layout/PublicFooter';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/src/lib/toast/ToastProvider';

export const ContactUsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string } | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);

    // Simulate real backend processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const ticketId = `SYN-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedTicket({ id: ticketId, email });
    setSubmitting(false);
    addToast(`Inquiry received! Reference Ticket #${ticketId}`, 'success');
  };

  const handleReset = () => {
    setFullName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setInquiryType('general');
    setSubmittedTicket(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased flex flex-col selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)]">
      <PublicNavbar />

      <main className="flex-1 space-y-8 pb-20">
        {/* BACK NAVIGATION */}
        <div className="pt-6 px-6 lg:px-12 max-w-7xl mx-auto w-full text-left">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="contact-back-btn"
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

        {/* HEADER */}
        <section className="relative pt-4 px-6 lg:px-12 max-w-7xl mx-auto text-left">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex">
              <StatusPill
                variant="cyan"
                icon={<Mail className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
                label="Get in Touch"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Contact our platform team
            </h1>
            <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
              Have questions regarding PreSync AI, custom enterprise agreements, milestone invoicing, or specialist onboarding? We're here to assist.
            </p>
          </div>
        </section>

        {/* 2-COLUMN FORM & INFO GRID */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Form Area (7 cols) */}
            <div className="lg:col-span-7">
              <Card className="p-6 sm:p-8 border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-6">
                {submittedTicket ? (
                  <div className="py-8 text-center space-y-5">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border border-[var(--color-success-green)]/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                        Thank You! Your message has been routed.
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
                        A support specialist has been assigned to ticket{' '}
                        <strong className="font-mono text-[var(--color-accent-cyan)] font-bold">
                          #{submittedTicket.id}
                        </strong>
                        . A confirmation and response will be sent to{' '}
                        <strong className="text-[var(--color-text-primary)]">{submittedTicket.email}</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] max-w-sm mx-auto text-left text-xs font-mono space-y-1.5 text-[var(--color-text-secondary)]">
                      <div className="flex justify-between">
                        <span>Ticket Status:</span>
                        <span className="text-[var(--color-success-green)] font-bold">QUEUED FOR DISPATCH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected SLA:</span>
                        <span className="text-[var(--color-text-primary)] font-bold">&lt; 24 Hours</span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleReset}
                      className="mt-4"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase font-mono text-[var(--color-text-primary)]">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full px-3.5 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase font-mono text-[var(--color-text-primary)]">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@company.com"
                          className="w-full px-3.5 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
                        />
                      </div>
                    </div>

                    {/* Inquiry Type */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold uppercase font-mono text-[var(--color-text-primary)]">
                        Inquiry Category
                      </label>
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
                      >
                        <option value="general">General Inquiries</option>
                        <option value="enterprise">Enterprise Custom Solutions & Scoping</option>
                        <option value="talent">Symbiote Specialist Onboarding & Vetting</option>
                        <option value="billing">Milestone Settlement & Billing Questions</option>
                        <option value="technical">Technical Support / Bug Report</option>
                      </select>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold uppercase font-mono text-[var(--color-text-primary)]">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your inquiry"
                        className="w-full px-3.5 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold uppercase font-mono text-[var(--color-text-primary)]">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please describe how we can assist you..."
                        className="w-full px-3.5 py-2.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                      className="w-full justify-center font-bold gap-2 mt-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Inquiry</span>
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* Right Information Area (5 cols) */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] space-y-5">
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-[var(--color-accent-cyan)]">
                  Direct Communications
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Support Desk</h4>
                      <a href="mailto:support@syncsphere.io" className="text-xs text-[var(--color-accent-cyan)] hover:underline font-mono">
                        support@syncsphere.io
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Enterprise Partnerships</h4>
                      <a href="mailto:partners@syncsphere.io" className="text-xs text-[var(--color-accent-cyan)] hover:underline font-mono">
                        partners@syncsphere.io
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Response SLA</h4>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Under 24 hours standard; under 4 hours for active client contracts.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-success-green)]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Platform SLA</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  All enterprise messages and contract inquiries are routed with end-to-end audit logging and strict data isolation under SyncSphere governance.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
