import {
  getDocs,
  collection,
  query,
  addDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { AuditLog } from '@/src/types/firestore';

const AUDIT_LOGS_COLLECTION = 'audit_logs';

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, AUDIT_LOGS_COLLECTION);
    return '';
  }
}

export async function getAuditLogs(maxLogs: number = 100): Promise<AuditLog[]> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxLogs));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, AUDIT_LOGS_COLLECTION);
    return [];
  }
}
