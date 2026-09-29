import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db } from '@/src/lib/firebase';
import firebaseConfig from '@/firebase-applet-config.json';

export interface AdminUserRow {
  id: string;
  userIdLabel: string;
  name: string;
  email: string;
  role: 'client' | 'symbiote' | 'admin';
  status: 'active' | 'suspended' | 'disabled';
  registeredAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
  avatarInitials: string;
  avatarUrl?: string;
}

export interface CreateAdminUserParams {
  email: string;
  password: string;
  displayName: string;
  role: 'client' | 'symbiote' | 'admin';
  companyName?: string;
  title?: string;
  adminUid: string;
  adminEmail?: string;
}

export interface UserFilters {
  role?: AdminUserRow['role'];
  status?: AdminUserRow['status'] | 'inactive';
  search?: string;
}

const PAGE_SIZE = 20;

function parseTimestamp(val: any): Timestamp | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val;
  if (typeof val?.toDate === 'function') {
    try {
      return Timestamp.fromDate(val.toDate());
    } catch {
      // ignore error
    }
  }
  if (typeof val?.seconds === 'number') {
    return new Timestamp(val.seconds, val.nanoseconds || 0);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
  }
  return null;
}

export async function getUsersPage(
  filters: UserFilters,
  cursor?: QueryDocumentSnapshot
): Promise<{ rows: AdminUserRow[]; nextCursor: QueryDocumentSnapshot | null; hasMore: boolean }> {
  try {
    const hasSearch = Boolean(filters.search && filters.search.trim());
    let snap;
    try {
      const constraints: any[] = [];
      if (filters.role) constraints.push(where('role', '==', filters.role));
      if (filters.status) constraints.push(where('status', '==', filters.status));

      const q = constraints.length > 0 ? query(collection(db, 'users'), ...constraints) : collection(db, 'users');
      snap = await getDocs(q);
    } catch {
      // Fallback query if constraints fail
      snap = await getDocs(collection(db, 'users'));
    }

    let rows: AdminUserRow[] = snap.docs.map((d) => {
      const data = d.data();
      const name =
        data.displayName ||
        data.name ||
        (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : '') ||
        '—';
      const email = data.email || '—';
      const role = data.role === 'freelancer' ? 'symbiote' : (data.role || 'client');
      const status = data.status === 'suspended' || data.status === 'disabled' || data.status === 'inactive' ? 'suspended' : 'active';

      // Fall back to updatedAt or lastActiveAt if createdAt is missing on legacy/OAuth docs
      const registeredAt = parseTimestamp(data.createdAt || data.updatedAt || data.lastActiveAt);
      const lastLoginAt = parseTimestamp(data.lastActiveAt || data.lastLoginAt || data.updatedAt);

      const avatarInitials = (name === '—' ? 'SS' : name)
        .split(' ')
        .filter(Boolean)
        .map((s: string) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const avatarUrl = data.avatarUrl || data.photoURL || '';

      return {
        id: d.id,
        userIdLabel: `USR-${d.id.slice(0, 6).toUpperCase()}`,
        name,
        email,
        role: role as 'client' | 'symbiote' | 'admin',
        status: status as 'active' | 'suspended' | 'disabled',
        registeredAt,
        lastLoginAt,
        avatarInitials: avatarInitials || 'SS',
        avatarUrl: avatarUrl || undefined,
      };
    });

    if (hasSearch) {
      const q2 = filters.search!.trim().toLowerCase();
      rows = rows.filter((r) => {
        const displayRole = r.role === 'symbiote' ? 'freelancer symbiote' : r.role;
        return (
          r.name.toLowerCase().includes(q2) ||
          r.email.toLowerCase().includes(q2) ||
          r.role.toLowerCase().includes(q2) ||
          displayRole.toLowerCase().includes(q2)
        );
      });
    }

    if (filters.role) {
      rows = rows.filter((r) => r.role === filters.role);
    }

    if (filters.status) {
      if (filters.status === 'active') {
        rows = rows.filter((r) => r.status === 'active');
      } else if (filters.status === 'inactive') {
        rows = rows.filter((r) => r.status !== 'active');
      }
    }

    // Explicit in-memory sorting fallback by registration date descending
    rows.sort((a, b) => {
      const timeAInt = a.registeredAt?.toMillis() ?? 0;
      const timeBInt = b.registeredAt?.toMillis() ?? 0;
      return timeBInt - timeAInt;
    });

    return {
      rows,
      nextCursor: snap.docs.at(-1) ?? null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    console.warn('Failed to get users page:', err);
    return { rows: [], nextCursor: null, hasMore: false };
  }
}

export async function getUserById(userId: string) {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended' | 'disabled', adminUid: string) {
  await updateDoc(doc(db, 'users', userId), {
    status,
    statusUpdatedAt: Timestamp.now(),
    statusUpdatedBy: adminUid,
  });
  await logAdminAction(adminUid, status === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER', 'Users', userId);
}

export async function createAdminUser(params: CreateAdminUserParams): Promise<{ uid: string; email: string }> {
  const { email, password, displayName, role, companyName, title, adminUid, adminEmail } = params;

  // Use an isolated secondary FirebaseApp instance to prevent signing out the current admin
  const secondaryAppName = `admin-create-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const newUid = cred.user.uid;

    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    const nowIso = new Date().toISOString();
    const userDocData: Record<string, any> = {
      uid: newUid,
      email: email.trim(),
      displayName: displayName.trim() || email.split('@')[0],
      role,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      twoFactorEnabled: false,
      verified: true,
    };

    if (role === 'client' && companyName?.trim()) {
      userDocData.companyName = companyName.trim();
    }
    if (role === 'symbiote') {
      userDocData.title = title?.trim() || 'AI Specialist';
      userDocData.skills = ['AI Consulting', 'Prompt Engineering', 'Full-Stack Development'];
      userDocData.hourlyRate = 120;
      userDocData.rating = 0;
      userDocData.reviewsCount = 0;
      userDocData.completedProjects = 0;
    }

    // Write Firestore user document
    await setDoc(doc(db, 'users', newUid), userDocData);

    // Record formal audit event
    await addDoc(collection(db, 'audit_logs'), {
      userId: adminUid,
      userEmail: adminEmail || 'admin@syncsphere.io',
      action: 'CREATE_USER',
      module: 'Users',
      targetId: newUid,
      targetUserEmail: email.trim(),
      details: `Admin created ${role.toUpperCase()} account for ${displayName.trim() || email.trim()} (${email.trim()})`,
      result: 'success',
      timestamp: Timestamp.now(),
    });

    return { uid: newUid, email: email.trim() };
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function deleteAdminUser(
  userId: string,
  adminUid: string,
  adminEmail?: string,
  userEmail?: string
) {
  await deleteDoc(doc(db, 'users', userId));
  await addDoc(collection(db, 'audit_logs'), {
    userId: adminUid,
    userEmail: adminEmail || 'admin@syncsphere.io',
    action: 'DELETE_USER',
    module: 'Users',
    targetId: userId,
    targetUserEmail: userEmail,
    details: `Deleted user record ${userId} (${userEmail || 'unknown'})`,
    result: 'success',
    timestamp: Timestamp.now(),
  });
}

async function logAdminAction(adminUid: string, action: string, module: string, targetId: string) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId: adminUid,
      action,
      module,
      targetId,
      timestamp: Timestamp.now(),
      result: 'success',
    });
  } catch (e) {
    console.warn('Failed to write audit log:', e);
  }
}
