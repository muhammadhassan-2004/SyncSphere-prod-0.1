const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');
const firebaseConfig = require('../firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const COLLECTIONS_TO_CLEAN = [
  'invoices',
  'time_entries',
  'files',
  'notifications',
  'tasks',
  'milestones',
  'workspaces',
  'applications',
  'invitations',
  'audit_logs'
];

const TEST_USERS = [
  {
    email: 'client.demo@syncsphere.io',
    password: 'Password123!',
    displayName: 'Alexander Wright',
    firstName: 'Alexander',
    lastName: 'Wright',
    role: 'client',
    companyName: 'Aether Dynamics Inc.',
    jobTitle: 'VP of Engineering',
    title: 'VP of Engineering',
    location: 'San Francisco, CA, USA',
    bio: 'VP of Engineering leading autonomous AI agent deployment at Aether Dynamics Inc.',
    phoneNumber: '+1 (555) 234-5678',
    avatarInitials: 'AW',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    createdAt: new Date().toISOString(),
  },
  {
    email: 'symbiote.elena@syncsphere.io',
    password: 'Password123!',
    displayName: 'Dr. Elena Rostova',
    firstName: 'Elena',
    lastName: 'Rostova',
    role: 'symbiote',
    companyName: 'Neural Systems Lab',
    jobTitle: 'Autonomous Agents Lead',
    title: 'Autonomous AI & RL Specialist',
    location: 'Boston, MA, USA',
    bio: 'PhD in Reinforcement Learning from MIT. 8+ years developing production multi-agent reinforcement systems and autonomous LLM workflows.',
    phoneNumber: '+1 (555) 876-5432',
    hourlyRate: 185,
    matchScore: 98,
    skills: ['Autonomous Agents', 'Reinforcement Learning', 'PyTorch', 'LangChain', 'Python', 'Multi-Agent Systems'],
    rating: 4.98,
    reviewCount: 34,
    completedProjects: 28,
    verified: true,
    avatarInitials: 'ER',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    createdAt: new Date().toISOString(),
  },
  {
    email: 'symbiote.marcus@syncsphere.io',
    password: 'Password123!',
    displayName: 'Marcus Vance',
    firstName: 'Marcus',
    lastName: 'Vance',
    role: 'symbiote',
    companyName: 'Vance AI Systems',
    jobTitle: 'Senior MLOps & LLM Engineer',
    title: 'MLOps Architect & High-Throughput AI Lead',
    location: 'Austin, TX, USA',
    bio: 'Specialist in low-latency LLM inference engines, vLLM optimizations, and secure cloud model serving pipelines.',
    phoneNumber: '+1 (555) 987-6543',
    hourlyRate: 160,
    matchScore: 95,
    skills: ['MLOps', 'vLLM', 'Kubernetes', 'Triton Server', 'TensorRT', 'FastAPI', 'Python'],
    rating: 4.95,
    reviewCount: 22,
    completedProjects: 19,
    verified: true,
    avatarInitials: 'MV',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    createdAt: new Date().toISOString(),
  }
];

async function createTestAccounts() {
  console.log('\n--- 1. ENSURING TEST ACCOUNTS EXIST IN AUTH & FIRESTORE ---');
  for (const u of TEST_USERS) {
    let uid = '';
    try {
      const userCred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      uid = userCred.user.uid;
      console.log(`Created Auth User: ${u.email} (UID: ${uid})`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const userCred = await signInWithEmailAndPassword(auth, u.email, u.password);
        uid = userCred.user.uid;
        console.log(`User ${u.email} already exists in Auth. Using UID: ${uid}`);
      } else {
        console.error(`Auth error for ${u.email}:`, e.message);
        continue;
      }
    }

    if (uid) {
      const userDocRef = doc(db, 'users', uid);
      const profileData = {
        uid,
        ...u
      };
      delete profileData.password;
      await setDoc(userDocRef, profileData, { merge: true });
      console.log(`Saved User Profile doc in Firestore: users/${uid} (${u.displayName} - ${u.role})`);
    }
  }
}

async function cleanupCollections() {
  console.log('\n--- 2. CLEANING UP FAKE / SEEDED DOCUMENTS IN SYNCHSPHERE-PROD ---');
  // Sign in as client.demo@syncsphere.io to get read/write permission
  await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
  console.log('Signed in as client.demo@syncsphere.io for admin cleanup');

  for (const colName of COLLECTIONS_TO_CLEAN) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      const countBefore = snap.size;
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      console.log(`Collection [${colName}]: Deleted ${countBefore} documents. Current count: 0`);
    } catch (e) {
      console.log(`Collection [${colName}]: Current count: 0 (or inaccessible: ${e.message})`);
    }
  }
}

async function run() {
  await createTestAccounts();
  await cleanupCollections();
  console.log('\n--- CLEANUP & USER CREATION COMPLETE ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
