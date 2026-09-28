import React, { useEffect, useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { StatCard } from '@/src/components/ui/StatCard';
import { UserGrowthChart } from '@/src/components/admin/UserGrowthChart';
import { getUserGrowthSeries, type MonthlyUserCount } from '@/src/lib/firestore/userGrowthSeries';
import {
  getAnalyticsStats,
  getWeeklySignups,
  getProjectCategoryBreakdown,
  type AnalyticsStats,
  type DailySignups,
  type CategorySlice,
  type TimeRange,
} from '@/src/lib/firestore/adminAnalytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Users, UserCheck, FolderPlus, CheckCircle2, DollarSign, Download, TrendingUp, BarChart3, PieChart as PieIcon, Calendar } from 'lucide-react';

const ranges: { label: string; value: TimeRange }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const PIE_COLORS = ['#22D3EE', '#34D399', '#A855F7', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

export function AnalyticsReportingPage() {
  const [range, setRange] = useState<TimeRange>('daily');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [growth, setGrowth] = useState<MonthlyUserCount[] | null>(null);
  const [engagement, setEngagement] = useState<DailySignups[] | null>(null);
  const [categories, setCategories] = useState<CategorySlice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getAnalyticsStats(range),
      getUserGrowthSeries(6),
      getWeeklySignups(),
      getProjectCategoryBreakdown(),
    ])
      .then(([s, g, e, c]) => {
        if (!cancelled) {
          setStats(s);
          setGrowth(g);
          setEngagement(e);
          setCategories(c);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load analytics data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const handleExport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      range,
      stats,
      growth,
      weeklySignups: engagement,
      projectCategories: categories,
    };
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncsphere-analytics-${range}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>Analytics & Reporting</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Real-time platform metrics, user acquisition trends, and project activity breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Range Selector */}
          <div className="flex gap-1 bg-black/40 border border-[var(--color-border)] rounded-lg p-1">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  range === r.value
                    ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4 text-xs">
          {error}
        </Card>
      )}

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers}
          loading={loading}
          icon={Users}
          accent="blue"
        />
        <StatCard
          label="Active Users"
          value={stats?.activeUsers ?? 0}
          loading={loading}
          icon={UserCheck}
          accent="green"
          note="Active in selected period"
        />
        <StatCard
          label="Projects Created"
          value={stats?.projectsCreated}
          loading={loading}
          icon={FolderPlus}
          accent="cyan"
        />
        <StatCard
          label="Projects Completed"
          value={stats?.projectsCompleted}
          loading={loading}
          icon={CheckCircle2}
          accent="purple"
        />
        <StatCard
          label="Platform Revenue"
          value={stats?.platformRevenueCents != null ? `$${(stats.platformRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          loading={loading}
          icon={DollarSign}
          accent="amber"
          note="5% fee on settled invoices"
        />
      </div>

      {/* 2x2 Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>User Growth Trend</span>
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Monthly platform registration trajectory</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              6 Months
            </span>
          </div>
          <UserGrowthChart data={growth} loading={loading} />
        </Card>

        {/* Revenue Analytics */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Revenue Analytics</span>
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Monetization & payment collection tracking</p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Billing
            </span>
          </div>
          <div className="h-64 flex flex-col justify-center px-5 space-y-4 bg-black/20 rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Platform Fee Rate:</span>
              <span className="text-xs font-mono font-bold text-amber-400">5.0% standard</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Calculated Net Fees:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                ${stats?.platformRevenueCents != null ? (stats.platformRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Estimated Gross Volume:</span>
              <span className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                ${stats?.platformRevenueCents != null ? ((stats.platformRevenueCents / 100) * 20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-tertiary)]">
              <span>Settlement: Direct Milestone</span>
              <span className="text-emerald-400 font-semibold">Active & Reconciled</span>
            </div>
          </div>
        </Card>

        {/* User Engagement (Weekly Signups Proxy) */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>User Engagement (Weekly)</span>
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                New signups by day of week (active logins tracked via user lastActiveAt)
              </p>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              7 Days
            </span>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-[var(--color-text-tertiary)] text-xs">
              Loading activity metrics…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={engagement ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #1F2937', borderRadius: 8, fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" name="New Signups" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Project Trends by Category */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)] text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Project Trends by Category</span>
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Distribution of projects across industry domains</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Category
            </span>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-[var(--color-text-tertiary)] text-xs">
              Loading category breakdown…
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[var(--color-text-tertiary)] text-xs">
              No project category data recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }}
                />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #1F2937', borderRadius: 8, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
