import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const adminApp = getFirebaseAdmin();
  const db = getAdminFirestore(adminApp!);
  
  const snap = await db.collection('users').get();
  snap.forEach(d => {
    const data = d.data();
    if (['Mack lewis', 'Sarah', 'Nick josh'].includes(data.displayName || data.name)) {
      console.log(`User: ${data.displayName || data.name} -> avatarUrl: "${data.avatarUrl}"`);
    }
  });
}

main().catch(console.error);
