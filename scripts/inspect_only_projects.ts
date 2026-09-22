import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  await signInWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');
  const snap = await getDocs(collection(db, 'projects'));
  console.log(`Total projects in DB: ${snap.size}`);
  snap.forEach((d) => {
    const data = d.data();
    console.log(`ID: "${d.id}" | Title: "${data.title}" | Status: "${data.status}" | Owner: "${data.ownerId || data.clientId}" | Assigned: "${data.assignedSymbioteId || data.symbioteId}"`);
  });
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
