import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  type QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export type ProjectOversightStatus = 'active' | 'completed' | 'in_review' | 'suspended';

export interface ProjectProfessional {
  uid?: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface ProjectOversightRow {
  id: string;
  projectIdLabel: string; // "PRJ-2041" style
  name: string;
  businessOwnerName: string;
  professionalNames: string[]; // for avatar stack
  professionals: ProjectProfessional[]; // with real avatarUrl & role
  budgetDisplay: string; // e.g. "$10,000 - $15,000"
  budget: number | null;
  previousBudget: number | null; // for strikethrough-revised-budget display
  status: ProjectOversightStatus;
  category: string | null;
  createdAt: Timestamp | null;
  rawProject?: any;
}

export interface ProjectOversightFilters {
  status?: ProjectOversightStatus; // undefined = "All"
  search?: string;
  category?: string;
}

const PAGE_SIZE = 20;

const statusRawValues: Record<ProjectOversightStatus, string[]> = {
  active: ['active', 'in_progress', 'open', 'published', 'draft'],
  in_review: ['in_review', 'review', 'under_review', 'pending'],
  completed: ['completed', 'finished', 'closed'],
  suspended: ['suspended', 'paused', 'cancelled', 'canceled', 'disabled'],
};

export function formatProjectBudget(data: any): string {
  if (!data) return 'Dynamic Per-Task';

  // If project has tracked cumulative spend from approved tasks
  if (data.totalSpent != null && !isNaN(Number(data.totalSpent))) {
    const spent = Number(data.totalSpent);
    return `$${spent.toLocaleString()} spent`;
  }

  // If string, return formatted
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return 'Dynamic Per-Task';
    return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
  }

  // If number, format directly as currency
  if (typeof data === 'number') {
    return `$${data.toLocaleString()}`;
  }

  // If object has explicit budgetRange string
  if (typeof data.budgetRange === 'string' && data.budgetRange.trim()) {
    return data.budgetRange;
  }

  // Extract min and max from possible field names
  const min = data.minBudget ?? data.min ?? data.budgetMin ?? data.budget?.minBudget ?? data.budget?.min ?? data.budget?.budgetMin;
  const max = data.maxBudget ?? data.max ?? data.budgetMax ?? data.budget?.maxBudget ?? data.budget?.max ?? data.budget?.budgetMax;

  if (typeof min === 'number' && typeof max === 'number') {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }
  if (typeof min === 'number') {
    return `From $${min.toLocaleString()}`;
  }
  if (typeof max === 'number') {
    return `Up to $${max.toLocaleString()}`;
  }

  // Check nested budget object properties
  if (data.budget && typeof data.budget === 'object') {
    if (typeof data.budget.total === 'number') {
      return `$${data.budget.total.toLocaleString()}`;
    }
    if (typeof data.budget.amount === 'number') {
      return `$${data.budget.amount.toLocaleString()}`;
    }
  }

  if (typeof data.total === 'number') {
    return `$${data.total.toLocaleString()}`;
  }
  if (typeof data.amount === 'number') {
    return `$${data.amount.toLocaleString()}`;
  }

  if (typeof data.budget === 'number') {
    return `$${data.budget.toLocaleString()}`;
  }
  if (typeof data.price === 'number') {
    return `$${data.price.toLocaleString()}`;
  }
  if (typeof data.budget === 'string' && data.budget.trim()) {
    return data.budget.startsWith('$') ? data.budget : `$${data.budget}`;
  }

  return 'Dynamic Per-Task';
}

export async function getProjectsPage(
  filters: ProjectOversightFilters,
  cursor?: QueryDocumentSnapshot
): Promise<{ rows: ProjectOversightRow[]; nextCursor: QueryDocumentSnapshot | null; hasMore: boolean }> {
  try {
    const constraints: any[] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];

    if (filters.status) {
      constraints.unshift(where('status', 'in', statusRawValues[filters.status]));
    }
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }
    if (cursor) {
      constraints.push(startAfter(cursor));
    }

    let snap;
    try {
      const q = query(collection(db, 'projects'), ...constraints);
      snap = await getDocs(q);
    } catch (err) {
      console.warn('Query with constraints failed, falling back to basic getDocs:', err);
      // Fallback query without specific index or ordering constraints
      snap = await getDocs(collection(db, 'projects'));
    }

    // Resolve owner & professional user profiles from Firestore
    const ownerIds = Array.from(
      new Set(snap.docs.map((d) => d.data().ownerId || d.data().clientId).filter(Boolean))
    ) as string[];

    const proIds = Array.from(
      new Set(
        snap.docs.flatMap((d) => {
          const data = d.data();
          const ids: string[] = [];
          if (data.assignedSymbioteId) ids.push(data.assignedSymbioteId);
          if (data.symbioteId) ids.push(data.symbioteId);
          if (Array.isArray(data.teamMembers)) {
            data.teamMembers.forEach((m: any) => {
              if (m?.uid) ids.push(m.uid);
              if (m?.id) ids.push(m.id);
            });
          }
          if (typeof data.assignedTo === 'string' && data.assignedTo.length > 15) {
            ids.push(data.assignedTo);
          } else if (data.assignedTo?.uid || data.assignedTo?.id) {
            ids.push(data.assignedTo.uid || data.assignedTo.id);
          }
          return ids;
        }).filter(Boolean)
      )
    ) as string[];

    const allLookupUids = Array.from(new Set([...ownerIds, ...proIds]));
    const userProfileMap = new Map<string, { name: string; avatarUrl?: string; companyName?: string }>();

    if (allLookupUids.length > 0) {
      await Promise.all(
        allLookupUids.map(async (uid) => {
          try {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              const cName =
                uData.companyName ||
                uData.companyProfile?.companyName ||
                uData.displayName ||
                uData.fullName ||
                (uData.firstName ? `${uData.firstName} ${uData.lastName || ''}`.trim() : null);
              const pName =
                uData.displayName ||
                uData.fullName ||
                (uData.firstName ? `${uData.firstName} ${uData.lastName || ''}`.trim() : null) ||
                uData.email?.split('@')[0] ||
                'User';
              const avatar = uData.avatarUrl || uData.photoURL || undefined;

              userProfileMap.set(uid, {
                name: pName,
                avatarUrl: avatar,
                companyName: cName || undefined,
              });
            }
          } catch (e) {
            console.warn('Failed to lookup user doc for admin projects:', uid, e);
          }
        })
      );
    }

    let rows: ProjectOversightRow[] = snap.docs.map((d) => {
      const data = d.data();

      // Normalize status string to UI type
      const rawStatus = (data.status || 'active').toLowerCase();
      let normalizedStatus: ProjectOversightStatus = 'active';
      if (['completed', 'finished', 'closed'].includes(rawStatus)) {
        normalizedStatus = 'completed';
      } else if (['in_review', 'review', 'under_review', 'pending'].includes(rawStatus)) {
        normalizedStatus = 'in_review';
      } else if (['suspended', 'paused', 'cancelled', 'canceled', 'disabled'].includes(rawStatus)) {
        normalizedStatus = 'suspended';
      }

      // Format createdAt Timestamp
      let createdAt: Timestamp | null = null;
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt;
        } else if (typeof data.createdAt?.toDate === 'function') {
          createdAt = data.createdAt;
        } else if (typeof data.createdAt === 'string') {
          createdAt = Timestamp.fromDate(new Date(data.createdAt));
        }
      }

      // Professional Profiles extraction with avatarUrl
      const professionals: ProjectProfessional[] = [];

      if (Array.isArray(data.teamMembers) && data.teamMembers.length > 0) {
        data.teamMembers.forEach((m: any) => {
          const profile = m?.uid ? userProfileMap.get(m.uid) : null;
          professionals.push({
            uid: m?.uid,
            name: m.displayName || m.name || profile?.name || 'Pro',
            avatarUrl: m.avatarUrl || profile?.avatarUrl,
            role: m.role || 'Team Member',
          });
        });
      } else if (data.assignedSymbioteId || data.symbioteId) {
        const sUid = data.assignedSymbioteId || data.symbioteId;
        const profile = userProfileMap.get(sUid);
        professionals.push({
          uid: sUid,
          name: data.assignedSymbioteName || profile?.name || 'Freelancer',
          avatarUrl: data.assignedSymbioteAvatarUrl || profile?.avatarUrl,
          role: 'Assigned Freelancer',
        });
      } else if (Array.isArray(data.teamMemberNames) && data.teamMemberNames.length > 0) {
        data.teamMemberNames.forEach((nameStr: string) => {
          professionals.push({ name: nameStr });
        });
      } else if (Array.isArray(data.assignedToNames) && data.assignedToNames.length > 0) {
        data.assignedToNames.forEach((nameStr: string) => {
          professionals.push({ name: nameStr });
        });
      } else if (Array.isArray(data.professionals) && data.professionals.length > 0) {
        data.professionals.forEach((p: any) => {
          if (typeof p === 'string') {
            professionals.push({ name: p });
          } else {
            const profile = p.uid ? userProfileMap.get(p.uid) : null;
            professionals.push({
              uid: p.uid,
              name: p.name || profile?.name || 'Pro',
              avatarUrl: p.avatarUrl || profile?.avatarUrl,
              role: p.role,
            });
          }
        });
      } else if (data.assignedTo) {
        if (typeof data.assignedTo === 'string') {
          const profile = userProfileMap.get(data.assignedTo);
          professionals.push({
            uid: data.assignedTo,
            name: profile?.name || data.assignedTo,
            avatarUrl: profile?.avatarUrl,
          });
        } else {
          const proUid = data.assignedTo.uid || data.assignedTo.id;
          const profile = proUid ? userProfileMap.get(proUid) : null;
          professionals.push({
            uid: proUid,
            name: data.assignedTo.name || profile?.name || 'Pro',
            avatarUrl: data.assignedTo.avatarUrl || profile?.avatarUrl,
            role: data.assignedTo.role,
          });
        }
      }

      const professionalNames = professionals.map((p) => p.name);

      const ownerUid = data.ownerId || data.clientId;
      const ownerProfile = ownerUid ? userProfileMap.get(ownerUid) : null;
      const businessOwnerName =
        data.companyName ||
        data.clientName ||
        data.ownerName ||
        data.createdByName ||
        ownerProfile?.companyName ||
        ownerProfile?.name ||
        'Client';

      const budgetDisplay = formatProjectBudget(data);
      const numericBudget =
        typeof data.budget === 'number'
          ? data.budget
          : typeof data.minBudget === 'number'
          ? data.minBudget
          : typeof data.price === 'number'
          ? data.price
          : null;

      return {
        id: d.id,
        projectIdLabel: `PRJ-${d.id.slice(0, 4).toUpperCase()}`,
        name: data.title || data.name || 'Untitled Project',
        businessOwnerName,
        professionalNames,
        professionals,
        budgetDisplay,
        budget: numericBudget,
        previousBudget: typeof data.originalBudget === 'number' ? data.originalBudget : null,
        status: normalizedStatus,
        category: data.category || data.industry || data.domain || null,
        createdAt,
        rawProject: { id: d.id, ...data, businessOwnerName, budgetDisplay },
      };
    });

    // Client-side filtering as safety net
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }

    if (filters.category) {
      rows = rows.filter((r) => r.category?.toLowerCase() === filters.category?.toLowerCase());
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.businessOwnerName.toLowerCase().includes(s) ||
          r.projectIdLabel.toLowerCase().includes(s)
      );
    }

    // Explicit in-memory sorting fallback by project createdAt descending
    rows.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() ?? 0;
      const timeB = b.createdAt?.toMillis() ?? 0;
      return timeB - timeA;
    });

    return {
      rows,
      nextCursor: snap.docs.at(-1) ?? null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    console.error('Failed to get projects page:', err);
    return { rows: [], nextCursor: null, hasMore: false };
  }
}

