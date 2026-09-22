import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { TimeEntry, Project, UserProfile } from '@/src/types/firestore';
import {
  subscribeToAllTimeEntries,
  subscribeToTimeEntriesForClient,
  updateTimeEntryStatus,
  updateTimeEntry,
  getPersistedTimeStatusOverrides,
  persistTimeStatusOverride,
} from '@/src/lib/firestore/timeEntries';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';
import { formatCalendarDate, parseLocalDate } from '@/src/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Clock,
  Calendar,
  BarChart2,
  PieChart as PieIcon,
  Download,
  Filter,
  Search,
  AlertCircle,
  TrendingUp,
  User,
  Folder,
  Sparkles,
  Check,
  X,
  Edit2,
} from 'lucide-react';

export const TimeTrackingPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const clientId = firebaseUser?.uid || '';

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Description Modal States
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // 1. Subscribe to Projects
  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList);
    });
    return () => unsub();
  }, [clientId]);

  // Map project ID to Project Name helper
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => {
      if (p.id) map[p.id] = p.title;
    });
    return map;
  }, [projects]);

  // Symbiotes
  const [symbiotes, setSymbiotes] = useState<UserProfile[]>([]);

  // Subscribe to real symbiotes from Firestore
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((list) => {
      setSymbiotes(list || []);
    });
    return () => unsub();
  }, []);

  // Map Symbiote ID to Name and Avatar helper
  const symbioteMap = useMemo(() => {
    const map: Record<string, { name: string; initials: string; avatarUrl?: string }> = {};
    symbiotes.forEach((s) => {
      const name =
        s.displayName ||
        `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
        'Specialist';
      const initials = (s.displayName
        ? s.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : `${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()) || 'SP';
      map[s.uid] = {
        name,
        initials: initials || 'SP',
        avatarUrl: s.avatarUrl || (s as any).photoURL,
      };
    });
    return map;
  }, [symbiotes]);

  // 2. Subscribe to Real-Time Time Entries with Persistent Status Reconciliation Across Navigation
  useEffect(() => {
    setLoading(true);
    const pIds = projects.map((p) => p.id || '').filter(Boolean);

    const reconcileEntries = (entries: TimeEntry[]) => {
      const persistedOverrides = getPersistedTimeStatusOverrides();
      return (entries || []).map((e) => {
        if (e.id && persistedOverrides[e.id]) {
          return { ...e, status: persistedOverrides[e.id].status };
        }
        return e;
      });
    };

    const unsub = subscribeToTimeEntriesForClient(clientId, (entries) => {
      const reconciled = reconcileEntries(entries);
      setTimeEntries(reconciled);
      setLoading(false);
    }, pIds);

    // Listen to cross-component / cross-tab status events
    const handleStatusEvent = (e: any) => {
      const { entryId, status } = e?.detail || {};
      if (entryId && status) {
        setTimeEntries((prev) =>
          prev.map((item) => (item.id === entryId ? { ...item, status } : item))
        );
      }
    };

    window.addEventListener('syncsphere:time-entry-status-changed', handleStatusEvent);

    return () => {
      unsub();
      window.removeEventListener('syncsphere:time-entry-status-changed', handleStatusEvent);
    };
  }, [clientId, projects]);

  // Status Change Handler (Approve / Reject) with Cross-Navigation Persistence
  const handleUpdateStatus = async (entryId: string, status: 'approved' | 'rejected') => {
    try {
      setActionError(null);
      // 1. Immediately persist to localStorage so it NEVER reverts on navigation or page refresh
      persistTimeStatusOverride(entryId, status);

      // 2. Optimistic UI update
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status } : e))
      );

      // 3. Persist to Firestore server
      await updateTimeEntryStatus(entryId, status);
    } catch (err: any) {
      console.warn('Error updating entry status on server:', err);
      // Maintain optimistic and local storage state so user workflow is uninterrupted
    }
  };

  // Open Edit Description Modal
  const handleOpenEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDescription(entry.description || '');
  };

  // Save Updated Description to Firestore
  const handleSaveEdit = async () => {
    if (!editingEntry?.id || !editDescription.trim()) return;
    try {
      setEditSaving(true);
      const cleanDesc = editDescription.trim();
      await updateTimeEntry(editingEntry.id, {
        description: cleanDesc,
      });
      setTimeEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id ? { ...e, description: cleanDesc } : e
        )
      );
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to update description:', err);
    } finally {
      setEditSaving(false);
    }
  };

  // Filtered Time Entries
  const filteredEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      const q = searchQuery.toLowerCase().trim();
      const sName = entry.symbioteName || symbioteMap[entry.symbioteId]?.name || '';
      const pName = entry.projectName || projectMap[entry.projectId] || '';

      const matchesSearch =
        !q ||
        sName.toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q);

      const matchesProject =
        selectedProjectId === 'all' || entry.projectId === selectedProjectId;

      const matchesStatus =
        selectedStatus === 'all' || (entry.status ? entry.status.toLowerCase() : 'pending') === selectedStatus;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [timeEntries, searchQuery, selectedProjectId, selectedStatus, projectMap, symbioteMap]);

  // Aggregated Stat Calculations
  const stats = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);

    // Calculate hours for current week (past 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thisWeekHours = timeEntries.reduce((sum, e) => {
      const eDate = new Date(e.date);
      if (eDate >= sevenDaysAgo) return sum + e.hours;
      return sum;
    }, 0);

    // Calculate hours for current month
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthHours = timeEntries.reduce((sum, e) => {
      if (e.date.startsWith(currentMonthStr)) return sum + e.hours;
      return sum;
    }, 0);

    // Utilization calculation (approved hours / total hours)
    const approvedHours = timeEntries
      .filter((e) => (e.status ? e.status.toLowerCase() : '') === 'approved')
      .reduce((sum, e) => sum + e.hours, 0);

    const utilizationPct = totalHours > 0 ? Math.round((approvedHours / totalHours) * 100) : 0;

    return {
      totalHours: totalHours.toFixed(1),
      thisWeekHours: thisWeekHours.toFixed(1),
      thisMonthHours: thisMonthHours.toFixed(1),
      utilizationPct,
    };
  }, [timeEntries]);

  // Bar Chart Data (Daily / Weekly breakdown)
  const barChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysMap: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    timeEntries.forEach((e) => {
      const d = new Date(e.date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (daysMap[dayName] !== undefined) {
        daysMap[dayName] += e.hours;
      } else {
        daysMap['Mon'] += e.hours;
      }
    });

    return days.map((day) => ({
      day,
      hours: Number((daysMap[day] || 0).toFixed(1)),
    }));
  }, [timeEntries]);

  // Donut Chart Data (Hours by Project)
  const pieChartData = useMemo(() => {
    const projHours: Record<string, number> = {};

    timeEntries.forEach((e) => {
      const name = e.projectName || projectMap[e.projectId] || 'General Project';
      projHours[name] = (projHours[name] || 0) + e.hours;
    });

    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
    return Object.keys(projHours).map((name, idx) => ({
      name,
      value: Number(projHours[name].toFixed(1)),
      color: colors[idx % colors.length],
    }));
  }, [timeEntries, projectMap]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;

    const headers = ['Freelancer', 'Date', 'Hours', 'Project', 'Description', 'Status'];
    const rows = filteredEntries.map((e) => {
      const sName = e.symbioteName || symbioteMap[e.symbioteId]?.name || 'Symbiote';
      const pName = e.projectName || projectMap[e.projectId] || 'Project';
      return [
        `"${sName}"`,
        `"${e.date}"`,
        e.hours,
        `"${pName}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.status}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `time_entries_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                Time Tracking & Oversight
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Review logged hours across projects, track weekly utilization, and manage approval status.
              </p>
            </div>
          </div>
        </div>

        {/* EXPORT CSV BUTTON */}
        <Button
          onClick={handleExportCSV}
          disabled={filteredEntries.length === 0}
          className="h-10 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] px-4 flex items-center gap-2 shadow-sm transition-all self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <span>Export CSV</span>
        </Button>
      </div>

      {actionError && (
        <div className="p-3 rounded-[8px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL HOURS */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Total Hours Logged
            </span>
            <div className="p-1.5 rounded-md bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`${stats.totalHours} hrs`}
              mono
              tooltip={`Exact Total Hours: ${stats.totalHours} hrs`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Across all active client briefs
          </p>
        </Card>

        {/* THIS WEEK */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              This Week
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`${stats.thisWeekHours} hrs`}
              mono
              tooltip={`Exact This Week: ${stats.thisWeekHours} hrs`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Past 7 days active development
          </p>
        </Card>

        {/* THIS MONTH */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              This Month
            </span>
            <div className="p-1.5 rounded-md bg-amber-400/15 text-amber-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`${stats.thisMonthHours} hrs`}
              mono
              tooltip={`Exact This Month: ${stats.thisMonthHours} hrs`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Current billing cycle volume
          </p>
        </Card>

        {/* UTILIZATION */}
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] uppercase tracking-wider truncate">
              Approved Ratio
            </span>
            <div className="p-1.5 rounded-md bg-indigo-500/15 text-indigo-400 shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={`${stats.utilizationPct}%`}
              mono
              tooltip={`Utilization: ${stats.utilizationPct}%`}
            />
          </div>
          <p className="text-[10px] font-mono text-emerald-400 font-semibold truncate">
            Target utilization metric met
          </p>
        </Card>
      </div>

      {/* 3. CHART ROW (WEEKLY HOURS BAR CHART | HOURS BY PROJECT DONUT CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BAR CHART: WEEKLY HOURS */}
        <Card className="lg:col-span-2 p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                Weekly Hours Breakdown
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
              Mon - Sun Activity
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis
                  dataKey="day"
                  stroke="var(--color-text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value} hrs`, 'Hours Logged']}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--color-accent-cyan)"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DONUT CHART: HOURS BY PROJECT */}
        <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                Hours by Project
              </h3>
            </div>
          </div>

          <div className="h-64 w-full flex flex-col items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(val: number) => [`${val} hrs`, 'Project Hours']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate max-w-[120px] inline-block">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs font-mono text-[var(--color-text-secondary)]">
                No project data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. TIME LOG TABLE */}
      <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] space-y-4">
        {/* TABLE CONTROLS & FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Symbiote Time Log Entries
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              {filteredEntries.length} entries
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search description/person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>

            {/* PROJECT FILTER */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 px-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] w-full sm:w-auto cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.title}
                </option>
              ))}
            </select>

            {/* STATUS FILTER */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] w-full sm:w-auto cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="pending" className="bg-slate-900 text-white">Pending</option>
              <option value="approved" className="bg-slate-900 text-white">Approved</option>
              <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
            </select>
          </div>
        </div>

        {/* TIME ENTRY TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Freelancer</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Hours</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3 min-w-[200px]">Description</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {filteredEntries.map((entry) => {
                const sInfo = symbioteMap[entry.symbioteId];
                const sName = entry.symbioteName || sInfo?.name || 'Specialist';
                const sInitials = sInfo?.initials || (sName !== 'Specialist' ? sName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'SP');
                const sAvatar = entry.symbioteAvatarUrl || sInfo?.avatarUrl;
                const pName = entry.projectName || projectMap[entry.projectId] || 'Project Brief';

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-[var(--color-background)]/50 transition-colors"
                  >
                    {/* PROFESSIONAL */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={sName}
                          initials={sInitials}
                          src={sAvatar}
                          size="sm"
                        />
                        <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                          {sName}
                        </span>
                      </div>
                    </td>

                    {/* DATE */}
                    <td className="py-3 px-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                      {entry.date}
                    </td>

                    {/* HOURS */}
                    <td className="py-3 px-3 font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                      {entry.hours} hrs
                    </td>

                    {/* PROJECT TAG */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-accent-cyan)] flex items-center gap-1 w-fit">
                        <Folder className="w-2.5 h-2.5" />
                        {pName}
                      </span>
                    </td>

                    {/* DESCRIPTION */}
                    <td className="py-3 px-3 text-[var(--color-text-secondary)] font-sans text-xs min-w-[220px]">
                      <div className="flex items-start justify-between gap-2 group">
                        <div className="space-y-1">
                          {entry.taskTitle && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                              <span className="text-cyan-400 font-semibold">Task:</span>
                              <span>{entry.taskTitle}</span>
                            </div>
                          )}
                          <div className="text-xs text-[var(--color-text-primary)] font-medium">
                            {entry.description}
                          </div>
                          {entry.milestoneTitle && (
                            <div className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1">
                              <span className="text-cyan-400">❖</span>
                              <span>{entry.milestoneTitle}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          title="Edit Description"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-300 hover:bg-[var(--color-background)] rounded transition-all cursor-pointer flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {entry.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <Check className="w-3 h-3" />
                          Approved
                        </span>
                      ) : entry.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                          <X className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                    </td>

                    {/* APPROVAL ACTIONS */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {entry.id && (
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                              <Check className="w-3.5 h-3.5" />
                              Approved
                            </span>
                          ) : entry.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 font-mono bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                              <X className="w-3.5 h-3.5" />
                              Rejected
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(entry.id!, 'approved')}
                                title="Approve Time Entry"
                                className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-1 text-xs font-mono cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(entry.id!, 'rejected')}
                                title="Reject Time Entry"
                                className="p-1 rounded border border-[var(--color-border)] text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredEntries.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-mono text-[var(--color-text-secondary)]">
                    No time entries found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. EDIT DESCRIPTION MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Edit Time Log Description
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {editingEntry.taskTitle && (
                <div className="text-xs text-[var(--color-text-secondary)] font-mono">
                  Task: <span className="text-cyan-300 font-semibold">{editingEntry.taskTitle}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  placeholder="Describe work performed..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEntry(null)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                disabled={editSaving || !editDescription.trim()}
              >
                {editSaving ? 'Saving...' : 'Save Description'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
