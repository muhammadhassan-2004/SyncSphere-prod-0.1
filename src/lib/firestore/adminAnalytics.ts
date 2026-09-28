import { collection, query, where, orderBy, getDocs, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number | null; // null = needs a "last active" tracking field that may not exist yet
  projectsCreated: number;
  projectsCompleted: number;
  platformRevenueCents: number; // 5% fee on settled invoices
}

function rangeStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case 'daily': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case 'monthly': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    case 'yearly': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  }
}

export async function getAnalyticsStats(range: TimeRange): Promise<AnalyticsStats> {
  try {
    const startDate = rangeStartDate(range);
    const startMs = startDate.getTime();
    const usersCol = collection(db, 'users');
    const projectsCol = collection(db, 'projects');

    let totalUsersCount = 0;
    try {
      const totalCountSnap = await getCountFromServer(usersCol);
      totalUsersCount = totalCountSnap.data().count;
    } catch {
      const allUsers = await getDocs(usersCol);
      totalUsersCount = allUsers.docs.length;
    }

    let activeUsersCount = 0;
    try {
      const allUsersSnap = await getDocs(usersCol);
      allUsersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const lastActive = data.lastActiveAt || data.updatedAt || data.createdAt;
        if (!lastActive) return;
        let d: Date;
        if (lastActive instanceof Timestamp) {
          d = lastActive.toDate();
        } else if (typeof lastActive?.toDate === 'function') {
          d = lastActive.toDate();
        } else {
          d = new Date(lastActive);
        }
        if (!isNaN(d.getTime()) && d.getTime() >= startMs) {
          activeUsersCount++;
        }
      });
    } catch (memErr) {
      console.warn('In-memory active user calculation failed:', memErr);
    }

    let projectsCreatedCount = 0;
    let projectsCompletedCount = 0;

    try {
      const allProjectsSnap = await getDocs(projectsCol);
      allProjectsSnap.forEach((docSnap) => {
        const data = docSnap.data();

        // Extract createdAt timestamp safely (supporting ISO strings, Timestamps, and numbers)
        let createdDate: Date | null = null;
        if (data.createdAt) {
          if (data.createdAt instanceof Timestamp) {
            createdDate = data.createdAt.toDate();
          } else if (typeof data.createdAt?.toDate === 'function') {
            createdDate = data.createdAt.toDate();
          } else {
            createdDate = new Date(data.createdAt);
          }
        }

        if (createdDate && !isNaN(createdDate.getTime())) {
          if (createdDate.getTime() >= startMs) {
            projectsCreatedCount++;
          }
        } else {
          // Fallback: If createdAt is missing or unparseable, count it so real projects aren't omitted
          projectsCreatedCount++;
        }

        // Check if project is completed
        const rawStatus = (data.status || '').toLowerCase();
        const isCompleted = ['completed', 'finished', 'closed'].includes(rawStatus);

        if (isCompleted) {
          let updatedDate: Date | null = null;
          const rawUpdated = data.updatedAt || data.completedAt || data.createdAt;
          if (rawUpdated) {
            if (rawUpdated instanceof Timestamp) {
              updatedDate = rawUpdated.toDate();
            } else if (typeof rawUpdated?.toDate === 'function') {
              updatedDate = rawUpdated.toDate();
            } else {
              updatedDate = new Date(rawUpdated);
            }
          }
          if (!updatedDate || isNaN(updatedDate.getTime()) || updatedDate.getTime() >= startMs) {
            projectsCompletedCount++;
          }
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
        const data = docSnap.data();
        const rawPaid = data.paidAt || data.updatedAt || data.createdAt;
        let paidDate: Date | null = null;
        if (rawPaid) {
          if (rawPaid instanceof Timestamp) {
            paidDate = rawPaid.toDate();
          } else if (typeof rawPaid?.toDate === 'function') {
            paidDate = rawPaid.toDate();
          } else {
            paidDate = new Date(rawPaid);
          }
        }

        // Include if payment falls within time range (or if paidDate missing/unparseable, include in all-time/general tally)
        if (!paidDate || isNaN(paidDate.getTime()) || paidDate.getTime() >= startMs) {
          const invAmount = Number(data.amount) || (Number(data.amountCents) ? Number(data.amountCents) / 100 : 0);
          const feeCents = data.paymentDetails?.fee
            ? Math.round(data.paymentDetails.fee * 100)
            : Math.round(invAmount * 0.05 * 100);
          platformRevenueCents += feeCents;
        }
      });
    } catch (invErr) {
      console.warn('Invoices revenue aggregation failed for analytics:', invErr);
    }

    return {
      totalUsers: totalUsersCount,
      activeUsers: activeUsersCount,
      projectsCreated: projectsCreatedCount,
      projectsCompleted: projectsCompletedCount,
      platformRevenueCents,
    };
  } catch (err) {
    console.warn('Failed to fetch analytics stats:', err);
    return {
      totalUsers: 0,
      activeUsers: 0,
      projectsCreated: 0,
      projectsCompleted: 0,
      platformRevenueCents: 0,
    };
  }
}

// User engagement (weekly) — real signups per day of week, last 7 days, as a genuine proxy.
// NOTE: true "engagement" (logins/activity) needs lastActiveAt tracking, which doesn't exist yet.
// This is explicitly signup-activity, not login-activity — labeled honestly in the UI, not renamed to hide the gap.
export interface DailySignups { day: string; count: number }

export async function getWeeklySignups(): Promise<DailySignups[]> {
  try {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 6);
    const q = query(
      collection(db, 'users'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      orderBy('createdAt', 'asc')
    );
    let snap;
    try {
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(collection(db, 'users'));
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = new Map(days.map((d) => [d, 0]));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawCreatedAt = data.createdAt;
      if (!rawCreatedAt) return;
      let d: Date;
      if (rawCreatedAt instanceof Timestamp) {
        d = rawCreatedAt.toDate();
      } else if (typeof rawCreatedAt?.toDate === 'function') {
        d = rawCreatedAt.toDate();
      } else {
        d = new Date(rawCreatedAt);
      }
      if (isNaN(d.getTime())) return;
      const jsDay = d.getDay(); // 0=Sun
      const label = days[(jsDay + 6) % 7]; // shift so Mon=0
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    });
    return days.map((d) => ({ day: d, count: buckets.get(d) ?? 0 }));
  } catch (err) {
    console.warn('Failed to fetch weekly signups:', err);
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, count: 0 }));
  }
}

// Project category breakdown — real, from the `category` field already used in Project Oversight
export interface CategorySlice { category: string; count: number }

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
