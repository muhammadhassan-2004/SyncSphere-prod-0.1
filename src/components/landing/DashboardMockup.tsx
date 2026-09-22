import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Layers, Users, DollarSign, TrendingUp, CheckCircle2, Database } from 'lucide-react';
import { getLivePlatformMetrics, getLiveFeaturedProjects, PlatformMetrics, FeaturedProject } from '@/src/lib/firestore/landingData';

export const DashboardMockup: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [m, p] = await Promise.all([
          getLivePlatformMetrics(),
          getLiveFeaturedProjects(),
        ]);
        if (isMounted) {
          setMetrics(m);
          setProjects(p);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Display values with live database fallback
  const activeProjectsCount = metrics && metrics.activeProjects > 0 ? metrics.activeProjects : 12;
  const hiredProsCount = metrics && metrics.totalSymbiotes > 0 ? metrics.totalSymbiotes : 34;
  const isRealData = metrics && (metrics.totalProjects > 0 || metrics.totalUsers > 0);

  const displayProjects = projects.length > 0
    ? projects.slice(0, 3)
    : [
        { id: 'proj-1', title: 'E-commerce Microservices Redesign', progressPercent: 92, status: 'Testing' },
        { id: 'proj-2', title: 'Real-Time Telematics API Gateway', progressPercent: 78, status: 'In Progress' },
        { id: 'proj-3', title: 'Cross-Platform React Native App', progressPercent: 45, status: 'Active' },
      ];

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden text-left transition-all">
      {/* Chrome Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)]">
          <Database className="w-3 h-3 text-[var(--color-accent-cyan)]" />
          <span>app.syncsphere.io/workspace</span>
        </div>
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border border-[var(--color-success-green)]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-green)] animate-pulse" />
            {isRealData ? 'Live Firestore' : 'Live Sync'}
          </span>
        </div>
      </div>

      {/* Main Mockup Body */}
      <div className="p-5 space-y-5 bg-[var(--color-surface)]">
        {/* 3 Mini KPI Stat Blocks */}
        <div className="grid grid-cols-3 gap-3">
          {/* Active Projects - Blue */}
          <Link
            to="/portal-select"
            className="p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1 border-l-2 border-l-[var(--color-info-blue)] hover:border-[var(--color-accent-cyan)] transition-colors block"
            title="Click to explore Active Projects"
          >
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase block truncate">
              Active Projects
            </span>
            <div className="text-lg font-bold text-[var(--color-text-primary)] font-mono">
              {activeProjectsCount}
            </div>
          </Link>

          {/* Hired Pros - Green */}
          <Link
            to="/portal-select"
            className="p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1 border-l-2 border-l-[var(--color-success-green)] hover:border-[var(--color-accent-cyan)] transition-colors block"
            title="Click to view Verified Talent"
          >
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase block truncate">
              Specialists
            </span>
            <div className="text-lg font-bold text-[var(--color-text-primary)] font-mono">
              {hiredProsCount}
            </div>
          </Link>

          {/* Average Rating / Milestone Health */}
          <Link
            to="/portal-select"
            className="p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-1 border-l-2 border-l-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)] transition-colors block"
            title="Click to view Platform Quality Score"
          >
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase block truncate">
              Avg Rating
            </span>
            <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono">
              {metrics?.averageRating ? `${metrics.averageRating} ★` : '4.9 ★'}
            </div>
          </Link>
        </div>

        {/* Decorative Ascending Delivery Velocity Chart */}
        <div className="p-4 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-[var(--color-text-secondary)]">Platform Delivery Velocity</span>
            <span className="text-[10px] font-mono text-[var(--color-success-green)] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +18.4% velocity
            </span>
          </div>
          <div className="h-14 flex items-end justify-between gap-1.5 pt-2">
            {[35, 45, 40, 60, 55, 75, 70, 85, 90, 95].map((height, i) => (
              <div key={i} className="flex-1 bg-[var(--color-border)] rounded-t h-full flex items-end overflow-hidden">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-emerald-400 transition-all duration-300 min-h-[4px]"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Labeled Progress Bars from Live Projects */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-secondary)] uppercase">
            <span>Active Deliverables</span>
            <span>Completion</span>
          </div>
          {displayProjects.map((proj) => (
            <Link
              key={proj.id}
              to="/portal-select"
              className="block space-y-1.5 group cursor-pointer"
            >
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors truncate max-w-[80%]">
                  {proj.title}
                </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono font-bold">
                  {proj.progressPercent}%
                </span>
              </div>
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${proj.progressPercent}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
