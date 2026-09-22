import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const defaultDb = getFirestore(app);
const customDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : defaultDb;

const auth = getAuth(app);

const MOCK_INVITATION_IDS = [
  'YgHq1CQrvs61aksAPBL4', // CyberShield Capital
  'pXom5jgM1vAHMX5BtxVM', // Nexus Global Tech
  'r44tO8LWtCKfiBGHEdFp', // Apex Neural Labs
  'yPLJnmopcGoxbaEjxWPH', // DataFlow Systems
];

async function cleanup() {
  console.log('Signing in as admin...');
  const cred = await signInWithEmailAndPassword(auth, 'test_admin_inspect@syncsphere.com', 'AdminInspect123!');
  const user = cred.user;

  // Set admin doc in BOTH databases so isAdmin() rule succeeds in both
  await setDoc(doc(defaultDb, 'users', user.uid), {
    email: user.email,
    displayName: 'Admin Inspector',
    role: 'admin',
    createdAt: new Date().toISOString()
  }, { merge: true });

  if (customDb !== defaultDb) {
    await setDoc(doc(customDb, 'users', user.uid), {
      email: user.email,
      displayName: 'Admin Inspector',
      role: 'admin',
      createdAt: new Date().toISOString()
    }, { merge: true });
  }

  const dbInstances = [
    { label: '(default)', db: defaultDb },
    { label: firebaseConfig.firestoreDatabaseId, db: customDb },
  ];

  for (const { label, db } of dbInstances) {
    console.log(`\n=================== CLEANING UP DB: ${label} ===================`);

    // 1. Delete Mock Invitations
    for (const invId of MOCK_INVITATION_IDS) {
      try {
        const docRef = doc(db, 'invitations', invId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await deleteDoc(docRef);
          console.log(`[${label}] SUCCESS: Deleted mock invitation doc: ${invId}`);
        } else {
          console.log(`[${label}] Mock invitation doc ${invId} not present.`);
        }
      } catch (err: any) {
        console.error(`[${label}] Failed to delete ${invId}:`, err?.message || err);
      }
    }

    // 2. Fix Real Invitations (Set projectTitle to "Privacy app")
    const invSnap = await getDocs(collection(db, 'invitations'));
    console.log(`[${label}] Remaining invitation count: ${invSnap.size}`);
    for (const d of invSnap.docs) {
      const data = d.data();
      console.log(`[${label}] Inspecting invitation ID ${d.id}:`, data.projectTitle || data.projectId);
      
      // If invitation is for Privacy app project or missing projectTitle or generic
      if (data.projectId === 'GaX5FeRkeGTdkD97zDyy' || !data.projectTitle || data.projectTitle === 'Project Invitation') {
        await updateDoc(doc(db, 'invitations', d.id), {
          projectTitle: 'Privacy app',
          clientName: data.clientName || 'Aether Dynamics Inc.',
        });
        console.log(`[${label}] SUCCESS: Updated invitation ${d.id}: projectTitle explicitly set to "Privacy app"`);
      }
    }

    // 3. Clean Project Team Members (Remove "Marcus Vance")
    const projRef = doc(db, 'projects', 'GaX5FeRkeGTdkD97zDyy');
    const projSnap = await getDoc(projRef);
    if (projSnap.exists()) {
      const projData = projSnap.data();
      console.log(`[${label}] Found "Privacy app" project:`, projData.title);
      const teamMembers = projData.teamMembers || [];
      const updatedTeam = teamMembers.filter(
        (m: any) =>
          m.uid !== 'on29RmdwChdxT7gjrtgJo4vKAQ23' &&
          m.displayName !== 'Marcus Vance' &&
          m.name !== 'Marcus Vance'
      );

      await updateDoc(projRef, {
        teamMembers: updatedTeam,
      });
      console.log(`[${label}] SUCCESS: Updated "Privacy app" project: removed Marcus Vance from teamMembers. New team count: ${updatedTeam.length}`);
    } else {
      console.log(`[${label}] Project "GaX5FeRkeGTdkD97zDyy" not present in this DB.`);
    }
  }

  // 4. Sync defaultDb to customDb if different
  if (customDb !== defaultDb) {
    console.log('\n=================== SYNCING DEFAULT DB DATA TO CUSTOM DB ===================');
    
    // Sync Privacy app project
    const projSnapDefault = await getDoc(doc(defaultDb, 'projects', 'GaX5FeRkeGTdkD97zDyy'));
    if (projSnapDefault.exists()) {
      await setDoc(doc(customDb, 'projects', 'GaX5FeRkeGTdkD97zDyy'), projSnapDefault.data(), { merge: true });
      console.log('Synced Privacy app project to custom DB.');
    }

    // Sync remaining invitations
    const invSnapDefault = await getDocs(collection(defaultDb, 'invitations'));
    for (const d of invSnapDefault.docs) {
      await setDoc(doc(customDb, 'invitations', d.id), d.data(), { merge: true });
      console.log(`Synced invitation ${d.id} to custom DB.`);
    }
  }

  console.log('\n=================== CLEANUP & DATA AUDIT COMPLETE ===================');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
