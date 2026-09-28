import {
  collection,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { ProjectFile } from '@/src/types/firestore';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';

export const PROJECT_FILES_COLLECTION = 'project_files';

export function subscribeToProjectFilesForClient(
  clientId: string,
  callback: (files: ProjectFile[]) => void,
  clientProjectIds?: string[]
): () => void {
  if (!clientId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, PROJECT_FILES_COLLECTION);
  const q1 = query(colRef, where('clientId', '==', clientId));
  const q2 = query(colRef, where('uploadedBy', '==', clientId));

  let list1: ProjectFile[] = [];
  let list2: ProjectFile[] = [];

  const emitMerged = () => {
    const map = new Map<string, ProjectFile>();
    list1.forEach(f => { if (f.id) map.set(f.id, f); });
    list2.forEach(f => { if (f.id) map.set(f.id, f); });
    const merged = Array.from(map.values());
    if (clientProjectIds && clientProjectIds.length > 0) {
      callback(merged.filter(f => clientProjectIds.includes(f.projectId) || f.clientId === clientId || f.uploadedBy === clientId));
    } else {
      callback(merged);
    }
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      list1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFile));
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECT_FILES_COLLECTION);
      callback([]);
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      list2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFile));
      emitMerged();
    },
    (error) => {
      // Graceful fallback for secondary alias query
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
}

export function subscribeToAllProjectFiles(
  callback: (files: ProjectFile[]) => void
): () => void {
  const colRef = collection(db, PROJECT_FILES_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const files = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ProjectFile)
      );
      callback(files);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECT_FILES_COLLECTION);
    }
  );
}

export function subscribeToProjectFilesForProject(
  projectId: string,
  callback: (files: ProjectFile[]) => void
): () => void {
  const colRef = collection(db, PROJECT_FILES_COLLECTION);
  const q = query(colRef, where('projectId', '==', projectId));

  return onSnapshot(
    q,
    (snapshot) => {
      const files = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ProjectFile)
      );
      callback(files);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROJECT_FILES_COLLECTION);
    }
  );
}

export async function createProjectFile(
  fileData: Omit<ProjectFile, 'id'>
): Promise<string> {
  try {
    const colRef = collection(db, PROJECT_FILES_COLLECTION);

    // Issue #37 Fix: Ensure clientId is always accurately populated
    let finalClientId = fileData.clientId;
    if ((!finalClientId || finalClientId === '') && fileData.projectId) {
      try {
        const projSnap = await getDoc(doc(db, 'projects', fileData.projectId));
        if (projSnap.exists()) {
          const pd = projSnap.data();
          finalClientId = pd.clientId || pd.ownerId || '';
        }
      } catch (pErr) {
        console.warn('[projectFiles] Failed to hydrate clientId from project:', pErr);
      }
    }

    const payload = {
      ...fileData,
      clientId: finalClientId || '',
    };

    const docRef = await addDoc(colRef, payload);

    if (fileData.projectId) {
      let actorAvatarUrl = '';
      let actorAvatarInitials = '';
      let actorName = fileData.uploadedByName || 'Team Member';
      if (fileData.uploadedBy) {
        try {
          const userSnap = await getDoc(doc(db, 'users', fileData.uploadedBy));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            actorAvatarUrl = ud.avatarUrl || (ud as any).photoURL || '';
            actorAvatarInitials = ud.avatarInitials || '';
            actorName = ud.displayName || actorName;
          }
        } catch {
          // Non-blocking lookup fallback
        }
      }

      await logProjectActivity(fileData.projectId, {
        title: 'File Uploaded',
        description: `Uploaded file "${fileData.name}" (${fileData.size || 'Attachment'})`,
        type: 'file',
        actorName,
        actorId: fileData.uploadedBy,
        actorAvatarUrl,
        actorAvatarInitials,
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PROJECT_FILES_COLLECTION);
    throw error;
  }
}

export async function deleteProjectFile(fileId: string): Promise<void> {
  try {
    const docRef = doc(db, PROJECT_FILES_COLLECTION, fileId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${PROJECT_FILES_COLLECTION}/${fileId}`
    );
    throw error;
  }
}
