import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSearch(q: string) {
  const snap = await getDocs(collection(db, 'projects'));
  const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  const query = q.toLowerCase().trim();
  const matchingProjects = projects.filter((p: any) => {
    const matchTitle = (p.title || '').toLowerCase().includes(query);
    const matchDesc = (p.description || '').toLowerCase().includes(query);
    const matchCat = (p.category || '').toLowerCase().includes(query);
    const matchTags = (p.techTags || p.skills || []).some((t: string) => t.toLowerCase().includes(query));
    return matchTitle || matchDesc || matchCat || matchTags;
  });

  console.log(`\nQuery: "${q}" -> Total matching projects: ${matchingProjects.length}`);
  matchingProjects.forEach((p: any) => {
    console.log(`- [${p.status}] "${p.title}" (ID: ${p.id}, owner: ${p.ownerId || p.clientId})`);
  });
}

async function run() {
  await testSearch('Privacy');
  await testSearch('Web');
  await testSearch('app');
  await testSearch('completed');
  await testSearch('project');
  process.exit(0);
}

run().catch(console.error);
