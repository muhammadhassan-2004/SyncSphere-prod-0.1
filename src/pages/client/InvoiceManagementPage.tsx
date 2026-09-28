import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Invoice, Project } from '@/src/types/firestore';
import {
  subscribeToInvoices,
  updateInvoiceStatus,
  createInvoice,
} from '@/src/lib/firestore/invoices';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { getAllSymbiotesFromFirestore, subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';
import { formatCalendarDate } from '@/src/lib/utils';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Download,
  Search,
  Filter,
  Info,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Sparkles,
  Printer,
  X,
  Check,
} from 'lucide-react';

export const InvoiceManagementPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment Modal state
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'card' | 'ach' | 'wallet'>('card');
  const [cardNumber, setCardNumber] = useState<string>('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('888');
  const [gatewayConfig, setGatewayConfig] = useState<{ isConfigured: boolean; mode: string }>({
    isConfigured: false,
    mode: 'sandbox',
  });

  // Fetch Payment Gateway Config
  useEffect(() => {
    fetch('/api/payments/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setGatewayConfig({
            isConfigured: data.isConfigured,
            mode: data.mode,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Client vs Symbiote "Create Invoice" Info Banner State
  const [showCreateInfoModal, setShowCreateInfoModal] = useState<boolean>(false);

  // 1. Subscribe to Projects
  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList || []);
    });
    return () => unsub();
  }, [clientId]);

  // Project map helper
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => {
      if (p.id) map[p.id] = p.title;
    });
    return map;
  }, [projects]);

  // Symbiotes helper
  const [symbiotes, setSymbiotes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((list) => {
      setSymbiotes(list || []);
    });
    return () => unsub();
  }, []);

  const symbioteMap = useMemo(() => {
    const map: Record<string, { name: string; title: string; initials: string; avatarUrl?: string }> = {};
    symbiotes.forEach((s) => {
      const name =
        s.displayName ||
        `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
        'Specialist';
      const initials = (s.displayName
        ? s.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : `${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()) || 'SP';
      map[s.uid] = {
        name,
        title: s.headline || s.roleTitle || 'Elite Technical Consultant',
        initials: initials || 'SP',
        avatarUrl: s.avatarUrl || s.photoURL,
      };
    });
    return map;
  }, [symbiotes]);

  // 2. Real-Time Invoices Subscription
  useEffect(() => {
    if (!clientId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsub = subscribeToInvoices(clientId, 'client', (invList) => {
      setInvoices(invList || []);
      if ((invList || []).length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(invList[0].id || null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const sName = inv.symbioteName || symbioteMap[inv.symbioteId]?.name || '';
      const pName = inv.projectName || projectMap[inv.projectId] || '';

      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        sName.toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatus === 'all' || inv.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, selectedStatus, projectMap, symbioteMap]);

  // Active Selected Invoice
  const activeInvoice = useMemo(() => {
    return invoices.find((inv) => inv.id === selectedInvoiceId) || filteredInvoices[0] || null;
  }, [invoices, selectedInvoiceId, filteredInvoices]);

  // Aggregate Stat Calculations
  const stats = useMemo(() => {
    let pendingSum = 0,
      pendingCount = 0;
    let paidSum = 0,
      paidCount = 0;
    let overdueSum = 0,
      overdueCount = 0;
    let totalVolume = 0;

    invoices.forEach((inv) => {
      totalVolume += inv.amount;
      if (inv.status === 'pending') {
        pendingSum += inv.amount;
        pendingCount++;
      } else if (inv.status === 'paid') {
        paidSum += inv.amount;
        paidCount++;
      } else if (inv.status === 'overdue') {
        overdueSum += inv.amount;
        overdueCount++;
      }
    });

    return {
      pendingSum,
      pendingCount,
      paidSum,
      paidCount,
      overdueSum,
      overdueCount,
      totalVolume,
    };
  }, [invoices]);

  // Payment Execution Handler
  const handleExecutePayment = async () => {
    if (!activeInvoice || !activeInvoice.id) return;

    setPaymentProcessing(true);
    setErrorMsg(null);

    try {
      const cleanLast4 = cardNumber.replace(/\D/g, '').slice(-4) || '4242';
      const token = firebaseUser ? await firebaseUser.getIdToken() : '';

      const response = await fetch('/api/payments/process-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invoiceId: activeInvoice.id,
          amount: activeInvoice.amount,
          currency: 'USD',
          clientId,
          clientEmail: userProfile?.email || firebaseUser?.email || '',
          clientName: userProfile?.displayName || 'Client Representative',
          symbioteId: activeInvoice.symbioteId,
          symbioteName: activeInvoice.symbioteName || symbioteMap[activeInvoice.symbioteId]?.name || 'Specialist',
          projectId: activeInvoice.projectId || '',
          projectName: activeInvoice.projectName || projectMap[activeInvoice.projectId || ''] || 'Project Brief',
          cardBrand: paymentMethodChoice === 'card' ? 'Visa' : paymentMethodChoice === 'ach' ? 'ACH Bank' : 'SyncSphere Wallet',
          last4: cleanLast4,
          paymentMethod: paymentMethodChoice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment execution failed.');
      }

      setPaymentReceipt(data);
      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        setPaymentSuccess(false);
        setShowPayModal(false);
      }, 2500);
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
      setPaymentProcessing(false);
    }
  };

  // Printable Invoice PDF / HTML Window
  const handleDownloadPDF = () => {
    if (!activeInvoice) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${activeInvoice.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0284c7; }
          .badge { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
          .details { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 14px; }
          .details-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #64748b; }
          td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row { font-weight: bold; font-size: 16px; background: #f8fafc; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SyncSphere Marketplace</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Invoice #: ${activeInvoice.invoiceNumber}</div>
          </div>
          <div>
            <span class="badge">${activeInvoice.status}</span>
          </div>
        </div>

        <div class="details">
          <div class="details-box">
            <strong>Issued By (Symbiote Specialist):</strong><br/>
            ${activeInvoice.symbioteName || symbioteMap[activeInvoice.symbioteId]?.name || 'Symbiote Expert'}<br/>
            ${symbioteMap[activeInvoice.symbioteId]?.title || 'Elite Technical Consultant'}
          </div>
          <div class="details-box">
            <strong>Billed To (Client):</strong><br/>
            ${userProfile?.displayName || 'Client Representative'}<br/>
            Project: ${activeInvoice.projectName || projectMap[activeInvoice.projectId] || 'Project Brief'}<br/>
            Issued: ${activeInvoice.issuedDate || '2026-08-01'} | Due: ${activeInvoice.dueDate}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Hours</th>
              <th>Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(activeInvoice.lineItems || []).map(
              (item) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.hours || '-'}</td>
                <td>${item.rate ? `$${item.rate}/hr` : '-'}</td>
                <td style="text-align: right;">$${item.amount.toLocaleString()}</td>
              </tr>
            `
            ).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 20px;">Total Billed:</td>
              <td style="text-align: right; color: #0284c7;">$${activeInvoice.amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          SyncSphere Marketplace Billing Engine · Thank you for your business.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

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
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                Invoice Management
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Review, process, and track invoices issued by engaged elite Symbiote specialists.
              </p>
            </div>
          </div>
        </div>

        {/* CREATE INVOICE MARKETPLACE NOTE ACTION */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateInfoModal(true)}
            className="h-10 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] px-4 flex items-center gap-2 shadow-sm transition-all"
          >
            <Info className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span>Create Invoice Info</span>
          </Button>
        </div>
      </div>

      {/* MARKETPLACE INVOICE ORIGIN NOTE MODAL */}
      {showCreateInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2 text-[var(--color-accent-cyan)] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Marketplace Invoicing Protocol</span>
              </div>
              <button
                onClick={() => setShowCreateInfoModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-[var(--color-text-secondary)] leading-relaxed">
              <p className="text-[var(--color-text-primary)] font-semibold">
                Invoices on SyncSphere are generated exclusively by Symbiote Specialists (FR-S10) upon milestone delivery.
              </p>
              <p>
                As a Client, you receive itemized invoices once milestone criteria or hourly time logs are submitted and verified.
              </p>
              <div className="p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-[11px] text-[var(--color-accent-cyan)] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Need an adjustment or custom invoice adjustment? Contact your engaged specialist directly via Workspace Chat or raise a milestone revision request.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowCreateInfoModal(false)}
                className="h-9 bg-[var(--color-accent-cyan)] text-slate-950 font-mono font-bold text-xs px-4"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-[8px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PENDING INVOICES */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Pending Invoices
            </span>
            <div className="p-1.5 rounded-md bg-amber-400/15 text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${stats.pendingSum.toLocaleString()}`}
              mono
              tooltip={`Exact Pending Sum: $${stats.pendingSum.toLocaleString()}`}
            />
          </div>
          <p className="text-[10px] font-mono text-amber-400 truncate">
            {stats.pendingCount} invoice{stats.pendingCount !== 1 ? 's' : ''} awaiting payment
          </p>
        </Card>

        {/* PAID INVOICES */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Paid Invoices
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${stats.paidSum.toLocaleString()}`}
              mono
              tooltip={`Exact Paid Sum: $${stats.paidSum.toLocaleString()}`}
            />
          </div>
          <p className="text-[10px] font-mono text-emerald-400 truncate">
            {stats.paidCount} invoice{stats.paidCount !== 1 ? 's' : ''} settled
          </p>
        </Card>

        {/* OVERDUE INVOICES */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Overdue Invoices
            </span>
            <div className="p-1.5 rounded-md bg-rose-500/15 text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${stats.overdueSum.toLocaleString()}`}
              mono
              className={stats.overdueSum > 0 ? 'text-rose-400' : 'text-[var(--color-text-primary)]'}
              tooltip={`Exact Overdue Sum: $${stats.overdueSum.toLocaleString()}`}
            />
          </div>
          <p className="text-[10px] font-mono text-rose-400 truncate">
            {stats.overdueCount} invoice{stats.overdueCount !== 1 ? 's' : ''} require immediate action
          </p>
        </Card>

        {/* TOTAL VOLUME */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Total Volume
            </span>
            <div className="p-1.5 rounded-md bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${stats.totalVolume.toLocaleString()}`}
              mono
              tooltip={`Exact Total Volume: $${stats.totalVolume.toLocaleString()}`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Total lifetime billed across briefs
          </p>
        </Card>
      </div>

      {/* 3. TWO-COLUMN LAYOUT: [INVOICE TABLE] | [SELECTED INVOICE DETAIL PANEL] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: INVOICE TABLE (7 COLS) */}
        <Card className="lg:col-span-7 p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-4">
          {/* SEARCH & STATUS FILTER ROW */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Invoice#, Project, Freelancer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer w-full sm:w-auto"
              >
                <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                <option value="pending" className="bg-slate-900 text-white">Pending</option>
                <option value="paid" className="bg-slate-900 text-white">Paid</option>
                <option value="overdue" className="bg-slate-900 text-white">Overdue</option>
              </select>
            </div>
          </div>

          {/* INVOICE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-2">Invoice#</th>
                  <th className="py-3 px-2">Project</th>
                  <th className="py-3 px-2">Freelancer</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2">Due</th>
                  <th className="py-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {filteredInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id;
                  const sName = inv.symbioteName || symbioteMap[inv.symbioteId]?.name || 'Symbiote Expert';
                  const pName = inv.projectName || projectMap[inv.projectId] || 'Project Brief';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id || null)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-accent-cyan)]/15 border-l-2 border-l-[var(--color-accent-cyan)]'
                          : 'hover:bg-[var(--color-background)]/50'
                      }`}
                    >
                      {/* INVOICE NUMBER */}
                      <td className="py-3 px-2 font-bold text-[var(--color-accent-cyan)] whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>

                      {/* PROJECT */}
                      <td className="py-3 px-2 text-[var(--color-text-primary)] max-w-[120px] truncate">
                        {pName}
                      </td>

                      {/* PROFESSIONAL */}
                      <td className="py-3 px-2 text-[var(--color-text-secondary)] max-w-[110px] truncate">
                        {sName}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3 px-2 font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        ${inv.amount.toLocaleString()}
                      </td>

                      {/* DUE DATE */}
                      <td className="py-3 px-2 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {formatCalendarDate(inv.dueDate)}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {inv.status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Paid
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/40 text-rose-400 inline-flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 border border-amber-400/40 text-amber-400 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-6">
                      <EmptyState
                        icon={CreditCard}
                        title={invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
                        description={invoices.length === 0 ? "Invoices issued by specialists for milestone deliveries will appear here." : "Try adjusting your search query or filter selection."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* RIGHT COLUMN: SELECTED INVOICE DETAIL PANEL (§11.20) (5 COLS) */}
        <Card className="lg:col-span-5 p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-5 sticky top-20">
          {activeInvoice ? (
            <>
              {/* HEADER: INVOICE# + STATUS PILL (§11.20) */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider block">
                    Selected Invoice Detail
                  </span>
                  <h2 className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {activeInvoice.invoiceNumber}
                  </h2>
                </div>

                {activeInvoice.status === 'paid' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Paid
                  </span>
                ) : activeInvoice.status === 'overdue' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Overdue
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Payment
                  </span>
                )}
              </div>

              {/* KEY-VALUE ROWS (FROM / PROJECT / AMOUNT / ISSUED / DUE) */}
              <div className="space-y-2.5 text-xs font-mono bg-[var(--color-background)]/60 border border-[var(--color-border)] p-3.5 rounded-[10px]">
                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-secondary)]">From Freelancer:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {activeInvoice.symbioteName || symbioteMap[activeInvoice.symbioteId]?.name || 'Symbiote Specialist'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-secondary)]">Project Brief:</span>
                  <span className="font-semibold text-[var(--color-accent-cyan)] truncate max-w-[180px]">
                    {activeInvoice.projectName || projectMap[activeInvoice.projectId] || 'Project Brief'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-secondary)]">Issued Date:</span>
                  <span className="text-[var(--color-text-primary)]">
                    {formatCalendarDate(activeInvoice.issuedDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--color-text-secondary)]">Due Date:</span>
                  <span className="font-bold text-amber-400">
                    {formatCalendarDate(activeInvoice.dueDate)}
                  </span>
                </div>
              </div>

              {/* ITEMIZED LINE ITEMS SUB-CARD (§11.20) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center justify-between">
                  <span>Line Item Breakdown</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-normal">
                    {(activeInvoice.lineItems || []).length} items
                  </span>
                </h4>

                <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] p-3 space-y-2 text-xs font-mono">
                  {(activeInvoice.lineItems || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 pb-2 border-b border-[var(--color-border)]/40 last:border-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-[var(--color-text-primary)]">
                          {item.description}
                        </p>
                        {item.hours && (
                          <span className="text-[10px] text-[var(--color-text-secondary)]">
                            {item.hours} hrs @ ${item.rate}/hr
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[var(--color-text-primary)] shrink-0">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {/* BOLD TOTAL ROW (§11.20) */}
                  <div className="pt-2 mt-2 border-t border-[var(--color-border)] flex items-center justify-between font-bold text-sm">
                    <span className="text-[var(--color-text-primary)]">Total Amount Billed:</span>
                    <span className="text-[var(--color-accent-cyan)] font-mono text-base">
                      ${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* PAYMENT SETTLEMENT & TRANSACTION DETAILS IF PAID */}
                {activeInvoice.status === 'paid' && (
                  <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Settlement Confirmed
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {activeInvoice.paymentDetails?.gateway === 'stripe' ? 'Direct Paid' : 'Confirmed Paid'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-secondary)] pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-500">Method:</span>
                        <span className="text-[var(--color-text-primary)] font-medium">
                          {activeInvoice.paymentDetails?.brand || 'Card / Wire'} •••• {activeInvoice.paymentDetails?.last4 || '4242'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">Receipt / Ref:</span>
                        <span className="text-[var(--color-text-primary)] font-medium truncate block" title={activeInvoice.paymentDetails?.chargeId}>
                          {activeInvoice.paymentDetails?.chargeId ? `${activeInvoice.paymentDetails.chargeId.slice(0, 14)}...` : 'rec_settled'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">Invoice Amount:</span>
                        <span className="text-[var(--color-text-primary)]">
                          ${activeInvoice.amount.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">Payout to Specialist:</span>
                        <span className="text-emerald-400 font-bold">
                          ${activeInvoice.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS: PAY NOW / DOWNLOAD PDF (§11.20) */}
              <div className="space-y-2 pt-2">
                {activeInvoice.status !== 'paid' ? (
                  <Button
                    onClick={() => setShowPayModal(true)}
                    className="w-full h-11 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-[8px] flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.01] transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Settle & Mark Paid (${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  </Button>
                ) : (
                  <div className="p-3 rounded-[8px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Invoice Settled & Paid</span>
                  </div>
                )}

                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="w-full h-10 border-[var(--color-border)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] flex items-center justify-center gap-2 hover:border-[var(--color-accent-cyan)] transition-all"
                >
                  <Download className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span>Download PDF Receipt</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center space-y-2">
              <FileText className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto opacity-40" />
              <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                Select an invoice row from the table to inspect details.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* STRIPE DIRECT PAYMENT MODAL */}
      {showPayModal && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn relative">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[var(--color-accent-cyan)]" />
                <div>
                  <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)]">
                    Direct Invoice Checkout
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                    {gatewayConfig.isConfigured ? 'Direct Gateway Active' : 'Invoice Payment Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {paymentSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-400 font-mono">
                  Invoice Payment Confirmed!
                </h4>
                <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                  Invoice {activeInvoice.invoiceNumber} has been marked paid. ${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been settled.
                </p>
                {paymentReceipt?.chargeId && (
                  <div className="p-2 bg-[var(--color-background)] rounded border border-[var(--color-border)] text-[10px] font-mono text-slate-400">
                    Transaction Ref: {paymentReceipt.chargeId}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs font-mono">
                {/* PAYMENT METHOD CHOICES */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodChoice('card')}
                    className={`py-2 px-2 rounded-[8px] border text-center font-mono text-[11px] transition-all flex flex-col items-center gap-1 ${
                      paymentMethodChoice === 'card'
                        ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-bold'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-slate-600'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Credit Card / Wire</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodChoice('ach')}
                    className={`py-2 px-2 rounded-[8px] border text-center font-mono text-[11px] transition-all flex flex-col items-center gap-1 ${
                      paymentMethodChoice === 'ach'
                        ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-bold'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-slate-600'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Bank ACH / Transfer</span>
                  </button>
                </div>

                {/* SUMMARY RECAP */}
                <div className="p-3 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-1.5">
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>Invoice #:</span>
                    <span className="text-[var(--color-text-primary)] font-bold">{activeInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>Payee (Specialist):</span>
                    <span className="text-[var(--color-accent-cyan)] font-medium">
                      {activeInvoice.symbioteName || symbioteMap[activeInvoice.symbioteId]?.name || 'Symbiote Expert'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>Invoice Subtotal:</span>
                    <span className="text-[var(--color-text-primary)]">${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-[var(--color-border)]/50">
                    <span className="text-[var(--color-text-primary)]">Total Settlement:</span>
                    <span className="text-emerald-400 font-mono">${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* CARD PAYMENT INPUTS */}
                {paymentMethodChoice === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[var(--color-text-secondary)] mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[var(--color-text-secondary)] mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--color-text-secondary)] mb-1">CVC / CVV</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethodChoice === 'ach' && (
                  <div className="p-3 rounded-[8px] bg-slate-900 border border-slate-800 space-y-2">
                    <p className="text-[11px] text-slate-300">
                      Direct US ACH Debit connected to your verified corporate bank account (Chase •••• 8812).
                    </p>
                    <span className="text-[10px] text-emerald-400 font-bold block">✓ Direct Bank Settlement</span>
                  </div>
                )}

                <div className="p-2.5 rounded-[8px] bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Payments are recorded directly to milestone invoices with downloadable receipts.</span>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    variant="outline"
                    className="h-9 border-[var(--color-border)] text-xs font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExecutePayment}
                    disabled={paymentProcessing}
                    className="h-9 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold px-4"
                  >
                    {paymentProcessing ? 'Processing...' : `Confirm & Pay $${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
