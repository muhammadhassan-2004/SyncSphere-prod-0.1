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
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Invitation } from '@/src/types/firestore';
import { createNotification } from '@/src/lib/firestore/notifications';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';

const INVITATIONS_COLLECTION = 'invitations';

export async function createInvitation(invitation: Omit<Invitation, 'id'>): Promise<string> {
  if (!auth.currentUser) {
    console.warn('createInvitation skipped: User not authenticated.');
    return '';
  }
  try {
    const colRef = collection(db, INVITATIONS_COLLECTION);
    
    // Sanitize any undefined properties so Firestore never throws invalid data error
    const cleanInvitation: Record<string, any> = {};
    Object.entries(invitation).forEach(([k, v]) => {
      if (v !== undefined) {
        cleanInvitation[k] = v;
      }
    });

    const docRef = await addDoc(colRef, {
      ...cleanInvitation,
      createdAt: invitation.createdAt || new Date().toISOString(),
    });

    if (invitation.projectId) {
      try {
        await logProjectActivity(invitation.projectId, {
          title: 'Team Member Invited',
          description: `Invited ${invitation.symbioteName || 'specialist'} (${(invitation as any).role || 'Team Member'}) to the project team`,
          type: 'team',
          actorName: invitation.clientName || 'Client',
          actorId: invitation.clientId,
        });
      } catch (actErr) {
        console.warn('Non-fatal activity log failure on invite:', actErr);
      }
    }

    if (invitation.symbioteId) {
      try {
        await createNotification({
          userId: invitation.symbioteId,
          type: 'application',
          title: 'New Project Invitation',
          description: `${invitation.clientName || 'A client'} invited you to join project "${invitation.projectTitle || 'Project'}".`,
          read: false,
          relatedItemId: docRef.id,
          relatedItemLink: '/symbiote/invitations',
          createdAt: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('Non-fatal notification failure on invite:', notifErr);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Failed to create invitation:', error);
    handleFirestoreError(error, OperationType.CREATE, INVITATIONS_COLLECTION);
    return '';
  }
}

export async function getInvitationsBySymbiote(symbioteId: string): Promise<Invitation[]> {
  if (!auth.currentUser || !symbioteId) {
    return [];
  }
  try {
    const colRef = collection(db, INVITATIONS_COLLECTION);
    const q = query(colRef, where('symbioteId', '==', symbioteId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
    return [];
  }
}

export async function getInvitationsByClient(clientId: string): Promise<Invitation[]> {
  if (!auth.currentUser || !clientId) {
    return [];
  }
  try {
    const colRef = collection(db, INVITATIONS_COLLECTION);
    const q = query(colRef, where('clientId', '==', clientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
    return [];
  }
}

export async function updateInvitationStatus(
  invitationId: string,
  status: Invitation['status']
): Promise<void> {
  if (!auth.currentUser || !invitationId) {
    return;
  }
  try {
    const docRef = doc(db, INVITATIONS_COLLECTION, invitationId);
    const invSnap = await getDoc(docRef);
    await updateDoc(docRef, { status });

    if (invSnap.exists()) {
      const invData = invSnap.data() as Invitation;

      if (invData.projectId) {
        // If invitation accepted, auto-initiate contract and move project to in_progress
        if (status === 'accepted') {
          try {
            const projDocRef = doc(db, 'projects', invData.projectId);
            const projSnap = await getDoc(projDocRef);
            if (projSnap.exists()) {
              const projData = projSnap.data();
              const existingTeam = projData.teamMembers || [];
              const alreadyInTeam = existingTeam.some((m: any) => m.uid === invData.symbioteId);
              let specialistRate = 55;
              if (invData.symbioteHourlyRate && invData.symbioteHourlyRate > 0 && invData.symbioteHourlyRate <= 500) {
                specialistRate = invData.symbioteHourlyRate;
              } else {
                try {
                  const uSnap = await getDoc(doc(db, 'users', invData.symbioteId));
                  if (uSnap.exists() && uSnap.data()?.hourlyRate && uSnap.data().hourlyRate <= 500) {
                    specialistRate = uSnap.data().hourlyRate;
                  } else if (typeof invData.budgetRange === 'string' && invData.budgetRange.includes('/hr')) {
                    const parsed = parseFloat(invData.budgetRange.replace(/[^0-9.]/g, ''));
                    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) specialistRate = parsed;
                  }
                } catch (e) {
                  console.debug('Could not fetch user profile rate:', e);
                }
              }

              const updatedTeam = alreadyInTeam
                ? existingTeam
                : [
                    ...existingTeam,
                    {
                      uid: invData.symbioteId,
                      displayName: invData.symbioteName || 'Specialist',
                      role: (invData as any).role || 'Specialist Engineer',
                      avatarInitials: invData.symbioteAvatarInitials || 'SP',
                      hourlyRate: specialistRate,
                      matchScore: invData.aiMatchScore || (invData as any).matchScore || 95,
                      addedAt: new Date().toISOString(),
                    },
                  ];

              await updateDoc(projDocRef, {
                status: 'in_progress',
                assignedSymbioteId: projData.assignedSymbioteId || invData.symbioteId,
                teamMembers: updatedTeam,
                updatedAt: new Date().toISOString(),
              });
            }

            // Auto-initialize contract document in contracts collection
            const contractsColRef = collection(db, 'contracts');
            await addDoc(contractsColRef, {
              projectId: invData.projectId,
              projectTitle: invData.projectTitle || 'Project',
              clientId: invData.clientId,
              clientName: invData.clientName || 'Client',
              symbioteId: invData.symbioteId,
              symbioteName: invData.symbioteName || 'Specialist',
              invitationId: invitationId,
              status: 'active',
              rate: invData.budgetRange || '$100/hr',
              timeline: invData.timeline || 'Project Duration',
              terms: 'Master Services Agreement & Milestone Delivery Terms',
              signedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });

            // Also register in project_files with category: 'contracts'
            const filesColRef = collection(db, 'project_files');
            await addDoc(filesColRef, {
              projectId: invData.projectId,
              projectName: invData.projectTitle || 'Project',
              clientId: invData.clientId,
              name: `Contract_Agreement_${(invData.projectTitle || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
              size: '254 KB',
              type: 'application/pdf',
              category: 'contracts',
              downloadUrl: 'https://syncsphere.io/contracts/preview',
              uploadedBy: invData.symbioteId,
              uploadedByName: invData.symbioteName || 'Specialist',
              uploadedAt: new Date().toISOString(),
            });
          } catch (projErr) {
            console.warn('Non-fatal project sync / contract auto-initiation error:', projErr);
          }
        }

        await logProjectActivity(invData.projectId, {
          title: `Invitation ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: status === 'accepted'
            ? `${invData.symbioteName || 'Specialist'} accepted invitation. Contract auto-initiated and project is now In Progress.`
            : `${invData.symbioteName || 'Specialist'} ${status} invitation for ${(invData as any).role || 'Team Member'} role`,
          type: 'team',
          actorName: invData.symbioteName || 'Specialist',
          actorId: invData.symbioteId,
        });
      }

      if (invData.clientId) {
        await createNotification({
          userId: invData.clientId,
          type: 'application',
          title: `Invitation ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: status === 'accepted'
            ? `${invData.symbioteName || 'Specialist'} accepted your invitation for "${invData.projectTitle || 'project'}". Contract has been auto-initialized!`
            : `${invData.symbioteName || 'Specialist'} ${status} your invitation for "${invData.projectTitle || 'project'}".`,
          read: false,
          relatedItemId: invitationId,
          relatedItemLink: '/client/team',
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVITATIONS_COLLECTION}/${invitationId}`);
  }
}

export function subscribeToSymbioteInvitations(
  symbioteId: string,
  callback: (invitations: Invitation[]) => void
): () => void {
  if (!auth.currentUser || !symbioteId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, INVITATIONS_COLLECTION);
  const q = query(colRef, where('symbioteId', '==', symbioteId));
  return onSnapshot(
    q,
    (snapshot) => {
      const invs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
      callback(invs);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToClientInvitations(
  clientId: string,
  callback: (invitations: Invitation[]) => void
): () => void {
  if (!auth.currentUser || !clientId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, INVITATIONS_COLLECTION);
  const q = query(colRef, where('clientId', '==', clientId));
  return onSnapshot(
    q,
    (snapshot) => {
      const invs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
      callback(invs);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToProjectInvitations(
  projectId: string,
  callback: (invitations: Invitation[]) => void
): () => void {
  if (!auth.currentUser || !projectId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, INVITATIONS_COLLECTION);
  const q = query(colRef, where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snapshot) => {
      const invs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
      callback(invs);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
      callback([]);
    }
  );
}

export async function getInvitationsByProject(projectId: string): Promise<Invitation[]> {
  if (!auth.currentUser || !projectId) {
    return [];
  }
  try {
    const colRef = collection(db, INVITATIONS_COLLECTION);
    const q = query(colRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${INVITATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
    return [];
  }
}

