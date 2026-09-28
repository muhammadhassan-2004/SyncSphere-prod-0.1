import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Download,
  ShieldAlert,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  User,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import {
  getAuditLogsPage,
  type AuditLogItem,
  type AuditLogFilters,
} from '@/src/lib/firestore/adminAuditLogs';
import { doc, getDoc, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

const moduleOptions = [
  'Users',
  'Settings',
  'Roles',
  'Projects',
  'Authentication',
  'System',
];

interface ResolvedUser {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

function formatActionBadge(action: string) {
  switch (action) {
    case 'CREATE_USER':
      return { label: 'User Created', variant: 'green' as const };
    case 'REACTIVATE_USER':
      return { label: 'Mark Active', variant: 'emerald' as const };
    case 'SUSPEND_USER':
      return { label: 'Mark Inactive', variant: 'amber' as const };
    case 'DELETE_USER':
      return { label: 'User Deleted', variant: 'red' as const };
    case 'UPDATE_SETTINGS':
      return { label: 'Settings Updated', variant: 'cyan' as const };
    case 'RESET_SETTINGS':
      return { label: 'Settings Reset', variant: 'purple' as const };
    default:
      return {
        label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        variant: 'blue' as const,
      };
  }
}

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, ResolvedUser>>({});

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<'success' | 'failure' | 'warning' | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Expandable row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (reset = true) => {
      setLoading(true);
      setError(null);
      const filters: AuditLogFilters = {
        search: search || undefined,
        module: selectedModule || undefined,
        result: selectedResult || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      try {
        const { rows: newRows, nextCursor, hasMore: more } = await getAuditLogsPage(
          filters,
          reset ? undefined : cursor ?? undefined
        );
        setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
        setCursor(nextCursor);
        setHasMore(more);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    },
    [search, selectedModule, selectedResult, startDate, endDate, cursor]
  );

  useEffect(() => {
    loadLogs(true);
  }, [selectedModule, selectedResult, startDate, endDate]);

  // Debounced search input effect for instant filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Resolve actor and target users automatically from Firestore
  useEffect(() => {
    const userIds: string[] = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.targetId, r.userId])
          .filter((id): id is string => Boolean(id && typeof id === 'string' && id.length > 5))
      )
    );

    const missingIds: string[] = userIds.filter((id) => !userMap[id]);
    if (missingIds.length === 0) return;

    let isMounted = true;
    Promise.all(
      missingIds.map(async (id: string): Promise<(ResolvedUser & { id: string }) | null> => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const d = snap.data();
            const fullName =
              d.displayName ||
              d.name ||
              (d.firstName ? `${d.firstName} ${d.lastName || ''}`.trim() : null) ||
              d.email?.split('@')[0] ||
              'User';
            return {
              id,
              name: fullName,
              email: d.email || '',
              role: d.role === 'symbiote' ? 'freelancer' : d.role || 'client',
              avatarUrl: d.avatarUrl || d.photoURL || undefined,
            };
          }
        } catch {
          // ignore lookup errors
        }
        return null;
      })
    ).then((results) => {
      if (!isMounted) return;
      const updates: Record<string, ResolvedUser> = {};
      results.forEach((r) => {
        if (r) {
          updates[r.id] = {
            name: r.name,
            email: r.email,
            role: r.role,
            avatarUrl: r.avatarUrl,
          };
        }
      });
      if (Object.keys(updates).length > 0) {
        setUserMap((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [rows, userMap]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedModule('');
    setSelectedResult('');
    setStartDate('');
    setEndDate('');
  };

  const exportCsv = () => {
    const header = ['Timestamp', 'Actor', 'Actor Email', 'Action', 'Module', 'Target Name', 'Target ID', 'Result', 'Details'];
    const lines = rows.map((r) => {
      const targetUser = r.targetId ? userMap[r.targetId] : undefined;
      const targetName = targetUser ? targetUser.name : r.targetName || r.module;
      return [
        r.timestamp ? r.timestamp.toDate().toISOString() : '',
        `"${(r.actorName || 'Platform Admin').replace(/"/g, '""')}"`,
        `"${(r.userEmail || '').replace(/"/g, '""')}"`,
        `"${r.action.replace(/"/g, '""')}"`,
        `"${r.module.replace(/"/g, '""')}"`,
        `"${targetName.replace(/"/g, '""')}"`,
        `"${(r.targetId || '').replace(/"/g, '""')}"`,
        r.result,
        `"${(r.details || '').replace(/"/g, '""')}"`,
      ];
    });

    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = Boolean(
    search || selectedModule || selectedResult || startDate || endDate
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
            <span>Audit Logs & Compliance</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Immutable system audit trail tracking administrative actions, user moderation, and system events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLogs(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Filter Control Card */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              placeholder="Search by action, email, actor or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Module Select */}
          <select
            className="px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          >
            <option value="">All Modules</option>
            {moduleOptions.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>

          {/* Result Select */}
          <select
            className="px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value as any)}
          >
            <option value="">All Results</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="failure">Failure</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
              <span>Reset Filters</span>
            </button>
          ) : (
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apply Filters</span>
            </button>
          )}
        </form>

        {/* Date Range Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Date Filter:</span>
          </span>

          <div className="flex items-center gap-2">
            <label className="text-[var(--color-text-tertiary)]">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-black/40 border border-[var(--color-border)] rounded text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[var(--color-text-tertiary)]">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-black/40 border border-[var(--color-border)] rounded text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            />
          </div>
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4">
          {error}
        </Card>
      )}

      {/* Main Professional Audit Log Table (Clean 5-Column Grid) */}
      <Card className="overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white/5 border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="p-3.5 font-medium whitespace-nowrap min-w-[150px]">Date & Time</th>
                <th className="p-3.5 font-medium min-w-[200px]">Actor</th>
                <th className="p-3.5 font-medium min-w-[150px]">Action & Module</th>
                <th className="p-3.5 font-medium min-w-[240px]">Target / Description</th>
                <th className="p-3.5 font-medium min-w-[110px]">Status</th>
                <th className="p-3.5 font-medium w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--color-text-secondary)]">
                    Loading audit events…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <FileText className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                      <span>No audit logs match the specified criteria.</span>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((log) => {
                const isExpanded = expandedId === log.id;
                const formattedDate = log.timestamp
                  ? log.timestamp.toDate().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';
                const formattedTime = log.timestamp
                  ? log.timestamp.toDate().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '';

                const actionBadge = formatActionBadge(log.action);
                const targetUser = log.targetId ? userMap[log.targetId] : undefined;
                const actorProfile = log.userId ? userMap[log.userId] : undefined;
                const actorName = log.actorName || actorProfile?.name || (log.userEmail ? log.userEmail.split('@')[0] : 'Platform Admin');
                const actorAvatar = actorProfile?.avatarUrl;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className={`hover:bg-white/5 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-white/5' : ''
                      }`}
                    >
                      {/* Column 1: Date & Time */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                          <p className="text-[11px] text-[var(--color-text-tertiary)] pl-5 font-mono">
                            {formattedTime}
                          </p>
                        </div>
                      </td>

                      {/* Column 2: Actor (Name + Email + Avatar) */}
                      <td className="p-3.5 align-top">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={actorName}
                            src={actorAvatar}
                            size="sm"
                            className="w-7 h-7 text-[10px] shrink-0"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                              {actorName}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                              {log.userEmail || actorProfile?.email || 'admin@syncsphere.com'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Action & Module */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1">
                          <Badge variant={actionBadge.variant}>{actionBadge.label}</Badge>
                          <p className="text-[11px] text-[var(--color-text-tertiary)] font-medium pl-0.5">
                            {log.module}
                          </p>
                        </div>
                      </td>

                      {/* Column 4: Target / Description (Real Name + Profile Link + Avatar) */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1">
                          {log.targetId && targetUser ? (
                            <Link
                              to={`/admin/users/${log.targetId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline group"
                            >
                              <Avatar
                                name={targetUser.name}
                                src={targetUser.avatarUrl}
                                size="xs"
                                className="w-5 h-5 text-[8.5px] shrink-0"
                              />
                              <span>{targetUser.name}</span>
                              <span className="text-[10px] text-[var(--color-text-tertiary)] font-normal capitalize">
                                ({targetUser.role === 'symbiote' ? 'Freelancer' : targetUser.role === 'client' ? 'Client' : 'Admin'})
                              </span>
                              <ExternalLink className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300" />
                            </Link>
                          ) : log.targetName ? (
                            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                              {log.targetName}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                              {log.module}
                            </span>
                          )}

                          {log.details ? (
                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {log.details}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* Column 5: Status */}
                      <td className="p-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            log.result === 'failure'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : log.result === 'warning'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              log.result === 'failure'
                                ? 'bg-red-400'
                                : log.result === 'warning'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          <span>{log.result[0].toUpperCase() + log.result.slice(1)}</span>
                        </span>
                      </td>

                      {/* Column 6: Expand Chevron */}
                      <td className="p-3.5 align-top text-center text-[var(--color-text-tertiary)]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Expandable Technical Detail Drawer Row */}
                    {isExpanded && (
                      <tr className="bg-black/50 border-b border-[var(--color-border)]">
                        <td colSpan={6} className="p-4 space-y-3">
                          <div className="p-4 rounded-lg bg-black/60 border border-white/10 space-y-3 text-xs">
                            <div className="flex items-center justify-between text-[var(--color-text-secondary)] border-b border-white/5 pb-2">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-cyan-400" /> Event Details & Audit Metadata
                              </span>
                              <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                                Event ID: {log.id}
                              </span>
                            </div>

                            {log.details && (
                              <p className="text-[var(--color-text-primary)] text-xs bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed">
                                {log.details}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[11px] pt-1">
                              <div>
                                <span className="text-[var(--color-text-tertiary)] block mb-1">Actor:</span>
                                <div className="flex items-center gap-2">
                                  <Avatar name={actorName} src={actorAvatar} size="xs" className="w-5 h-5 text-[8.5px] shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-white font-medium block truncate">{actorName}</span>
                                    <span className="text-[10px] text-[var(--color-text-secondary)] font-mono block">
                                      UID: {log.userId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)] block mb-1">Target Resource:</span>
                                {log.targetId ? (
                                  <div className="flex items-center gap-2">
                                    {targetUser && (
                                      <Avatar name={targetUser.name} src={targetUser.avatarUrl} size="xs" className="w-5 h-5 text-[8.5px] shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <span className="text-cyan-400 font-medium block truncate">
                                        {targetUser ? targetUser.name : log.targetName || 'Resource'}
                                      </span>
                                      <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono block truncate">
                                        ID: {log.targetId}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-white font-mono">None</span>
                                )}
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)] block mb-0.5">Module / Action:</span>
                                <span className="text-white font-mono">{log.module} • {log.action}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)] block mb-0.5">Status & Result:</span>
                                <span className="text-emerald-400 font-medium capitalize">{log.result}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => loadLogs(false)}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
          >
            {loading ? 'Loading…' : 'Load More Audit Logs'}
          </button>
        </div>
      )}
    </div>
  );
}
