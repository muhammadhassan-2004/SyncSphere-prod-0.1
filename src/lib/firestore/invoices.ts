import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Invoice } from '@/src/types/firestore';
import { createNotification } from '@/src/lib/firestore/notifications';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';

const INVOICES_COLLECTION = 'invoices';

export async function createInvoice(invoice: Omit<Invoice, 'id'>): Promise<string> {
  if (!auth.currentUser) {
    console.warn('createInvoice skipped: User not authenticated.');
    return '';
  }
  try {
    const colRef = collection(db, INVOICES_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...invoice,
      createdAt: invoice.createdAt || new Date().toISOString(),
    });

    if (invoice.projectId) {
      const formattedAmount = invoice.amount
        ? invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';
      await logProjectActivity(invoice.projectId, {
        title: 'Invoice Submitted',
        description: `Submitted invoice ${invoice.invoiceNumber || ''} for ${formattedAmount}`,
        type: 'invoice',
        actorName: invoice.symbioteName || 'Specialist',
        actorId: invoice.symbioteId,
      });
    }

    // Write real notification to recipient
    if (invoice.clientId) {
      const formattedAmount = invoice.amount
        ? invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';
      const senderName = invoice.symbioteName || 'A specialist';
      await createNotification({
        userId: invoice.clientId,
        type: 'invoice',
        title: 'New Invoice Received',
        description: `${senderName} submitted invoice ${invoice.invoiceNumber || ''} for $${formattedAmount} on project "${invoice.projectName || 'Engagement'}".`,
        read: false,
        relatedItemId: docRef.id,
        relatedItemLink: '/client/invoices',
        createdAt: new Date().toISOString(),
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, INVOICES_COLLECTION);
    return '';
  }
}

export async function getInvoices(
  filter: { clientId?: string; symbioteId?: string; projectId?: string }
): Promise<Invoice[]> {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const colRef = collection(db, INVOICES_COLLECTION);
    let q = query(colRef);
    if (filter.clientId) {
      q = query(colRef, where('clientId', '==', filter.clientId));
    } else if (filter.symbioteId) {
      q = query(colRef, where('symbioteId', '==', filter.symbioteId));
    } else if (filter.projectId) {
      q = query(colRef, where('projectId', '==', filter.projectId));
    }
    const snap = await getDocs(q);
    const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    // Sort in-memory safely by issuedDate / createdAt descending
    invoices.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : a.issuedDate ? new Date(a.issuedDate).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : b.issuedDate ? new Date(b.issuedDate).getTime() : 0;
      return dateB - dateA;
    });
    return invoices;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.warn(`[Firestore] Permission warning for ${INVOICES_COLLECTION}:`, error.message);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, INVOICES_COLLECTION);
    return [];
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice['status']
): Promise<void> {
  if (!auth.currentUser || !invoiceId) {
    return;
  }
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invSnap = await getDoc(docRef);
    await updateDoc(docRef, { status });

    if (invSnap.exists()) {
      const invData = invSnap.data() as Invoice;
      const formattedAmount = invData.amount
        ? invData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0.00';

      if (invData.projectId) {
        await logProjectActivity(invData.projectId, {
          title: `Invoice ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: `Invoice ${invData.invoiceNumber || ''} (${formattedAmount}) status marked as ${status}`,
          type: 'invoice',
        });
      }

      if ((status === 'paid' || status === 'approved') && invData.symbioteId) {
        await createNotification({
          userId: invData.symbioteId,
          type: 'invoice',
          title: `Invoice ${status === 'paid' ? 'Paid' : 'Approved'}`,
          description: `Invoice ${invData.invoiceNumber || ''} for $${formattedAmount} has been marked as ${status}.`,
          read: false,
          relatedItemId: invoiceId,
          relatedItemLink: '/symbiote/invoices',
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COLLECTION}/${invoiceId}`);
  }
}

/**
 * Client marks that an external payment (bank transfer, wire, PayPal etc.) has been dispatched.
 * Sets status to 'marked_paid' awaiting freelancer verification.
 */
export async function markInvoicePaidByClient(
  invoiceId: string,
  referenceNote?: string
): Promise<void> {
  if (!auth.currentUser || !invoiceId) return;
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invSnap = await getDoc(docRef);
    if (!invSnap.exists()) return;
    const invData = invSnap.data() as Invoice;

    await updateDoc(docRef, {
      status: 'marked_paid',
      paymentDetails: {
        ...(invData.paymentDetails || {}),
        gateway: 'direct_transfer',
        markedPaidAt: new Date().toISOString(),
        referenceNote: referenceNote || 'Direct transfer sent out-of-platform',
      },
    });

    const formattedAmount = invData.amount
      ? invData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';

    if (invData.projectId) {
      await logProjectActivity(invData.projectId, {
        title: 'Invoice Payment Dispatched',
        description: `Client marked invoice ${invData.invoiceNumber || ''} ($${formattedAmount}) as Paid via direct transfer.`,
        type: 'invoice',
      });
    }

    if (invData.symbioteId) {
      await createNotification({
        userId: invData.symbioteId,
        type: 'invoice',
        title: 'Payment Dispatched — Please Confirm Receipt 💸',
        description: `Client marked invoice ${invData.invoiceNumber || ''} ($${formattedAmount}) as Paid. Please verify your account and confirm receipt.`,
        read: false,
        relatedItemId: invoiceId,
        relatedItemLink: '/symbiote/invoices',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COLLECTION}/${invoiceId}`);
    throw error;
  }
}

/**
 * Freelancer verifies and confirms that the payment was received into their bank/account.
 * Finalizes status to 'paid'.
 */
export async function confirmInvoicePaymentBySymbiote(
  invoiceId: string
): Promise<void> {
  if (!auth.currentUser || !invoiceId) return;
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invSnap = await getDoc(docRef);
    if (!invSnap.exists()) return;
    const invData = invSnap.data() as Invoice;

    const nowIso = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'paid',
      paymentDetails: {
        ...(invData.paymentDetails || {}),
        paidAt: nowIso,
        confirmedAt: nowIso,
      },
    });

    const formattedAmount = invData.amount
      ? invData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';

    if (invData.projectId) {
      await logProjectActivity(invData.projectId, {
        title: 'Invoice Payment Confirmed',
        description: `Specialist confirmed receipt of payment for invoice ${invData.invoiceNumber || ''} ($${formattedAmount}).`,
        type: 'invoice',
      });
    }

    if (invData.clientId) {
      await createNotification({
        userId: invData.clientId,
        type: 'invoice',
        title: 'Payment Receipt Confirmed ✓',
        description: `Specialist confirmed payment receipt for invoice ${invData.invoiceNumber || ''} ($${formattedAmount}). Invoice is settled!`,
        read: false,
        relatedItemId: invoiceId,
        relatedItemLink: '/client/invoices',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COLLECTION}/${invoiceId}`);
    throw error;
  }
}

export function subscribeToInvoices(
  userId: string,
  userType: 'client' | 'symbiote',
  callback: (invoices: Invoice[]) => void
): () => void {
  if (!auth.currentUser || !userId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, INVOICES_COLLECTION);
  const fieldName = userType === 'client' ? 'clientId' : 'symbioteId';
  const q = query(colRef, where(fieldName, '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const invs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
      callback(invs);
    },
    (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn(`[Firestore] Permission warning for ${INVOICES_COLLECTION}:`, error.message);
        callback([]);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, INVOICES_COLLECTION);
      callback([]);
    }
  );
}

