const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('../firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const COLLECTIONS = [
  'users',
  'invoices',
  'time_entries',
  'files',
  'notifications',
  'tasks',
  'milestones',
  'workspaces',
  'applications',
  'invitations',
  'projects'
];

async function checkCounts() {
  console.log('=== FIRESTORE COLLECTION COUNTS IN SYNCHSPHERE-PROD ===');
  await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
  
  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`- Collection [${colName}]: ${snap.size} documents`);
      if (colName === 'users') {
        snap.docs.forEach((d) => {
          const data = d.data();
          console.log(`   > User: ${data.displayName} (${data.email}) - Role: ${data.role} - UID: ${d.id}`);
        });
      }
    } catch (e) {
      console.log(`- Collection [${colName}]: 0 documents (or empty)`);
    }
  }
}

checkCounts().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
