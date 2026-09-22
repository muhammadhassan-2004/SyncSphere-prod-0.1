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

export interface ProjectOversightRow {
  id: string;
  projectIdLabel: string; // "PRJ-2041" style
  name: string;
  businessOwnerName: string;
  professionalNames: string[]; // for avatar stack
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
  if (!data) return 'Negotiable';

  // If string, return formatted
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return 'Negotiable';
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

  return 'Negotiable';
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

    // Resolve owner user profiles to get real company / business owner names
    const ownerIds = Array.from(
      new Set(snap.docs.map((d) => d.data().ownerId || d.data().clientId).filter(Boolean))
    ) as string[];

    const userMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      await Promise.all(
        ownerIds.map(async (uid) => {
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
              if (cName) {
                userMap.set(uid, cName);
              }
            }
          } catch (e) {
            console.warn('Failed to lookup user doc for project owner:', uid, e);
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

      // Professional Names extraction
      let professionalNames: string[] = [];
      if (Array.isArray(data.teamMemberNames)) {
        professionalNames = data.teamMemberNames;
      } else if (Array.isArray(data.assignedToNames)) {
        professionalNames = data.assignedToNames;
      } else if (Array.isArray(data.teamMembers)) {
        professionalNames = data.teamMembers.map((m: any) => m.displayName || m.name || 'Pro');
      } else if (Array.isArray(data.professionals)) {
        professionalNames = data.professionals.map((p: any) => (typeof p === 'string' ? p : p?.name || 'Pro'));
      } else if (data.assignedTo) {
        professionalNames = [typeof data.assignedTo === 'string' ? data.assignedTo : data.assignedTo?.name || 'Pro'];
      }

      const ownerUid = data.ownerId || data.clientId;
      const businessOwnerName =
        data.companyName ||
        data.clientName ||
        data.ownerName ||
        data.createdByName ||
        (ownerUid ? userMap.get(ownerUid) : null) ||
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

