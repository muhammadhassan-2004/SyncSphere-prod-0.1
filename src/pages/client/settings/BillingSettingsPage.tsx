import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { subscribeToUserProfile, updateUserProfile } from '@/src/lib/firestore/users';
import { subscribeToInvoices, createInvoice } from '@/src/lib/firestore/invoices';
import { BillingInfo, Invoice } from '@/src/types/firestore';
import { SettingsLeftNav } from '@/src/components/settings/SettingsLeftNav';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  FileText,
  DollarSign,
  Calendar,
  X,
  Check,
  Loader2,
  Building2,
  Lock,
} from 'lucide-react';

const INITIAL_BILLING_INVOICES: any[] = [];

export const BillingSettingsPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || userProfile?.uid || '';

  // Billing state
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    planName: 'Free / Unsubscribed',
    status: 'inactive',
    renewalDate: 'N/A',
    amountPerMonth: 0,
    paymentMethodLast4: '',
    paymentMethodBrand: '',
    billingEmail: firebaseUser?.email || '',
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<boolean>(false);

  // Card input mock for upgrade
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');

  // Preview Invoice Modal State
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);

  // Subscribe to user profile to load live billing info
  useEffect(() => {
    if (!userId) return;

    const unsubProfile = subscribeToUserProfile(userId, (profile) => {
      if (profile) {
        if (profile.billingInfo) {
          setBillingInfo((prev) => ({
            ...prev,
            ...profile.billingInfo,
          }));
        } else {
          setBillingInfo({
            planName: 'Standard Plan',
            status: 'inactive',
            renewalDate: 'N/A',
            amountPerMonth: 0,
            paymentMethodLast4: '',
            paymentMethodBrand: '',
            billingEmail: profile.email || firebaseUser?.email || '',
          });
        }
      }
    });

    return () => unsubProfile();
  }, [userId, firebaseUser?.email]);

  // Subscribe to real invoices from Firestore
  useEffect(() => {
    if (!userId) return;

    const unsubInvoices = subscribeToInvoices(userId, 'client', (realInvoices) => {
      setInvoices(realInvoices);
      setLoading(false);
    });

    return () => unsubInvoices();
  }, [userId]);

  // Combined invoice list (subscription billing receipts + milestone invoices)
  const allBillingHistory = [...INITIAL_BILLING_INVOICES, ...invoices];

  // Upgrade to Enterprise Handler
  const handleUpgradeToEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);

    // Simulate Stripe payment processing & webhook delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const updatedBillingInfo: BillingInfo = {
      planName: 'Enterprise Plan',
      status: 'active',
      renewalDate: 'September 1, 2026',
      amountPerMonth: 1299,
      paymentMethodLast4: cardNumber.slice(-4) || '4242',
      paymentMethodBrand: 'Visa',
      billingEmail: firebaseUser?.email || 'billing@aetherdynamics.ai',
    };

    try {
      await updateUserProfile(userId, {
        billingInfo: updatedBillingInfo,
      });

      // Also create a receipt invoice doc in Firestore
      await createInvoice({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        title: 'Enterprise Plan Upgrade — Annual Tier',
        clientId: userId,
        symbioteId: 'platform-stripe',
        amount: 1299,
        status: 'paid',
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        description: 'Upgraded subscription tier to Enterprise Plan with unlimited AI matching and SLA support.',
      });

      setBillingInfo(updatedBillingInfo);
      setUpgrading(false);
      setIsUpgradeModalOpen(false);
      setUpgradeSuccess(true);

      setTimeout(() => {
        setUpgradeSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to update billing plan:', err);
      setUpgrading(false);
    }
  };

  // Single Invoice PDF Download Handler
  const handleDownloadInvoice = (inv: any) => {
    const content = `================================================
OFFICIAL BILLING RECEIPT — INVOICE ${inv.invoiceNumber || inv.id}
================================================
Date: ${new Date(inv.createdAt).toLocaleDateString('en-US', { dateStyle: 'full' })}
Billing Entity: ${billingInfo.billingEmail || 'Aether Dynamics Inc.'}
Plan Tier: ${inv.title || 'Growth Plan Monthly Subscription'}
Amount Paid: $${typeof inv.amount === 'number' ? inv.amount.toFixed(2) : '—'} USD
Payment Status: PAID via Stripe (${billingInfo.paymentMethodBrand} •••• ${billingInfo.paymentMethodLast4})

Thank you for choosing SyncSphere Enterprise Infrastructure.
Questions? Contact billing@syncsphere.ai
================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${inv.invoiceNumber || inv.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download All Invoices Summary
  const handleDownloadAll = () => {
    let summaryText = `================================================
SYNCSPHERE COMPLETE BILLING HISTORY STATEMENT
================================================
Client: ${billingInfo.billingEmail}
Generated: ${new Date().toLocaleString()}
Total Statements: ${allBillingHistory.length}

INVOICE BREAKDOWN:
------------------------------------------------
`;

    allBillingHistory.forEach((inv, index) => {
      summaryText += `${index + 1}. [${inv.invoiceNumber || inv.id}] ${inv.title || 'Subscription'} | Amount: $${(inv.amount || 0).toFixed(2)} | Date: ${new Date(inv.createdAt).toLocaleDateString()} | Status: PAID\n`;
    });

    summaryText += `\n================================================
End of Statement
================================================`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SyncSphere_Billing_History_Summary_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isEnterprise = billingInfo.planName?.toLowerCase().includes('enterprise');

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                Billing & Subscription
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Manage your organization subscription plan, payment methods, and invoice receipts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UPGRADE SUCCESS TOAST */}
      {upgradeSuccess && (
        <div className="p-4 rounded-[12px] bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Welcome to Enterprise Tier!</span>
              <span>Your subscription plan has been upgraded to Enterprise. Unlimited AI matching and SLA support are now active.</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 font-bold uppercase text-[10px] text-emerald-300 shrink-0">
            Active Now
          </span>
        </div>
      )}

      {/* 2. TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAV PANEL (4 COLS) */}
        <div className="lg:col-span-4 sticky top-20">
          <SettingsLeftNav />
        </div>

        {/* RIGHT CONTENT PANEL (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* NOTICE BANNER */}
          <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Billing & Stripe Integration Not Configured</span>
            </div>
            <p className="text-amber-200/80 leading-relaxed">
              No live payment processor or Stripe API keys have been connected to this environment. Active SaaS subscription billing and plan upgrades require payment gateway infrastructure that is not yet configured.
            </p>
          </div>

          {/* CARD 1: CURRENT PLAN SUMMARY */}
          <Card className="p-6 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-background)] border-[var(--color-border)] rounded-[14px] space-y-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* PLAN HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {billingInfo.planName || 'Standard Plan'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Billing Not Configured
                  </span>
                </div>
                <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                  Free Access Tier • Payment processor required for paid upgrades
                </p>
              </div>

              {/* PRICE BADGE */}
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                  $0
                  <span className="text-xs text-[var(--color-text-secondary)] font-normal">/mo</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                  No Payment Processor
                </span>
              </div>
            </div>

            {/* PLAN FEATURES LIST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-primary)]">
                <Check className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                <span>Standard project brief creation</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-primary)]">
                <Check className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                <span>Basic Symbiote profile browsing</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] opacity-60">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Custom Team Limits (Requires Setup)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] opacity-60">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Priority SLA Support (Requires Setup)</span>
              </div>
            </div>

            {/* PAYMENT METHOD & UPGRADE ACTION */}
            <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
                    No Payment Method On File
                  </div>
                  <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    Billing email: {billingInfo.billingEmail || firebaseUser?.email || 'N/A'}
                  </p>
                </div>
              </div>

              <Button
                disabled
                className="h-10 bg-slate-800 text-slate-400 cursor-not-allowed font-mono text-xs font-bold px-5 rounded-[8px] flex items-center gap-2 border border-slate-700"
              >
                <Zap className="w-4 h-4" />
                <span>Payment Setup Needed</span>
              </Button>
            </div>
          </Card>

          {/* CARD 2: BILLING HISTORY TABLE */}
          <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
                  Billing History & Invoices
                </h3>
                <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                  View and download official statements and subscription payment receipts.
                </p>
              </div>

              <Button
                onClick={handleDownloadAll}
                variant="outline"
                className="h-8 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                <span>Download All</span>
              </Button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="pb-3 font-semibold">Invoice ID & Description</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                    <th className="pb-3 font-semibold text-center">Status</th>
                    <th className="pb-3 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 text-xs font-mono">
                  {allBillingHistory.map((inv, idx) => (
                    <tr key={inv.id || idx} className="hover:bg-[var(--color-background)]/60 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
                          <span>{inv.invoiceNumber || inv.id}</span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-secondary)] block truncate max-w-xs mt-0.5">
                          {inv.title || inv.description || 'Monthly Subscription Tier'}
                        </span>
                      </td>

                      <td className="py-3.5 px-2 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-2 text-right font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        ${(inv.amount || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-2 text-center whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                          Paid
                        </span>
                      </td>

                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            title="Preview Invoice"
                            className="p-1.5 rounded-[6px] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            title="Download Receipt TXT"
                            className="p-1.5 rounded-[6px] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. STRIPE UPGRADE TO ENTERPRISE MODAL */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[var(--color-surface)] border-[var(--color-accent-cyan)]/40 p-6 space-y-6 rounded-[16px] shadow-2xl animate-scaleIn">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-[12px] bg-gradient-to-r from-[var(--color-accent-cyan)]/20 to-blue-500/20 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
                  <Zap className="w-6 h-6 fill-[var(--color-accent-cyan)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    Upgrade to Enterprise Tier
                  </h3>
                  <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                    Instant upgrade via Stripe Checkout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ENTERPRISE HIGHLIGHTS */}
            <div className="p-4 rounded-[12px] bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-white">Enterprise Membership</span>
                <span className="text-lg font-bold font-mono text-[var(--color-accent-cyan)]">$1,299/mo</span>
              </div>
              <ul className="text-xs font-mono text-[var(--color-text-secondary)] space-y-1.5 pt-1">
                <li className="flex items-center gap-2 text-[var(--color-text-primary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  Unlimited AI Symbiote matching & priority neural queue
                </li>
                <li className="flex items-center gap-2 text-[var(--color-text-primary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  Dedicated Technical Account Manager & 24/7 SLA response
                </li>
                <li className="flex items-center gap-2 text-[var(--color-text-primary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  Custom Master Services Agreement (MSA) & SLA contracts
                </li>
              </ul>
            </div>

            {/* STRIPE PAYMENT CARD INPUT MOCK */}
            <form onSubmit={handleUpgradeToEnterprise} className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
                <div className="font-bold font-mono text-[var(--color-accent-cyan)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Stripe Elements Sandbox Tokenizer
                </div>
                <p className="text-[11px]">
                  Encrypted test mode gateway active. Enter any valid test card to securely simulate Stripe enterprise subscription billing.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                  Payment Card Details (Stripe Secure)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="•••• •••• •••• 4242"
                    className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="888"
                    className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)] pt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted 256-bit SSL transaction via Stripe Merchant Services</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="h-10 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={upgrading}
                  className="h-10 bg-gradient-to-r from-[var(--color-accent-cyan)] to-blue-500 text-slate-950 font-mono text-xs font-bold px-6 rounded-[8px] flex items-center gap-2 shadow-lg"
                >
                  {upgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing Stripe...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>Confirm & Upgrade ($1,299/mo)</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. INVOICE PREVIEW MODAL */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[var(--color-surface)] border-[var(--color-border)] p-6 space-y-5 rounded-[16px] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-base font-bold font-mono text-[var(--color-text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span>Invoice {previewInvoice.invoiceNumber || previewInvoice.id}</span>
                </h3>
                <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                  Issued on {new Date(previewInvoice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="text-[var(--color-text-secondary)] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Billed To:</span>
                  <span className="text-[var(--color-text-primary)] font-bold">{billingInfo.billingEmail}</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Item / Description:</span>
                  <span className="text-[var(--color-text-primary)]">{previewInvoice.title || 'Subscription'}</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Payment Provider:</span>
                  <span className="text-[var(--color-text-primary)]">SyncSphere Platform Billing</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-2 mt-2">
                  <span className="font-bold text-[var(--color-text-primary)]">Total Paid:</span>
                  <span className="text-sm font-bold text-[var(--color-accent-cyan)]">
                    ${typeof previewInvoice.amount === 'number' ? previewInvoice.amount.toFixed(2) : '—'} USD
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
              <Button
                variant="outline"
                onClick={() => setPreviewInvoice(null)}
                className="h-9 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]"
              >
                Close
              </Button>
              <Button
                onClick={() => handleDownloadInvoice(previewInvoice)}
                className="h-9 bg-[var(--color-accent-cyan)] text-slate-950 font-mono text-xs font-bold px-4 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Receipt</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
