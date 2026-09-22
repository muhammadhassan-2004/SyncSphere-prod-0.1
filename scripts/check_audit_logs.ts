import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function inspectAuditLogs() {
  console.log('Signing in as admin@syncsphere.com...');
  await signInWithEmailAndPassword(auth, 'admin@syncsphere.com', 'Password123!');
  console.log('Signed in successfully! Fetching audit_logs...');

  const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')));
  console.log(`\n>>> Total documents in audit_logs collection: ${snap.size} <<<\n`);
  
  snap.docs.forEach((doc, idx) => {
    const d = doc.data();
    let dateStr = 'No timestamp';
    if (d.timestamp) {
      if (typeof d.timestamp.toDate === 'function') dateStr = d.timestamp.toDate().toLocaleString();
      else dateStr = String(d.timestamp);
    }
    console.log(`[#${idx + 1}] ID: ${doc.id}`);
    console.log(`  Actor: ${d.userEmail || d.userId} (${d.userId})`);
    console.log(`  Action: ${d.action} | Module: ${d.module} | Result: ${d.result}`);
    console.log(`  Target: ${d.targetId || 'N/A'}`);
    console.log(`  Timestamp: ${dateStr}`);
    console.log(`  Details: ${d.details || 'N/A'}`);
    console.log(`  IP: ${d.ipAddress || 'N/A'}`);
    console.log('--------------------------------------------------');
  });
}

inspectAuditLogs().catch(console.error);
