import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ACCOUNTS = [
  { email: 'admin@syncsphere.com', pass: 'Password123!' },
  { email: 'orbics@syncsphere.com', pass: 'Password123!' },
  { email: 'adam@syncsphere.com', pass: 'Password123!' },
  { email: 'client.demo@syncsphere.io', pass: 'Password123!' },
  { email: 'symbiote.elena@syncsphere.io', pass: 'Password123!' },
];

async function run() {
  for (const acc of ACCOUNTS) {
    console.log(`\n========================================`);
    console.log(`Testing login: ${acc.email} with ${acc.pass}`);
    try {
      const cred = await signInWithEmailAndPassword(auth, acc.email, acc.pass);
      const uid = cred.user.uid;
      console.log(`SUCCESS! Auth UID: "${uid}"`);

      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        console.log(`Firestore doc users/${uid} EXISTS:`, snap.data());
      } else {
        console.log(`WARNING: Firestore doc users/${uid} DOES NOT EXIST!`);

        // Check if user doc exists under email search
        const q = query(collection(db, 'users'), where('email', '==', acc.email.toLowerCase()));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          console.log(`Found doc by email search! Doc ID: "${qSnap.docs[0].id}"`, qSnap.docs[0].data());
        } else {
          console.log(`No doc found by email search either.`);
        }
      }
    } catch (err: any) {
      console.log(`LOGIN FAILED: ${err.message || err.code}`);
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
