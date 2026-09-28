import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { TimeEntry } from '@/src/types/firestore';

const TIME_ENTRIES_COLLECTION = 'time_entries';

export async function createTimeEntry(entry: Omit<TimeEntry, 'id'>): Promise<string> {
  if (!auth.currentUser) {
    if (typeof window !== 'undefined' && localStorage.getItem('syncsphere_demo_mode') === 'true') {
      const demoId = `time-demo-${Date.now()}`;
      return demoId;
    }
    console.warn('createTimeEntry skipped: User not authenticated.');
    return '';
  }
  try {
    const colRef = collection(db, TIME_ENTRIES_COLLECTION);
    // Sanitize payload to strip any undefined or null keys that crash Firestore addDoc SDK
    const cleanEntry: Record<string, any> = {};
    Object.entries(entry).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        cleanEntry[key] = val;
      }
    });
    cleanEntry.createdAt = cleanEntry.createdAt || new Date().toISOString();

    const docRef = await addDoc(colRef, cleanEntry);

    // If entry is attached to a specific task in a workspace, update task's actualHours and actualTotalHours
    if (entry.projectId && entry.taskId && entry.hours) {
      try {
        const taskDocRef = doc(db, 'workspaces', entry.projectId, 'tasks', entry.taskId);
        const taskSnap = await getDoc(taskDocRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const currentActual = Number(taskData.actualHours || taskData.actualTotalHours) || 0;
          const newActual = +(currentActual + Number(entry.hours)).toFixed(2);
          const updateData: Record<string, any> = {
            actualHours: newActual,
            actualTotalHours: newActual,
            updatedAt: new Date().toISOString(),
          };
          if (taskData.status === 'todo') {
            updateData.status = 'in_progress';
          }
          await updateDoc(taskDocRef, updateData);
        }
      } catch (taskErr) {
        console.warn('Could not auto-increment task actual hours:', taskErr);
      }
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, TIME_ENTRIES_COLLECTION);
    return '';
  }
}

export async function getTimeEntries(
  filter: { symbioteId?: string; projectId?: string; clientId?: string }
): Promise<TimeEntry[]> {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const colRef = collection(db, TIME_ENTRIES_COLLECTION);
    let q = query(colRef);
    if (filter.symbioteId) {
      q = query(colRef, where('symbioteId', '==', filter.symbioteId));
    } else if (filter.projectId) {
      q = query(colRef, where('projectId', '==', filter.projectId));
    } else if (filter.clientId) {
      q = query(colRef, where('clientId', '==', filter.clientId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${TIME_ENTRIES_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, TIME_ENTRIES_COLLECTION);
    return [];
  }
}

export const TIME_STATUS_STORAGE_KEY = 'syncsphere_time_entry_status_overrides';

export function getPersistedTimeStatusOverrides(): Record<string, { status: TimeEntry['status']; updatedAt: string }> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(TIME_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistTimeStatusOverride(entryId: string, status: TimeEntry['status']): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !entryId) return;
    const overrides = getPersistedTimeStatusOverrides();
    overrides[entryId] = { status, updatedAt: new Date().toISOString() };
    localStorage.setItem(TIME_STATUS_STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('syncsphere:time-entry-status-changed', {
      detail: { entryId, status },
    }));
  } catch (err) {
    console.warn('Failed to persist time status override to localStorage:', err);
  }
}

export async function updateTimeEntryStatus(
  entryId: string,
  status: TimeEntry['status']
): Promise<void> {
  if (!entryId) {
    return;
  }

  // 1. Immediately persist to localStorage across navigation and offline/demo modes
  persistTimeStatusOverride(entryId, status);

  try {
    const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'approved') {
      updatePayload.approvedAt = new Date().toISOString();
    } else if (status === 'rejected') {
      updatePayload.rejectedAt = new Date().toISOString();
    }

    await setDoc(docRef, updatePayload, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${TIME_ENTRIES_COLLECTION}/${entryId}:`, error.message);
      return;
    }
    console.warn(`[Firestore] Update time entry notice for ${TIME_ENTRIES_COLLECTION}/${entryId}:`, error);
  }
}

export async function updateTimeEntry(
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<void> {
  if (!entryId) return;
  try {
    const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
    const cleanUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) cleanUpdates[k] = v;
    });
    await setDoc(docRef, cleanUpdates, { merge: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('syncsphere:time-entry-updated', {
          detail: { entryId, updates },
        })
      );
    }
  } catch (error: any) {
    console.warn(`[Firestore] Update time entry notice for ${TIME_ENTRIES_COLLECTION}/${entryId}:`, error);
  }
}

export function subscribeToTimeEntriesForClient(
  clientId: string,
  callback: (entries: TimeEntry[]) => void,
  projectIds?: string[]
): () => void {
  if (!auth.currentUser || !clientId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, TIME_ENTRIES_COLLECTION);
  const q1 = query(colRef, where('clientId', '==', clientId));

  let clientEntries: TimeEntry[] = [];
  let projectEntries: TimeEntry[] = [];

  const emitMerged = () => {
    const map = new Map<string, TimeEntry>();
    clientEntries.forEach(e => { if (e.id) map.set(e.id, e); });
    projectEntries.forEach(e => { if (e.id) map.set(e.id, e); });
    
    // Merge with persisted overrides so approvals NEVER revert across navigation
    const overrides = getPersistedTimeStatusOverrides();
    const merged = Array.from(map.values()).map(e => {
      if (e.id && overrides[e.id]) {
        return { ...e, status: overrides[e.id].status };
      }
      return e;
    });

    callback(merged);
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      clientEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
      emitMerged();
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${TIME_ENTRIES_COLLECTION}:`, error.message);
        clientEntries = [];
        emitMerged();
        return;
      }
      handleFirestoreError(error, OperationType.LIST, TIME_ENTRIES_COLLECTION);
      clientEntries = [];
      emitMerged();
    }
  );

  let unsub2: (() => void) | null = null;
  const validProjectIds = (projectIds || []).filter(Boolean).slice(0, 10);
  if (validProjectIds.length > 0) {
    try {
      const q2 = query(colRef, where('projectId', 'in', validProjectIds));
      unsub2 = onSnapshot(
        q2,
        (snapshot) => {
          projectEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
          emitMerged();
        },
        (error) => {
          console.warn('Project time entries snapshot listener notice:', error);
        }
      );
    } catch (e) {
      console.warn('Could not attach project-based time listener:', e);
    }
  }

  return () => {
    unsub1();
    if (unsub2) unsub2();
  };
}

export function subscribeToTimeEntriesForProject(
  projectId: string,
  callback: (entries: TimeEntry[]) => void
): () => void {
  if (!auth.currentUser || !projectId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, TIME_ENTRIES_COLLECTION);
  const q = query(colRef, where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
      const overrides = getPersistedTimeStatusOverrides();
      const merged = entries.map(e => {
        if (e.id && overrides[e.id]) {
          return { ...e, status: overrides[e.id].status };
        }
        return e;
      });
      callback(merged);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for project time entries:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, TIME_ENTRIES_COLLECTION);
      callback([]);
    }
  );
}

export function subscribeToAllTimeEntries(
  callback: (entries: TimeEntry[]) => void
): () => void {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, TIME_ENTRIES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
      callback(entries);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${TIME_ENTRIES_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, TIME_ENTRIES_COLLECTION);
      callback([]);
    }
  );
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  if (!auth.currentUser || !entryId) {
    return;
  }
  try {
    const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TimeEntry;
      await deleteDoc(docRef);

      // Decrement task actual hours if attached
      if (data.projectId && data.taskId && data.hours) {
        try {
          const taskDocRef = doc(db, 'workspaces', data.projectId, 'tasks', data.taskId);
          const taskSnap = await getDoc(taskDocRef);
          if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            const currentActual = Number(taskData.actualHours || taskData.actualTotalHours) || 0;
            const newActual = Math.max(0, +(currentActual - Number(data.hours)).toFixed(2));
            await updateDoc(taskDocRef, {
              actualHours: newActual,
              actualTotalHours: newActual,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (taskErr) {
          console.warn('Could not decrement task actual hours on delete:', taskErr);
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TIME_ENTRIES_COLLECTION}/${entryId}`);
  }
}

export function subscribeToTimeEntries(
  symbioteId: string,
  callback: (entries: TimeEntry[]) => void
): () => void {
  if (!auth.currentUser || !symbioteId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, TIME_ENTRIES_COLLECTION);
  const q = query(colRef, where('symbioteId', '==', symbioteId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rawEntries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TimeEntry));
      const overrides = getPersistedTimeStatusOverrides();
      const entries = rawEntries.map((e) => {
        if (e.id && overrides[e.id]) {
          return { ...e, status: overrides[e.id].status };
        }
        return e;
      });
      callback(entries);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${TIME_ENTRIES_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      console.warn(`[Firestore] Time entries snapshot notice:`, error);
      callback([]);
    }
  );
}

