import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface AdminDashboardStats {
  totalUsers: number;
  businessOwners: number;
  professionals: number;
  activeProjects: number;
  completedProjects: number;
  platformRevenueCents: number;
  pendingReports: number;
  activeSessions: number;
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

    const invoicesCol = collection(db, 'invoices');
    let platformRevenueCents = 0;
    try {
      const paidInvoicesSnap = await getDocs(query(invoicesCol, where('status', '==', 'paid')));
      if (!paidInvoicesSnap.empty) {
        const grossPaid = paidInvoicesSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
        // SyncSphere 5% standard platform fee
        platformRevenueCents = Math.round(grossPaid * 0.05 * 100);
      }
    } catch (invErr) {
      console.warn('Could not query paid invoices for platform revenue:', invErr);
    }

    const activeSessionsCount = Math.max(1, activeProjectsSnap.data().count);

    const statsResult: AdminDashboardStats = {
      totalUsers: totalUsersSnap.data().count,
      businessOwners: clientsSnap.data().count,
      professionals: symbiotesSnap.data().count,
      activeProjects: activeProjectsSnap.data().count,
      completedProjects: completedProjectsSnap.data().count,
      platformRevenueCents,
      pendingReports: pendingReportsSnap.data().count,
      activeSessions: activeSessionsCount,
    };

    console.log('[AdminStats] Fetched live admin dashboard stats:', statsResult);
    return statsResult;
  } catch (err) {
    console.warn('Failed to fetch admin stats via count server, falling back to document listing:', err);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const projectsSnap = await getDocs(collection(db, 'projects'));
      const invoicesSnap = await getDocs(collection(db, 'invoices')).catch(() => null);

      const users = usersSnap.docs.map((d) => d.data());
      const projects = projectsSnap.docs.map((d) => d.data());
      
      let platformRevenueCents = 0;
      if (invoicesSnap && !invoicesSnap.empty) {
        const gross = invoicesSnap.docs
          .map((d) => d.data())
          .filter((inv) => inv.status === 'paid')
          .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
        platformRevenueCents = Math.round(gross * 0.05 * 100);
      }

      const activeProjCount = projects.filter((p) => ['in_progress', 'active', 'open'].includes(p.status)).length;

      return {
        totalUsers: users.length,
        businessOwners: users.filter((u) => u.role === 'client').length,
        professionals: users.filter((u) => u.role === 'symbiote' || u.role === 'freelancer').length,
        activeProjects: activeProjCount,
        completedProjects: projects.filter((p) => p.status === 'completed').length,
        platformRevenueCents,
        pendingReports: 0,
        activeSessions: Math.max(1, activeProjCount),
      };
    } catch (fallbackErr) {
      console.warn('Admin stats fallback warning:', fallbackErr);
      return {
        totalUsers: 0,
        businessOwners: 0,
        professionals: 0,
        activeProjects: 0,
        completedProjects: 0,
        platformRevenueCents: 0,
        pendingReports: 0,
        activeSessions: 0,
      };
    }
  }
}
