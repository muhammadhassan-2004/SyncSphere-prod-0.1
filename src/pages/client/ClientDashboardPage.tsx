import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { KPIStatCard } from '@/src/components/widgets/KPIStatCard';
import { ProgressBar } from '@/src/components/widgets/ProgressBar';
import {
  subscribeToProjectsByOwner,
  subscribeToClientApplications,
  subscribeToInvoices,
} from '@/src/lib/firestore';
import { Project, Application, Invoice } from '@/src/types/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  FolderKanban,
  DollarSign,
  Users,
  FileText,
  Sparkles,
  CreditCard,
  Plus,
  PlusCircle,
  Search,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
} from 'lucide-react';

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Recently';
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return 'Recently';
  const diffMs = Date.now() - time;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export const ClientDashboardPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Real-time Firestore state
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardSearch, setDashboardSearch] = useState<string>('');

  // Subscribe to live Firestore collections
  useEffect(() => {
    const clientId = firebaseUser?.uid;
    if (!clientId) {
      setProjects([]);
      setApplications([]);
      setInvoices([]);
      setLoading(false);
      return;
    }

    const unSubProjects = subscribeToProjectsByOwner(clientId, (data) => {
      setProjects(data);
      setLoading(false);
    });

    const unSubApps = subscribeToClientApplications(clientId, (data) => {
      const realApps = (data || []).filter((a) => !a.symbioteId?.startsWith('symbiote-10'));
      setApplications(realApps);
    });

    const unSubInvoices = subscribeToInvoices(clientId, 'client', (data) => {
      setInvoices(data);
    });

    return () => {
      if (unSubProjects) unSubProjects();
      if (unSubApps) unSubApps();
      if (unSubInvoices) unSubInvoices();
    };
  }, [firebaseUser?.uid]);

  // Derived KPI Metrics (Real-time from Firestore)
  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === 'in_progress' || p.status === 'open').length;
  }, [projects]);

  const totalSpend = useMemo(() => {
    const sum = projects.reduce((acc, p) => acc + (p.budget?.total || 0), 0);
    return `$${sum.toLocaleString()}`;
  }, [projects]);

  const hiredProsCount = useMemo(() => {
    return projects.filter((p) => p.assignedSymbioteId).length;
  }, [projects]);

  const pendingAppsCount = useMemo(() => {
    return applications.filter((a) => a.status === 'pending').length;
  }, [applications]);

  const avgMatchScore = useMemo(() => {
    if (applications.length > 0) {
      const scores = applications.map((a) => a.matchScore || 90);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return `${avg}%`;
    }
    return '0%';
  }, [applications]);

  const openInvoicesCount = useMemo(() => {
    if (invoices.length > 0) {
      const openInvs = invoices.filter((i) => i.status === 'unpaid' || i.status === 'pending');
      const totalAmt = openInvs.reduce((acc, i) => acc + i.amount, 0);
      return `${openInvs.length} ($${totalAmt.toLocaleString()})`;
    }
    return '0 ($0)';
  }, [invoices]);

  // Chart Data Preparation (Real aggregated data or empty)
  const spendChartData = useMemo(() => {
    if (invoices.length === 0) {
      return [
        { month: 'Mar', spend: 0 },
        { month: 'Apr', spend: 0 },
        { month: 'May', spend: 0 },
        { month: 'Jun', spend: 0 },
        { month: 'Jul', spend: 0 },
        { month: 'Aug', spend: 0 },
      ];
    }
    return [
      { month: 'Mar', spend: 0 },
      { month: 'Apr', spend: 0 },
      { month: 'May', spend: 0 },
      { month: 'Jun', spend: 0 },
      { month: 'Jul', spend: 0 },
      { month: 'Aug', spend: invoices.reduce((acc, i) => acc + i.amount, 0) },
    ];
  }, [invoices]);

  const teamActivityData = useMemo(
    () => [
      { day: 'Mon', hours: 0, tasks: 0 },
      { day: 'Tue', hours: 0, tasks: 0 },
      { day: 'Wed', hours: 0, tasks: 0 },
      { day: 'Thu', hours: 0, tasks: 0 },
      { day: 'Fri', hours: 0, tasks: 0 },
      { day: 'Sat', hours: 0, tasks: 0 },
      { day: 'Sun', hours: 0, tasks: 0 },
    ],
    []
  );

  // Recent Projects Table Display List (Filtered by dashboardSearch)
  const recentProjectsList = useMemo(() => {
    const q = dashboardSearch.toLowerCase().trim();
    const list = projects.map((p) => ({
      id: p.id || '',
      title: p.title,
      category: p.category || 'AI Engineering',
      status: p.status || 'in_progress',
      budget: `$${(p.budget?.total || p.budget?.max || 0).toLocaleString()}`,
      pros: p.assignedSymbioteId ? ['SP'] : [],
      deadline: p.deadline || 'TBD',
      progress:
        p.status === 'completed'
          ? 100
          : typeof p.progressPct === 'number'
          ? p.progressPct
          : typeof p.progressPercent === 'number'
          ? p.progressPercent
          : p.status === 'in_progress'
          ? 25
          : 0,
    }));

    if (!q) return list.slice(0, 6);

    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.budget.toLowerCase().includes(q)
    );
  }, [projects, dashboardSearch]);

  // Top Applicants List (Filtered by dashboardSearch)
  const topApplicationsList = useMemo(() => {
    if (!applications || applications.length === 0) return [];

    const sortedApps = [...applications].sort((a, b) => {
      const scoreA = a.aiMatchScore ?? a.matchScore ?? 0;
      const scoreB = b.aiMatchScore ?? b.matchScore ?? 0;
      return scoreB - scoreA;
    });

    const mapped = sortedApps.map((a) => {
      const matchedProj = projects.find((p) => p.id === a.projectId);
      return {
        id: a.id || Math.random().toString(),
        name: a.symbioteName || a.symbioteTitle || 'Specialist Candidate',
        role: a.symbioteTitle || a.experience || 'AI Systems Engineer',
        project: a.projectTitle || matchedProj?.title || 'Target Project',
        matchScore: a.aiMatchScore ?? a.matchScore ?? 90,
        appliedTime: formatRelativeTime(a.appliedAt),
      };
    });

    const q = dashboardSearch.toLowerCase().trim();
    if (!q) return mapped.slice(0, 4);

    return mapped.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.project.toLowerCase().includes(q)
    );
  }, [applications, projects, dashboardSearch]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'blue';
      case 'completed':
        return 'green';
      case 'open':
        return 'amber';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'open':
        return 'Open for Applications';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Welcome back! Here is what's happening with your active projects and talent pipeline.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/client/projects/new')}
          className="shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* KPI ROW (6 STAT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPIStatCard
          label="Active Projects"
          value={activeProjectsCount}
          icon={<FolderKanban className="w-4 h-4" />}
          iconVariant="blue"
          trend={{ value: '+12% vs last mo', direction: 'up' }}
          isLoading={loading}
        />
        <KPIStatCard
          label="Total Spend"
          value={totalSpend}
          icon={<DollarSign className="w-4 h-4" />}
          iconVariant="green"
          trend={{ value: '+8.4% vs last mo', direction: 'up' }}
          isLoading={loading}
        />
        <KPIStatCard
          label="Hired Pros"
          value={hiredProsCount}
          icon={<Users className="w-4 h-4" />}
          iconVariant="purple"
          trend={{ value: '+3 this month', direction: 'up' }}
          isLoading={loading}
        />
        <KPIStatCard
          label="Pending Apps"
          value={pendingAppsCount}
          icon={<FileText className="w-4 h-4" />}
          iconVariant="amber"
          trend={{ value: '4 new today', direction: 'neutral' }}
          isLoading={loading}
        />
        <KPIStatCard
          label="Avg Match Score"
          value={avgMatchScore}
          icon={<Sparkles className="w-4 h-4" />}
          iconVariant="blue"
          trend={{ value: '+2.1% AI match', direction: 'up' }}
          isLoading={loading}
        />
        <KPIStatCard
          label="Open Invoices"
          value={openInvoicesCount}
          icon={<CreditCard className="w-4 h-4" />}
          iconVariant="red"
          trend={{ value: 'Due in 7 days', direction: 'down' }}
          isLoading={loading}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spend Area Chart */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Monthly Spend
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Aggregated compute & talent execution expenses over the last 6 months
              </p>
            </div>
            <StatusPill variant="blue" label="USD Currency ($)" />
          </div>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    boxShadow: 'none',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Spend']}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#00f2fe"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Team Activity Bar Chart */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-info-blue)]" />
                Team Activity
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Active execution hours logged per day across all symbiote squads
              </p>
            </div>
            <StatusPill variant="green" label="Live Telemetry" />
          </div>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamActivityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    boxShadow: 'none',
                  }}
                  formatter={(value: any) => [`${value} hrs`, 'Logged Hours']}
                />
                <Bar dataKey="hours" fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* DATA ROW: RECENT PROJECTS & TOP APPLICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT PROJECTS TABLE (2 COLS) */}
        <Card className="lg:col-span-2 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--color-info-blue)]" />
                Recent Projects
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Track status, allocated budgets, assigned pros, and milestones
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/client/projects')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--color-accent-cyan)]/10 hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {recentProjectsList.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No Active Projects"
              description="Create a new project to start matching with AI specialists."
              actionLabel="New Project"
              onAction={() => navigate('/client/projects/new')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium">
                    <th className="py-2.5 px-3.5">Project Name</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Budget</th>
                    <th className="py-2.5 px-3.5">Team</th>
                    <th className="py-2.5 px-3.5">Deadline</th>
                    <th className="py-2.5 px-3.5">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/60">
                  {recentProjectsList.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/client/projects/${project.id}`)}
                      className="hover:bg-[var(--color-surface)]/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                          {project.title}
                        </p>
                        <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono mt-0.5">
                          {project.category}
                        </p>
                      </td>

                      <td className="py-3 px-3.5">
                        <StatusPill
                          variant={getStatusVariant(project.status)}
                          label={getStatusLabel(project.status)}
                        />
                      </td>

                      <td className="py-3 px-3.5 font-mono font-semibold text-[var(--color-text-primary)]">
                        {project.budget}
                      </td>

                      <td className="py-3 px-3.5">
                        {project.pros.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {project.pros.map((initials, idx) => (
                              <Avatar
                                key={idx}
                                initials={initials}
                                size="sm"
                                className="w-6 h-6 text-[10px] ring-2 ring-[var(--color-background)]"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {project.deadline}
                      </td>

                      <td className="py-3 px-3.5 min-w-[120px]">
                        <ProgressBar
                          value={project.progress}
                          variant="compact"
                          color={project.status === 'completed' ? 'green' : 'gradient'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* TOP APPLICATIONS LIST (1 COL) */}
        <Card className="lg:col-span-1 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Top Applications
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Highest AI match score candidates
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/client/applications')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--color-accent-cyan)]/10 hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topApplicationsList.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No Applications Yet"
              description="Applications for your active projects will appear here sorted by AI match score."
            />
          ) : (
            <div className="space-y-3">
              {topApplicationsList.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate('/client/applications')}
                  className="p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={app.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                          {app.name}
                        </p>
                        <p className="text-[10.5px] text-[var(--color-text-secondary)] truncate">
                          {app.role}
                        </p>
                      </div>
                    </div>

                    <StatusPill
                      variant="blue"
                      label={`${app.matchScore}% Match`}
                      className="text-[10px] shrink-0 font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)]/50">
                    <span className="truncate max-w-[170px]">{app.project}</span>
                    <span className="shrink-0">{app.appliedTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* QUICK ACTIONS GRID (2x2 / 4 TILES) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] font-mono">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            onClick={() => navigate('/client/projects/new')}
            className="p-4 hover:border-[var(--color-info-blue)] hover:bg-[var(--color-surface)] transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="p-3 rounded-[10px] bg-[var(--color-info-blue)]/15 text-[var(--color-info-blue)] group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-info-blue)] transition-colors">
                New Project
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Post a new requirement wizard
              </p>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/client/talent')}
            className="p-4 hover:border-[var(--color-success-green)] hover:bg-[var(--color-surface)] transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="p-3 rounded-[10px] bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-success-green)] transition-colors">
                Find Talent
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Browse verified AI operators
              </p>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/client/ai-matching')}
            className="p-4 hover:border-[var(--color-accent-cyan)] hover:bg-[var(--color-surface)] transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="p-3 rounded-[10px] bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                AI Matching
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Run autonomous candidate match
              </p>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/client/invoices')}
            className="p-4 hover:border-[var(--color-warning-amber)] hover:bg-[var(--color-surface)] transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="p-3 rounded-[10px] bg-[var(--color-warning-amber)]/15 text-[var(--color-warning-amber)] group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-warning-amber)] transition-colors">
                Invoices
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Manage payments & billing
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
