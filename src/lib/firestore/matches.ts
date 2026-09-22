import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { createNotification } from '@/src/lib/firestore/notifications';

export interface MatchSubMetrics {
  skillsMatch: number;
  experienceFit: number;
  availabilityFit: number;
}

export interface ProjectMatch {
  id?: string;
  projectId: string;
  symbioteId: string;
  symbioteName?: string;
  symbioteTitle?: string;
  symbioteAvatarInitials?: string;
  symbioteAvatarUrl?: string;
  symbioteHourlyRate?: number;
  matchScore: number;
  subMetrics: MatchSubMetrics;
  explanation: string;
  generatedAt: string;
}

export async function getProjectMatches(projectId: string): Promise<ProjectMatch[]> {
  try {
    const colRef = collection(db, 'projects', projectId, 'matches');
    const snap = await getDocs(colRef);
    const results: ProjectMatch[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectMatch));
    // Sort descending by matchScore
    return results.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/matches`);
    return [];
  }
}

export async function saveProjectMatches(projectId: string, matches: ProjectMatch[]): Promise<void> {
  try {
    const colRef = collection(db, 'projects', projectId, 'matches');
    const now = new Date().toISOString();

    const batch = writeBatch(db);
    matches.forEach((m) => {
      const matchDocRef = doc(colRef, m.symbioteId);
      batch.set(matchDocRef, {
        ...m,
        projectId,
        generatedAt: now,
      }, { merge: true });
    });

    await batch.commit();

    try {
      const projSnap = await getDoc(doc(db, 'projects', projectId));
      if (projSnap.exists()) {
        const pd = projSnap.data();
        const clientId = pd.clientId || pd.ownerId;
        if (clientId && matches.length > 0) {
          await createNotification({
            userId: clientId,
            type: 'ai',
            title: 'AI Symbiote Match Recommendations Ready',
            description: `Neural Engine found ${matches.length} top specialist match${matches.length > 1 ? 'es' : ''} for project "${pd.title || 'Project'}".`,
            read: false,
            relatedItemId: projectId,
            relatedItemLink: `/client/ai-matching`,
            createdAt: now,
          });
        }
      }
    } catch (e) {
      console.warn('Error creating AI match notification:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}/matches`);
    throw error;
  }
}

export function subscribeToProjectMatches(
  projectId: string,
  callback: (matches: ProjectMatch[]) => void
): () => void {
  const colRef = collection(db, 'projects', projectId, 'matches');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectMatch));
      matches.sort((a, b) => b.matchScore - a.matchScore);
      callback(matches);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/matches`);
      callback([]);
    }
  );
}
