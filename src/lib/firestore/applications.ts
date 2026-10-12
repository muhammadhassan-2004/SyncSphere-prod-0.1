import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Application } from '@/src/types/firestore';
import { createNotification } from '@/src/lib/firestore/notifications';

const APPLICATIONS_COLLECTION = 'applications';

export async function createApplication(appData: Omit<Application, 'id'>): Promise<string> {
  if (!auth.currentUser) {
    console.warn('createApplication skipped: User not authenticated.');
    return '';
  }
  try {
    // Resolve target client ID if not already present
    let targetClientId = appData.clientId;
    if (!targetClientId && appData.projectId) {
      const projSnap = await getDoc(doc(db, 'projects', appData.projectId));
      if (projSnap.exists()) {
        const pd = projSnap.data();
        targetClientId = pd.clientId || pd.ownerId;
      }
    }

    const colRef = collection(db, APPLICATIONS_COLLECTION);
    
    // Sanitize any undefined properties so Firestore never throws invalid data error
    const cleanAppData: Record<string, any> = {};
    Object.entries(appData).forEach(([k, v]) => {
      if (v !== undefined) {
        cleanAppData[k] = v;
      }
    });

    const docRef = await addDoc(colRef, {
      ...cleanAppData,
      clientId: targetClientId || appData.clientId || '',
      appliedAt: appData.appliedAt || new Date().toISOString(),
    });

    if (targetClientId) {
      const matchScoreText = appData.aiMatchScore ? ` with a ${appData.aiMatchScore}% match score` : '';
      await createNotification({
        userId: targetClientId,
        type: 'application',
        title: 'New Application Received',
        description: `${appData.symbioteName || 'A specialist'} submitted an application for "${appData.projectTitle || 'your project'}"${matchScoreText}.`,
        read: false,
        relatedItemId: docRef.id,
        relatedItemLink: '/client/applications',
        createdAt: new Date().toISOString(),
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, APPLICATIONS_COLLECTION);
    return '';
  }
}

export async function getApplicationsByProject(projectId: string): Promise<Application[]> {
  if (!auth.currentUser || !projectId) {
    return [];
  }
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(colRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);
    const appsABA = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
    appsABA.sort((a, b) => {
      const dateA = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const dateB = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return dateB - dateA;
    });
    return appsABA;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${APPLICATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
    return [];
  }
}

export async function getApplicationsBySymbiote(symbioteId: string): Promise<Application[]> {
  if (!auth.currentUser || !symbioteId) {
    return [];
  }
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(colRef, where('symbioteId', '==', symbioteId));
    const snap = await getDocs(q);
    const appsABA = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
    appsABA.sort((a, b) => {
      const dateA = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const dateB = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return dateB - dateA;
    });
    return appsABA;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${APPLICATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
    return [];
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Application['status']
): Promise<void> {
  if (!auth.currentUser || !applicationId) {
    return;
  }
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
    await updateDoc(docRef, { status });

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const appData = snap.data() as Application;

      // Notify symbiote of status update
      if (appData.symbioteId) {
        const titleText = status === 'hired'
          ? 'Congratulations! You Were Hired'
          : `Application Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        await createNotification({
          userId: appData.symbioteId,
          type: 'application',
          title: titleText,
          description: `Your application for "${appData.projectTitle || 'the engagement'}" was updated to ${status}.`,
          read: false,
          relatedItemId: applicationId,
          relatedItemLink: '/symbiote/applications',
          createdAt: new Date().toISOString(),
        });
      }

      if (status === 'hired' && appData.projectId && appData.symbioteId) {
        const projectRef = doc(db, 'projects', appData.projectId);
        const projSnap = await getDoc(projectRef);
        if (projSnap.exists()) {
          const projData = projSnap.data();
          const existingTeam = projData.teamMembers || [];
          const isMember = existingTeam.some((m: any) => m.uid === appData.symbioteId);

          let appRate = 55;
          if (appData.rate && appData.rate > 0 && appData.rate <= 500) {
            appRate = appData.rate;
          } else {
            try {
              const uSnap = await getDoc(doc(db, 'users', appData.symbioteId));
              if (uSnap.exists() && uSnap.data()?.hourlyRate && uSnap.data().hourlyRate <= 500) {
                appRate = uSnap.data().hourlyRate;
              }
            } catch (e) {
              console.debug('Could not fetch user profile rate in applications:', e);
            }
          }

          const newMember = {
            uid: appData.symbioteId,
            displayName: appData.symbioteName || 'Specialist',
            role: appData.symbioteTitle || 'AI Specialist',
            avatarInitials: appData.symbioteAvatarInitials || 'SP',
            hourlyRate: appRate,
            matchScore: appData.aiMatchScore || 95,
            addedAt: new Date().toISOString(),
          };

          const updatedTeam = isMember ? existingTeam : [...existingTeam, newMember];

          await updateDoc(projectRef, {
            assignedSymbioteId: appData.symbioteId,
            symbioteId: appData.symbioteId,
            teamMembers: updatedTeam,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${applicationId}`);
  }
}

export function subscribeToProjectApplications(
  projectId: string,
  callback: (apps: Application[]) => void
): () => void {
  if (!auth.currentUser || !projectId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, APPLICATIONS_COLLECTION);
  const q = query(colRef, where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application));
      callback(apps);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${APPLICATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToClientApplications(
  clientId: string,
  callback: (apps: Application[]) => void
): () => void {
  if (!auth.currentUser || !clientId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, APPLICATIONS_COLLECTION);
  const q = query(colRef, where('clientId', '==', clientId));
  return onSnapshot(
    q,
    (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application));
      callback(apps);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${APPLICATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToSymbioteApplications(
  symbioteId: string,
  callback: (apps: Application[]) => void
): () => void {
  if (!auth.currentUser || !symbioteId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, APPLICATIONS_COLLECTION);
  const q = query(colRef, where('symbioteId', '==', symbioteId));
  return onSnapshot(
    q,
    (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application));
      callback(apps);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${APPLICATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
      callback([]);
    }
  );
}

export async function cleanupLegacyApplicationScores(symbioteId?: string): Promise<{ updatedCount: number; docIds: string[] }> {
  try {
    if (!auth.currentUser || !symbioteId) return { updatedCount: 0, docIds: [] };
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(colRef, where('symbioteId', '==', symbioteId));
    const snap = await getDocs(q);
    const docIds: string[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.aiMatchScore === 90 && (!data.aiMatchStatus || data.aiMatchStatus !== 'calculated')) {
        await updateDoc(docSnap.ref, {
          aiMatchScore: deleteField(),
          aiMatchStatus: 'pending',
        });
        docIds.push(docSnap.id);
      }
    }
    return { updatedCount: docIds.length, docIds };
  } catch (error) {
    console.warn('Legacy application score cleanup notice:', error);
    return { updatedCount: 0, docIds: [] };
  }
}


