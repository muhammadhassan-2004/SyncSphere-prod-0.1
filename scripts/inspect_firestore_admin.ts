import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

// Initialize Admin SDK
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined);

async function inspect() {
  console.log('=== INVITATIONS COLLECTION ===');
  const invSnap = await db.collection('invitations').get();
  console.log(`Total invitations: ${invSnap.size}`);
  invSnap.forEach((doc) => {
    console.log(`\n[INVITATION DOC ID]: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });

  console.log('\n=== PROJECTS COLLECTION ===');
  const projSnap = await db.collection('projects').get();
  console.log(`Total projects: ${projSnap.size}`);
  projSnap.forEach((doc) => {
    const d = doc.data();
    console.log(`\n[PROJECT DOC ID]: ${doc.id}`);
    console.log(`Title: "${d.title}" | ownerId: ${d.ownerId} | clientId: ${d.clientId} | assignedSymbioteId: ${d.assignedSymbioteId}`);
    console.log(`Team Members (${d.teamMembers?.length || 0}):`, JSON.stringify(d.teamMembers, null, 2));
  });

  console.log('\n=== USERS COLLECTION ===');
  const userSnap = await db.collection('users').get();
  console.log(`Total users: ${userSnap.size}`);
  userSnap.forEach((doc) => {
    const d = doc.data();
    console.log(`[USER DOC ID]: ${doc.id} | Email: ${d.email} | Name: ${d.displayName || d.name} | Role: ${d.role}`);
  });

  process.exit(0);
}

inspect().catch((err) => {
  console.error('Inspection error:', err);
  process.exit(1);
});
