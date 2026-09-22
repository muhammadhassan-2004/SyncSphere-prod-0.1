import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';

const API_KEY = firebaseConfig.apiKey;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ACCOUNTS = [
  { email: 'admin@syncsphere.com', pass: 'Password123!', role: 'admin' },
  { email: 'orbics@syncsphere.com', pass: 'Password123!', role: 'client' },
  { email: 'adam@syncsphere.com', pass: 'Password123!', role: 'symbiote' },
  { email: 'client.demo@syncsphere.io', pass: 'Password123!', role: 'client' },
  { email: 'symbiote.elena@syncsphere.io', pass: 'Password123!', role: 'symbiote' },
];

async function main() {
  console.log('Signing in as client.demo@syncsphere.io to authorize Firestore writes...');
  await signInWithEmailAndPassword(auth, 'client.demo@syncsphere.io', 'Password123!');
  console.log('Signed in successfully!\n');

  for (const acc of ACCOUNTS) {
    console.log(`----------------------------------------`);
    console.log(`Checking Auth UID for ${acc.email}...`);

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acc.email, password: acc.pass, returnSecureToken: true }),
    });

    const data = await res.json();
    if (data.error) {
      console.error(`Error signing in via REST for ${acc.email}:`, data.error);
      continue;
    }

    const authUid = data.localId;
    console.log(`Auth UID for ${acc.email}: "${authUid}"`);

    // Check if doc exists at users/{authUid}
    const userDocRef = doc(db, 'users', authUid);
    const snap = await getDoc(userDocRef);

    // Search by email in users collection for existing profile data
    const q = query(collection(db, 'users'), where('email', '==', acc.email.toLowerCase()));
    const qSnap = await getDocs(q);

    let existingData: Record<string, any> = {};
    if (!qSnap.empty) {
      existingData = qSnap.docs[0].data();
      console.log(`Found existing profile for ${acc.email} in Firestore doc ID: "${qSnap.docs[0].id}"`);
    } else if (snap.exists()) {
      existingData = snap.data();
    }

    const fullProfile: Record<string, any> = {
      ...existingData,
      uid: authUid,
      email: acc.email,
      role: acc.role,
      displayName: existingData.displayName || existingData.fullName || acc.email.split('@')[0],
      updatedAt: new Date().toISOString(),
    };
    if (!existingData.createdAt) {
      fullProfile.createdAt = new Date().toISOString();
    }

    await setDoc(userDocRef, fullProfile, { merge: true });
    console.log(`SUCCESSFULLY SYNCED users/${authUid} with role "${acc.role}"!`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
