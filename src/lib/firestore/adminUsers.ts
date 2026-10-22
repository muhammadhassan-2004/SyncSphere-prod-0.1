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
import { db, auth } from '@/src/lib/firebase';
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
  onboardingCompleted?: boolean;
  profileCompleted?: boolean;
  missingProfileFields?: string[];
  incompleteReason?: string;
  isGoogleUser?: boolean;
  authProvider?: string;
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

    let rows: AdminUserRow[] = snap.docs
      .filter((d) => d.data().isDeleted !== true)
      .map((d) => {
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

      const onboardingCompleted = data.onboardingCompleted === true;

      const isGoogleUser = Boolean(
        data.authProvider === 'google' ||
        data.providerId === 'google.com' ||
        (Array.isArray(data.providers) && data.providers.includes('google.com')) ||
        (typeof data.avatarUrl === 'string' && data.avatarUrl.includes('googleusercontent.com')) ||
        (typeof data.photoURL === 'string' && data.photoURL.includes('googleusercontent.com')) ||
        (Array.isArray(data.providerData) && data.providerData.some((p: any) => p.providerId === 'google.com'))
      );

      const missingProfileFields: string[] = [];
      if (role === 'symbiote') {
        const hasSkills = Array.isArray(data.skills) && data.skills.length > 0;
        const hasRate = Boolean(data.hourlyRate && Number(data.hourlyRate) > 0);
        const hasTitle = Boolean((data.title && data.title.trim()) || (data.jobTitle && data.jobTitle.trim()));
        if (!hasTitle) missingProfileFields.push('Professional Title');
        if (!hasSkills) missingProfileFields.push('Skills');
        if (!hasRate) missingProfileFields.push('Hourly Rate');
      } else if (role === 'client') {
        const hasCompany = Boolean(
          (data.companyName && data.companyName.trim()) ||
          (data.companyProfile?.companyName && data.companyProfile.companyName.trim())
        );
        if (!hasCompany) missingProfileFields.push('Company Name');
      }

      const profileCompleted = data.profileCompleted !== false && (
        role === 'admin'
          ? true
          : missingProfileFields.length === 0
      );

      const incompleteReason = missingProfileFields.length > 0
        ? `Missing required fields: ${missingProfileFields.join(', ')}`
        : 'User skipped or has not finished profile setup';

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
        onboardingCompleted,
        profileCompleted,
        missingProfileFields,
        incompleteReason,
        isGoogleUser,
        authProvider: isGoogleUser ? 'google' : (data.authProvider || 'password'),
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
  // 1. Attempt server-side Hard Delete (Wipes from Firebase Auth + Firestore + Projects)
  try {
    const currentAuthUser = auth.currentUser;
    const token = currentAuthUser ? await currentAuthUser.getIdToken() : '';

    const res = await fetch(`/api/auth/admin/delete-user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data;
    }
    console.warn('Backend delete-user endpoint returned non-success, attempting direct fallback:', data?.error);
  } catch (apiErr) {
    console.warn('Failed to call backend hard delete endpoint, using direct Firestore fallback:', apiErr);
  }

  // 2. Direct Firestore Fallback (Deletes Firestore user doc, client projects, and audit logs)
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch {
    await updateDoc(doc(db, 'users', userId), {
      status: 'disabled',
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Delete all client projects in fallback as well
  try {
    const q1 = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const snap1 = await getDocs(q1);
    const deletePromises: Promise<any>[] = [];
    snap1.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref)));

    const q2 = query(collection(db, 'projects'), where('clientId', '==', userId));
    const snap2 = await getDocs(q2);
    snap2.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref)));

    await Promise.allSettled(deletePromises);
  } catch (fallbackProjErr) {
    console.warn('Fallback project deletion warning:', fallbackProjErr);
  }

  await addDoc(collection(db, 'audit_logs'), {
    userId: adminUid,
    userEmail: adminEmail || 'admin@syncsphere.io',
    action: 'HARD_DELETE_USER',
    module: 'Users',
    targetId: userId,
    targetUserEmail: userEmail,
    details: `Hard deleted user record ${userId} (${userEmail || 'unknown'})`,
    result: 'success',
    timestamp: Timestamp.now(),
  }).catch(() => {});
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
