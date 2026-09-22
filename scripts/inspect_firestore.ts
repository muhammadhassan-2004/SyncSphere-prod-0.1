import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function inspect() {
  console.log('--- INVITATIONS COLLECTION ---');
  const invSnap = await getDocs(collection(db, 'invitations'));
  invSnap.forEach((d) => {
    console.log(`ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
  });

  console.log('\n--- PROJECTS COLLECTION ---');
  const projSnap = await getDocs(collection(db, 'projects'));
  projSnap.forEach((d) => {
    console.log(`ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
  });

  console.log('\n--- USERS COLLECTION ---');
  const userSnap = await getDocs(collection(db, 'users'));
  userSnap.forEach((d) => {
    console.log(`ID: ${d.id} | Email: ${d.data().email} | Name: ${d.data().displayName || d.data().name}`);
  });
}

inspect().catch(console.error);
