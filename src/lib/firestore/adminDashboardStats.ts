import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface AdminDashboardStats {
  totalUsers: number;
  businessOwners: number;
  professionals: number;
  activeProjects: number;
  completedProjects: number;
  platformRevenueCents: number | null;
  pendingReports: number;
  activeSessions: number | null;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const usersCol = collection(db, 'users');
    const projectsCol = collection(db, 'projects');
    const reportsCol = collection(db, 'reports');

    const [
      totalUsersSnap,
      clientsSnap,
      symbiotesSnap,
      activeProjectsSnap,
      completedProjectsSnap,
      pendingReportsSnap,
    ] = await Promise.all([
      getCountFromServer(usersCol).catch(() => ({ data: () => ({ count: 0 }) })),
      getCountFromServer(query(usersCol, where('role', '==', 'client'))).catch(() => ({ data: () => ({ count: 0 }) })),
      getCountFromServer(query(usersCol, where('role', 'in', ['symbiote', 'freelancer']))).catch(() => ({ data: () => ({ count: 0 }) })),
      getCountFromServer(query(projectsCol, where('status', 'in', ['in_progress', 'active', 'open']))).catch(() => ({ data: () => ({ count: 0 }) })),
      getCountFromServer(query(projectsCol, where('status', '==', 'completed'))).catch(() => ({ data: () => ({ count: 0 }) })),
      getCountFromServer(query(reportsCol, where('status', '==', 'pending'))).catch(() => ({ data: () => ({ count: 0 }) })),
    ]);

    const statsResult: AdminDashboardStats = {
      totalUsers: totalUsersSnap.data().count,
      businessOwners: clientsSnap.data().count,
      professionals: symbiotesSnap.data().count,
      activeProjects: activeProjectsSnap.data().count,
      completedProjects: completedProjectsSnap.data().count,
      platformRevenueCents: null,
      pendingReports: pendingReportsSnap.data().count,
      activeSessions: null,
    };

    console.log('[AdminStats] Fetched live admin dashboard stats:', statsResult);
    return statsResult;
  } catch (err) {
    console.warn('Failed to fetch admin stats via count server, falling back to document listing:', err);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const projectsSnap = await getDocs(collection(db, 'projects'));

      const users = usersSnap.docs.map((d) => d.data());
      const projects = projectsSnap.docs.map((d) => d.data());

      return {
        totalUsers: users.length,
        businessOwners: users.filter((u) => u.role === 'client').length,
        professionals: users.filter((u) => u.role === 'symbiote' || u.role === 'freelancer').length,
        activeProjects: projects.filter((p) => ['in_progress', 'active', 'open'].includes(p.status)).length,
        completedProjects: projects.filter((p) => p.status === 'completed').length,
        platformRevenueCents: null,
        pendingReports: 0,
        activeSessions: null,
      };
    } catch (fallbackErr) {
      console.warn('Admin stats fallback warning:', fallbackErr);
      return {
        totalUsers: 0,
        businessOwners: 0,
        professionals: 0,
        activeProjects: 0,
        completedProjects: 0,
        platformRevenueCents: null,
        pendingReports: 0,
        activeSessions: null,
      };
    }
  }
}
