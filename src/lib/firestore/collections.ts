import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  OrderByDirection,
  orderBy,
  limit as limitQuery,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  UserProfile,
  Project,
  Application,
  Invitation,
  WorkspaceTask,
  WorkspaceMilestone,
  Conversation,
  Message,
  TimeEntry,
  Invoice,
  Review,
  NotificationItem,
  AuditLog,
  PlatformSettings,
  UserRole,
} from '@/src/types/firestore';

/**
 * All 11 Core Firestore Collections
 */
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  APPLICATIONS: 'applications',
  INVITATIONS: 'invitations',
  WORKSPACES: 'workspaces',
  CONVERSATIONS: 'conversations',
  TIME_ENTRIES: 'time_entries',
  INVOICES: 'invoices',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  PLATFORM_SETTINGS: 'platform_settings',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Interfaces for All 11 Collections with explicit Firestore schema fields
 */

export interface UserDocument extends UserProfile {
  id: string;
}

export interface ProjectDocument extends Project {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDocument extends Application {
  id: string;
  appliedAt: string;
}

export interface InvitationDocument extends Invitation {
  id: string;
  createdAt: string;
}

export interface WorkspaceDocument {
  id: string;
  projectId: string;
  title: string;
  tasks: WorkspaceTask[];
  milestones: WorkspaceMilestone[];
  ownerId: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDocument extends Conversation {
  id: string;
  messages?: Message[];
  updatedAt: string;
}

export interface TimeEntryDocument extends TimeEntry {
  id: string;
}

export interface InvoiceDocument extends Invoice {
  id: string;
  createdAt: string;
}

export interface ReviewDocument extends Review {
  id: string;
  createdAt: string;
}

export interface NotificationDocument extends NotificationItem {
  id: string;
  createdAt: string;
}

export interface AuditLogDocument extends AuditLog {
  id: string;
  timestamp: string;
}

/**
 * Helper Security Check
 */
function assertAuthenticated(uid?: string | null): string {
  if (!uid) {
    throw new Error('Security Error: User must be authenticated to perform this operation.');
  }
  return uid;
}

function assertOwnerOrAdmin(
  currentUserId: string,
  docOwnerId: string,
  userRole?: UserRole
): void {
  if (currentUserId !== docOwnerId && userRole !== 'admin') {
    throw new Error(
      'Security Error: Insufficient permissions. Operation allowed for owner or admin only.'
    );
  }
}

/**
 * Generic Firestore CRUD Helper with Security Validation & Error Handling
 */

export async function createDocument<T extends { id?: string }>(
  collectionName: string,
  data: Omit<T, 'id'> & { id?: string },
  actorUid?: string
): Promise<string> {
  assertAuthenticated(actorUid);
  try {
    const colRef = collection(db, collectionName);
    const docRef = data.id ? doc(db, collectionName, data.id) : doc(colRef);
    const id = docRef.id;
    const now = new Date().toISOString();

    const payload = {
      ...data,
      id,
      createdAt: (data as any).createdAt || now,
      updatedAt: now,
      createdById: actorUid,
    };

    await setDoc(docRef, payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${data.id || 'new'}`);
    throw error;
  }
}

export async function getDocumentById<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
    return null;
  }
}

export async function updateDocumentById<T>(
  collectionName: string,
  id: string,
  updates: Partial<T>,
  actorUid?: string,
  ownerIdCheck?: string,
  userRole?: UserRole
): Promise<void> {
  const uid = assertAuthenticated(actorUid);

  if (ownerIdCheck) {
    assertOwnerOrAdmin(uid, ownerIdCheck, userRole);
  }

  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    throw error;
  }
}

export async function deleteDocumentById(
  collectionName: string,
  id: string,
  actorUid?: string,
  ownerIdCheck?: string,
  userRole?: UserRole
): Promise<void> {
  const uid = assertAuthenticated(actorUid);

  if (ownerIdCheck) {
    assertOwnerOrAdmin(uid, ownerIdCheck, userRole);
  }

  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    throw error;
  }
}

export async function queryCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return [];
  }
}
