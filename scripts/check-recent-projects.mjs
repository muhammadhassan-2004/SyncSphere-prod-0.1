import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

const adminApp = getFirebaseAdmin();
if (!adminApp) {
  console.log('No admin app');
  process.exit(1);
}
const db = getAdminFirestore(adminApp);
const snap = await db.collection('projects').orderBy('createdAt', 'desc').limit(5).get();
console.log('Recent Projects count:', snap.docs.length);

for (const doc of snap.docs) {
  const d = doc.data();
  console.log(`\nProject ID: ${doc.id}`);
  console.log(`Title: ${d.title}`);
  console.log(`Category: ${d.category}`);
  console.log(`Skills:`, d.skills);
  console.log(`Description: ${d.description?.slice(0, 100)}...`);

  // Check matches subcollection
  const matchSnap = await doc.ref.collection('matches').get();
  console.log(`Matches count in subcollection: ${matchSnap.docs.length}`);
  matchSnap.docs.forEach(m => {
    const md = m.data();
    console.log(`  - Candidate: ${md.symbioteName} (${md.symbioteTitle}) | Match Score: ${md.matchScore}% | Explanation: ${md.explanation?.slice(0, 80)}...`);
  });
}
