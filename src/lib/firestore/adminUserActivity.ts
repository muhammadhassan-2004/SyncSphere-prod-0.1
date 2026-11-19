import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface ProjectHistoryRow {
  id: string;
  title: string;
  roleOnProject: 'owner' | 'assigned_symbiote';
  status: string;
  budget: number | null;
  createdAt: string | null;
}

export interface ActivitySummary {
  activeProjectsCount: number;
  completedProjectsCount: number;
  proposalsSentCount: number | null; // SYMBIOTE-only
  applicationsReceivedCount: number | null; // CLIENT-only
  totalEarned: number | null; // SYMBIOTE paid invoice total; CLIENT = total spent
  avgRating: number | null;
  reviewsCount: number | null;
}

const ACTIVE_STATUSES = new Set([
  'active',
  'in_progress',
  'open',
  'in-progress',
  'assigned',
  'ongoing',
]);
const COMPLETED_STATUSES = new Set(['completed', 'finished', 'closed']);

function toIsoCreatedAt(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof (raw as { toDate?: () => Date })?.toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof raw === 'number') return new Date(raw).toISOString();
  return null;
}

async function getOwnedProjects(userId: string) {
  const [byOwnerId, byClientId, byClientUid] = await Promise.all([
    getDocs(query(collection(db, 'projects'), where('ownerId', '==', userId))),
    getDocs(query(collection(db, 'projects'), where('clientId', '==', userId))),
    getDocs(query(collection(db, 'projects'), where('clientUid', '==', userId))).catch(() => null),
  ]);
  const seen = new Map<string, any>();
  [...byOwnerId.docs, ...byClientId.docs, ...(byClientUid?.docs || [])].forEach((d) =>
    seen.set(d.id, { id: d.id, ...d.data() })
  );
  return Array.from(seen.values());
}

async function getAssignedProjects(userId: string) {
  const [byAssigned, bySymbioteId, byTeamUids] = await Promise.all([
    getDocs(query(collection(db, 'projects'), where('assignedSymbioteId', '==', userId))),
    getDocs(query(collection(db, 'projects'), where('symbioteId', '==', userId))),
    getDocs(query(collection(db, 'projects'), where('teamMemberUids', 'array-contains', userId))).catch(
      () => null
    ),
  ]);

  const direct = [
    ...byAssigned.docs,
    ...bySymbioteId.docs,
    ...(byTeamUids?.docs || []),
  ].map((d) => ({ id: d.id, ...d.data() }));

  // Legacy teamMembers object array (not queryable by nested uid)
  let viaTeamMembers: any[] = [];
  try {
    const allProjectsSnap = await getDocs(collection(db, 'projects'));
    viaTeamMembers = allProjectsSnap.docs
      .filter((d) => {
        const tm = d.data().teamMembers;
        return Array.isArray(tm) && tm.some((m: any) => m?.uid === userId);
      })
      .map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('teamMembers project scan failed:', err);
  }

  const seen = new Map<string, any>();
  [...direct, ...viaTeamMembers].forEach((p) => seen.set(p.id, p));
  return Array.from(seen.values());
}

export async function getProjectHistory(
  userId: string,
  userRole: 'client' | 'symbiote'
): Promise<ProjectHistoryRow[]> {
  const projects =
    userRole === 'client' ? await getOwnedProjects(userId) : await getAssignedProjects(userId);

  return projects
    .map((p) => ({
      id: p.id,
      title: p.title ?? 'Untitled Project',
      roleOnProject: (userRole === 'client' ? 'owner' : 'assigned_symbiote') as
        | 'owner'
        | 'assigned_symbiote',
      status: p.status ?? 'draft',
      budget: p.budget?.total ?? p.maxBudget ?? p.budget ?? null,
      createdAt: toIsoCreatedAt(p.createdAt),
    }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

async function sumPaidInvoiceAmount(
  field: 'symbioteId' | 'clientId',
  userId: string
): Promise<number> {
  try {
    const snap = await getDocs(query(collection(db, 'invoices'), where(field, '==', userId)));
    let total = 0;
    snap.forEach((d) => {
      const data = d.data() || {};
      const status = String(data.status || '').toLowerCase();
      if (status !== 'paid' && status !== 'completed') return;
      const amount =
        Number(data.amount) ||
        (Number(data.amountCents) ? Number(data.amountCents) / 100 : 0) ||
        0;
      total += amount;
    });
    return total;
  } catch (err) {
    console.warn('Invoice total aggregation failed:', err);
    return 0;
  }
}

export async function getActivitySummary(
  userId: string,
  userRole: 'client' | 'symbiote'
): Promise<ActivitySummary> {
  const projects =
    userRole === 'client' ? await getOwnedProjects(userId) : await getAssignedProjects(userId);

  const activeProjectsCount = projects.filter((p) =>
    ACTIVE_STATUSES.has(String(p.status || '').toLowerCase())
  ).length;
  const completedProjectsCount = projects.filter((p) =>
    COMPLETED_STATUSES.has(String(p.status || '').toLowerCase())
  ).length;

  let proposalsSentCount: number | null = null;
  let applicationsReceivedCount: number | null = null;

  if (userRole === 'symbiote') {
    try {
      const snap = await getDocs(
        query(collection(db, 'applications'), where('symbioteId', '==', userId))
      );
      proposalsSentCount = snap.size;
    } catch {
      proposalsSentCount = 0;
    }
  } else {
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < projectIds.length; i += 10) chunks.push(projectIds.slice(i, i + 10));
      try {
        const results = await Promise.all(
          chunks.map((chunk) =>
            getDocs(query(collection(db, 'applications'), where('projectId', 'in', chunk)))
          )
        );
        applicationsReceivedCount = results.reduce((sum, snap) => sum + snap.size, 0);
      } catch {
        applicationsReceivedCount = 0;
      }
    } else {
      applicationsReceivedCount = 0;
    }
  }

  const totalEarned =
    userRole === 'symbiote'
      ? await sumPaidInvoiceAmount('symbioteId', userId)
      : await sumPaidInvoiceAmount('clientId', userId);

  let avgRating: number | null = null;
  let reviewsCount: number | null = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const u = userSnap.data() || {};
      if (typeof u.rating === 'number' && u.rating > 0) avgRating = u.rating;
      if (typeof u.reviewsCount === 'number') reviewsCount = u.reviewsCount;
    }

    if (avgRating == null || reviewsCount == null) {
      const [byToUser, bySymbiote] = await Promise.all([
        getDocs(query(collection(db, 'reviews'), where('toUserId', '==', userId))).catch(() => null),
        getDocs(query(collection(db, 'reviews'), where('symbioteId', '==', userId))).catch(() => null),
      ]);
      const seen = new Map<string, any>();
      [...(byToUser?.docs || []), ...(bySymbiote?.docs || [])].forEach((d) =>
        seen.set(d.id, d.data())
      );
      const rows = Array.from(seen.values());
      if (rows.length > 0) {
        reviewsCount = rows.length;
        const sum = rows.reduce((acc, r) => {
          const score =
            r.ratings?.overall ?? (typeof r.rating === 'number' ? r.rating : null);
          return acc + (typeof score === 'number' ? score : 0);
        }, 0);
        const rated = rows.filter(
          (r) => typeof (r.ratings?.overall ?? r.rating) === 'number'
        ).length;
        avgRating = rated > 0 ? Number((sum / rated).toFixed(1)) : null;
      } else {
        reviewsCount = reviewsCount ?? 0;
      }
    }
  } catch (err) {
    console.warn('Rating aggregation failed:', err);
  }

  return {
    activeProjectsCount,
    completedProjectsCount,
    proposalsSentCount,
    applicationsReceivedCount,
    totalEarned,
    avgRating,
    reviewsCount,
  };
}

export interface UserActivityLog {
  id: string;
  action: string;
  module: string;
  details?: string;
  result: 'success' | 'failure' | 'warning';
  timestamp: string;
  actorEmail?: string;
  isActor: boolean;
}

export async function getUserRecentActivity(
  userId: string,
  userEmail?: string
): Promise<UserActivityLog[]> {
  try {
    const { auth } = await import('@/src/lib/firebase');
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to view user activity.');
    }

    const token = await currentUser.getIdToken();
    const params = new URLSearchParams();
    params.set('limit', '30');
    if (userEmail) params.set('email', userEmail);

    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/activity?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success || !Array.isArray(body.rows)) {
      throw new Error(body?.error || `Failed to load user activity (${res.status}).`);
    }

    return body.rows.map((row: any) => ({
      id: String(row.id),
      action: row.action || 'SYSTEM_EVENT',
      module: row.module || 'System',
      details: row.details || '',
      result:
        row.result === 'failure' ? 'failure' : row.result === 'warning' ? 'warning' : 'success',
      timestamp: row.timestamp || new Date(0).toISOString(),
      actorEmail: row.actorEmail,
      isActor: Boolean(row.isActor),
    })) as UserActivityLog[];
  } catch (err) {
    console.warn('Failed to fetch user recent activity:', err);
    return [];
  }
}
