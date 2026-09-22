"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteUser = void 0;
const functions = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
exports.adminDeleteUser = functions.onCall(async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new functions.HttpsError('unauthenticated', 'Must be signed in.');
    }
    // Server-side admin check — NEVER trust a client-passed "isAdmin" flag.
    const db = (0, firestore_1.getFirestore)();
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
    const auth = (0, auth_1.getAuth)();
    // 1. Delete the Firebase Auth account
    try {
        await auth.deleteUser(targetUid);
    }
    catch (err) {
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
//# sourceMappingURL=adminDeleteUser.js.map