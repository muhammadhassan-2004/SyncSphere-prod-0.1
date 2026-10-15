import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, X } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { GoogleColorIcon } from '@/src/components/ui/GoogleColorIcon';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/lib/toast/ToastProvider';
import {
  getUsersPage,
  setUserStatus,
  type AdminUserRow,
  type UserFilters,
} from '@/src/lib/firestore/adminUsers';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

const roleBadgeVariant = {
  client: 'purple',
  symbiote: 'blue',
  admin: 'red',
} as const;

const statusBadgeVariant = {
  active: 'green',
  suspended: 'amber',
  disabled: 'red',
} as const;

export function UserManagementPage() {
  const showToast = useToast();
  const { authenticatedUser, userProfile } = useAuth();
  const currentAdminUid = authenticatedUser?.uid || userProfile?.uid || (userProfile as any)?.id || 'admin-system';

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Dialog state for bulk / single actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
    requireTypedConfirmation?: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    destructive: false,
    action: async () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      setError(null);
      try {
        const { rows: newRows, nextCursor, hasMore: more } = await getUsersPage(
          filters,
          reset ? undefined : cursor ?? undefined
        );
        setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
        setCursor(nextCursor);
        setHasMore(more);
        if (reset) setSelected(new Set());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [filters, cursor]
  );

  useEffect(() => {
    load(true);
  }, [filters.role, filters.status]);

  // Debounced search input effect for instant filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      load(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(true);
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSingleStatusToggle = (userId: string, newStatus: 'suspended' | 'active', userName: string) => {
    const isSuspend = newStatus === 'suspended';
    const actionLabel = isSuspend ? 'Mark Inactive' : 'Mark Active';

    setConfirmDialog({
      open: true,
      title: `${actionLabel} for ${userName}?`,
      description: isSuspend
        ? `This will mark ${userName}'s account as Inactive, restricting platform access. You can reactivate them at any time.`
        : `This will restore active access for ${userName}'s account.`,
      confirmLabel: actionLabel,
      destructive: isSuspend,
      action: async () => {
        setActionLoading(true);
        try {
          await setUserStatus(userId, newStatus, currentAdminUid);
          showToast('success', `${userName} marked ${isSuspend ? 'Inactive' : 'Active'}.`);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          await load(true);
        } catch (err: any) {
          showToast('error', `Failed to update status: ${err?.message || err}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleBulkStatusChange = (newStatus: 'suspended' | 'active') => {
    const count = selected.size;
    const isSuspend = newStatus === 'suspended';
    const actionLabel = isSuspend ? 'Mark Inactive' : 'Mark Active';

    setConfirmDialog({
      open: true,
      title: `${actionLabel} for ${count} Selected User${count > 1 ? 's' : ''}?`,
      description: isSuspend
        ? `This will mark ${count} selected user account(s) as Inactive, restricting platform access. You can reactivate them later.`
        : `This will restore active access for ${count} selected user account(s).`,
      confirmLabel: `${actionLabel} Users`,
      destructive: isSuspend,
      action: async () => {
        setActionLoading(true);
        const selectedIds: string[] = Array.from(selected);

        const results = await Promise.allSettled(
          selectedIds.map((id) => setUserStatus(id, newStatus, currentAdminUid))
        );

        const succeeded: string[] = [];
        const failed: { id: string; error: string }[] = [];

        results.forEach((res, idx) => {
          const id = selectedIds[idx];
          if (res.status === 'fulfilled') {
            succeeded.push(id);
          } else {
            failed.push({
              id,
              error: res.reason instanceof Error ? res.reason.message : String(res.reason),
            });
          }
        });

        setActionLoading(false);
        setConfirmDialog((prev) => ({ ...prev, open: false }));

        if (succeeded.length > 0) {
          showToast(
            'success',
            `${succeeded.length} user${succeeded.length > 1 ? 's' : ''} marked ${isSuspend ? 'Inactive' : 'Active'}.`
          );
        }

        if (failed.length > 0) {
          showToast(
            'error',
            `Failed to update ${failed.length} user(s): ${failed.map((f) => f.id.slice(0, 6)).join(', ')}`
          );
        }

        setSelected(new Set());
        await load(true);
      },
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">User Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {rows.length} platform user accounts {hasMore ? '(more available)' : ''}
          </p>
        </div>
      </header>

      {/* Filters Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            className="w-full pl-10 pr-9 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            placeholder="Search by name, email, or role..."
            value={filters.search || ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex gap-3">
          <select
            className="px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            value={filters.role || ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                role: (e.target.value || undefined) as AdminUserRow['role'],
              }))
            }
          >
            <option value="">All Roles</option>
            <option value="client">Client</option>
            <option value="symbiote">Freelancer</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className="px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            value={filters.status || ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as any,
              }))
            }
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </Card>
      )}

      {/* Bulk Toolbar */}
      {selected.size > 0 && (() => {
        const selectedUsers = rows.filter((r) => selected.has(r.id));
        const hasActiveSelected = selectedUsers.some((u) => u.status === 'active');
        const hasInactiveSelected = selectedUsers.some((u) => u.status !== 'active');

        return (
          <Card className="p-3 flex items-center justify-between bg-cyan-500/10 border-cyan-500/30">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {selected.size} user{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              {hasInactiveSelected && (
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('active')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  Mark Active
                </button>
              )}
              {hasActiveSelected && (
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('suspended')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  Mark Inactive
                </button>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Users Table */}
      <Card className="overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white/5 border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-[var(--color-border)] bg-black/40 accent-[var(--color-accent-cyan)]"
                  />
                </th>
                <th className="p-3.5 font-medium">Name</th>
                <th className="p-3.5 font-medium">Email</th>
                <th className="p-3.5 font-medium">Role</th>
                <th className="p-3.5 font-medium">Registered</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium">Last Login</th>
                <th className="p-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--color-text-secondary)]">
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--color-text-secondary)]">
                    No user accounts match these filters.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={(e) => toggleOne(u.id, e.target.checked)}
                      className="rounded border-[var(--color-border)] bg-black/40 accent-[var(--color-accent-cyan)]"
                    />
                  </td>
                  <td className="p-3.5 text-[var(--color-text-primary)] font-medium">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="flex items-center gap-2.5 hover:text-[var(--color-accent-cyan)] transition-colors group"
                      title="View user details"
                    >
                      <Avatar name={u.name} initials={u.avatarInitials} src={u.avatarUrl} size="sm" />
                      <span className="group-hover:underline">{u.name}</span>
                    </Link>
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {u.isGoogleUser && (
                        <span title="Registered via Google OAuth" className="inline-flex shrink-0">
                          <GoogleColorIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge variant={roleBadgeVariant[u.role] || 'gray'}>
                      {u.role === 'client' ? 'Client' : u.role === 'symbiote' ? 'Freelancer' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)]">
                    {u.registeredAt ? u.registeredAt.toDate().toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={statusBadgeVariant[u.status] || 'gray'}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                      {u.role !== 'admin' && !u.profileCompleted && (
                        <div className="relative group/incomplete">
                          <span
                            className="text-[10px] text-amber-400 font-mono whitespace-nowrap cursor-help flex items-center gap-1 hover:underline"
                            title={u.incompleteReason || 'Incomplete Profile: Missing required fields'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Incomplete Profile</span>
                          </span>
                          {/* Rich hover tooltip */}
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover/incomplete:block z-50 p-2.5 rounded-md bg-slate-900 border border-amber-500/40 text-amber-200 text-[11px] shadow-2xl whitespace-nowrap font-sans pointer-events-none">
                            <p className="font-semibold text-amber-300">Incomplete Profile</p>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              {u.incompleteReason || 'User has not completed all required profile fields'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)]">
                    {u.lastLoginAt ? u.lastLoginAt.toDate().toLocaleString() : 'Never'}
                  </td>
                  <td className="p-3.5 text-right">
                    {u.status === 'active' ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSingleStatusToggle(u.id, 'suspended', u.name)}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                        title={`Mark ${u.name} as Inactive`}
                      >
                        Mark Inactive
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSingleStatusToggle(u.id, 'active', u.name)}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                        title={`Mark ${u.name} as Active`}
                      >
                        Mark Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
          >
            {loading ? 'Loading…' : 'Load More Users'}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        destructive={confirmDialog.destructive}
        requireTypedConfirmation={confirmDialog.requireTypedConfirmation}
        loading={actionLoading}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
