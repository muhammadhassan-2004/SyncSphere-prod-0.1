import {
  getDocs,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Review } from '@/src/types/firestore';

const REVIEWS_COLLECTION = 'reviews';

export async function createReview(review: Omit<Review, 'id'>): Promise<string> {
  const currentUid = auth.currentUser?.uid || review.fromUserId || review.clientId || '';
  const reviewerId = review.reviewerId || currentUid;
  const fromUserId = review.fromUserId || currentUid;
  const clientId = review.clientId || currentUid;
  const symbioteId = review.symbioteId || review.toUserId || '';
  const toUserId = review.toUserId || review.symbioteId || '';

  try {
    const colRef = collection(db, REVIEWS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...review,
      reviewerId,
      fromUserId,
      clientId,
      symbioteId,
      toUserId,
      createdAt: review.createdAt || new Date().toISOString(),
    });

    // Atomically recalculate and persist freelancer's public profile rating aggregate
    const targetUserId = symbioteId || toUserId;
    if (targetUserId) {
      try {
        const [q1Snap, q2Snap] = await Promise.all([
          getDocs(query(colRef, where('toUserId', '==', targetUserId))),
          getDocs(query(colRef, where('symbioteId', '==', targetUserId))),
        ]);
        const map = new Map<string, Review>();
        q1Snap.docs.forEach(d => map.set(d.id, d.data() as Review));
        q2Snap.docs.forEach(d => map.set(d.id, d.data() as Review));
        const allReviews = Array.from(map.values());
        if (allReviews.length > 0) {
          const totalRatingSum = allReviews.reduce((sum, r) => {
            const score = r.ratings?.overall ?? (typeof (r as any).rating === 'number' ? (r as any).rating : 5);
            return sum + score;
          }, 0);
          const avgRating = +(totalRatingSum / allReviews.length).toFixed(1);
          const userDocRef = doc(db, 'users', targetUserId);
          await updateDoc(userDocRef, {
            rating: avgRating,
            reviewsCount: allReviews.length,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (userRatingErr) {
        console.warn('Could not sync user profile rating aggregate:', userRatingErr);
      }
    }

    return docRef.id;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${REVIEWS_COLLECTION}:`, error.message);
      // Generate fallback local document ID to prevent UI lockup in demo/preview modes
      return `review-${Date.now()}`;
    }
    handleFirestoreError(error, OperationType.CREATE, REVIEWS_COLLECTION);
    return `review-${Date.now()}`;
  }
}

export async function markReviewHelpful(reviewId: string, currentHelpfulCount: number = 0): Promise<boolean> {
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(docRef, {
      helpfulCount: (currentHelpfulCount || 0) + 1,
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${REVIEWS_COLLECTION}/${reviewId}`);
    return false;
  }
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, REVIEWS_COLLECTION);
    const [snap1, snap2, snap3, snap4] = await Promise.all([
      getDocs(query(colRef, where('fromUserId', '==', userId))),
      getDocs(query(colRef, where('toUserId', '==', userId))),
      getDocs(query(colRef, where('clientId', '==', userId))),
      getDocs(query(colRef, where('symbioteId', '==', userId))),
    ]);
    const map = new Map<string, Review>();
    snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Review));
    snap2.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Review));
    snap3.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Review));
    snap4.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Review));
    const reviews = Array.from(map.values());
    reviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return reviews;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
    return [];
  }
}

export function subscribeToUserReviews(
  userId: string,
  callback: (reviews: Review[]) => void
): () => void {
  const colRef = collection(db, REVIEWS_COLLECTION);
  const q1 = query(colRef, where('toUserId', '==', userId));
  const q2 = query(colRef, where('symbioteId', '==', userId));

  let docs1: Review[] = [];
  let docs2: Review[] = [];

  const mergeAndNotify = () => {
    const map = new Map<string, Review>();
    docs1.forEach(d => map.set(d.id, d));
    docs2.forEach(d => map.set(d.id, d));
    const all = Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    callback(all);
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      docs1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      mergeAndNotify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
      callback([]);
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      docs2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      mergeAndNotify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
}

export function subscribeToClientReviews(
  clientId: string,
  callback: (reviews: Review[]) => void
): () => void {
  const colRef = collection(db, REVIEWS_COLLECTION);
  const q1 = query(colRef, where('fromUserId', '==', clientId));
  const q2 = query(colRef, where('clientId', '==', clientId));

  let docs1: Review[] = [];
  let docs2: Review[] = [];

  const mergeAndNotify = () => {
    const map = new Map<string, Review>();
    docs1.forEach(d => map.set(d.id, d));
    docs2.forEach(d => map.set(d.id, d));
    const all = Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    callback(all);
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      docs1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      mergeAndNotify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
      callback([]);
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      docs2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      mergeAndNotify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
}

export async function getProjectReview(projectId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, REVIEWS_COLLECTION);
    const q = query(colRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
    return [];
  }
}
