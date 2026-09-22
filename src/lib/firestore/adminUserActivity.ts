import { collection, query, where, getDocs } from 'firebase/firestore';
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
  proposalsSentCount: number | null;   // SYMBIOTE-only — null if user is CLIENT
  applicationsReceivedCount: number | null; // CLIENT-only — applications on their projects
  totalEarned: null;   // honestly not tracked — no confirmed earnings/invoice source yet
  avgRating: null;     // honestly not tracked — no confirmed reviews collection schema yet
  reviewsCount: null;  // same as above
}

// Fetches projects where this user is the CLIENT owner (checks both ownerId and clientId,
// since the real data shows both fields are used inconsistently across documents).
async function getOwnedProjects(userId: string) {
  const [byOwnerId, byClientId] = await Promise.all([
    getDocs(query(collection(db, 'projects'), where('ownerId', '==', userId))),
    getDocs(query(collection(db, 'projects'), where('clientId', '==', userId))),
  ]);
  const seen = new Map<string, any>();
  [...byOwnerId.docs, ...byClientId.docs].forEach((d) => seen.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(seen.values());
}

// Fetches projects where this user is the assigned SYMBIOTE.
// Reliably covers assignedSymbioteId (single-assignment, indexed query).
// For teamMembers (multi-assignment array), this does a client-side scan since Firestore
// can't query "array contains object with field X == Y" directly — flagged as a scale
// limitation, fine at current data volumes.
async function getAssignedProjects(userId: string) {
  const bySingleAssignment = await getDocs(
    query(collection(db, 'projects'), where('assignedSymbioteId', '==', userId))
  );
  const direct = bySingleAssignment.docs.map((d) => ({ id: d.id, ...d.data() }));

  const allProjectsSnap = await getDocs(collection(db, 'projects'));
  const viaTeamMembers = allProjectsSnap.docs
    .filter((d) => {
      const tm = d.data().teamMembers;
      return Array.isArray(tm) && tm.some((m: any) => m?.uid === userId);
    })
    .map((d) => ({ id: d.id, ...d.data() }));

  const seen = new Map<string, any>();
  [...direct, ...viaTeamMembers].forEach((p) => seen.set(p.id, p));
  return Array.from(seen.values());
}

export async function getProjectHistory(userId: string, userRole: 'client' | 'symbiote'): Promise<ProjectHistoryRow[]> {
  const projects = userRole === 'client'
    ? await getOwnedProjects(userId)
    : await getAssignedProjects(userId);

  return projects.map((p) => ({
    id: p.id,
    title: p.title ?? 'Untitled Project',
    roleOnProject: (userRole === 'client' ? 'owner' : 'assigned_symbiote') as 'owner' | 'assigned_symbiote',
    status: p.status ?? 'draft',
    budget: p.budget?.total ?? p.maxBudget ?? null,
    createdAt: p.createdAt ?? null,
  })).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getActivitySummary(userId: string, userRole: 'client' | 'symbiote'): Promise<ActivitySummary> {
  const projects = userRole === 'client'
    ? await getOwnedProjects(userId)
    : await getAssignedProjects(userId);

  const activeStatuses = new Set(['active', 'in_progress', 'open']);
  const completedStatuses = new Set(['completed']);

  const activeProjectsCount = projects.filter((p) => activeStatuses.has(p.status)).length;
  const completedProjectsCount = projects.filter((p) => completedStatuses.has(p.status)).length;

  let proposalsSentCount: number | null = null;
  let applicationsReceivedCount: number | null = null;

  if (userRole === 'symbiote') {
    const snap = await getDocs(query(collection(db, 'applications'), where('symbioteId', '==', userId)));
    proposalsSentCount = snap.size;
  } else {
    // Applications received across all of this client's projects
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      // Firestore 'in' supports max 10 — chunk if needed
      const chunks: string[][] = [];
      for (let i = 0; i < projectIds.length; i += 10) chunks.push(projectIds.slice(i, i + 10));
      const results = await Promise.all(
        chunks.map((chunk) => getDocs(query(collection(db, 'applications'), where('projectId', 'in', chunk))))
      );
      applicationsReceivedCount = results.reduce((sum, snap) => sum + snap.size, 0);
    } else {
      applicationsReceivedCount = 0;
    }
  }

  return {
    activeProjectsCount,
    completedProjectsCount,
    proposalsSentCount,
    applicationsReceivedCount,
    totalEarned: null,  // no confirmed invoices/payments schema — not fabricating a number
    avgRating: null,    // no confirmed reviews collection schema — not fabricating a number
    reviewsCount: null,
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

export async function getUserRecentActivity(userId: string, userEmail?: string): Promise<UserActivityLog[]> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const targetEmailLower = (userEmail || '').toLowerCase().trim();

    const logs: UserActivityLog[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const docUserId = data.userId || data.actorId;
      const docUserEmail = (data.userEmail || data.actorEmail || '').toLowerCase().trim();
      const docTargetId = data.targetId;
      const docTargetEmail = (data.targetUserEmail || '').toLowerCase().trim();
      const docDetails = (data.details || '').toLowerCase();

      const isActor = docUserId === userId || (targetEmailLower && docUserEmail === targetEmailLower);
      const isTarget =
        docTargetId === userId ||
        (targetEmailLower && (docTargetEmail === targetEmailLower || docDetails.includes(targetEmailLower)));

      if (isActor || isTarget) {
        let tsStr = new Date().toISOString();
        if (data.timestamp) {
          if (typeof data.timestamp.toDate === 'function') {
            tsStr = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
            tsStr = data.timestamp;
          } else if (typeof data.timestamp === 'number') {
            tsStr = new Date(data.timestamp).toISOString();
          }
        }

        logs.push({
          id: d.id,
          action: data.action || 'SYSTEM_EVENT',
          module: data.module || 'System',
          details: data.details || '',
          result: data.result === 'failure' ? 'failure' : data.result === 'warning' ? 'warning' : 'success',
          timestamp: tsStr,
          actorEmail: data.userEmail || data.actorEmail,
          isActor: Boolean(isActor),
        });
      }
    });

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, 20);
  } catch (err) {
    console.warn('Failed to fetch user recent activity from audit_logs:', err);
    return [];
  }
}
