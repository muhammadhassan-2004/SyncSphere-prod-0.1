import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ACCOUNTS = [
  {
    email: 'admin@syncsphere.com',
    password: 'Password123!',
    role: 'admin',
    displayName: 'Platform Admin',
    fullName: 'Platform Admin',
    firstName: 'Platform',
    lastName: 'Admin',
  },
  {
    email: 'orbics@syncsphere.com',
    password: 'Password123!',
    role: 'client',
    displayName: 'Orbics Client',
    fullName: 'Orbics Client',
    firstName: 'Orbics',
    lastName: 'Client',
    companyName: 'Orbics',
  },
  {
    email: 'adam@syncsphere.com',
    password: 'Password123!',
    role: 'symbiote',
    displayName: 'Adam John',
    fullName: 'Adam Symbiote',
    title: 'Web Developer',
    hourlyRate: 127,
  },
];

async function run() {
  console.log('Ensuring Auth accounts & Firestore user documents match...');

  for (const acc of ACCOUNTS) {
    let uid = '';
    try {
      const cred = await signInWithEmailAndPassword(auth, acc.email, acc.password);
      uid = cred.user.uid;
      console.log(`Signed in ${acc.email} (UID: ${uid})`);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
          uid = cred.user.uid;
          console.log(`Created new Auth account for ${acc.email} (UID: ${uid})`);
        } catch (createErr: any) {
          console.error(`Error creating user ${acc.email}:`, createErr.message);
          continue;
        }
      } else {
        console.error(`Auth error for ${acc.email}:`, err.message);
        continue;
      }
    }

    if (uid) {
      const userRef = doc(db, 'users', uid);
      const existingSnap = await getDoc(userRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};

      const profileData: Record<string, any> = {
        ...existingData,
        uid,
        email: acc.email,
        role: acc.role,
        displayName: acc.displayName,
        fullName: acc.fullName,
        updatedAt: new Date().toISOString(),
      };
      if (!existingSnap.exists()) {
        profileData.createdAt = new Date().toISOString();
      }

      await setDoc(userRef, profileData, { merge: true });
      console.log(`Updated Firestore document users/${uid} for ${acc.email} with role: "${acc.role}"`);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
