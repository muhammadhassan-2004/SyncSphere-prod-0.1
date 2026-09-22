import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { ProjectActivityItem } from '@/src/types/firestore';

export type ProjectActivityCategory =
  | 'milestone'
  | 'task'
  | 'file'
  | 'team'
  | 'invoice'
  | 'message'
  | 'general';

export interface CreateProjectActivityInput {
  title: string;
  description: string;
  type: ProjectActivityCategory;
  actorName?: string;
  actorId?: string;
  timestamp?: string;
  referenceText?: string;
  referenceUrl?: string;
}

/**
 * Write a real activity log entry to Firestore scoped to a project
 */
export async function logProjectActivity(
  projectId: string,
  activity: CreateProjectActivityInput
): Promise<string> {
  if (!projectId) return '';
  try {
    const colRef = collection(db, 'workspaces', projectId, 'activity');
    const docRef = await addDoc(colRef, {
      projectId,
      title: activity.title,
      description: activity.description,
      type: activity.type || 'general',
      actorName: activity.actorName || 'System User',
      actorId: activity.actorId || '',
      timestamp: activity.timestamp || new Date().toISOString(),
      ...(activity.referenceText ? { referenceText: activity.referenceText } : {}),
      ...(activity.referenceUrl ? { referenceUrl: activity.referenceUrl } : {}),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `workspaces/${projectId}/activity`);
    return '';
  }
}

/**
 * Fetch project activity log entries in reverse chronological order
 */
export async function getProjectActivity(
  projectId: string,
  maxEntries: number = 100
): Promise<ProjectActivityItem[]> {
  if (!projectId) return [];
  try {
    const colRef = collection(db, 'workspaces', projectId, 'activity');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxEntries));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      projectId,
      ...d.data(),
    } as ProjectActivityItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/activity`);
    return [];
  }
}

/**
 * Subscribe to live real-time project activity stream
 */
export function subscribeToProjectActivity(
  projectId: string,
  callback: (activities: ProjectActivityItem[]) => void
): () => void {
  if (!projectId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'workspaces', projectId, 'activity');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map(
        (d) => ({ id: d.id, projectId, ...d.data() } as ProjectActivityItem)
      );
      items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/activity`);
    }
  );
}
