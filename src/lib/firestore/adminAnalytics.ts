import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AnalyticsStats {
  /** All-time registered users (not affected by period filter). */
  totalUsers: number;
  /** Users whose createdAt falls inside the selected period. */
  newUsers: number;
  /** Users whose lastActiveAt falls inside the selected period. */
  activeUsers: number;
  projectsCreated: number;
  projectsCompleted: number;
  platformRevenueCents: number; // 5% fee on settled invoices
}

function rangeStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case 'monthly': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case 'yearly': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }
}

function parseFlexibleDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof (raw as { toDate?: () => Date })?.toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate();
  }
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? null : d;
}

export async function getAnalyticsStats(range: TimeRange): Promise<AnalyticsStats> {
  const empty: AnalyticsStats = {
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    projectsCreated: 0,
    projectsCompleted: 0,
    platformRevenueCents: 0,
  };

  try {
    const startMs = rangeStartDate(range).getTime();
    const usersCol = collection(db, 'users');
    const projectsCol = collection(db, 'projects');

    const usersSnap = await getDocs(usersCol);
    let newUsersCount = 0;
    let activeUsersCount = 0;

    usersSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};

      const created = parseFlexibleDate(data.createdAt);
      if (created && created.getTime() >= startMs) {
        newUsersCount++;
      }

      // Active = real session activity only. Do not fall back to createdAt/updatedAt.
      const lastActive = parseFlexibleDate(data.lastActiveAt);
      if (lastActive && lastActive.getTime() >= startMs) {
        activeUsersCount++;
      }
    });

    let projectsCreatedCount = 0;
    let projectsCompletedCount = 0;

    try {
      const allProjectsSnap = await getDocs(projectsCol);
      allProjectsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const createdDate = parseFlexibleDate(data.createdAt);
        if (createdDate && createdDate.getTime() >= startMs) {
          projectsCreatedCount++;
        }

        const rawStatus = String(data.status || '').toLowerCase();
        const isCompleted = ['completed', 'finished', 'closed'].includes(rawStatus);
        if (!isCompleted) return;

        const completedDate = parseFlexibleDate(data.completedAt || data.updatedAt);
        if (completedDate && completedDate.getTime() >= startMs) {
          projectsCompletedCount++;
        }
      });
    } catch (projErr) {
      console.warn('Project aggregation failed:', projErr);
    }

    let platformRevenueCents = 0;
    try {
      const invoicesCol = collection(db, 'invoices');
      const paidInvoicesSnap = await getDocs(query(invoicesCol, where('status', '==', 'paid')));
      paidInvoicesSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const paidDate = parseFlexibleDate(data.paidAt || data.updatedAt);
        if (!paidDate || paidDate.getTime() < startMs) return;

        const invAmount =
          Number(data.amount) || (Number(data.amountCents) ? Number(data.amountCents) / 100 : 0);
        const feeCents = data.paymentDetails?.fee
          ? Math.round(data.paymentDetails.fee * 100)
          : Math.round(invAmount * 0.05 * 100);
        platformRevenueCents += feeCents;
      });
    } catch (invErr) {
      console.warn('Invoices revenue aggregation failed for analytics:', invErr);
    }

    return {
      totalUsers: usersSnap.size,
      newUsers: newUsersCount,
      activeUsers: activeUsersCount,
      projectsCreated: projectsCreatedCount,
      projectsCompleted: projectsCompletedCount,
      platformRevenueCents,
    };
  } catch (err) {
    console.warn('Failed to fetch analytics stats:', err);
    return empty;
  }
}

// User engagement (weekly) — real signups per day of week, last 7 days.
export interface DailySignups {
  day: string;
  count: number;
}

export async function getWeeklySignups(): Promise<DailySignups[]> {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const empty = () => dayLabels.map((day) => ({ day, count: 0 }));

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 6);
    const startMs = start.getTime();

    // createdAt is stored as ISO strings for most users — Timestamp inequality returns 0 matches.
    const snap = await getDocs(collection(db, 'users'));
    const buckets = new Map(dayLabels.map((d) => [d, 0]));

    snap.forEach((docSnap) => {
      const d = parseFlexibleDate(docSnap.data()?.createdAt);
      if (!d || d.getTime() < startMs) return;
      const label = dayLabels[(d.getDay() + 6) % 7];
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    });

    return dayLabels.map((day) => ({ day, count: buckets.get(day) ?? 0 }));
  } catch (err) {
    console.warn('Failed to fetch weekly signups:', err);
    return empty();
  }
}

export interface CategorySlice {
  category: string;
  count: number;
}

export async function getProjectCategoryBreakdown(): Promise<CategorySlice[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    const buckets = new Map<string, number>();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const cat = data.category || data.industry || 'Uncategorized';
      buckets.set(cat, (buckets.get(cat) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([category, count]) => ({ category, count }));
  } catch (err) {
    console.warn('Failed to fetch project category breakdown:', err);
    return [];
  }
}
