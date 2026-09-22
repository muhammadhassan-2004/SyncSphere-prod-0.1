import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { StatCard } from '@/src/components/ui/StatCard';
import { getAdminDashboardStats, type AdminDashboardStats } from '@/src/lib/firestore/adminDashboardStats';
import { getUserGrowthSeries, type MonthlyUserCount } from '@/src/lib/firestore/userGrowthSeries';
import { getSystemHealth, type ServiceHealth } from '@/src/lib/firestore/systemHealth';
import { UserGrowthChart } from '@/src/components/admin/UserGrowthChart';
import { QuickActionsPanel } from '@/src/components/admin/QuickActionsPanel';
import { SystemHealthPanel } from '@/src/components/admin/SystemHealthPanel';
import {
  Users,
  Building2,
  Briefcase,
  FolderKanban,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Radio,
  RefreshCw,
} from 'lucide-react';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [growth, setGrowth] = useState<MonthlyUserCount[] | null>(null);
  const [health, setHealth] = useState<ServiceHealth[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, g, h] = await Promise.all([
        getAdminDashboardStats(),
        getUserGrowthSeries(6),
        getSystemHealth(),
      ]);
      setStats(s);
      setGrowth(g);
      setHealth(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Platform overview — last updated just now</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent-gradient text-white hover:opacity-95 transition-opacity cursor-pointer"
          >
            Analytics
          </button>
        </div>
      </header>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4">
          Failed to load dashboard stats: {error}
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers} loading={loading} icon={Users} accent="blue" />
        <StatCard label="Clients" value={stats?.businessOwners} loading={loading} icon={Building2} accent="blue" />
        <StatCard label="Freelancers" value={stats?.professionals} loading={loading} icon={Briefcase} accent="green" />
        <StatCard label="Active Projects" value={stats?.activeProjects} loading={loading} icon={FolderKanban} accent="cyan" />
        <StatCard label="Completed Projects" value={stats?.completedProjects} loading={loading} icon={CheckCircle2} accent="green" />
        <StatCard
          label="Platform Revenue"
          value={stats?.platformRevenueCents != null ? `$${(stats.platformRevenueCents / 100).toLocaleString()}` : '—'}
          loading={loading}
          icon={DollarSign}
          accent="green"
          note={stats?.platformRevenueCents == null ? 'Not yet tracked' : undefined}
        />
        <StatCard label="Pending Reports" value={stats?.pendingReports} loading={loading} icon={AlertTriangle} accent="amber" />
        <StatCard
          label="Active Sessions"
          value={stats?.activeSessions ?? '—'}
          loading={loading}
          icon={Radio}
          accent="cyan"
          note={stats?.activeSessions == null ? 'Not yet tracked' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <Card className="lg:col-span-7 p-6">
          <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">User Growth Analytics</h2>
          <UserGrowthChart data={growth} loading={loading} />
        </Card>
        <div className="lg:col-span-3 space-y-6">
          <QuickActionsPanel />
          <SystemHealthPanel services={health} loading={loading} />
        </div>
      </div>
    </div>
  );
}
