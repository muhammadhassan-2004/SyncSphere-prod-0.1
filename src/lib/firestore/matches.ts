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

export function computeDeterministicMatchScore(
  candidate: { skills?: string[]; title?: string; jobTitle?: string; bio?: string; experience?: string; availability?: string; rating?: number },
  project: { skills?: string[]; techTags?: string[]; title?: string; category?: string; description?: string } | null
): { matchScore: number; subMetrics: MatchSubMetrics; explanation: string } {
  if (!project) {
    return {
      matchScore: 75,
      subMetrics: { skillsMatch: 75, experienceFit: 75, availabilityFit: 80 },
      explanation: `${candidate.title || 'Specialist'} with verified engineering capabilities.`,
    };
  }

  const rawSkills: any[] = [
    ...(Array.isArray(project?.skills) ? project.skills : []),
    ...(Array.isArray(project?.techTags) ? project.techTags : []),
  ];
  const projectSkills: string[] = rawSkills
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().toLowerCase());

  const projectTitle = String(project?.title || 'Project');

  const titleKeywords = projectTitle
    .toLowerCase()
    .split(/[\s,/-]+/)
    .filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'app', 'project', 'brief'].includes(w));

  const effectiveKeywords = projectSkills.length > 0 ? projectSkills : titleKeywords;

  const candSkills: string[] = (Array.isArray(candidate?.skills) ? candidate.skills : [])
    .filter((s: any): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().toLowerCase());

  const candTitle = String(candidate?.title || candidate?.jobTitle || '').toLowerCase();
  const candBio = String(candidate?.bio || '').toLowerCase();

  const matchingSkills = candSkills.filter((cs) =>
    effectiveKeywords.some((pk) => pk === cs || cs.includes(pk) || pk.includes(cs))
  );

  const titleMatches = effectiveKeywords.some((pk) => candTitle.includes(pk));
  const bioMatches = effectiveKeywords.filter((pk) => candBio.includes(pk)).length;

  const hasAnySkillMatch = matchingSkills.length > 0;
  const hasDomainMatch = titleMatches || bioMatches > 1;

  let matchScore = 12;
  let skillsScore = 10;

  if (hasAnySkillMatch || (effectiveKeywords.length > 0 && hasDomainMatch)) {
    const overlapRatio = effectiveKeywords.length > 0 ? matchingSkills.length / effectiveKeywords.length : 0.5;
    skillsScore = Math.min(98, Math.round(50 + overlapRatio * 45 + (titleMatches ? 5 : 0)));
    const expScore = candidate.experience === 'Expert' ? 95 : candidate.experience === 'Senior' ? 88 : 75;
    const availScore = candidate.availability === 'Immediate' ? 95 : 82;

    matchScore = Math.round((skillsScore * 0.6) + (expScore * 0.25) + (availScore * 0.15));
    matchScore = Math.min(98, Math.max(45, matchScore));
  } else {
    matchScore = Math.min(15, Math.max(8, Math.round((candidate.rating ? candidate.rating * 2 : 10))));
    skillsScore = 10;
  }

  const expScore = candidate.experience === 'Expert' ? 95 : candidate.experience === 'Senior' ? 88 : 75;
  const availScore = candidate.availability === 'Immediate' ? 95 : 80;

  const matchedList = matchingSkills.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
  const explanation = hasAnySkillMatch
    ? `${candidate.title || 'Specialist'} is a ${matchScore}% match for "${projectTitle}". Verified skills in ${matchedList} with strong alignment.`
    : `Primary technical focus does not align with required qualifications (${effectiveKeywords.slice(0, 3).join(', ')}).`;

  return {
    matchScore,
    subMetrics: {
      skillsMatch: skillsScore,
      experienceFit: expScore,
      availabilityFit: availScore,
    },
    explanation,
  };
}
