import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const EMAILS = ['admin@syncsphere.com', 'orbics@syncsphere.com', 'adam@syncsphere.com', 'client.demo@syncsphere.io', 'symbiote.elena@syncsphere.io'];
const PASSWORDS = ['Admin123!', 'Orbics123!', 'Adam123!', 'Password123!', 'admin123', 'password123'];

async function run() {
  for (const email of EMAILS) {
    let success = false;
    for (const pass of PASSWORDS) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const u = cred.user;
        console.log(`\nSUCCESS: Email "${email}" logged in with password "${pass}"`);
        console.log(`Auth UID: "${u.uid}"`);
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        if (userSnap.exists()) {
          console.log(`Firestore doc users/${u.uid} EXISTS:`, JSON.stringify(userSnap.data(), null, 2));
        } else {
          console.log(`Firestore doc users/${u.uid} DOES NOT EXIST!`);
        }
        success = true;
        break;
      } catch (err: any) {
        // try next password
      }
    }
    if (!success) {
      console.log(`\nFAILED: Email "${email}" could not log in with any tested password.`);
    }
  }
}

run().catch(console.error);
