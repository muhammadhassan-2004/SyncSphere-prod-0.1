import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import {
  subscribeToProjectsBySymbiote,
  subscribeToSymbioteInvitations,
  subscribeToSymbioteApplications,
  subscribeToInvoices,
  subscribeToUserReviews,
  updateInvitationStatus,
} from '@/src/lib/firestore';
import { Project, Invitation, Application, Invoice, Review } from '@/src/types/firestore';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';
import {
  Compass,
  FolderKanban,
  Mail,
  FileCheck,
  DollarSign,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  User,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const SymbioteDashboardPage: React.FC = () => {
  const { userProfile, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  // Real Firestore Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);

  // Derive First Name for Greeting
  const firstName =
    userProfile?.firstName ||
    userProfile?.displayName?.split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Specialist';

  // Real-time Firestore Listeners Scoped to uid
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Projects listener (scoped to assigned symbiote projects)
    const unsubProjects = subscribeToProjectsBySymbiote(uid, (myProjects) => {
      setProjects(myProjects);
      setLoading(false);
    });

    // 2. Invitations listener
    const unsubInvitations = subscribeToSymbioteInvitations(uid, (invs) => {
      setInvitations(invs);
    });

    // 3. Applications listener
    const unsubApplications = subscribeToSymbioteApplications(uid, (apps) => {
      setApplications(apps);
    });

    // 4. Invoices listener
    const unsubInvoices = subscribeToInvoices(uid, 'symbiote', (invs) => {
      setInvoices(invs);
    });

    // 5. Reviews listener
    const unsubReviews = subscribeToUserReviews(uid, (revs) => {
      setReviews(revs);
    });

    return () => {
      unsubProjects();
      unsubInvitations();
      unsubApplications();
      unsubInvoices();
      unsubReviews();
    };
  }, [uid]);

  // Handle Invitation Accept/Decline
  const handleInvitationResponse = async (invId: string, status: 'accepted' | 'declined') => {
    try {
      setActionProcessing(invId);
      await updateInvitationStatus(invId, status);
    } catch (err) {
      console.error('Failed to update invitation status:', err);
    } finally {
      setActionProcessing(null);
    }
  };

  // --- CALCULATE REAL 6 STAT CARDS METRICS ---
  // Stat 1: Active Projects
  const activeProjectsCount = projects.filter(
    (p) => p.status === 'in_progress' || p.status === 'open'
  ).length;

  // Stat 2: Pending Invitations
  const pendingInvitations = invitations.filter(
    (i) => i.status === 'pending' || !i.status
  );
  const pendingInvitationsCount = pendingInvitations.length;

  // Stat 3: Applied Projects
  const appliedProjectsCount = applications.length;

  // Stat 4: Total Earnings (Sum of paid invoices)
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const totalEarnings = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Stat 5: Pending Payments (Sum of pending/unpaid invoices)
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid');
  const pendingPaymentsAmount = pendingInvoices.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0
  );

  // Stat 6: Average Rating (From user reviews or userProfile)
  const calculatedRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : userProfile?.rating
      ? userProfile.rating.toFixed(1)
      : '0.0';

  // --- MONTHLY EARNINGS CHART DATA (Real Firestore Invoices Aggregation) ---
  const getMonthlyEarningsChartData = () => {
    const monthsMap: { [key: string]: number } = {
      Jan: 0,
      Feb: 0,
      Mar: 0,
      Apr: 0,
      May: 0,
      Jun: 0,
      Jul: 0,
      Aug: 0,
      Sep: 0,
      Oct: 0,
      Nov: 0,
      Dec: 0,
    };

    paidInvoices.forEach((inv) => {
      const dateStr = (inv as any).paidAt || inv.issuedDate || inv.createdAt || inv.dueDate;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const monthName = date.toLocaleString('en-US', { month: 'short' });
          if (monthsMap[monthName] !== undefined) {
            monthsMap[monthName] += inv.amount || 0;
          }
        }
      }
    });

    return Object.keys(monthsMap).map((month) => ({
      month,
      earnings: monthsMap[month],
    }));
  };

  const monthlyChartData = getMonthlyEarningsChartData();

  // Paid vs Pending Percentage
  const totalBilled = totalEarnings + pendingPaymentsAmount;
  const paidPercent = totalBilled > 0 ? Math.round((totalEarnings / totalBilled) * 100) : 0;
  const pendingPercent = totalBilled > 0 ? 100 - paidPercent : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* GREETING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-caption text-[var(--color-text-secondary)] mt-1">
            Here's what's happening with your freelance work today.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/symbiote/browse')}
          className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-medium px-5 py-2.5 shadow-md border-0 transition-all flex items-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>Find Projects</span>
        </Button>
      </div>

      {/* STAT CARD ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Active Projects */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Active Projects
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div>
            <ResponsiveStatValue value={activeProjectsCount} />
            <p className="text-caption text-emerald-500 mt-2 flex items-center gap-1 font-medium truncate">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Currently in progress</span>
            </p>
          </div>
        </Card>

        {/* Pending Invitations */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Pending Invitations
            </span>
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div>
            <ResponsiveStatValue value={pendingInvitationsCount} />
            <p className="text-caption text-cyan-500 mt-2 flex items-center gap-1 font-medium truncate">
              Awaiting your response
            </p>
          </div>
        </Card>

        {/* Applied Projects */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Applied Projects
            </span>
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <ResponsiveStatValue value={appliedProjectsCount} />
            <p className="text-caption text-indigo-400 mt-2 flex items-center gap-1 font-medium truncate">
              Proposals submitted
            </p>
          </div>
        </Card>
      </div>

      {/* STAT CARD ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Earnings */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Total Earnings
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <ResponsiveStatValue
              value={`$${totalEarnings.toLocaleString()}`}
              tooltip={`Exact Total Earnings: $${totalEarnings.toLocaleString()}`}
            />
            <p className="text-caption text-emerald-500 mt-2 flex items-center gap-1 font-medium truncate">
              Settled payouts to date
            </p>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Pending Payments
            </span>
            <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <ResponsiveStatValue
              value={`$${pendingPaymentsAmount.toLocaleString()}`}
              className={pendingPaymentsAmount > 0 ? 'text-amber-500' : 'text-[var(--color-text-primary)]'}
              tooltip={`Exact Pending Payments: $${pendingPaymentsAmount.toLocaleString()}`}
            />
            <p className="text-caption text-amber-500 mt-2 flex items-center gap-1 font-medium truncate">
              In review or pending release
            </p>
          </div>
        </Card>

        {/* Average Rating */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] truncate">
              Average Rating
            </span>
            <div className="w-9 h-9 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 min-w-0">
              <ResponsiveStatValue value={calculatedRating} className="w-auto max-w-fit shrink-0" />
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 shrink-0 inline" />
            </div>
            <p className="text-caption text-[var(--color-text-secondary)] mt-2 font-medium truncate">
              Based on {reviews.length} client review{reviews.length === 1 ? '' : 's'}
            </p>
          </div>
        </Card>
      </div>

      {/* TWO-COLUMN SECTION 1: CURRENT PROJECTS & RECENT INVITATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 60%: Current Projects */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-500" /> Current Projects
            </h2>
            <button
              type="button"
              onClick={() => navigate('/symbiote/projects')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <EmptyStateBlock
              icon={<FolderKanban className="w-6 h-6 text-emerald-500" />}
              title="No Active Projects"
              description="You don't have any active project engagements right now."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/symbiote/browse')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Browse Open Opportunities
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => {
                const progress =
                  typeof proj.progressPct === 'number'
                    ? proj.progressPct
                    : typeof proj.progressPercent === 'number'
                    ? proj.progressPercent
                    : proj.status === 'completed'
                    ? 100
                    : 0;
                const statusLabel =
                  proj.status === 'in_progress'
                    ? 'In Progress'
                    : proj.status === 'completed'
                    ? 'Completed'
                    : 'Planning';
                const statusVariant =
                  proj.status === 'in_progress'
                    ? 'green'
                    : proj.status === 'completed'
                    ? 'blue'
                    : 'yellow';

                return (
                  <Card
                    key={proj.id}
                    className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[10px] space-y-3 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-body font-semibold text-[var(--color-text-primary)] hover:text-emerald-500 transition-colors cursor-pointer" onClick={() => navigate('/symbiote/projects')}>
                          {proj.title}
                        </h3>
                        <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
                          Category: {proj.category || 'Engineering'} · Priority: {proj.priority || 'Medium'}
                        </p>
                      </div>
                      <StatusPill variant={statusVariant} label={statusLabel} />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-caption text-[var(--color-text-secondary)] font-medium">
                        <span>Milestone Completion</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-caption text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Due: {proj.deadline || proj.endDate || 'Next Sprint'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/symbiote/workspace/${proj.id}`)}
                        className="text-caption text-emerald-500 p-0 h-auto font-medium hover:underline"
                      >
                        Open Workspace →
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT 40%: Recent Invitations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-500" /> Recent Invitations
            </h2>
            <StatusPill variant="cyan" label={`${pendingInvitationsCount} Pending`} />
          </div>

          {invitations.length === 0 ? (
            <EmptyStateBlock
              icon={<Mail className="w-6 h-6 text-cyan-500" />}
              title="No Invitations"
              description="No project invitations received yet."
            />
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => {
                const isAccepted = inv.status === 'accepted';
                const isDeclined = inv.status === 'declined';
                const isPending = !isAccepted && !isDeclined;

                return (
                  <Card
                    key={inv.id}
                    className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[10px] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-body font-semibold text-[var(--color-text-primary)]">
                          {inv.projectTitle || 'AI Engineering Project'}
                        </h4>
                        <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
                          {inv.clientName ? `Client: ${inv.clientName} · ` : ''}
                          {inv.budgetRange ? `Rate: ${inv.budgetRange}` : 'Agreed Rate'}
                          {inv.timeline ? ` · ${inv.timeline}` : ''}
                        </p>
                      </div>
                      <StatusPill
                        variant="purple"
                        label={
                          (inv.aiMatchScore || inv.matchScore)
                            ? `${inv.aiMatchScore || inv.matchScore}% Match`
                            : 'Match Pending'
                        }
                      />
                    </div>

                    {inv.techTags && inv.techTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {inv.techTags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[11px] font-mono rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 3-STATE LIFECYCLE ACTION BUTTONS / BANNERS */}
                    <div className="pt-2 border-t border-[var(--color-border)]">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionProcessing === inv.id}
                            onClick={() => inv.id && handleInvitationResponse(inv.id, 'accepted')}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-1.5 h-auto text-caption"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept Invite
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionProcessing === inv.id}
                            onClick={() => inv.id && handleInvitationResponse(inv.id, 'declined')}
                            className="flex-1 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 py-1.5 h-auto text-caption"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                          </Button>
                        </div>
                      )}

                      {isAccepted && (
                        <div className="flex items-center justify-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-caption font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Invitation Accepted
                        </div>
                      )}

                      {isDeclined && (
                        <div className="flex items-center justify-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-caption font-semibold">
                          <XCircle className="w-4 h-4" /> Invitation Declined
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TWO-COLUMN SECTION: MONTHLY EARNINGS & PAYMENT STATUS / QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 60%: Monthly Earnings Area Chart */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Monthly Earnings
            </h2>
            <span className="text-caption font-mono text-[var(--color-text-secondary)]">
              Real Settled Invoices
            </span>
          </div>

          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} interval={0} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Earnings']}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#earningsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* RIGHT 40%: Payment Status & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Payment Status Card */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Payment Status Breakdown
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-caption font-medium mb-1">
                  <span className="text-[var(--color-text-secondary)]">Paid & Settled ({paidPercent}%)</span>
                  <span className="text-emerald-500 font-bold">${totalEarnings.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                  <div className="h-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-caption font-medium mb-1">
                  <span className="text-[var(--color-text-secondary)]">Pending Release ({pendingPercent}%)</span>
                  <span className="text-amber-500 font-bold">${pendingPaymentsAmount.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                  <div className="h-full bg-amber-500" style={{ width: `${pendingPercent}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions List */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-3">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" /> Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/symbiote/browse')}
                className="justify-start gap-2 text-caption text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all h-10"
              >
                <Compass className="w-4 h-4 text-emerald-500" /> Find Projects
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/symbiote/profile')}
                className="justify-start gap-2 text-caption text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all h-10"
              >
                <User className="w-4 h-4 text-cyan-500" /> Update Profile
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/symbiote/time-tracking')}
                className="justify-start gap-2 text-caption text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all h-10"
              >
                <Clock className="w-4 h-4 text-indigo-400" /> Log Time
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/symbiote/invoices')}
                className="justify-start gap-2 text-caption text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all h-10"
              >
                <FileText className="w-4 h-4 text-emerald-500" /> Create Invoice
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
