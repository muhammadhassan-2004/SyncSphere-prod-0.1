import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

const adminApp = getFirebaseAdmin();
if (!adminApp) process.exit(1);
const db = getAdminFirestore(adminApp);

async function run() {
  console.log('--- Healing Time Entry fgKHe2F1vEEKS2u4NkCX ---');
  const timeRef = db.collection('time_entries').doc('fgKHe2F1vEEKS2u4NkCX');
  const timeSnap = await timeRef.get();
  if (timeSnap.exists) {
    await timeRef.update({
      status: 'approved',
      invoiced: true,
      invoiceId: '2UEh2ARLkvJZ9odcA5au',
      approvedAt: '2026-09-28T23:04:00.000Z',
      updatedAt: new Date().toISOString(),
    });
    console.log('Time entry updated to approved and invoiced.');
  } else {
    console.log('Time entry not found.');
  }

  console.log('--- Healing Invoice 2UEh2ARLkvJZ9odcA5au ---');
  const invRef = db.collection('invoices').doc('2UEh2ARLkvJZ9odcA5au');
  const invSnap = await invRef.get();
  if (invSnap.exists) {
    await invRef.update({
      clientName: 'Yan Alex',
      clientCompany: 'Acme Tech',
      invoiceType: 'hourly',
      updatedAt: new Date().toISOString(),
    });
    console.log('Invoice updated with clientName Yan Alex and clientCompany Acme Tech.');
  } else {
    console.log('Invoice not found.');
  }

  console.log('Healing complete.');
}

run().catch(console.error);
