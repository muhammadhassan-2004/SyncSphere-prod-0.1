import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log('Signing in as client.demo@syncsphere.io...');
  await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
  console.log('Signed in successfully! Fetching all docs from users collection...');

  const snap = await getDocs(collection(db, 'users'));
  console.log(`Found ${snap.size} documents in 'users' collection:\n`);
  snap.docs.forEach((doc) => {
    console.log(`Doc ID (UID): "${doc.id}"`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log('--------------------------------------------------');
  });
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
