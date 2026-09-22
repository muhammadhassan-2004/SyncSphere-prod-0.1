import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);

async function run() {
  console.log('Signing in...');
  let user;
  try {
    const cred = await signInWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');
    user = cred.user;
  } catch (err) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');
      user = cred.user;
    } catch (e2) {
      console.error('Auth error:', e2);
      process.exit(1);
    }
  }

  console.log('Signed in as:', user.uid, user.email);

  // Set user doc with admin role so isAdmin() works safely
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: 'Admin Inspector',
    role: 'admin',
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log('\n================ USERS ================');
  const userSnap = await getDocs(collection(db, 'users'));
  console.log(`Total user docs found: ${userSnap.size}`);
  userSnap.forEach((d) => {
    const data = d.data();
    console.log(`USER ID: ${d.id} | Email: ${data.email} | Name: ${data.displayName || data.name} | Role: ${data.role}`);
  });

  console.log('\n================ INVITATIONS ================');
  const invSnap = await getDocs(collection(db, 'invitations'));
  console.log(`Total invitation docs found: ${invSnap.size}`);
  invSnap.forEach((d) => {
    console.log(`\nINVITATION ID: ${d.id}`);
    console.log(JSON.stringify(d.data(), null, 2));
  });

  console.log('\n================ PROJECTS ================');
  const projSnap = await getDocs(collection(db, 'projects'));
  console.log(`Total project docs found: ${projSnap.size}`);
  projSnap.forEach((d) => {
    const data = d.data();
    console.log(`\nPROJECT ID: ${d.id}`);
    console.log(`Title: "${data.title}" | clientId: ${data.clientId} | ownerId: ${data.ownerId} | assignedSymbioteId: ${data.assignedSymbioteId}`);
    console.log(`teamMembers:`, JSON.stringify(data.teamMembers || [], null, 2));
  });

  process.exit(0);
}

run().catch((err) => {
  console.error('Run error:', err);
  process.exit(1);
});
