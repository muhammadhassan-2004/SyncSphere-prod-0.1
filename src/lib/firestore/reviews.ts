import {
  getDocs,
  getDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Review } from '@/src/types/firestore';

const REVIEWS_COLLECTION = 'reviews';

/** Overall score for a review (supports legacy `rating` and nested `ratings.overall`). */
export function getReviewOverallScore(review: Review): number {
  if (typeof review.ratings?.overall === 'number' && review.ratings.overall > 0) {
    return review.ratings.overall;
  }
  const legacy = (review as { rating?: number }).rating;
  if (typeof legacy === 'number' && legacy > 0) return legacy;
  return 0;
}

/** Exclude declined / opt-out review stubs from public counts and averages. */
export function filterActiveReviews(reviews: Review[]): Review[] {
  return (reviews || []).filter((r) => !r.declined && getReviewOverallScore(r) > 0);
}

export function computeReviewAggregate(reviews: Review[]): { rating: number; reviewsCount: number } {
  const active = filterActiveReviews(reviews);
  if (active.length === 0) return { rating: 0, reviewsCount: 0 };
  const sum = active.reduce((acc, r) => acc + getReviewOverallScore(r), 0);
  return {
    rating: Number((sum / active.length).toFixed(1)),
    reviewsCount: active.length,
  };
}

/**
 * Specialist re-syncs their own users/{uid} rating + reviewsCount from live reviews.
 * Clients cannot write another user's doc under Firestore rules — only the owner can.
 * Skips the write when aggregates are already up to date (avoids listener loops).
 */
export async function syncOwnReviewAggregates(userId: string): Promise<{ rating: number; reviewsCount: number }> {
  const aggregate = computeReviewAggregate(await getReviewsForUser(userId));
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== userId) return aggregate;

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data() : {};
    const existingRating = typeof existing.rating === 'number' ? existing.rating : 0;
    const existingCount = typeof existing.reviewsCount === 'number' ? existing.reviewsCount : 0;
    if (existingRating === aggregate.rating && existingCount === aggregate.reviewsCount) {
      return aggregate;
    }
    await setDoc(
      userRef,
      {
        rating: aggregate.rating,
        reviewsCount: aggregate.reviewsCount,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not persist own review aggregates:', err);
  }
  return aggregate;
}

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

    // Best-effort aggregate sync (only succeeds when the signed-in user owns the target user doc)
    const targetUserId = symbioteId || toUserId;
    if (targetUserId && !review.declined) {
      try {
        await syncOwnReviewAggregates(targetUserId);
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
    const reviews = filterActiveReviews(Array.from(map.values()));
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
    const all = filterActiveReviews(Array.from(map.values())).sort((a, b) => {
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
