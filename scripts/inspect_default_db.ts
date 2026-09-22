import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const defaultDb = getFirestore(app); // (default) database
const customDb = getFirestore(app, firebaseConfig.firestoreDatabaseId); // custom database

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
];

async function scanDb(dbInstance: any, dbLabel: string) {
  console.log(`\n=================== DB INSTANCE: ${dbLabel} ===================`);
  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(dbInstance, colName));
      console.log(`Collection "${colName}": ${snap.size} docs`);
      snap.forEach((d) => {
        console.log(`  [Doc ID: ${d.id}]`, JSON.stringify(d.data(), null, 2));
      });
    } catch (err: any) {
      console.error(`  Error reading "${colName}" from ${dbLabel}:`, err?.message || err);
    }
  }
}

async function run() {
  await signInWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');
  await scanDb(defaultDb, '(default)');
  await scanDb(customDb, firebaseConfig.firestoreDatabaseId);
  process.exit(0);
}

const auth = getAuth(app);
run().catch(console.error);
