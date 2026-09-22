import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);

const COLLECTIONS = [
  'users',
  'projects',
  'applications',
  'invitations',
  'workspaces',
  'conversations',
  'time_entries',
  'invoices',
  'reviews',
  'notifications',
  'audit_logs',
  'platform_settings',
];

async function scan() {
  await signInWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');

  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`\n========== COLLECTION: "${colName}" (${snap.size} docs) ==========`);
      snap.forEach((d) => {
        console.log(`Doc ID: ${d.id}`);
        console.log(JSON.stringify(d.data(), null, 2));
      });
    } catch (err: any) {
      console.error(`Error reading collection "${colName}":`, err?.message || err);
    }
  }

  process.exit(0);
}

scan().catch(console.error);
