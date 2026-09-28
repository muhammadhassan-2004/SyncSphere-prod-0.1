import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

async function main() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
  console.log('Signed in as:', cred.user.uid, cred.user.email);
  const snap = await getDocs(collection(db, 'projects'));
  console.log('Total projects:', snap.size);
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`Project: [${d.id}] | Title: "${data.title}" | Status: ${data.status} | Progress: ${data.progressPct}% | Owner: ${data.ownerId || data.clientId}`);
    const tasksSnap = await getDocs(collection(db, 'workspaces', d.id, 'tasks'));
    console.log(`   Tasks count: ${tasksSnap.size}`);
    tasksSnap.docs.forEach(t => console.log(`     Task [${t.id}]: "${t.data().title}" | Status: ${t.data().status}`));
  }
}
main().catch(console.error);
