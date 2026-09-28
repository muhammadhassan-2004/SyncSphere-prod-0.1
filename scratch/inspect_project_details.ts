import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const adminApp = getFirebaseAdmin();
  if (!adminApp) {
    console.error('No admin app');
    process.exit(1);
  }
  const db = getAdminFirestore(adminApp);
  const snap = await db.collection('projects').get();
  console.log('Total projects in DB:', snap.size);
  
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`\n==============================================`);
    console.log(`Project ID: ${doc.id}`);
    console.log(`Title: "${d.title}" | Status: "${d.status}" | Progress: ${d.progressPct}% (progressPercent: ${d.progressPercent}%)`);
    console.log(`Owner/Client: ${d.clientId || d.ownerId} | Assigned: ${d.assignedSymbioteId || d.symbioteId}`);
    
    // Check tasks
    const tasksSnap = await doc.ref.collection('tasks').get();
    console.log(`Tasks subcollection count: ${tasksSnap.size}`);
    tasksSnap.forEach(t => {
      const td = t.data();
      console.log(`  - Task [${t.id}]: "${td.title}" | status: "${td.status}"`);
    });

    // Also check workspaces/{id}/tasks
    const wsTasksSnap = await db.collection('workspaces').doc(doc.id).collection('tasks').get();
    console.log(`Workspaces/${doc.id}/tasks count: ${wsTasksSnap.size}`);
    wsTasksSnap.forEach(t => {
      const td = t.data();
      console.log(`  - Workspace Task [${t.id}]: "${td.title}" | status: "${td.status}"`);
    });

    // Check workspaces/{id}/milestones
    const wsMsSnap = await db.collection('workspaces').doc(doc.id).collection('milestones').get();
    console.log(`Workspaces/${doc.id}/milestones count: ${wsMsSnap.size}`);
    wsMsSnap.forEach(m => {
      const md = m.data();
      console.log(`  - Milestone [${m.id}]: "${md.title}" | completed: ${md.completed} | status: "${md.status}"`);
    });
  }
}

main().catch(console.error);
