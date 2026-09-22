import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, where, addDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);

async function runVerification() {
  console.log('Authenticating Elena Rostova...');
  const userCred = await signInWithEmailAndPassword(auth, 'symbiote.elena@syncsphere.io', 'Password123!');
  const uid = userCred.user.uid;
  console.log('Authenticated UID:', uid);

  // 1. Dashboard queries check
  console.log('\n--- 1. Dashboard Data ---');
  const userSnap = await getDoc(doc(db, 'users', uid));
  console.log('User Profile:', userSnap.data()?.displayName, userSnap.data()?.role, 'Rating:', userSnap.data()?.rating, 'Earned:', userSnap.data()?.totalEarned);

  const projectsSnap = await getDocs(query(collection(db, 'projects'), where('assignedSymbioteId', '==', uid)));
  console.log('Assigned Projects count:', projectsSnap.size);
  projectsSnap.docs.forEach(d => console.log('  - Project:', d.id, d.data().title, d.data().status, d.data().budget));

  const invSnap = await getDocs(query(collection(db, 'invitations'), where('symbioteId', '==', uid)));
  console.log('Invitations count:', invSnap.size);
  invSnap.docs.forEach(d => console.log('  - Invitation:', d.id, d.data().status, d.data().projectTitle));

  const appsSnap = await getDocs(query(collection(db, 'applications'), where('symbioteId', '==', uid)));
  console.log('Proposals/Applications count:', appsSnap.size);
  appsSnap.docs.forEach(d => console.log('  - Application:', d.id, d.data().status, d.data().proposedRate));

  // 2. Browse Projects check
  console.log('\n--- 2. Browse Projects Data ---');
  const allProjectsSnap = await getDocs(collection(db, 'projects'));
  console.log('Total Open Projects in platform:', allProjectsSnap.size);

  // 3. Project Detail / Submit Proposal test
  console.log('\n--- 3. Submit Proposal Test ---');
  const sampleProject = allProjectsSnap.docs.find(d => d.data().status === 'open' || d.data().status === 'accepting_proposals');
  if (sampleProject) {
    console.log('Found open project for proposal test:', sampleProject.id, sampleProject.data().title);
    const newAppRef = await addDoc(collection(db, 'applications'), {
      projectId: sampleProject.id,
      projectTitle: sampleProject.data().title,
      symbioteId: uid,
      symbioteName: 'Elena Rostova',
      proposedRate: 15000,
      coverLetter: 'Automated test proposal verification.',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    console.log('Created test application/proposal ID:', newAppRef.id);
    const checkApp = await getDoc(newAppRef);
    console.log('Proposal verified in Firestore:', checkApp.exists(), checkApp.data()?.coverLetter);
  } else {
    console.log('No open project found for proposal test.');
  }

  // 4. Invitations test
  console.log('\n--- 4. Invitations State Test ---');
  if (invSnap.size > 0) {
    const inv = invSnap.docs[0];
    console.log('Testing invitation state update on ID:', inv.id, 'Current status:', inv.data().status);
    await setDoc(doc(db, 'invitations', inv.id), { status: 'accepted', updatedAt: new Date().toISOString() }, { merge: true });
    const updatedInv = await getDoc(doc(db, 'invitations', inv.id));
    console.log('Updated invitation status in Firestore:', updatedInv.data()?.status);
  } else {
    console.log('No invitations exist to test state update.');
  }

  // 5. My Projects check
  console.log('\n--- 5. My Projects ---');
  console.log('Assigned Projects count for table:', projectsSnap.size);

  // 6. Workspace sub-collections check (Tasks, Files, Updates)
  console.log('\n--- 6. Workspace Sub-collections ---');
  if (projectsSnap.size > 0) {
    const activeProjId = projectsSnap.docs[0].id;
    console.log('Testing workspace for project:', activeProjId);

    // Test Tasks
    const taskRef = await addDoc(collection(db, 'workspaces', activeProjId, 'tasks'), {
      title: 'Verification Test Task',
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    });
    console.log('Created workspace task ID:', taskRef.id);
    const taskCheck = await getDoc(taskRef);
    console.log('Task exists in Firestore:', taskCheck.exists(), taskCheck.data()?.title);

    // Test Updates ("Post Update")
    const updateRef = await addDoc(collection(db, 'workspaces', activeProjId, 'updates'), {
      content: 'Verification test update message.',
      authorUid: uid,
      authorName: 'Elena Rostova',
      createdAt: new Date().toISOString(),
    });
    console.log('Created workspace update ID:', updateRef.id);
    const updateCheck = await getDoc(updateRef);
    console.log('Workspace update exists in Firestore:', updateCheck.exists(), updateCheck.data()?.content);
  }

  // 7. Messages check
  console.log('\n--- 7. Messages ---');
  const convsSnap = await getDocs(query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid)));
  console.log('User conversations count:', convsSnap.size);

  // 8. Time Tracking test
  console.log('\n--- 8. Time Tracking ---');
  if (projectsSnap.size > 0) {
    const activeProjId = projectsSnap.docs[0].id;
    const timeRef = await addDoc(collection(db, 'time_entries'), {
      projectId: activeProjId,
      projectTitle: 'Test Project',
      symbioteId: uid,
      hours: 4.5,
      description: 'Verification test time logging',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
    console.log('Logged time entry ID:', timeRef.id);
    const timeCheck = await getDoc(timeRef);
    console.log('Time entry exists in Firestore:', timeCheck.exists(), timeCheck.data()?.hours, 'hours');
  }

  // 9. Earnings check
  console.log('\n--- 9. Earnings Data ---');
  const invoicesSnap = await getDocs(query(collection(db, 'invoices'), where('symbioteId', '==', uid)));
  console.log('Invoices count:', invoicesSnap.size);
  invoicesSnap.docs.forEach(d => console.log('  - Invoice:', d.id, d.data().amount, d.data().status));

  // 10. Invoices + Create Invoice test
  console.log('\n--- 10. Create Invoice Test ---');
  if (projectsSnap.size > 0) {
    const activeProj = projectsSnap.docs[0];
    const invRef = await addDoc(collection(db, 'invoices'), {
      projectId: activeProj.id,
      projectTitle: activeProj.data().title,
      symbioteId: uid,
      clientId: activeProj.data().clientId || 'client-test',
      amount: 2500,
      status: 'pending',
      description: 'Verification test invoice',
      createdAt: new Date().toISOString(),
    });
    console.log('Created invoice ID:', invRef.id);
    const invCheck = await getDoc(invRef);
    console.log('Invoice exists in Firestore:', invCheck.exists(), '$' + invCheck.data()?.amount);
  }

  // 11. Reviews check
  console.log('\n--- 11. Reviews Data ---');
  const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('targetId', '==', uid)));
  console.log('Reviews received count:', reviewsSnap.size);
  reviewsSnap.docs.forEach(d => console.log('  - Review:', d.id, d.data().rating, 'stars', d.data().comment));

  // 12. Profile edit test
  console.log('\n--- 12. Profile Edit Test ---');
  await setDoc(doc(db, 'users', uid), {
    title: 'Lead AI & Systems Architect',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  const reCheckProfile = await getDoc(doc(db, 'users', uid));
  console.log('Profile updated title in Firestore:', reCheckProfile.data()?.title);

  console.log('\nAll verification runs completed successfully!');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
