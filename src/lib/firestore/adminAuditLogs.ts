import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

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

const PAGE_SIZE = 25;

export async function getAuditLogsPage(
  filters: AuditLogFilters,
  cursor?: QueryDocumentSnapshot
): Promise<{ rows: AuditLogItem[]; nextCursor: QueryDocumentSnapshot | null; hasMore: boolean }> {
  try {
    const constraints: any[] = [orderBy('timestamp', 'desc'), limit(PAGE_SIZE)];

    if (filters.module) {
      constraints.unshift(where('module', '==', filters.module));
    }
    if (filters.result) {
      constraints.unshift(where('result', '==', filters.result));
    }
    if (cursor) {
      constraints.push(startAfter(cursor));
    }

    let snap;
    try {
      const q = query(collection(db, 'audit_logs'), ...constraints);
      snap = await getDocs(q);
    } catch (err) {
      console.warn('Audit logs constrained query failed, using basic getDocs fallback:', err);
      snap = await getDocs(collection(db, 'audit_logs'));
    }

    // Return empty array when no documents match or collection is empty
    let rows: AuditLogItem[] = snap.docs.map((d) => {
      const data = d.data();
      let timestamp: Timestamp | null = null;
      if (data.timestamp) {
        if (data.timestamp instanceof Timestamp) timestamp = data.timestamp;
        else if (typeof data.timestamp?.toDate === 'function') timestamp = data.timestamp;
        else if (typeof data.timestamp === 'string') timestamp = Timestamp.fromDate(new Date(data.timestamp));
        else if (typeof data.timestamp === 'number') timestamp = Timestamp.fromMillis(data.timestamp);
      }

      const email = data.userEmail || data.actorEmail || 'admin@syncsphere.com';
      const actorName = data.actorName || data.userName || (email ? email.split('@')[0] : 'Platform Admin');

      return {
        id: d.id,
        userId: data.userId || 'system',
        userEmail: email,
        actorName: actorName.charAt(0).toUpperCase() + actorName.slice(1),
        action: data.action || 'SYSTEM_EVENT',
        module: data.module || 'System',
        targetId: data.targetId || undefined,
        targetName: data.targetName || data.targetUserName || undefined,
        targetEmail: data.targetUserEmail || data.targetEmail || undefined,
        timestamp,
        result: data.result === 'failure' ? 'failure' : data.result === 'warning' ? 'warning' : 'success',
        details: data.details || '',
        ipAddress: data.ipAddress || undefined,
      };
    });

    // Client-side filter fallbacks
    if (filters.module) {
      rows = rows.filter((r) => r.module.toLowerCase() === filters.module?.toLowerCase());
    }
    if (filters.result) {
      rows = rows.filter((r) => r.result === filters.result);
    }
    if (filters.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      rows = rows.filter((r) => r.timestamp && r.timestamp.toMillis() >= startMs);
    }
    if (filters.endDate) {
      const endMs = new Date(filters.endDate).getTime() + 86400000; // end of day
      rows = rows.filter((r) => r.timestamp && r.timestamp.toMillis() <= endMs);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.action.toLowerCase().includes(s) ||
          (r.userEmail && r.userEmail.toLowerCase().includes(s)) ||
          r.userId.toLowerCase().includes(s) ||
          r.module.toLowerCase().includes(s) ||
          (r.details && r.details.toLowerCase().includes(s)) ||
          (r.targetId && r.targetId.toLowerCase().includes(s))
      );
    }

    // Explicit in-memory sorting fallback by timestamp descending
    rows.sort((a, b) => {
      const timeA = a.timestamp?.toMillis() ?? 0;
      const timeB = b.timestamp?.toMillis() ?? 0;
      return timeB - timeA;
    });

    return {
      rows,
      nextCursor: snap.docs.at(-1) ?? null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    console.error('Failed to get audit logs page:', err);
    return { rows: [], nextCursor: null, hasMore: false };
  }
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
