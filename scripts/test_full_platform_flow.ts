import 'dotenv/config';
import assert from 'node:assert';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { getAdminFirestore } from '../server/firebaseAdmin';

// Services from application
import { createProject, getProjectById, updateProject, addTeamMemberToProject } from '../src/lib/firestore/projects';
import { createInvitation, updateInvitationStatus } from '../src/lib/firestore/invitations';
import { createTask, getWorkspaceTasks, updateTaskStatus, approveTaskByClient } from '../src/lib/firestore/workspace';
import { createTimeEntry, updateTimeEntryStatus } from '../src/lib/firestore/timeEntries';
import { createInvoice, getInvoices, markInvoicePaidByClient, confirmInvoicePaymentBySymbiote } from '../src/lib/firestore/invoices';
import { getUserProfile, setUserProfile } from '../src/lib/firestore/users';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const timestamp = Date.now();
const testClientEmail = `test_client_${timestamp}@syncsphere.test`;
const testSymbioteEmail = `test_symbiote_${timestamp}@syncsphere.test`;
const testPassword = 'Password123!@#';

let clientUid = '';
let symbioteUid = '';
let createdProjectId = '';
let createdInvitationId = '';
let createdTaskId = '';
let createdTimeEntryId = '';
let createdInvoiceId = '';

console.log('================================================================');
console.log('🚀 SyncSphere Complete End-to-End Platform Flow Verification');
console.log('================================================================\n');

async function runStep(name: string, fn: () => Promise<void>) {
  process.stdout.write(`⏳ ${name}... `);
  try {
    await fn();
    console.log('✅ PASSED');
  } catch (error: any) {
    console.log('❌ FAILED');
    console.error(`   Error: ${error.message || error}`);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  }
}

async function main() {
  try {
    // -------------------------------------------------------------
    // FLOW 1: Registration / Signup Flow
    // -------------------------------------------------------------
    console.log('\n--- FLOW 1: Registration & Signup ---');
    await runStep('1.1: Register Client Account via Auth & create UserProfile', async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, testClientEmail, testPassword);
      clientUid = userCredential.user.uid;
      assert.ok(clientUid, 'Client UID must be generated');

      const clientProfile = {
        uid: clientUid,
        email: testClientEmail,
        fullName: 'Test Enterprise Client',
        displayName: 'Test Client',
        role: 'client' as const,
        company: 'SyncSphere QA Corp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingCompleted: true,
      };
      await setUserProfile(clientProfile);

      const saved = await getUserProfile(clientUid);
      assert.ok(saved, 'Client profile must exist in Firestore');
      assert.strictEqual(saved.role, 'client', 'Client profile role must be client');
      assert.strictEqual(saved.email, testClientEmail);
    });

    await runStep('1.2: Register Freelancer (Symbiote) Account via Auth & create UserProfile', async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      symbioteUid = userCredential.user.uid;
      assert.ok(symbioteUid, 'Freelancer UID must be generated');

      const symbioteProfile = {
        uid: symbioteUid,
        email: testSymbioteEmail,
        fullName: 'Alex River Specialist',
        displayName: 'Alex River',
        role: 'symbiote' as const,
        title: 'Full Stack Architect',
        hourlyRate: 85,
        skills: ['React', 'TypeScript', 'Firebase', 'Node.js'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingCompleted: true,
      };
      await setUserProfile(symbioteProfile);

      const saved = await getUserProfile(symbioteUid);
      assert.ok(saved, 'Freelancer profile must exist in Firestore');
      assert.strictEqual(saved.role, 'symbiote', 'Freelancer profile role must be symbiote');
      assert.strictEqual(saved.hourlyRate, 85);
    });

    // -------------------------------------------------------------
    // FLOW 2: Login / Authentication Flow
    // -------------------------------------------------------------
    console.log('\n--- FLOW 2: Login & Authentication ---');
    await runStep('2.1: Client Sign-out & Sign-in Authentication', async () => {
      await signOut(auth);
      assert.strictEqual(auth.currentUser, null, 'Auth current user should be null after signout');

      const userCredential = await signInWithEmailAndPassword(auth, testClientEmail, testPassword);
      assert.strictEqual(userCredential.user.uid, clientUid, 'Signed in UID must match client UID');
      assert.strictEqual(auth.currentUser?.email, testClientEmail);

      const profile = await getUserProfile(clientUid);
      assert.strictEqual(profile?.role, 'client');
    });

    await runStep('2.2: Freelancer Sign-out & Sign-in Authentication', async () => {
      await signOut(auth);
      const userCredential = await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      assert.strictEqual(userCredential.user.uid, symbioteUid, 'Signed in UID must match symbiote UID');
      assert.strictEqual(auth.currentUser?.email, testSymbioteEmail);

      const profile = await getUserProfile(symbioteUid);
      assert.strictEqual(profile?.role, 'symbiote');
    });

    // -------------------------------------------------------------
    // FLOW 3: Project Creation Flow
    // -------------------------------------------------------------
    console.log('\n--- FLOW 3: Project Creation ---');
    await runStep('3.1: Client creates Project Brief in Firestore', async () => {
      // Sign back in as client
      await signInWithEmailAndPassword(auth, testClientEmail, testPassword);

      const newProjectData = {
        title: `NextGen AI Automation Platform ${timestamp}`,
        description: 'End-to-end full stack architecture for cloud microservices & real-time sync',
        category: 'Development & IT',
        skills: ['React', 'TypeScript', 'Node.js', 'Firebase'],
        budget: 4500,
        budgetType: 'fixed' as const,
        timeline: '1-2 months',
        status: 'open' as const,
        ownerId: clientUid,
        clientId: clientUid,
        clientName: 'Test Enterprise Client',
        teamMembers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdProjectId = await createProject(newProjectData);
      assert.ok(createdProjectId, 'createProject must return a valid document ID');

      const fetchedProject = await getProjectById(createdProjectId);
      assert.ok(fetchedProject, 'Fetched project document must exist');
      assert.strictEqual(fetchedProject.ownerId, clientUid);
      assert.strictEqual(fetchedProject.status, 'open');
      assert.strictEqual(fetchedProject.budget, 4500);
    });

    // -------------------------------------------------------------
    // FLOW 4: Hiring Flow (Invitation, Acceptance & Contract Init)
    // -------------------------------------------------------------
    console.log('\n--- FLOW 4: Hiring Flow (Invite, Accept & Contract) ---');
    await runStep('4.1: Client sends project invitation to Freelancer', async () => {
      assert.strictEqual(auth.currentUser?.uid, clientUid, 'Must be logged in as client');

      const inviteData = {
        projectId: createdProjectId,
        projectTitle: `NextGen AI Automation Platform ${timestamp}`,
        clientId: clientUid,
        clientName: 'Test Enterprise Client',
        symbioteId: symbioteUid,
        symbioteName: 'Alex River Specialist',
        symbioteHourlyRate: 85,
        budgetRange: '$85/hr',
        timeline: '1-2 months',
        techTags: ['React', 'TypeScript'],
        message: 'We would love for you to architect this platform!',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      createdInvitationId = await createInvitation(inviteData);
      assert.ok(createdInvitationId, 'createInvitation must return a valid ID');

      const invDoc = await getDoc(doc(db, 'invitations', createdInvitationId));
      assert.ok(invDoc.exists(), 'Invitation doc must exist in invitations collection');
      assert.strictEqual(invDoc.data()?.status, 'pending');
    });

    await runStep('4.2: Freelancer accepts invitation', async () => {
      // Freelancer signs in
      await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, symbioteUid);

      await updateInvitationStatus(createdInvitationId, 'accepted');

      // Verify invitation status
      const invDoc = await getDoc(doc(db, 'invitations', createdInvitationId));
      assert.strictEqual(invDoc.data()?.status, 'accepted');
    });

    await runStep('4.3: Client approves candidate & adds them to project team (transitions to in_progress)', async () => {
      // Client signs in
      await signInWithEmailAndPassword(auth, testClientEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, clientUid);

      await updateInvitationStatus(createdInvitationId, 'approved');
      await addTeamMemberToProject(createdProjectId, {
        uid: symbioteUid,
        displayName: 'Alex River Specialist',
        role: 'Full Stack Architect',
        hourlyRate: 85,
      });
      await updateProject(createdProjectId, { status: 'in_progress' });

      // Verify project document has team member and in_progress status
      const proj = await getProjectById(createdProjectId);
      assert.ok(proj, 'Project must exist');
      assert.strictEqual(proj.status, 'in_progress', 'Project status should transition to in_progress');
      assert.strictEqual(proj.assignedSymbioteId, symbioteUid, 'Assigned symbiote should match freelancer UID');
      assert.ok(proj.teamMembers && proj.teamMembers.length > 0, 'teamMembers must include hired freelancer');
      assert.ok(proj.teamMembers.some((m: any) => m.uid === symbioteUid), 'Hired freelancer must be in teamMembers');
    });

    // -------------------------------------------------------------
    // FLOW 5: Work Execution, Task Tracking & Client Approval
    // -------------------------------------------------------------
    console.log('\n--- FLOW 5: Task Management, Time Tracking & Approvals ---');
    await runStep('5.1: Create Workspace Task for Milestone', async () => {
      // Freelancer signs in to workspace
      await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, symbioteUid);

      const taskData = {
        projectId: createdProjectId,
        title: 'Design Scalable Firestore Security Rules & Architecture',
        description: 'Complete role-based rules and indexes for subcollections',
        status: 'todo' as const,
        priority: 'high' as const,
        estimatedHours: 10,
        actualHours: 0,
        assigneeId: symbioteUid,
        assigneeName: 'Alex River Specialist',
        createdBy: symbioteUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdTaskId = await createTask(createdProjectId, taskData);
      assert.ok(createdTaskId, 'createTask must return a task ID');

      const tasks = await getWorkspaceTasks(createdProjectId);
      assert.ok(tasks.some(t => t.id === createdTaskId), 'Task must be listed in workspace tasks');
    });

    await runStep('5.2: Freelancer logs time entry against task', async () => {
      const timeData = {
        projectId: createdProjectId,
        projectName: 'NextGen AI Automation Platform',
        taskId: createdTaskId,
        taskTitle: 'Design Scalable Firestore Security Rules & Architecture',
        symbioteId: symbioteUid,
        symbioteName: 'Alex River Specialist',
        clientId: clientUid,
        hours: 8,
        hourlyRate: 85,
        totalAmount: 680,
        date: new Date().toISOString().split('T')[0],
        description: 'Designed security rules and benchmarked queries',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      createdTimeEntryId = await createTimeEntry(timeData);
      assert.ok(createdTimeEntryId, 'createTimeEntry must return a valid ID');

      // Check task actual hours was auto-updated and status set to in_progress
      const taskDoc = await getDoc(doc(db, 'workspaces', createdProjectId, 'tasks', createdTaskId));
      assert.strictEqual(taskDoc.data()?.actualHours, 8);
      assert.strictEqual(taskDoc.data()?.status, 'in_progress');
    });

    await runStep('5.3: Freelancer marks task ready for review', async () => {
      await updateTaskStatus(createdProjectId, createdTaskId, 'review');
      const taskDoc = await getDoc(doc(db, 'workspaces', createdProjectId, 'tasks', createdTaskId));
      assert.strictEqual(taskDoc.data()?.status, 'review');
    });

    await runStep('5.4: Client reviews & approves task & time entry settlement', async () => {
      // Sign in as client
      await signInWithEmailAndPassword(auth, testClientEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, clientUid);

      // Approve task
      await approveTaskByClient(createdProjectId, createdTaskId, clientUid);
      const taskDoc = await getDoc(doc(db, 'workspaces', createdProjectId, 'tasks', createdTaskId));
      assert.strictEqual(taskDoc.data()?.status, 'completed');
      assert.strictEqual(taskDoc.data()?.approvedBy, clientUid);

      // Approve time entry
      await updateTimeEntryStatus(createdTimeEntryId, 'approved');

      // Freelancer syncs / confirms settled time entry
      await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      await updateTimeEntryStatus(createdTimeEntryId, 'approved');

      const timeDoc = await getDoc(doc(db, 'time_entries', createdTimeEntryId));
      assert.strictEqual(timeDoc.data()?.status, 'approved');
      assert.ok(timeDoc.data()?.approvedAt, 'approvedAt timestamp must be recorded');
    });

    // -------------------------------------------------------------
    // FLOW 6: Invoicing & Payment Settlement Flow
    // -------------------------------------------------------------
    console.log('\n--- FLOW 6: Invoicing & Payment Settlement ---');
    await runStep('6.1: Freelancer creates Invoice for approved hours', async () => {
      await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, symbioteUid);

      const invoiceData = {
        invoiceNumber: `INV-${timestamp}`,
        projectId: createdProjectId,
        projectName: 'NextGen AI Automation Platform',
        clientId: clientUid,
        clientName: 'Test Enterprise Client',
        symbioteId: symbioteUid,
        symbioteName: 'Alex River Specialist',
        amount: 680,
        currency: 'USD',
        status: 'pending' as const,
        issuedDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: 'Architecture & Security Rules Implementation (8 hrs @ $85/hr)',
            quantity: 8,
            unitPrice: 85,
            total: 680,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      createdInvoiceId = await createInvoice(invoiceData);
      assert.ok(createdInvoiceId, 'createInvoice must return invoice ID');

      const invSnap = await getDoc(doc(db, 'invoices', createdInvoiceId));
      assert.ok(invSnap.exists());
      assert.strictEqual(invSnap.data()?.status, 'pending');
      assert.strictEqual(invSnap.data()?.amount, 680);
    });

    await runStep('6.2: Client marks payment dispatched (direct wire / bank transfer)', async () => {
      await signInWithEmailAndPassword(auth, testClientEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, clientUid);

      await markInvoicePaidByClient(createdInvoiceId, 'Wire Ref #WIRE-98234 sent via Chase');

      const invSnap = await getDoc(doc(db, 'invoices', createdInvoiceId));
      assert.strictEqual(invSnap.data()?.status, 'marked_paid');
      assert.strictEqual(invSnap.data()?.paymentDetails?.gateway, 'direct_transfer');
      assert.strictEqual(invSnap.data()?.paymentDetails?.referenceNote, 'Wire Ref #WIRE-98234 sent via Chase');
    });

    await runStep('6.3: Freelancer confirms payment receipt & settles invoice', async () => {
      await signInWithEmailAndPassword(auth, testSymbioteEmail, testPassword);
      assert.strictEqual(auth.currentUser?.uid, symbioteUid);

      await confirmInvoicePaymentBySymbiote(createdInvoiceId);

      const invSnap = await getDoc(doc(db, 'invoices', createdInvoiceId));
      assert.strictEqual(invSnap.data()?.status, 'paid');
      assert.ok(invSnap.data()?.paymentDetails?.confirmedAt, 'confirmedAt must be recorded');
      assert.ok(invSnap.data()?.paymentDetails?.paidAt, 'paidAt must be recorded');
    });

    // -------------------------------------------------------------
    // Cleanup of ephemeral test data
    // -------------------------------------------------------------
    console.log('\n--- Teardown / Cleanup ---');
    await runStep('Clean up test records', async () => {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        if (createdInvoiceId) await adminDb.collection('invoices').doc(createdInvoiceId).delete();
        if (createdTimeEntryId) await adminDb.collection('time_entries').doc(createdTimeEntryId).delete();
        if (createdTaskId && createdProjectId) await adminDb.collection('workspaces').doc(createdProjectId).collection('tasks').doc(createdTaskId).delete();
        if (createdInvitationId) await adminDb.collection('invitations').doc(createdInvitationId).delete();
        if (createdProjectId) await adminDb.collection('projects').doc(createdProjectId).delete();
        if (clientUid) await adminDb.collection('users').doc(clientUid).delete();
        if (symbioteUid) await adminDb.collection('users').doc(symbioteUid).delete();
      }
    });

    console.log('\n================================================================');
    console.log('🎉 ALL 6 END-TO-END FLOWS EXECUTED AND VERIFIED WITH 100% SUCCESS!');
    console.log('================================================================');
  } catch (error: any) {
    console.error('\n❌ End-to-end verification encountered an error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
