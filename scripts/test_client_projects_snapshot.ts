import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

async function run() {
  console.log('Testing subscribeToProjects...');
  const colRef = collection(db, 'projects');
  const unsub = onSnapshot(
    colRef,
    (snapshot) => {
      console.log(`Snapshot received! Total projects: ${snapshot.docs.length}`);
      snapshot.docs.forEach((d) => {
        const data = d.data();
        console.log(`- ${d.id}: "${data.title}" (status: ${data.status})`);
      });
      unsub();
      process.exit(0);
    },
    (error) => {
      console.error('onSnapshot error:', error);
      process.exit(1);
    }
  );
}

run();
