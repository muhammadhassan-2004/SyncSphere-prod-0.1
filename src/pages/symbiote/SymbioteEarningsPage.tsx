import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Invoice, TimeEntry, Project } from '@/src/types/firestore';
import { subscribeToInvoices } from '@/src/lib/firestore/invoices';
import { subscribeToTimeEntries } from '@/src/lib/firestore/timeEntries';
import { subscribeToProjectsBySymbiote } from '@/src/lib/firestore/projects';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  PieChart,
  CreditCard,
  FileText,
  Briefcase,
  CheckCheck,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';

interface TransactionRow {
  id: string;
  date: string;
  projectName: string;
  projectId?: string;
  clientName: string;
  amount: number;
  type: 'Payment' | 'Milestone' | 'Hourly';
  status: 'paid' | 'pending' | 'overdue';
}

export const SymbioteEarningsPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const uid = firebaseUser?.uid || userProfile?.uid || '';
  const navigate = useNavigate();

  // Firestore Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Table Search and Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to Invoices for Symbiote
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsubInvoices = subscribeToInvoices(uid, 'symbiote', (invs) => {
      setInvoices(invs || []);
      setLoading(false);
    });

    return () => unsubInvoices();
  }, [uid]);

  // Subscribe to Time Entries for Symbiote
  useEffect(() => {
    if (!uid) return;
    const unsubTime = subscribeToTimeEntries(uid, (entries) => {
      setTimeEntries(entries || []);
    });

    return () => unsubTime();
  }, [uid]);

  // Subscribe to Projects for Symbiote
  useEffect(() => {
    if (!uid) return;
    const unsubProjects = subscribeToProjectsBySymbiote(uid, (pList) => {
      setProjects(pList || []);
    });

    return () => unsubProjects();
  }, [uid]);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => {
      if (p.id) map[p.id] = p.title;
    });
    return map;
  }, [projects]);

  // Project Client map to accurately resolve the client's name/company (never the symbiote)
  const projectClientMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => {
      if (p.id) {
        const cName =
          p.clientName ||
          (p as any).clientCompany ||
          (p as any).clientCompanyName ||
          (p as any).companyName ||
          'Client Partner';
        map[p.id] = cName;
      }
    });
    return map;
  }, [projects]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. STAT COMPUTATIONS
  // Paid Invoices Total
  const totalEarningsPaid = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  // Pending Invoices Total & Count
  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue');
  }, [invoices]);

  const pendingPaymentsSum = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [pendingInvoices]);

  const pendingPaymentsCount = pendingInvoices.length;

  // Total Invoiced (Paid + Pending + Overdue)
  const totalInvoicedSum = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  // Collection Rate %
  const collectionRatePct = useMemo(() => {
    if (totalInvoicedSum === 0) return 0;
    return Math.round((totalEarningsPaid / totalInvoicedSum) * 100);
  }, [totalEarningsPaid, totalInvoicedSum]);

  // Outstanding Balance computation
  const outstandingBalance = pendingPaymentsSum;

  // 2. UNIFIED TRANSACTIONS TABLE DATA
  const transactions: TransactionRow[] = useMemo(() => {
    const list: TransactionRow[] = [];

    const symbioteOwnName = userProfile?.displayName || (userProfile as any)?.name || '';

    // Map Invoices
    invoices.forEach((inv) => {
      const isHourly =
        Boolean(inv.lineItems && inv.lineItems.some((l) => l.hours || l.description?.includes('/hr') || l.description?.includes('Execution'))) ||
        Boolean(inv.title?.toLowerCase().includes('task')) ||
        Boolean(inv.title?.toLowerCase().includes('hourly')) ||
        Boolean(inv.description?.toLowerCase().includes('task')) ||
        Boolean(inv.description?.toLowerCase().includes('/hr')) ||
        Boolean(inv.description?.toLowerCase().includes('hrs')) ||
        Boolean((inv as any).invoiceType?.toLowerCase() === 'hourly');

      // Ensure clientName never defaults or reflects the freelancer's own name
      const rawClientName = inv.clientName || (inv as any).clientCompany;
      const isClientNameSelf =
        rawClientName &&
        symbioteOwnName &&
        (rawClientName.toLowerCase().trim() === symbioteOwnName.toLowerCase().trim() ||
          rawClientName.toLowerCase().trim() === (inv.symbioteName || '').toLowerCase().trim());

      const resolvedClientName =
        (!isClientNameSelf && rawClientName)
          ? rawClientName
          : (inv.projectId ? projectClientMap[inv.projectId] : null) || 'Client Partner';

      list.push({
        id: inv.id || `inv-${Math.random()}`,
        date: inv.issuedDate || inv.createdAt ? (inv.issuedDate || inv.createdAt || '').slice(0, 10) : new Date().toISOString().slice(0, 10),
        projectName: inv.projectName || projectMap[inv.projectId || ''] || 'Project Settlement',
        projectId: inv.projectId,
        clientName: resolvedClientName,
        amount: inv.amount || 0,
        type: isHourly ? 'Hourly' : 'Milestone',
        status: inv.status,
      });
    });

    // Map un-invoiced time entries as Hourly Logs
    const defaultHourlyRate = Number((userProfile as any)?.hourlyRate) || 0;
    const invoicedDatesAndProjects = new Set(
      invoices.map((inv) => `${inv.projectId}_${(inv.issuedDate || inv.createdAt || '').slice(0, 10)}`)
    );

    const invoicedKeywords = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.title) invoicedKeywords.add(inv.title.toLowerCase().trim());
      if (inv.description) invoicedKeywords.add(inv.description.toLowerCase().trim());
      inv.lineItems?.forEach((li) => {
        if (li.description) invoicedKeywords.add(li.description.toLowerCase().trim());
      });
    });

    timeEntries.forEach((te) => {
      // 1. Skip if explicitly marked as invoiced or linked to an invoice
      if (te.invoiced || te.invoiceId) return;

      // 2. Skip if an invoice covers this project on this date
      const key = `${te.projectId}_${(te.date || '').slice(0, 10)}`;
      if (invoicedDatesAndProjects.has(key)) return;

      // 3. Skip if task title, task ID, or description is referenced in an existing invoice
      if (te.taskId && Array.from(invoicedKeywords).some((kw) => kw.includes(te.taskId!.toLowerCase()))) return;
      if (te.taskTitle && Array.from(invoicedKeywords).some((kw) => kw.includes(te.taskTitle!.toLowerCase()))) return;
      if (te.description && Array.from(invoicedKeywords).some((kw) => kw.includes(te.description.toLowerCase()))) return;

      const rawRate = Number(te.hourlyRate) || defaultHourlyRate;
      const rate = rawRate > 0 && rawRate <= 500 ? rawRate : (defaultHourlyRate > 0 && defaultHourlyRate <= 500 ? defaultHourlyRate : 55);
      const estEarnings = (te.hours || 0) * rate;

      const resolvedClientName =
        (te.projectId ? projectClientMap[te.projectId] : null) ||
        (te as any).clientName ||
        'Client Partner';

      list.push({
        id: te.id || `te-${Math.random()}`,
        date: te.date || new Date().toISOString().slice(0, 10),
        projectName: te.projectName || projectMap[te.projectId] || 'Hourly Work',
        projectId: te.projectId,
        clientName: resolvedClientName,
        amount: estEarnings,
        type: 'Hourly',
        // Un-invoiced hours remain in 'pending' settlement until officially invoiced and paid
        status: 'pending',
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, timeEntries, projectMap, projectClientMap, userProfile]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = tx.projectName.toLowerCase();
        const cName = tx.clientName.toLowerCase();
        if (!pName.includes(q) && !cName.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, typeFilter, searchQuery]);

  // 3. MONTHLY EARNINGS CHART DATA (Last 6 Months)
  const monthlyChartData = useMemo(() => {
    const months: { label: string; yearMonth: string; total: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      months.push({ label, yearMonth, total: 0 });
    }

    // Aggregate paid/approved amounts into monthly buckets
    transactions.forEach((tx) => {
      if (tx.status === 'paid' && tx.date) {
        const ym = tx.date.slice(0, 7);
        const match = months.find((m) => m.yearMonth === ym);
        if (match) {
          match.total += tx.amount;
        }
      }
    });

    return months.map((m) => ({
      month: m.label,
      earnings: Math.round(m.total),
    }));
  }, [transactions]);

  // 4. PROJECT BREAKDOWN DATA
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { title: string; amount: number }> = {};

    transactions.forEach((tx) => {
      const pKey = tx.projectName || 'General Work';
      if (!map[pKey]) {
        map[pKey] = { title: pKey, amount: 0 };
      }
      map[pKey].amount += tx.amount;
    });

    const list = Object.values(map).sort((a, b) => b.amount - a.amount);
    const grandTotal = list.reduce((sum, item) => sum + item.amount, 0);

    return list.map((item) => ({
      ...item,
      sharePct: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 100) : 0,
    }));
  }, [transactions]);

  // EXPORT CSV HANDLER
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('No transaction data available to export');
      return;
    }

    const headers = ['Transaction ID', 'Date', 'Project Name', 'Client', 'Type', 'Amount ($)', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.projectName.replace(/"/g, '""')}"`,
      `"${tx.clientName.replace(/"/g, '""')}"`,
      `"${tx.type}"`,
      tx.amount.toFixed(2),
      `"${tx.status.toUpperCase()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `symbiote_earnings_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported transaction CSV successfully!');
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
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Earnings Dashboard</span>
          </h1>
          <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
            Real-time overview of paid revenues, pending milestone invoices, revenue trends, and financial reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-caption font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={() => navigate('/symbiote/time-tracking')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-caption font-semibold flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4" />
            <span>Log Time</span>
          </Button>
        </div>
      </div>

      {/* STAT ROW (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL EARNINGS */}
        <Card className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-2 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 truncate">
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Total Earnings</span>
            </span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${totalEarningsPaid.toLocaleString()}`}
              mono
              className="text-emerald-400"
              tooltip={`Exact Total Earnings: $${totalEarningsPaid.toLocaleString()}`}
            />
            <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 font-medium truncate">
              Collected from paid invoices
            </span>
          </div>
        </Card>

        {/* CARD 2: PENDING PAYMENTS */}
        <Card className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-2 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 truncate">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Pending Payments</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 truncate">
              {pendingPaymentsCount} {pendingPaymentsCount === 1 ? 'inv' : 'invs'}
            </span>
          </div>

          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${pendingPaymentsSum.toLocaleString()}`}
              mono
              tooltip={`Exact Pending Payments: $${pendingPaymentsSum.toLocaleString()}`}
            />
            <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 font-medium truncate">
              Awaiting client authorization
            </span>
          </div>
        </Card>

        {/* CARD 3: PAID AMOUNT & % COLLECTED */}
        <Card className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-2 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">Paid Amount</span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-cyan-400 shrink-0 truncate">
              {collectionRatePct}% collected
            </span>
          </div>

          <div className="pt-1 space-y-2">
            <ResponsiveStatValue
              value={`$${totalEarningsPaid.toLocaleString()}`}
              mono
              tooltip={`Exact Paid Amount: $${totalEarningsPaid.toLocaleString()}`}
            />

            <div className="w-full h-1.5 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${collectionRatePct}%` }}
              />
            </div>
          </div>
        </Card>

        {/* CARD 4: OUTSTANDING BALANCE */}
        <Card className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-2 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 truncate">
              <CreditCard className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="truncate">Outstanding Balance</span>
            </span>
            {outstandingBalance === 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                All Clear
              </span>
            )}
          </div>

          <div className="pt-1">
            <ResponsiveStatValue
              value={`$${outstandingBalance.toLocaleString()}`}
              mono
              tooltip={`Exact Outstanding Balance: $${outstandingBalance.toLocaleString()}`}
            />
            <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 font-medium truncate">
              {outstandingBalance === 0 ? '$0 • All clear' : 'Active unpaid balance'}
            </span>
          </div>
        </Card>
      </div>

      {/* TWO-COLUMN CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: MONTHLY EARNINGS CHART (lg:col-span-7) */}
        <Card className="lg:col-span-7 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Monthly Earnings & Revenue Trends</span>
              </h2>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Paid revenue aggregated by month across all projects.
              </p>
            </div>
          </div>

          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl text-caption space-y-1">
                          <p className="font-bold text-[var(--color-text-primary)]">{data.month}</p>
                          <p className="font-mono text-emerald-400 font-bold">
                            ${data.earnings.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#earningsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RIGHT: PROJECT BREAKDOWN (lg:col-span-5) */}
        <Card className="lg:col-span-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Project Breakdown</span>
            </h2>
            <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
              Relative Share
            </span>
          </div>

          <div className="space-y-4 my-auto pt-1">
            {projectBreakdown.length > 0 ? (
              projectBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[200px]">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-emerald-400">
                        ${item.amount.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] w-9 text-right">
                        {item.sharePct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${item.sharePct}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyStateBlock
                icon={<Briefcase className="w-5 h-5" />}
                title="No Project Revenue"
                description="Project earnings breakdown will appear here once invoices or time entries are logged."
              />
            )}
          </div>
        </Card>
      </div>

      {/* BOTTOM SECTION: TRANSACTION HISTORY TABLE */}
      <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Transaction History</span>
            </h2>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Comprehensive log of invoices, milestone payouts, and approved hourly work logs.
            </p>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-8 pr-3 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-caption text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors w-44"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-caption text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Types
              </option>
              <option value="Milestone" className="bg-slate-900 text-white">
                Milestone
              </option>
              <option value="Hourly" className="bg-slate-900 text-white">
                Hourly
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-caption text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Statuses
              </option>
              <option value="paid" className="bg-slate-900 text-white">
                Paid
              </option>
              <option value="pending" className="bg-slate-900 text-white">
                Pending
              </option>
              <option value="overdue" className="bg-slate-900 text-white">
                Overdue
              </option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-caption font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>↓ Export CSV</span>
            </Button>
          </div>
        </div>

        {/* TABLE DISPLAY */}
        {loading ? (
          <div className="py-12 text-center text-caption text-[var(--color-text-secondary)]">
            Loading transaction history...
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-caption">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider font-semibold bg-[var(--color-background)]/50">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--color-background)]/60 transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--color-text-primary)] font-medium whitespace-nowrap">
                      {tx.date}
                    </td>

                    <td className="py-3 px-3 font-semibold text-[var(--color-text-primary)]">
                      {tx.projectName}
                    </td>

                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">
                      {tx.clientName}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                        {tx.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {tx.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      ) : tx.status === 'overdue' ? (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyStateBlock
            icon={<DollarSign className="w-6 h-6" />}
            title="No Transactions Found"
            description="No earnings records match your search or filters. Log time or issue invoices to start tracking earnings."
          />
        )}
      </Card>
    </div>
  );
};
