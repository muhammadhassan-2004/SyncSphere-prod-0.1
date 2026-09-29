import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { UserProfile, UserRole, NotificationPreferences } from '@/src/types/firestore';
import { DEFAULT_SYMBIOTES } from '@/src/data/symbiotes';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      if (data.role) {
        const normalizedRole = data.role === 'freelancer' ? 'symbiote' : data.role;
        return { ...data, uid: snap.id, role: normalizedRole };
      }
    }

    // If doc missing or missing role, fallback to searching by email if available
    const searchEmail = email || (snap.exists() ? (snap.data() as UserProfile).email : undefined);
    if (searchEmail) {
      const q = query(collection(db, USERS_COLLECTION), where('email', '==', searchEmail.toLowerCase()));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        const foundData = foundDoc.data() as UserProfile;
        // SAFE: Only normalize role if it actually exists — NEVER default to 'client'
        // This prevents corrupting admin/symbiote roles for accounts whose doc was partial
        const normalizedRole = foundData.role === 'freelancer' ? 'symbiote' : foundData.role;
        const mergedProfile = {
          ...foundData,
          uid,
          ...(normalizedRole ? { role: normalizedRole } : {}),
          updatedAt: new Date().toISOString(),
        } as UserProfile;
        // Auto-heal / sync document to users/{uid} — preserves role if already set
        await setDoc(docRef, mergedProfile, { merge: true });
        return mergedProfile;
      }
    }

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return { ...data, uid: snap.id };
    }

    // Ghost account skeleton — save basic info WITHOUT role assignment
    // Role MUST be chosen by user via /portal-select; never auto-assign 'client'
    if (uid && searchEmail) {
      const fallbackName = searchEmail.split('@')[0];
      const skeletonDoc = {
        uid,
        email: searchEmail.toLowerCase(),
        displayName: fallbackName,
        fullName: fallbackName,
        emailVerified: false,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await setDoc(docRef, skeletonDoc, { merge: true });
      } catch (autoHealErr) {
        console.warn('Auto-provisioning ghost profile notice:', autoHealErr);
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
    return null;
  }
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  email?: string
) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    let hasSyncedEmailFallback = false;

    return onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          if (data.role) {
            const normalizedRole = data.role === 'freelancer' ? 'symbiote' : data.role;
            callback({ ...data, uid: snap.id, role: normalizedRole });
            return;
          }
        }

        // If doc doesn't exist or doesn't have role, attempt email fallback lookup once
        const searchEmail = email || (snap.exists() ? (snap.data() as UserProfile).email : undefined);
        if (searchEmail && !hasSyncedEmailFallback) {
          hasSyncedEmailFallback = true;
          try {
            const q = query(collection(db, USERS_COLLECTION), where('email', '==', searchEmail.toLowerCase()));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const foundDoc = querySnap.docs[0];
              const foundData = foundDoc.data() as UserProfile;
              // SAFE: Only normalize role if it actually exists — NEVER default to 'client'
              const normalizedRole = foundData.role === 'freelancer' ? 'symbiote' : foundData.role;
              const mergedProfile = {
                ...foundData,
                uid,
                ...(normalizedRole ? { role: normalizedRole } : {}),
              } as UserProfile;
              // Auto-sync into users/{uid} — preserves existing role field
              await setDoc(docRef, mergedProfile, { merge: true });
              callback(mergedProfile);
              return;
            }
          } catch (e) {
            console.warn('Email fallback user search failed:', e);
          }
        }

        if (snap.exists()) {
          callback({ uid: snap.id, ...snap.data() } as UserProfile);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('UserProfile snapshot error:', error);
        callback(null);
      }
    );
  } catch (error) {
    console.warn('Could not subscribe to UserProfile:', error);
    callback(null);
    return () => {};
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, profile.uid);
    await setDoc(
      docRef,
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${profile.uid}`);
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, updatedData, { merge: true });

    // Also update any document matching the user's email if the document ID is different
    if (updates.email) {
      try {
        const q = query(collection(db, USERS_COLLECTION), where('email', '==', updates.email.toLowerCase()));
        const querySnap = await getDocs(q);
        for (const userDoc of querySnap.docs) {
          if (userDoc.id !== uid) {
            await setDoc(doc(db, USERS_COLLECTION, userDoc.id), updatedData, { merge: true });
          }
        }
      } catch (e) {
        console.warn('Email secondary doc update warning:', e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const q = query(colRef, where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    return [];
  }
}

export async function ensureDefaultSymbiotesSeeded(): Promise<void> {
  // No-op: only real registered freelancers appear in the platform
}

export async function getAllSymbiotesFromFirestore(): Promise<UserProfile[]> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(colRef);
    const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
    const symbiotes = all.filter((u) => u.role === 'symbiote' || u.role === 'freelancer' || (u as any).hourlyRate);
    return symbiotes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    return [];
  }
}

export function subscribeToSymbiotesFromFirestore(callback: (profiles: UserProfile[]) => void) {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
        const symbiotes = all.filter((u) => u.role === 'symbiote' || u.role === 'freelancer' || (u as any).hourlyRate);
        callback(symbiotes);
      },
      (error) => {
        console.warn('Symbiotes snapshot error:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.warn('Could not subscribe to Symbiotes:', error);
    callback([]);
    return () => {};
  }
}

export async function updateNotificationPreference(
  uid: string,
  preferenceKey: keyof NotificationPreferences,
  enabled: boolean
): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, {
      [`notificationPreferences.${preferenceKey}`]: enabled,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

