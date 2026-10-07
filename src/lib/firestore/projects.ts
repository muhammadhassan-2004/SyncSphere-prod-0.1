import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Project } from '@/src/types/firestore';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';

const PROJECTS_COLLECTION = 'projects';

export async function getProjects(): Promise<Project[]> {
  try {
    const colRef = collection(db, PROJECTS_COLLECTION);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
    return [];
  }
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Project;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PROJECTS_COLLECTION}/${projectId}`);
    return null;
  }
}

export async function getProjectsByOwner(ownerId: string): Promise<Project[]> {
  try {
    const colRef = collection(db, PROJECTS_COLLECTION);
    const q = query(colRef, where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
    return [];
  }
}

export async function createProject(project: Omit<Project, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, PROJECTS_COLLECTION);
    const now = new Date().toISOString();
    const docRef = await addDoc(colRef, {
      ...project,
      createdAt: project.createdAt || now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PROJECTS_COLLECTION);
    return '';
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PROJECTS_COLLECTION}/${projectId}`);
  }
}

export function subscribeToProjects(callback: (projects: Project[]) => void): () => void {
  const colRef = collection(db, PROJECTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      callback(projects);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
    }
  );
}

export function subscribeToProjectsByOwner(
  ownerId: string,
  callback: (projects: Project[]) => void
): () => void {
  if (!ownerId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, PROJECTS_COLLECTION);
  const q1 = query(colRef, where('ownerId', '==', ownerId));
  const q2 = query(colRef, where('clientId', '==', ownerId));

  let list1: Project[] = [];
  let list2: Project[] = [];

  const emitMerged = () => {
    const map = new Map<string, Project>();
    list1.forEach(p => { if (p.id) map.set(p.id, p); });
    list2.forEach(p => { if (p.id) map.set(p.id, p); });
    callback(Array.from(map.values()));
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      list1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
      callback([]);
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      list2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      emitMerged();
    },
    (error) => {
      // Ignore fallback if index or query is missing
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
}

/**
 * Recursively strips undefined fields from an object to ensure Firestore setDoc/updateDoc
 * never throws "Unsupported field value: undefined" errors.
 */
function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = cleanUndefined(value);
    } else {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

export async function saveProjectDraft(
  draftId: string | null,
  data: Partial<Project> & { ownerId: string }
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const payload = cleanUndefined({
      ...data,
      clientId: data.clientId || data.ownerId,
      ownerId: data.ownerId || data.clientId,
      status: data.status || 'draft',
      updatedAt: now,
    });
    if (draftId) {
      const docRef = doc(db, PROJECTS_COLLECTION, draftId);
      await setDoc(docRef, payload, { merge: true });
      return draftId;
    } else {
      const colRef = collection(db, PROJECTS_COLLECTION);
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, {
        ...payload,
        id: newDocRef.id,
        createdAt: now,
      }, { merge: true });
      return newDocRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PROJECTS_COLLECTION);
    throw error;
  }
}

export async function publishProject(
  draftId: string,
  visibility: 'Public' | 'Invite Only' = 'Public'
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const docRef = doc(db, PROJECTS_COLLECTION, draftId);
    await setDoc(docRef, {
      status: 'open',
      visibility,
      publishedAt: now,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PROJECTS_COLLECTION);
    throw error;
  }
}

export function subscribeToProject(
  projectId: string,
  callback: (project: Project | null) => void
): () => void {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Project);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${PROJECTS_COLLECTION}/${projectId}`);
      callback(null);
    }
  );
}

export async function addTeamMemberToProject(
  projectId: string,
  member: {
    uid: string;
    displayName: string;
    role: string;
    avatarInitials?: string;
    avatarUrl?: string;
    email?: string;
    hourlyRate?: number;
    matchScore?: number;
  }
): Promise<void> {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const existingTeam = data.teamMembers || [];
    if (existingTeam.some((m: any) => m.uid === member.uid)) {
      return;
    }
    const updatedTeam = [...existingTeam, { ...member, addedAt: new Date().toISOString() }];
    const existingUids = Array.isArray(data.teamMemberUids)
      ? data.teamMemberUids
      : existingTeam.map((m: any) => m.uid).filter(Boolean);
    const updatedUids = Array.from(new Set([...existingUids, member.uid]));

    await updateDoc(docRef, {
      teamMembers: updatedTeam,
      teamMemberUids: updatedUids,
      ...(!data.assignedSymbioteId ? { assignedSymbioteId: member.uid } : {}),
      updatedAt: new Date().toISOString(),
    });

    await logProjectActivity(projectId, {
      title: 'Team Member Joined',
      description: `Approved ${member.displayName} (${member.role}) to project team`,
      type: 'team',
      actorName: member.displayName,
      actorId: member.uid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PROJECTS_COLLECTION}/${projectId}`);
    throw error;
  }
}

export function subscribeToProjectById(
  projectId: string,
  callback: (project: Project | null) => void
): () => void {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Project);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${PROJECTS_COLLECTION}/${projectId}`);
      callback(null);
    }
  );
}

export function subscribeToOpenProjects(
  callback: (projects: Project[]) => void
): () => void {
  const colRef = collection(db, PROJECTS_COLLECTION);
  const q = query(colRef, where('status', 'in', ['open', 'published', 'in_progress']));
  return onSnapshot(
    q,
    (snapshot) => {
      const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      callback(projects);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToProjectsBySymbiote(
  symbioteId: string,
  callback: (projects: Project[]) => void
): () => void {
  if (!symbioteId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, PROJECTS_COLLECTION);
  const q1 = query(colRef, where('assignedSymbioteId', '==', symbioteId));
  const q2 = query(colRef, where('symbioteId', '==', symbioteId));
  const q3 = query(colRef, where('teamMemberUids', 'array-contains', symbioteId));
  const q4 = query(colRef, where('status', 'in', ['in_progress', 'completed', 'open']));

  let list1: Project[] = [];
  let list2: Project[] = [];
  let list3: Project[] = [];
  let list4: Project[] = [];

  const emitMerged = () => {
    const map = new Map<string, Project>();
    list1.forEach(p => { if (p.id) map.set(p.id, p); });
    list2.forEach(p => { if (p.id) map.set(p.id, p); });
    list3.forEach(p => { if (p.id) map.set(p.id, p); });
    list4.forEach(p => { if (p.id) map.set(p.id, p); });
    callback(Array.from(map.values()));
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      list1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      list2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      emitMerged();
    },
    () => {}
  );

  const unsub3 = onSnapshot(
    q3,
    (snapshot) => {
      list3 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      emitMerged();
    },
    () => {}
  );

  const unsub4 = onSnapshot(
    q4,
    (snapshot) => {
      list4 = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Project))
        .filter(p =>
          p.assignedSymbioteId === symbioteId ||
          p.symbioteId === symbioteId ||
          (p.teamMembers && p.teamMembers.some((m: any) => m.uid === symbioteId)) ||
          ((p as any).teamMemberUids && (p as any).teamMemberUids.includes(symbioteId))
        );
      emitMerged();
    },
    () => {}
  );

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
  };
}

export function subscribeToSearchProjects(
  role: string,
  uid: string,
  callback: (projects: Project[]) => void
): () => void {
  if (role === 'admin') {
    return subscribeToProjects(callback);
  }

  if (!uid) {
    callback([]);
    return () => {};
  }

  if (role === 'client') {
    return subscribeToProjectsByOwner(uid, callback);
  }

  if (role === 'symbiote') {
    const colRef = collection(db, PROJECTS_COLLECTION);
    const qOpen = query(colRef, where('status', 'in', ['open', 'published']));

    let assignedList: Project[] = [];
    let openList: Project[] = [];

    const emitMerged = () => {
      const map = new Map<string, Project>();
      assignedList.forEach((p) => { if (p.id) map.set(p.id, p); });
      openList.forEach((p) => { if (p.id) map.set(p.id, p); });
      callback(Array.from(map.values()));
    };

    const unsubAssigned = subscribeToProjectsBySymbiote(uid, (list) => {
      assignedList = list || [];
      emitMerged();
    });

    const unsubOpen = onSnapshot(
      qOpen,
      (snapshot) => {
        openList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        emitMerged();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
      }
    );

    return () => {
      unsubAssigned();
      unsubOpen();
    };
  }

  return subscribeToProjectsByOwner(uid, callback);
}



