import * as functions from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) initializeApp();

export const adminDeleteUser = functions.onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new functions.HttpsError('unauthenticated', 'Must be signed in.');
  }

  // Server-side admin check — NEVER trust a client-passed "isAdmin" flag.
  const db = getFirestore();
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.HttpsError('permission-denied', 'Admin role required.');
  }

  const targetUid = request.data?.targetUid;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new functions.HttpsError('invalid-argument', 'targetUid is required.');
  }

  // Guard: an admin cannot delete their own account through this path (avoid lockout/footgun).
  if (targetUid === callerUid) {
    throw new functions.HttpsError('failed-precondition', 'Cannot delete your own account via this function.');
  }

  const auth = getAuth();

  // 1. Delete the Firebase Auth account
  try {
    await auth.deleteUser(targetUid);
  } catch (err: any) {
    // If the Auth user is already gone (e.g. re-run after partial failure), don't hard-fail —
    // proceed to clean up Firestore anyway. Any other error, surface it.
    if (err.code !== 'auth/user-not-found') {
      throw new functions.HttpsError('internal', `Failed to delete Auth account: ${err.message}`);
    }
  }

  // 2. Delete the Firestore profile doc.
  await db.collection('users').doc(targetUid).delete();

  // 3. Audit log — server-side
  await db.collection('audit_logs').add({
    userId: callerUid,
    action: 'DELETE_USER',
    module: 'Users',
    targetId: targetUid,
    timestamp: new Date(),
    result: 'success',
  });

  return { success: true, deletedUid: targetUid };
});
