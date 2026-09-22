import {
  doc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  orderBy,
  increment,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Conversation, Message, ChatAttachment } from '@/src/types/firestore';
import { createNotification } from '@/src/lib/firestore/notifications';

const CONVERSATIONS_COLLECTION = 'conversations';

export async function createConversation(
  participantIds: string[],
  projectId?: string,
  meta?: {
    participantNames?: Record<string, string>;
    participantAvatars?: Record<string, string>;
    participantTitles?: Record<string, string>;
  }
): Promise<string> {
  if (!auth.currentUser) {
    console.warn('createConversation skipped: User not authenticated.');
    return '';
  }
  try {
    const colRef = collection(db, CONVERSATIONS_COLLECTION);
    const now = new Date().toISOString();

    // Check if conversation between exact participants already exists
    const q = query(colRef, where('participantIds', 'array-contains', participantIds[0]));
    const snap = await getDocs(q);
    const existing = snap.docs.find((d) => {
      const data = d.data();
      const pIds: string[] = data.participantIds || [];
      return participantIds.every((id) => pIds.includes(id)) && pIds.length === participantIds.length;
    });

    if (existing) {
      // If meta provided, update existing conversation metadata
      if (meta && (meta.participantNames || meta.participantAvatars || meta.participantTitles)) {
        await updateDoc(doc(db, CONVERSATIONS_COLLECTION, existing.id), {
          ...(meta.participantNames && { participantNames: meta.participantNames }),
          ...(meta.participantAvatars && { participantAvatars: meta.participantAvatars }),
          ...(meta.participantTitles && { participantTitles: meta.participantTitles }),
        });
      }
      return existing.id;
    }

    const unreadCount: Record<string, number> = {};
    participantIds.forEach((id) => {
      unreadCount[id] = 0;
    });

    const docRef = await addDoc(colRef, {
      participantIds,
      participantNames: meta?.participantNames || {},
      participantAvatars: meta?.participantAvatars || {},
      participantTitles: meta?.participantTitles || {},
      projectId: projectId || null,
      lastMessage: '',
      updatedAt: now,
      lastMessageAt: now,
      unreadCount,
      typing: {},
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CONVERSATIONS_COLLECTION);
    return '';
  }
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const colRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(colRef, where('participantIds', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Conversation))
      .sort((a, b) => new Date(b.updatedAt || b.lastMessageAt || 0).getTime() - new Date(a.updatedAt || a.lastMessageAt || 0).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CONVERSATIONS_COLLECTION);
    return [];
  }
}

export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(colRef, where('participantIds', 'array-contains', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const convs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Conversation))
        .sort((a, b) => new Date(b.updatedAt || b.lastMessageAt || 0).getTime() - new Date(a.updatedAt || a.lastMessageAt || 0).getTime());
      callback(convs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CONVERSATIONS_COLLECTION);
    }
  );
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  attachments: ChatAttachment[] = [],
  senderName?: string
): Promise<string> {
  if (!auth.currentUser) {
    console.warn('sendMessage skipped: User not authenticated.');
    return '';
  }
  try {
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
    const now = new Date().toISOString();

    const messageData: Partial<Message> = {
      conversationId,
      senderId,
      text,
      sentAt: now,
      read: false,
    };
    if (senderName) messageData.senderName = senderName;
    if (attachments && attachments.length > 0) messageData.attachments = attachments;

    const messageDoc = await addDoc(messagesRef, messageData);

    // Fetch conversation to get recipient ID and increment unread count
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const convSnap = await getDoc(convRef);

    const updatePayload: any = {
      lastMessage: text || (attachments.length > 0 ? `[Attachment] ${attachments[0].name}` : 'New message'),
      updatedAt: now,
      lastMessageAt: now,
      [`typing.${senderId}`]: 0,
    };

    if (convSnap.exists()) {
      const data = convSnap.data() as Conversation;
      const otherParticipants = (data.participantIds || []).filter((id) => id !== senderId);
      for (const recipientId of otherParticipants) {
        updatePayload[`unreadCount.${recipientId}`] = increment(1);

        try {
          const recipientUserSnap = await getDoc(doc(db, 'users', recipientId));
          let link = '/client/messages';
          if (recipientUserSnap.exists()) {
            const rRole = recipientUserSnap.data()?.role;
            if (rRole === 'symbiote') link = '/symbiote/messages';
            else if (rRole === 'admin') link = '/admin/messages';
          }
          const previewText = text
            ? (text.length > 70 ? text.slice(0, 70) + '...' : text)
            : (attachments.length > 0 ? `Sent an attachment: ${attachments[0].name}` : 'Sent a message');

          await createNotification({
            userId: recipientId,
            type: 'message',
            title: `New Message from ${senderName || 'Contact'}`,
            description: `"${previewText}"`,
            read: false,
            relatedItemId: conversationId,
            relatedItemLink: link,
            createdAt: now,
          });
        } catch (e) {
          console.warn('Error creating message notification:', e);
        }
      }
    }

    await updateDoc(convRef, updatePayload);

    return messageDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
    return '';
  }
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
  const q = query(messagesRef, orderBy('sentAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      callback(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
    }
  );
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${userId}`]: 0,
    });
  } catch (error) {
    console.error('Error marking conversation read:', error);
  }
}

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(convRef, {
      [`typing.${userId}`]: isTyping ? Date.now() : 0,
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
}
