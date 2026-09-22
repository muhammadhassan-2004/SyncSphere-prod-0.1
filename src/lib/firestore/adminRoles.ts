import { collection, getDocs, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { logAuditEvent } from './adminAuditLogs';

export interface AdminRoleDef {
  id: string;
  name: string;
  userCount: number; // NOTE: computed from users collection, not stored
  permissions: string[];
}

export const ALL_ADMIN_PERMISSIONS = [
  'manage_users',
  'manage_projects',
  'view_analytics',
  'view_audit_logs',
  'manage_platform_settings',
  'manage_roles',
  'view_financials',
  'system_health',
];

// userCount is derived live from the users collection so it can't drift.
export async function getAdminRoles(): Promise<AdminRoleDef[]> {
  try {
    const rolesSnap = await getDocs(collection(db, 'admin_roles'));
    const usersSnap = await getDocs(collection(db, 'users'));

    const counts = new Map<string, number>();
    usersSnap.forEach((u) => {
      const data = u.data();
      const roleId = data.adminRoleId || data.role;
      if (roleId) counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
    });

    if (rolesSnap.empty) {
      return [];
    }

    return rolesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name || 'Unnamed Role',
      permissions: d.data().permissions ?? [],
      userCount: counts.get(d.id) ?? 0,
    }));
  } catch (err) {
    console.warn('Failed to fetch admin roles from Firestore:', err);
    return [];
  }
}

export async function createAdminRole(name: string, permissions: string[], adminUid: string) {
  try {
    const ref = await addDoc(collection(db, 'admin_roles'), {
      name,
      permissions,
      createdAt: Timestamp.now(),
    });
    await logAuditEvent({
      userId: adminUid,
      action: 'CREATE_ROLE',
      module: 'Admin Settings',
      targetId: ref.id,
      result: 'success',
    });
    return ref.id;
  } catch (err) {
    console.error('Failed to create admin role:', err);
    throw err;
  }
}
