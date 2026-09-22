import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log('Signing in as client.demo@syncsphere.io...');
  try {
    await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
    console.log('Signed in successfully!');
  } catch (err: any) {
    console.error('Failed to sign in as client.demo:', err.message);
  }

  const snap = await getDocs(collection(db, 'users'));
  console.log(`Total users in Firestore users collection: ${snap.size}`);
  snap.docs.forEach((doc) => {
    console.log(`\nUID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
