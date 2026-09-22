import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  module: string;
  targetId?: string;
  timestamp: Timestamp | null;
  result: 'success' | 'failure' | 'warning';
  details?: string;
}

export interface PlatformErrorLog {
  id: string;
  code: string;
  path: string;
  count: number;
  lastOccurred: string;
  message: string;
  stack?: string;
  isRealData: boolean;
}

export interface ServiceHealthStatus {
  name: string;
  key: string;
  status: 'operational' | 'degraded' | 'outage';
  latencyMs: number;
  uptimePercent: number;
  lastChecked: Date;
  details?: string;
}

export async function measureFirestoreLatency(): Promise<number> {
  const start = performance.now();
  try {
    // Read a lightweight doc or query to measure roundtrip
    await getDocs(query(collection(db, 'users'), limit(1)));
    const end = performance.now();
    return Math.round(end - start);
  } catch (err) {
    console.warn('Latency ping failed:', err);
    return -1;
  }
}

export async function fetchRecentAuditLogs(limitCount = 15): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => {
      const data = d.data();
      let timestamp: Timestamp | null = null;
      if (data.timestamp) {
        if (data.timestamp instanceof Timestamp) timestamp = data.timestamp;
        else if (typeof data.timestamp?.toDate === 'function') timestamp = data.timestamp;
        else if (typeof data.timestamp === 'string') timestamp = Timestamp.fromDate(new Date(data.timestamp));
      }

      return {
        id: d.id,
        userId: data.userId || 'system',
        userEmail: data.userEmail || data.userId || 'admin@syncsphere.io',
        action: data.action || 'SYSTEM_EVENT',
        module: data.module || 'System',
        targetId: data.targetId || undefined,
        timestamp,
        result: data.result === 'failure' ? 'failure' : data.result === 'warning' ? 'warning' : 'success',
        details: data.details,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch audit logs from Firestore:', err);
    return [];
  }
}

export async function fetchPlatformErrors(): Promise<PlatformErrorLog[]> {
  try {
    const colRef = collection(db, 'audit_logs');
    const q = query(colRef, where('result', '==', 'failure'), limit(10));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          code: data.action || 'EXCEPTION_LOG',
          path: data.module ? `/module/${data.module.toLowerCase()}` : '/system',
          count: 1,
          lastOccurred: data.timestamp ? 'Recently' : 'Just now',
          message: data.details || 'System operation failure recorded in audit log',
          stack: `Actor: ${data.userId || 'Anonymous'}\nTarget: ${data.targetId || 'N/A'}\nResult: Failed`,
          isRealData: true,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to query error audit logs:', err);
  }

  // Return empty array when no system failures are logged in Firestore
  return [];
}
