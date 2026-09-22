import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

const adminApp = getFirebaseAdmin();
if (!adminApp) {
  console.log('No admin app');
  process.exit(1);
}
const db = getAdminFirestore(adminApp);
const snap = await db.collection('users').get();
console.log('Total users:', snap.docs.length);
snap.docs.forEach(doc => {
  const d = doc.data();
  console.log(`- ${doc.id} | Name: ${d.displayName || d.fullName} | Role: ${d.role} | Skills:`, d.skills);
});
