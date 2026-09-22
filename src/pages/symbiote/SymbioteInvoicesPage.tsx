import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Invoice, Project, UserProfile } from '@/src/types/firestore';
import { subscribeToInvoices, createInvoice } from '@/src/lib/firestore/invoices';
import { subscribeToProjectsBySymbiote } from '@/src/lib/firestore/projects';
import { getUserProfile } from '@/src/lib/firestore/users';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { formatCalendarDate } from '@/src/lib/utils';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Search,
  X,
  DollarSign,
  Calendar,
  Building2,
  Briefcase,
  CheckCheck,
  XCircle,
  Eye,
  Send,
} from 'lucide-react';

export const SymbioteInvoicesPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const uid = firebaseUser?.uid || '';
  const symbioteName =
    userProfile?.displayName ||
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Symbiote');

  // Real-time Firestore State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientProfilesMap, setClientProfilesMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<Invoice | null>(null);

  // Form State for Create Invoice
  const [formClientId, setFormClientId] = useState<string>('');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('1000');
  const [formDueDate, setFormDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [formDescription, setFormDescription] = useState<string>('Milestone 1 Deliverable');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to Invoices
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsub = subscribeToInvoices(uid, 'symbiote', (invList) => {
      setInvoices(invList || []);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  // Subscribe to Symbiote Projects to derive real client list and projects dropdown
  useEffect(() => {
    if (!uid) return;

    const unsub = subscribeToProjectsBySymbiote(uid, (pList) => {
      setProjects(pList || []);
    });

    return () => unsub();
  }, [uid]);

  // Fetch and cache genuine client user profiles for all assigned projects
  useEffect(() => {
    if (projects.length === 0) return;
    const clientIds = Array.from(
      new Set(
        projects
          .map((p) => p.ownerId || (p as any).clientId)
          .filter(Boolean) as string[]
      )
    );

    let isMounted = true;
    Promise.all(
      clientIds.map(async (cId) => {
        try {
          const prof = await getUserProfile(cId);
          return { cId, prof };
        } catch {
          return { cId, prof: null };
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const newMap: Record<string, UserProfile> = {};
      results.forEach(({ cId, prof }) => {
        if (prof) newMap[cId] = prof;
      });
      setClientProfilesMap((prev) => ({ ...prev, ...newMap }));
    });

    return () => {
      isMounted = false;
    };
  }, [projects]);

  // Derived Client Options from Projects & Real User Profiles
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();

    projects.forEach((p) => {
      const cId = p.ownerId || (p as any).clientId;
      if (!cId) return;

      const profile = clientProfilesMap[cId];
      const resolvedName =
        profile?.companyName && profile?.displayName && profile.companyName !== profile.displayName
          ? `${profile.displayName} (${profile.companyName})`
          : profile?.displayName ||
            profile?.companyName ||
            (profile?.firstName
              ? `${profile.firstName} ${profile.lastName || ''}`.trim()
              : null) ||
            (p as any).clientName ||
            (p as any).companyName ||
            'Client';

      map.set(cId, resolvedName);
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects, clientProfilesMap]);

  // Auto-set initial client and project in form when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (clientOptions.length > 0) {
        if (!formClientId || !clientOptions.some((c) => c.id === formClientId)) {
          setFormClientId(clientOptions[0].id);
        }
      } else {
        setFormClientId('');
      }
    }
  }, [isModalOpen, clientOptions, formClientId]);

  // Projects filtered by selected client in form
  const filteredProjectsForClient = useMemo(() => {
    if (!formClientId) return projects;
    return projects.filter(
      (p) => (p.ownerId || (p as any).clientId) === formClientId
    );
  }, [projects, formClientId]);

  useEffect(() => {
    if (isModalOpen) {
      if (filteredProjectsForClient.length > 0) {
        if (!formProjectId || !filteredProjectsForClient.some((p) => p.id === formProjectId)) {
          setFormProjectId(filteredProjectsForClient[0].id || '');
        }
      } else {
        setFormProjectId('');
      }
    }
  }, [isModalOpen, filteredProjectsForClient, formProjectId]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate Sequential Invoice Number (e.g. INV-2026-001)
  const generateNextInvoiceNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const existingNums = invoices
      .map((i) => i.invoiceNumber)
      .filter((n) => n && n.startsWith(prefix))
      .map((n) => parseInt(n.replace(prefix, ''), 10))
      .filter((num) => !isNaN(num));

    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextSeq = String(maxNum + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }, [invoices]);

  // STAT CALCULATIONS
  const totalInvoicedSum = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  const paidInvoicedSum = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  const pendingInvoicedSum = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  // CREATE INVOICE SUBMIT
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);

    if (!formClientId) {
      showToast('Please select a client');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid invoice amount');
      return;
    }
    if (!formDueDate) {
      showToast('Please select a due date');
      return;
    }

    setSubmitting(true);

    const clientObj = clientOptions.find((c) => c.id === formClientId);
    const clientProfile = clientProfilesMap[formClientId];
    const clientName =
      clientObj?.name ||
      clientProfile?.displayName ||
      clientProfile?.companyName ||
      'Client';

    const selectedProj = projects.find((p) => p.id === formProjectId);
    const projectName = selectedProj ? selectedProj.title : 'Project Engagement';

    const newInvoiceNumber = generateNextInvoiceNumber;

    try {
      await createInvoice({
        invoiceNumber: newInvoiceNumber,
        clientId: formClientId,
        clientName,
        symbioteId: uid,
        symbioteName,
        projectId: formProjectId,
        projectName,
        title: formDescription || 'Development Services',
        description: formDescription,
        amount: parsedAmount,
        issuedDate: new Date().toISOString().slice(0, 10),
        dueDate: formDueDate,
        status: 'pending',
        lineItems: [
          {
            description: formDescription || 'Engineering & Development Services',
            amount: parsedAmount,
          },
        ],
      });

      showToast(`Invoice ${newInvoiceNumber} sent successfully!`);
      setIsModalOpen(false);
      setFormAmount('1000');
      setFormDescription('Milestone 1 Deliverable');
    } catch (err) {
      console.error('Error creating invoice:', err);
      showToast('Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Invoices Table Data
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Filter out legacy mock/seeded sample invoices
        if (
          inv.projectName === 'Autonomous Multi-Agent Swarm' ||
          inv.projectName === 'AI Neural Code Reviewer'
        ) {
          return false;
        }
        if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const invNum = (inv.invoiceNumber || '').toLowerCase();
          const proj = (inv.projectName || '').toLowerCase();
          const desc = (inv.description || '').toLowerCase();
          if (!invNum.includes(q) && !proj.includes(q) && !desc.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.issuedDate || b.createdAt || 0).getTime() - new Date(a.issuedDate || a.createdAt || 0).getTime());
  }, [invoices, statusFilter, searchQuery]);

  // Export Single Invoice / Download as Printable HTML PDF or Text
  const handleDownloadInvoice = (inv: Invoice, mode: 'pdf' | 'text' = 'pdf') => {
    if (mode === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Pop-up blocked. Please allow pop-ups to print PDF.');
        return;
      }

      const clientObj = clientOptions.find((c) => c.id === inv.clientId);
      const clientProfile = clientProfilesMap[inv.clientId];
      const clientName =
        (inv as any).clientName ||
        clientObj?.name ||
        clientProfile?.displayName ||
        clientProfile?.companyName ||
        'Client';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${inv.invoiceNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { margin: 0; font-size: 28px; color: #0f172a; }
            .invoice-title p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-family: monospace; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; }
            .box-title { text-transform: uppercase; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; }
            table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f1f5f9; padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .total-row { display: flex; justify-content: flex-end; margin-top: 20px; }
            .total-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; width: 240px; text-align: right; }
            .total-amount { font-size: 24px; font-weight: 800; color: #059669; font-family: monospace; margin-top: 4px; }
            .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">SyncSphere</div>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Enterprise AI Freelance Platform</p>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p>${inv.invoiceNumber}</p>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="box-title">Billed By (Symbiote)</div>
              <strong>${inv.symbioteName || symbioteName}</strong><br>
              <span style="color: #64748b;">ID: ${inv.symbioteId}</span>
            </div>
            <div class="box">
              <div class="box-title">Billed To (Client)</div>
              <strong>${clientName}</strong><br>
              <span style="color: #64748b;">Client ID: ${inv.clientId}</span>
            </div>
          </div>

          <div class="grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="box">
              <div class="box-title">Issue Date</div>
              ${inv.issuedDate || 'N/A'}
            </div>
            <div class="box">
              <div class="box-title">Due Date</div>
              ${inv.dueDate}
            </div>
            <div class="box">
              <div class="box-title">Status</div>
              <strong style="color: ${inv.status === 'paid' ? '#059669' : '#d97706'}; text-transform: uppercase;">
                ${inv.status}
              </strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Service Item</th>
                <th>Project</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${inv.description || inv.title || 'Engineering & Development Services'}</td>
                <td>${inv.projectName || 'Project Engagement'}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">
                  $${(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="total-row">
            <div class="total-box">
              <div style="font-size: 12px; color: #047857; text-transform: uppercase; font-weight: 700;">Total Amount Due</div>
              <div class="total-amount">$${(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for partnering with SyncSphere Symbiotes. Direct payment and milestone settlement completed.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      showToast(`Generated PDF invoice document for ${inv.invoiceNumber}`);
    } else {
      const content = `SYNCSPHERE INVOICE
----------------------------------------
Invoice #: ${inv.invoiceNumber}
Issued Date: ${inv.issuedDate || inv.createdAt?.slice(0, 10) || 'N/A'}
Due Date: ${inv.dueDate}
Status: ${inv.status.toUpperCase()}

Symbiote: ${inv.symbioteName || symbioteName}
Client ID: ${inv.clientId}
Project: ${inv.projectName || 'Project Engagement'}

Description:
${inv.description || inv.title || 'Development & Engineering Services'}

TOTAL AMOUNT: $${(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
----------------------------------------
Thank you for your business!`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${inv.invoiceNumber}_details.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded text details for ${inv.invoiceNumber}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white font-semibold text-caption rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCheck className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Invoices</span>
          </h1>
          <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
            Manage client billing, track pending invoices, and issue milestone payouts.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Button>
      </div>

      {/* STAT ROW (3 FLAT / BORDERLESS CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: TOTAL INVOICED */}
        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] space-y-1">
          <span className="text-caption font-medium text-[var(--color-text-secondary)] block">
            Total Invoiced
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-h1 font-bold font-mono text-[var(--color-text-primary)]">
              ${totalInvoicedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              {invoices.length} {invoices.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {/* CARD 2: PAID (GREEN) */}
        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] space-y-1">
          <span className="text-caption font-medium text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Paid</span>
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-h1 font-bold font-mono text-emerald-400">
              ${paidInvoicedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-emerald-400/80">
              {invoices.filter((i) => i.status === 'paid').length} paid
            </span>
          </div>
        </div>

        {/* CARD 3: PENDING (AMBER) */}
        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] space-y-1">
          <span className="text-caption font-medium text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-h1 font-bold font-mono text-amber-400">
              ${pendingInvoicedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-amber-400/80">
              {invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length} outstanding
            </span>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm">
        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice # or project..."
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-caption text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-caption text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Statuses
              </option>
              <option value="pending" className="bg-slate-900 text-white">
                Pending
              </option>
              <option value="paid" className="bg-slate-900 text-white">
                Paid
              </option>
              <option value="overdue" className="bg-slate-900 text-white">
                Overdue
              </option>
            </select>
          </div>
        </div>

        {/* TABLE CONTENT OR EMPTY STATE */}
        {loading ? (
          <div className="py-12 text-center text-caption text-[var(--color-text-secondary)]">
            Loading invoices...
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-caption">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider font-semibold bg-[var(--color-background)]/50">
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredInvoices.map((inv) => {
                  const clientObj = clientOptions.find((c) => c.id === inv.clientId);
                  const clientProfile = clientProfilesMap[inv.clientId];
                  const clientName =
                    (inv as any).clientName ||
                    clientObj?.name ||
                    clientProfile?.displayName ||
                    clientProfile?.companyName ||
                    'Client';

                  return (
                    <tr
                      key={inv.id || inv.invoiceNumber}
                      className="hover:bg-[var(--color-background)]/60 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[var(--color-text-primary)] max-w-xs truncate">
                        {inv.projectName || 'Project Engagement'}
                      </td>

                      <td className="py-3 px-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {clientName}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        ${(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                        {formatCalendarDate(inv.dueDate)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {inv.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoiceForDetails(inv)}
                          className="h-8 w-8 p-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="h-8 w-8 p-0 text-[var(--color-text-secondary)] hover:text-emerald-400"
                          title="Download Invoice Text"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyStateBlock
            icon={<FileText className="w-6 h-6" />}
            title="No Invoices Found"
            description="No invoices match your filter criteria. Click 'Create Invoice' to issue a new milestone bill."
          />
        )}
      </Card>

      {/* CREATE INVOICE MODAL (~500px CENTERED MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-2xl overflow-hidden flex flex-col">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/50">
              <div>
                <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Create New Invoice</span>
                </h2>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                  Invoice ID: <span className="font-mono text-emerald-400 font-semibold">{generateNextInvoiceNumber}</span>
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              {projects.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No active assigned client projects found. Invoices can only be issued against projects you are actively assigned to.</span>
                </div>
              )}

              {/* CLIENT SELECT */}
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                  Client <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => {
                    const newClientId = e.target.value;
                    setFormClientId(newClientId);
                    const relevantProjects = projects.filter((p) => (p.ownerId || (p as any).clientId) === newClientId);
                    if (relevantProjects.length > 0) {
                      setFormProjectId(relevantProjects[0].id || '');
                    } else {
                      setFormProjectId('');
                    }
                  }}
                  disabled={projects.length === 0}
                  className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                >
                  {clientOptions.length > 0 ? (
                    clientOptions.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled className="bg-slate-900 text-white">
                      No clients found
                    </option>
                  )}
                </select>
              </div>

              {/* PROJECT SELECT */}
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                  Project <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => {
                    const newProjId = e.target.value;
                    setFormProjectId(newProjId);
                    const proj = projects.find((p) => p.id === newProjId);
                    const projClientId = proj?.ownerId || (proj as any)?.clientId;
                    if (projClientId && projClientId !== formClientId) {
                      setFormClientId(projClientId);
                    }
                  }}
                  disabled={projects.length === 0}
                  className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                >
                  {filteredProjectsForClient.length > 0 ? (
                    filteredProjectsForClient.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.title}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled className="bg-slate-900 text-white">
                      No projects available
                    </option>
                  )}
                </select>
              </div>

              {/* AMOUNT AND DUE DATE ROW */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                    Amount ($) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="2500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                    Due Date <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* DESCRIPTION / SERVICES */}
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                  Description / Services Rendered
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail the milestone or services covered in this invoice..."
                  className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-caption font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submitting || projects.length === 0 || !formProjectId || !formClientId}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-caption py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending...' : 'Send Invoice'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedInvoiceForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/50">
              <div>
                <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{selectedInvoiceForDetails.invoiceNumber}</span>
                </h2>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                  Issued: {formatCalendarDate(selectedInvoiceForDetails.issuedDate)} • Due: {formatCalendarDate(selectedInvoiceForDetails.dueDate)}
                </p>
              </div>

              <button
                onClick={() => setSelectedInvoiceForDetails(null)}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-caption">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                <div>
                  <span className="text-[11px] text-[var(--color-text-secondary)] block">Project</span>
                  <span className="font-semibold text-[var(--color-text-primary)] block truncate">
                    {selectedInvoiceForDetails.projectName || 'Project Engagement'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--color-text-secondary)] block">Client</span>
                  <span className="font-semibold text-[var(--color-text-primary)] block truncate">
                    {(selectedInvoiceForDetails as any).clientName ||
                      clientOptions.find((c) => c.id === selectedInvoiceForDetails.clientId)?.name ||
                      clientProfilesMap[selectedInvoiceForDetails.clientId]?.displayName ||
                      'Client'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--color-text-secondary)] block">Status</span>
                  <span className="font-semibold text-emerald-400 capitalize block">
                    {selectedInvoiceForDetails.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] block">
                  Description
                </span>
                <p className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)] leading-relaxed">
                  {selectedInvoiceForDetails.description || selectedInvoiceForDetails.title || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-semibold text-emerald-400">Total Billed</span>
                <span className="text-h2 font-bold font-mono text-emerald-400">
                  ${(selectedInvoiceForDetails.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {selectedInvoiceForDetails.status === 'paid' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Client Payment Settled
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase">
                      {selectedInvoiceForDetails.paymentDetails?.gateway || 'Confirmed'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Payment Ref:</span>
                      <span className="text-slate-200 font-medium truncate block">
                        {selectedInvoiceForDetails.paymentDetails?.chargeId || 'rec_direct_settle'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Net Specialist Payout:</span>
                      <span className="text-emerald-400 font-bold">
                        ${(selectedInvoiceForDetails.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 border-t border-emerald-500/20 pt-1.5">
                    Settlement verified and confirmed on milestone invoice.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoiceForDetails(null)}
                  className="text-caption font-semibold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleDownloadInvoice(selectedInvoiceForDetails);
                    setSelectedInvoiceForDetails(null);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-caption flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Details</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
