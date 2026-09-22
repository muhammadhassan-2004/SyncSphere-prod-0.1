import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ACCOUNTS = [
  { email: 'admin@syncsphere.com', pass: 'Admin123!' },
  { email: 'orbics@syncsphere.com', pass: 'Orbics123!' },
  { email: 'adam@syncsphere.com', pass: 'Adam123!' },
];

async function run() {
  for (const acc of ACCOUNTS) {
    console.log(`\n========================================`);
    console.log(`Attempting login for: ${acc.email}`);
    try {
      const cred = await signInWithEmailAndPassword(auth, acc.email, acc.pass);
      const user = cred.user;
      console.log(`SUCCESS! Firebase Auth UID for ${acc.email}: "${user.uid}"`);

      // Read document at users/{user.uid}
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        console.log(`Document at users/${user.uid} EXISTS:`, JSON.stringify(userSnap.data(), null, 2));
      } else {
        console.log(`WARNING: Document at users/${user.uid} DOES NOT EXIST!`);
      }

      // Now query all docs in 'users' collection while signed in
      const snap = await getDocs(collection(db, 'users'));
      console.log(`Total docs in 'users' collection: ${snap.size}`);
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(`- Doc ID: "${d.id}" | email: "${data.email}" | role: "${data.role}"`);
      });

    } catch (err: any) {
      console.error(`FAILED to log in or read for ${acc.email}:`, err.message || err);
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
