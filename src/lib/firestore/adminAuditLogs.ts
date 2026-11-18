import {
  collection,
  addDoc,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';

export interface AuditLogItem {
  id: string;
  userId: string;
  userEmail?: string;
  actorName?: string;
  action: string;
  module: string;
  targetId?: string;
  targetName?: string;
  targetEmail?: string;
  timestamp: Timestamp | null;
  result: 'success' | 'failure' | 'warning';
  details?: string;
  ipAddress?: string;
}

export interface AuditLogFilters {
  module?: string;
  result?: 'success' | 'failure' | 'warning';
  search?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

const PAGE_SIZE = 100;

function normalizeTimestamp(value: unknown): Timestamp | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (typeof (value as any)?.toDate === 'function') return value as Timestamp;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  return null;
}

function mapApiRow(data: any): AuditLogItem {
  const email = data.userEmail || data.actorEmail || 'admin@syncsphere.com';
  const actorName =
    data.actorName || data.userName || (email ? String(email).split('@')[0] : 'Platform Admin');

  return {
    id: data.id,
    userId: data.userId || 'system',
    userEmail: email,
    actorName: String(actorName).charAt(0).toUpperCase() + String(actorName).slice(1),
    action: data.action || 'SYSTEM_EVENT',
    module: data.module || 'System',
    targetId: data.targetId || undefined,
    targetName: data.targetName || data.targetUserName || undefined,
    targetEmail: data.targetUserEmail || data.targetEmail || undefined,
    timestamp: normalizeTimestamp(data.timestamp),
    result: data.result === 'failure' ? 'failure' : data.result === 'warning' ? 'warning' : 'success',
    details: data.details || '',
    ipAddress: data.ipAddress || undefined,
  };
}

/**
 * Loads audit logs exclusively through the Admin SDK API.
 * Avoids client Firestore rules (which previously blocked admin reads).
 */
export async function getAuditLogsPage(
  filters: AuditLogFilters,
  _cursor?: QueryDocumentSnapshot
): Promise<{ rows: AuditLogItem[]; nextCursor: QueryDocumentSnapshot | null; hasMore: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to view audit logs.');
  }

  const token = await currentUser.getIdToken();
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  if (filters.module) params.set('module', filters.module);
  if (filters.result) params.set('result', filters.result);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      body?.error ||
      (res.status === 403
        ? 'Admin privileges required. Your account role may not be set to admin in Firestore.'
        : res.status === 401
          ? 'Session expired. Please sign in again.'
          : res.status === 404
            ? 'Audit logs API is unavailable. Restart the SyncSphere server and try again.'
            : `Failed to load audit logs (${res.status}).`);
    throw new Error(msg);
  }

  if (!body?.success || !Array.isArray(body.rows)) {
    throw new Error(body?.error || 'Failed to load audit logs.');
  }

  return {
    rows: body.rows.map(mapApiRow),
    nextCursor: null,
    hasMore: Boolean(body.hasMore),
  };
}

export async function logAuditEvent(entry: Omit<AuditLogItem, 'id' | 'timestamp'>) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...entry,
      timestamp: Timestamp.now(),
    });
  } catch (err) {
    console.warn('Failed to record audit event to Firestore:', err);
  }
}
