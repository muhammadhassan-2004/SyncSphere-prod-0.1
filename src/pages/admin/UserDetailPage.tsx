import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { getUserById, setUserStatus } from '@/src/lib/firestore/adminUsers';
import {
  getProjectHistory,
  getActivitySummary,
  getUserRecentActivity,
  type ProjectHistoryRow,
  type ActivitySummary,
  type UserActivityLog,
} from '@/src/lib/firestore/adminUserActivity';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useAuth } from '@/src/context/AuthContext';

type PendingAction = 'inactive' | 'active' | null;

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { authenticatedUser, firebaseUser, userProfile } = useAuth();
  const currentAdminUid = authenticatedUser?.uid || userProfile?.uid || (userProfile as any)?.id || 'admin-system';
  const currentAdminEmail = authenticatedUser?.email || userProfile?.email;

  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<ProjectHistoryRow[] | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivityLog[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getUserById(userId)
      .then((data) => setTarget(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || !target) return;
    const role = target.role === 'symbiote' ? 'symbiote' : 'client';
    if (target.role !== 'admin') {
      getProjectHistory(userId, role).then(setHistory).catch((err) => console.error(err));
      getActivitySummary(userId, role).then(setActivity).catch((err) => console.error(err));
    }

    setActivityLoading(true);
    getUserRecentActivity(userId, target.email)
      .then(setRecentActivity)
      .catch((err) => console.error(err))
      .finally(() => setActivityLoading(false));
  }, [userId, target]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-[var(--color-text-secondary)] flex items-center justify-center min-h-[400px]">
        <span>Loading user record details...</span>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <Card className="p-8 text-center text-[var(--color-text-secondary)]">
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">User not found</p>
          <p className="text-sm mt-1">The specified user ID does not exist in the platform record.</p>
        </Card>
      </div>
    );
  }

  const name = target.displayName || target.name || '—';
  const email = target.email || '—';
  const role = target.role === 'freelancer' ? 'symbiote' : (target.role || 'client');
  const status = target.status || 'active';

  let registeredDateStr = '—';
  if (target.createdAt) {
    if (typeof target.createdAt.toDate === 'function') {
      registeredDateStr = target.createdAt.toDate().toLocaleDateString();
    } else if (typeof target.createdAt === 'string') {
      registeredDateStr = new Date(target.createdAt).toLocaleDateString();
    }
  }

  const runAction = async () => {
    if (!userId) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (pendingAction === 'inactive') {
        await setUserStatus(userId, 'suspended', currentAdminUid);
        setActionSuccess(`User ${name} has been marked inactive.`);
      } else if (pendingAction === 'active') {
        await setUserStatus(userId, 'active', currentAdminUid);
        setActionSuccess(`User ${name} has been marked active.`);
      }

      const refreshed = await getUserById(userId);
      setTarget(refreshed);
      // Refresh recent activity log as well
      const updatedLogs = await getUserRecentActivity(userId, target.email);
      setRecentActivity(updatedLogs);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* User Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <Avatar name={name} src={target.avatarUrl || target.photoURL} size="lg" />
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>{name}</span>
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] flex flex-wrap items-center gap-2">
                <span>{email}</span>
                <span>•</span>
                <span className="capitalize">{role === 'client' ? 'Client' : role === 'symbiote' ? 'Freelancer' : 'Admin'}</span>
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Badge
                  variant={
                    status === 'active' ? 'green' : status === 'suspended' ? 'amber' : 'red'
                  }
                >
                  {status[0].toUpperCase() + status.slice(1)}
                </Badge>
                {role !== 'admin' && (
                  <Badge variant={target.profileCompleted !== false && (role === 'symbiote' ? Boolean(Array.isArray(target.skills) && target.skills.length > 0 && target.hourlyRate) : Boolean(target.companyName)) ? 'blue' : 'amber'}>
                    {target.profileCompleted !== false && (role === 'symbiote' ? Boolean(Array.isArray(target.skills) && target.skills.length > 0 && target.hourlyRate) : Boolean(target.companyName)) ? 'Profile Complete' : 'Profile Incomplete'}
                  </Badge>
                )}
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  Registered: {registeredDateStr}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {status === 'active' ? (
              <button
                onClick={() => setPendingAction('inactive')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Mark Inactive</span>
              </button>
            ) : (
              <button
                onClick={() => setPendingAction('active')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Active</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {actionError && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4">
          {actionError}
        </Card>
      )}

      {actionSuccess && (
        <Card className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 p-4">
          {actionSuccess}
        </Card>
      )}

      {/* Main Grid Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Profile Information</span>
          </h3>
          <dl className="space-y-3 text-sm">
            <Row label="Full Name" value={name} />
            <Row label="Email" value={email} />
            <Row label="Phone" value={target.phoneNumber || target.phone} />
            <Row label="Location" value={target.location || target.country} />
            <Row label="Headline" value={target.title || target.headline} />
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Account Information</span>
          </h3>
          <dl className="space-y-3 text-sm">
            <Row label="Role" value={role === 'client' ? 'Client' : role === 'symbiote' ? 'Freelancer' : 'Admin'} />
            <Row label="Status" value={status} />
            <Row label="Verified" value={target.verified ? 'Yes' : 'No'} />
            <Row label="2FA" value={target.twoFactorEnabled ? 'Enabled' : 'Disabled'} />
            <Row label="Plan" value={target.plan || 'Free'} />
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Activity Summary</span>
          </h3>
          {role === 'admin' ? (
            <div className="py-6 text-center text-xs text-[var(--color-text-tertiary)] italic">
              Admin account — project activity not applicable
            </div>
          ) : !activity ? (
            <div className="py-6 text-center text-xs text-[var(--color-text-tertiary)] italic">
              Loading activity summary...
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Active Projects" value={String(activity.activeProjectsCount)} />
              <Row label="Completed Projects" value={String(activity.completedProjectsCount)} />
              {activity.proposalsSentCount !== null && (
                <Row label="Proposals Sent" value={String(activity.proposalsSentCount)} />
              )}
              {activity.applicationsReceivedCount !== null && (
                <Row label="Applications Received" value={String(activity.applicationsReceivedCount)} />
              )}
              <Row label="Total Earned" value="Not tracked yet" />
              <Row label="Avg Rating" value="Not tracked yet" />
            </dl>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project History */}
        <Card className="p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
            <span>Project History</span>
            {history && <span className="text-xs text-[var(--color-text-secondary)] font-normal">{history.length} project{history.length !== 1 ? 's' : ''}</span>}
          </h3>
          {role === 'admin' ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-tertiary)] italic">
              Admin account — no project history
            </div>
          ) : !history ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-tertiary)] italic">
              Loading project history...
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No projects found"
              description="This user has not created or been assigned to any active projects yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[var(--color-text-secondary)] text-left border-b border-[var(--color-border)]">
                  <tr>
                    <th className="pb-2 font-medium">Project Title</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2.5 font-medium text-[var(--color-text-primary)] pr-2 max-w-[200px] truncate">
                        <Link to="/admin/projects" className="hover:underline">
                          {h.title}
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            h.status === 'completed'
                              ? 'green'
                              : h.status === 'in_progress' || h.status === 'active'
                              ? 'blue'
                              : 'amber'
                          }
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-mono text-[var(--color-text-secondary)]">
                        {h.budget ? `$${h.budget.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Live Recent Activity Stream */}
        <Card className="p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Recent Activity Stream</span>
            </div>
            {recentActivity && (
              <span className="text-xs text-[var(--color-text-secondary)] font-normal font-mono">
                {recentActivity.length} event{recentActivity.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>

          {activityLoading ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-tertiary)] italic">
              Loading audit activity stream...
            </div>
          ) : !recentActivity || recentActivity.length === 0 ? (
            <EmptyState
              title="No activity recorded"
              description="No audit log events have been logged for this user account yet."
            />
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recentActivity.map((log) => {
                const dateObj = new Date(log.timestamp);
                const timeStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-black/20 border border-[var(--color-border)] hover:border-white/10 transition-colors space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-semibold text-[var(--color-text-primary)] bg-white/5 px-2 py-0.5 rounded text-[11px] border border-white/5">
                          {log.action}
                        </span>
                        <span className="text-[var(--color-text-tertiary)] text-[10px]">
                          [{log.module}]
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                        {timeStr}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-[var(--color-text-secondary)] leading-relaxed">
                        {log.details}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] pt-0.5">
                      <span>
                        {log.isActor ? 'Initiated by user' : `Target of event${log.actorEmail ? ` (${log.actorEmail})` : ''}`}
                      </span>
                      <span
                        className={
                          log.result === 'success'
                            ? 'text-emerald-400'
                            : log.result === 'warning'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }
                      >
                        {log.result.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={pendingAction === 'inactive'}
        title="Mark this user as inactive?"
        description={`${name} will be restricted from accessing the platform. You can change this status anytime.`}
        confirmLabel="Mark Inactive"
        destructive
        loading={actionLoading}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={pendingAction === 'active'}
        title="Mark this user as active?"
        description={`${name} will regain full platform access.`}
        confirmLabel="Mark Active"
        loading={actionLoading}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center text-xs sm:text-sm">
      <dt className="text-[var(--color-text-secondary)] font-medium">{label}</dt>
      <dd className="text-[var(--color-text-primary)] font-mono text-right truncate max-w-[180px]">
        {value || '—'}
      </dd>
    </div>
  );
}

