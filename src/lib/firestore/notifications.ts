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
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { NotificationItem, UserProfile } from '@/src/types/firestore';

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function createNotification(notif: Omit<NotificationItem, 'id'>): Promise<string> {
  if (!auth.currentUser) {
    return '';
  }
  try {
    // Check target user's notification preferences if present
    if (notif.userId) {
      const userRef = doc(db, 'users', notif.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const prefs = userData.notificationPreferences;
        if (prefs) {
          const typeLower = (notif.type || '').toLowerCase();
          if (
            (typeLower.includes('application') && prefs.newApplications === false) ||
            (typeLower.includes('message') && prefs.messages === false) ||
            ((typeLower.includes('invoice') || typeLower.includes('payment')) && prefs.invoiceAlerts === false) ||
            (typeLower.includes('milestone') && prefs.milestoneUpdates === false) ||
            ((typeLower.includes('match') || typeLower.includes('ai')) && prefs.aiMatching === false) ||
            (typeLower.includes('digest') && prefs.weeklyDigest === false)
          ) {
            console.log(`[Notifications] Suppressed notification type '${notif.type}' based on user preference.`);
            return '';
          }
        }
      }
    }

    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...notif,
      createdAt: notif.createdAt || new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, NOTIFICATIONS_COLLECTION);
    return '';
  }
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  if (!auth.currentUser || !userId) {
    return [];
  }
  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${NOTIFICATIONS_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!auth.currentUser || !notificationId) {
    return;
  }
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!auth.currentUser || !userId) {
    return;
  }
  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(colRef, where('userId', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: NotificationItem[]) => void
): () => void {
  if (!auth.currentUser || !userId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
      callback(notifs);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${NOTIFICATIONS_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
      callback([]);
    }
  );
}

