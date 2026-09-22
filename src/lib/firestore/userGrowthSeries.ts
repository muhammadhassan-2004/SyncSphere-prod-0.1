import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface MonthlyUserCount {
  month: string; // "2026-02"
  count: number;
}

export async function getUserGrowthSeries(monthsBack = 6): Promise<MonthlyUserCount[]> {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

    const q = query(
      collection(db, 'users'),
      where('createdAt', '>=', start.toISOString()),
      orderBy('createdAt', 'asc')
    );

    let snap;
    try {
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(collection(db, 'users'));
    }

    const buckets = new Map<string, number>();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawCreatedAt = data.createdAt;
      if (!rawCreatedAt) return;
      let d: Date;
      if (typeof rawCreatedAt === 'string') {
        d = new Date(rawCreatedAt);
      } else if (rawCreatedAt instanceof Timestamp) {
        d = rawCreatedAt.toDate();
      } else if (typeof rawCreatedAt?.toDate === 'function') {
        d = rawCreatedAt.toDate();
      } else {
        d = new Date(rawCreatedAt);
      }

      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    });

    return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
  } catch (err) {
    console.warn('Failed to fetch user growth series:', err);
    return [];
  }
}
