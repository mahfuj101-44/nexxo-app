import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Chat, ChatMessage, MessageType, MessageAttachment, ReplyReference, PollData, LocationData, NexxoUser } from '../types';

export function getChatIdForUsers(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Initializes or merges a direct conversation room.
 */
export async function ensureChatExists(
  chatId: string,
  participants: string[],
  initialEphemeralTimer: number = 0
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participants,
        lastMessage: 'Conversation established.',
        lastMessageSenderId: participants[0],
        lastMessageType: 'text',
        lastMessageAt: serverTimestamp(),
        lastMessageStatus: 'sent',
        unreadCounts: {
          [participants[0]]: 0,
          [participants[1]]: 0,
        },
        typing: {},
        ephemeralTimer: initialEphemeralTimer || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
  }
}

export interface SendMessageOptions {
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId?: string;
  participants?: string[];
  text?: string;
  type?: MessageType;
  replyTo?: ReplyReference | null;
  attachment?: MessageAttachment | null;
  poll?: PollData | null;
  location?: LocationData | null;
  isEncrypted?: boolean;
  ephemeralTimer?: number;
}

/**
 * Sends a real-time message with full support for direct and group chats, text, attachments, replies, and status tracking.
 */
export async function sendChatMessage(options: SendMessageOptions): Promise<string> {
  const {
    chatId,
    senderId,
    senderName,
    senderAvatar,
    recipientId,
    participants,
    text = '',
    type = 'text',
    replyTo = null,
    attachment = null,
    poll = null,
    location = null,
    isEncrypted = false,
    ephemeralTimer = 0,
  } = options;

  const trimmedText = text.trim();
  if (!trimmedText && !attachment && !poll && !location) {
    throw new Error('Message cannot be empty.');
  }

  if (trimmedText.length > 4000) {
    throw new Error('Message exceeds 4000 character limit.');
  }

  const previewSnippet = poll
    ? `📊 Poll: ${poll.question}`
    : location
    ? `📍 Location: ${location.placeName || 'Pinned Location'}`
    : isEncrypted
    ? '🔒 Encrypted message'
    : trimmedText
    ? (trimmedText.length > 80 ? trimmedText.substring(0, 80) + '...' : trimmedText)
    : type === 'voice'
    ? '🎤 Voice note'
    : type === 'image'
    ? '📷 Image'
    : type === 'video'
    ? '🎥 Video'
    : '📎 Attachment';

  try {
    const batch = writeBatch(db);

    const allParticipants = participants && participants.length > 0
      ? participants
      : (recipientId ? [senderId, recipientId] : [senderId]);

    // 1. New Message reference
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const newMsgRef = doc(messagesCol);

    const messageData: any = {
      id: newMsgRef.id,
      chatId,
      senderId,
      senderName: senderName || null,
      senderAvatar: senderAvatar || null,
      participants: allParticipants,
      type: poll ? 'poll' : location ? 'location' : type,
      text: trimmedText || (poll ? poll.question : location ? (location.placeName || 'Location') : previewSnippet),
      status: 'sent',
      readAt: null,
      readBy: { [senderId]: serverTimestamp() },
      replyTo: replyTo || null,
      attachment: attachment || null,
      poll: poll || null,
      location: location || null,
      isEncrypted: Boolean(isEncrypted),
      reactions: {},
      deletedFor: [],
      isDeletedForEveryone: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (ephemeralTimer && ephemeralTimer > 0) {
      messageData.expiresAt = new Date(Date.now() + ephemeralTimer * 1000);
    }

    batch.set(newMsgRef, messageData);

    // Increment unread counts for all participants except the sender
    const unreadUpdates: Record<string, any> = {};
    const unreadNested: Record<string, any> = {};
    allParticipants.forEach((uid) => {
      if (uid !== senderId) {
        unreadUpdates[`unreadCounts.${uid}`] = increment(1);
        unreadNested[uid] = increment(1);
      }
    });

    // 2. Update Conversation Summary & recipient unread counts
    const chatRef = doc(db, 'chats', chatId);
    batch.set(
      chatRef,
      {
        id: chatId,
        participants: allParticipants,
        lastMessage: previewSnippet,
        lastMessageSenderId: senderId,
        lastMessageType: type,
        lastMessageAt: serverTimestamp(),
        lastMessageStatus: 'sent',
        deletedFor: arrayRemove(...allParticipants),
        updatedAt: serverTimestamp(),
        unreadCounts: unreadNested,
        ...unreadUpdates,
        typing: {
          [senderId]: null,
        },
      },
      { merge: true }
    );

    await batch.commit();
    return newMsgRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
  }
}

/**
 * Safely parses any Firestore Timestamp, Date, millisecond number or string into a JS Date.
 */
export function parseMessageTimestamp(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch {
      return null;
    }
  }
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formats a timestamp into a concise time string (e.g. "10:45 AM").
 */
export function formatTimeShort(val: any): string {
  const d = parseMessageTimestamp(val);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a read receipt timestamp with day and time (e.g. "Today at 10:45 AM", "Yesterday at 4:12 PM", "Sep 5 at 10:45 AM").
 */
export function formatReadReceiptTime(val: any): string {
  const d = parseMessageTimestamp(val);
  if (!d) return '';
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timePart}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timePart}`;
  }
  const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${datePart} at ${timePart}`;
}

/**
 * Formats a detailed exact timestamp including seconds (e.g. "Sep 5, 2026, 10:45:18 AM").
 */
export function formatExactTimestamp(val: any): string {
  const d = parseMessageTimestamp(val);
  if (!d) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Marks unread messages in an open conversation as read with exact server timestamps.
 * Accepts optional specific messageIds for instant, index-free batch update.
 */
export async function markChatMessagesAsRead(
  chatId: string,
  currentUserId: string,
  otherUserId?: string,
  messageIds?: string[]
): Promise<void> {
  if (!chatId || !currentUserId) return;

  try {
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const batch = writeBatch(db);
    let count = 0;

    if (messageIds && messageIds.length > 0) {
      // Direct document updates by ID (fastest, no index required)
      const idsToUpdate = messageIds.slice(0, 100);
      for (const msgId of idsToUpdate) {
        const msgRef = doc(messagesCol, msgId);
        batch.update(msgRef, {
          status: 'read',
          readAt: serverTimestamp(),
          [`readBy.${currentUserId}`]: serverTimestamp(),
        });
        count++;
      }
    } else {
      // Fallback query by status without requiring composite indexes
      const unreadQuery = query(
        messagesCol,
        where('status', 'in', ['sent', 'delivered']),
        limit(50)
      );

      const snapshot = await getDocs(unreadQuery);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const shouldMark = otherUserId
          ? data.senderId === otherUserId && data.status !== 'read'
          : data.senderId !== currentUserId && data.status !== 'read';
        if (shouldMark) {
          batch.update(docSnap.ref, {
            status: 'read',
            readAt: serverTimestamp(),
            [`readBy.${currentUserId}`]: serverTimestamp(),
          });
          count++;
        }
      });
    }

    // Reset current user's unread counter on the conversation document using set with merge
    const chatRef = doc(db, 'chats', chatId);
    batch.set(
      chatRef,
      {
        unreadCounts: {
          [currentUserId]: 0,
        },
        [`unreadCounts.${currentUserId}`]: 0,
        lastMessageStatus: 'read',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    console.warn('Notice marking chat messages as read:', error);
  }
}

/**
 * Safely computes the real-time unread count for a given user in a chat document.
 * Checks nested unreadCounts map as well as dot-flattened field keys.
 */
export function getChatUnreadCount(chat: Partial<Chat> | null | undefined, userId: string): number {
  if (!chat || !userId) return 0;
  if (chat.unreadCounts && typeof chat.unreadCounts[userId] === 'number') {
    return Math.max(0, chat.unreadCounts[userId]);
  }
  const rawKey = `unreadCounts.${userId}`;
  if (typeof (chat as any)[rawKey] === 'number') {
    return Math.max(0, (chat as any)[rawKey]);
  }
  return 0;
}

/**
 * Real-time typing indicator update.
 */
export async function setTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  if (!chatId || !userId) return;
  const chatRef = doc(db, 'chats', chatId);
  try {
    const payload = isTyping ? { isTyping: true, at: Date.now() } : null;
    await updateDoc(chatRef, {
      [`typing.${userId}`]: payload,
    });
  } catch (error) {
    // In case doc structure requires merge
    try {
      await setDoc(
        chatRef,
        {
          typing: {
            [userId]: isTyping ? { isTyping: true, at: Date.now() } : null,
          },
        },
        { merge: true }
      );
    } catch (inner) {
      console.warn('Typing state update notice:', inner);
    }
  }
}

/**
 * Toggles a message reaction for the current user.
 */
export async function toggleMessageReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
  currentReactions: Record<string, string[]> = {}
): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  try {
    const userList = currentReactions[emoji] || [];
    const hasReacted = userList.includes(userId);

    const updatedList = hasReacted
      ? userList.filter((id) => id !== userId)
      : [...userList, userId];

    const updatedReactions = { ...currentReactions };
    if (updatedList.length === 0) {
      delete updatedReactions[emoji];
    } else {
      updatedReactions[emoji] = updatedList;
    }

    await updateDoc(msgRef, {
      reactions: updatedReactions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Edits own message content.
 */
export async function editChatMessage(chatId: string, messageId: string, newText: string): Promise<void> {
  const trimmed = newText.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');

  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      text: trimmed,
      isEdited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Toggles star/bookmark status for a message for the current user.
 */
export async function toggleStarMessage(chatId: string, messageId: string, currentUserId: string): Promise<boolean> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const currentStarred: string[] = Array.isArray(data.starredBy) ? data.starredBy : [];
    const isAlreadyStarred = currentStarred.includes(currentUserId);

    if (isAlreadyStarred) {
      await updateDoc(msgRef, {
        starredBy: arrayRemove(currentUserId),
        updatedAt: serverTimestamp(),
      });
      return false;
    } else {
      await updateDoc(msgRef, {
        starredBy: arrayUnion(currentUserId),
        updatedAt: serverTimestamp(),
      });
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
    return false;
  }
}

/**
 * Deletes message for the current user only.
 */
export async function deleteMessageForMe(chatId: string, messageId: string, currentUserId: string): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      deletedFor: arrayUnion(currentUserId),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Deletes message for everyone in the conversation.
 */
export async function deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      isDeletedForEveryone: true,
      text: 'This message was deleted.',
      attachment: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Subscribes to live messages in a chat.
 */
export function subscribeToChatMessages(chatId: string, onUpdate: (messages: ChatMessage[]) => void) {
  const messagesCol = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ChatMessage, 'id'>),
        });
      });
      onUpdate(messages);
    },
    (error) => {
      console.warn(`Live messages listener notice for chats/${chatId}:`, error);
    }
  );
}

/**
 * Subscribes to the live chat document (for typing indicator & unread status).
 */
export function subscribeToChatDoc(chatId: string, onUpdate: (chat: Chat | null) => void) {
  const chatRef = doc(db, 'chats', chatId);
  return onSnapshot(
    chatRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...(snap.data() as Omit<Chat, 'id'>) });
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('Notice subscribing to chat doc:', error);
    }
  );
}

/**
 * Deletes an entire conversation and its history from the current user's view.
 * Sets deletedFor and clearedAt on the chat document and marks existing messages as deletedFor this user.
 */
export async function deleteConversationForUser(chatId: string, userId: string): Promise<void> {
  if (!chatId || !userId) return;

  try {
    const batch = writeBatch(db);
    const chatRef = doc(db, 'chats', chatId);

    batch.update(chatRef, {
      deletedFor: arrayUnion(userId),
      [`clearedAt.${userId}`]: serverTimestamp(),
      [`unreadCounts.${userId}`]: 0,
      updatedAt: serverTimestamp(),
    });

    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const msgSnap = await getDocs(query(messagesCol, limit(200)));

    msgSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const currentDeleted = data.deletedFor || [];
      if (!currentDeleted.includes(userId)) {
        batch.update(docSnap.ref, {
          deletedFor: arrayUnion(userId),
          updatedAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
}

/**
 * Subscribes to all conversations for the current user, filtering out deleted conversations.
 */
export function subscribeToUserChats(userId: string, onUpdate: (chats: Chat[]) => void) {
  const chatsCol = collection(db, 'chats');
  const q = query(chatsCol, where('participants', 'array-contains', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Exclude if deleted for current user
        if (data.deletedFor && Array.isArray(data.deletedFor) && data.deletedFor.includes(userId)) {
          return;
        }
        chats.push({ id: docSnap.id, ...(data as Omit<Chat, 'id'>) });
      });

      // Sort by pinned status (top) and lastMessageAt descending
      chats.sort((a, b) => {
        const isPinnedA = Boolean(a.pinned || (a.pinnedBy && Array.isArray(a.pinnedBy) && a.pinnedBy.includes(userId)));
        const isPinnedB = Boolean(b.pinned || (b.pinnedBy && Array.isArray(b.pinnedBy) && b.pinnedBy.includes(userId)));
        if (isPinnedA !== isPinnedB) {
          return isPinnedA ? -1 : 1;
        }
        const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : 0);
        const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : 0);
        return timeB - timeA;
      });

      onUpdate(chats);
    },
    (error) => {
      console.warn('Notice subscribing to user chats:', error);
    }
  );
}

/**
 * Saves a message draft for a user in a chat conversation.
 * Immediately writes to localStorage for instant tab switching retrieval,
 * and updates Firestore chats/{chatId}.drafts.{userId}.
 */
export async function saveChatDraft(chatId: string, userId: string, draftText: string): Promise<void> {
  if (!chatId || !userId) return;

  // 1. Immediately cache in localStorage
  try {
    const trimmed = draftText;
    if (trimmed && trimmed.trim()) {
      localStorage.setItem(`nexxo_chat_draft_${chatId}_${userId}`, trimmed);
      localStorage.setItem(`nexxo_chat_draft_${chatId}`, trimmed);
    } else {
      localStorage.removeItem(`nexxo_chat_draft_${chatId}_${userId}`);
      localStorage.removeItem(`nexxo_chat_draft_${chatId}`);
    }
  } catch (e) {
    console.warn('Notice saving draft to localStorage:', e);
  }

  // 2. Persist to Firestore chats collection 'drafts' map
  try {
    const chatRef = doc(db, 'chats', chatId);
    const trimmed = draftText.trim();
    if (trimmed) {
      await updateDoc(chatRef, {
        [`drafts.${userId}`]: trimmed,
      });
    } else {
      await updateDoc(chatRef, {
        [`drafts.${userId}`]: deleteField(),
      });
    }
  } catch (error) {
    // Non-fatal if offline or chat doc is being initialized
    console.warn('Notice saving draft to Firestore:', error);
  }
}

/**
 * Retrieves the unsent draft for a chat conversation.
 * First checks local storage for instant zero-latency rendering,
 * and optionally accepts a fallback draft string from Firestore.
 */
export function getChatDraft(chatId: string, userId: string, firestoreDraft?: string): string {
  if (!chatId) return '';
  try {
    const localUserDraft = localStorage.getItem(`nexxo_chat_draft_${chatId}_${userId}`);
    if (localUserDraft !== null) {
      return localUserDraft;
    }
    const legacyLocal = localStorage.getItem(`nexxo_chat_draft_${chatId}`);
    if (legacyLocal !== null) {
      return legacyLocal;
    }
  } catch {
    // ignore
  }
  return firestoreDraft || '';
}

/**
 * Clears an unsent draft from both localStorage and Firestore upon message send.
 */
export async function clearChatDraft(chatId: string, userId: string): Promise<void> {
  if (!chatId || !userId) return;
  try {
    localStorage.removeItem(`nexxo_chat_draft_${chatId}_${userId}`);
    localStorage.removeItem(`nexxo_chat_draft_${chatId}`);
  } catch {
    // ignore
  }

  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`drafts.${userId}`]: deleteField(),
    });
  } catch (error) {
    console.warn('Notice clearing draft in Firestore:', error);
  }
}

/**
 * Configure Disappearing / Ephemeral Messages timer for a chat (in seconds)
 * 0 = disabled, 86400 = 24 hours, 604800 = 7 days
 */
export async function setChatEphemeralTimer(chatId: string, timerSeconds: number): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    ephemeralTimer: timerSeconds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cast a vote on a direct chat poll
 */
export async function voteChatPoll(
  chatId: string,
  messageId: string,
  optionId: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const poll = data.poll as PollData | undefined;
  if (!poll || poll.isClosed) return;

  const multiple = Boolean(poll.multipleAnswers);
  const updatedOptions = poll.options.map((opt) => {
    let votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
    if (opt.id === optionId) {
      if (votes.includes(userId)) {
        votes = votes.filter((uid) => uid !== userId);
      } else {
        votes.push(userId);
      }
    } else if (!multiple) {
      // Single choice removes vote from other options
      votes = votes.filter((uid) => uid !== userId);
    }
    return { ...opt, votes };
  });

  await updateDoc(msgRef, {
    'poll.options': updatedOptions,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Close a direct chat poll
 */
export async function closeChatPoll(chatId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(msgRef, {
    'poll.isClosed': true,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Group Conversation Management
// ---------------------------------------------------------------------------

export const GROUP_AVATAR_PRESETS = [
  {
    name: 'Team Collab',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tech & Dev',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Creative Studio',
    url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Coffee & Chat',
    url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Project Launch',
    url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Gaming Guild',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=80',
  },
];

export interface CreateGroupChatParams {
  name: string;
  avatar?: string;
  description?: string;
  participantIds: string[];
  creator: NexxoUser;
}

/**
 * Creates a new multi-participant group conversation under the /chats collection.
 */
export async function createGroupChat(params: CreateGroupChatParams): Promise<string> {
  const { name, avatar = '', description = '', participantIds, creator } = params;
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Group name is required.');

  // Deduplicate participants and ensure creator is included
  const allParticipants = Array.from(new Set([creator.id, ...participantIds]));
  if (allParticipants.length < 2) {
    throw new Error('Please select at least one participant to add to the group.');
  }

  const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const chatRef = doc(db, 'chats', chatId);

  const initialUnread: Record<string, number> = {};
  allParticipants.forEach((uid) => {
    if (uid !== creator.id) initialUnread[uid] = 1;
  });

  const batch = writeBatch(db);

  // 1. Group chat document
  batch.set(chatRef, {
    id: chatId,
    isGroup: true,
    name: trimmedName,
    avatar: avatar.trim() || null,
    description: description.trim() || null,
    createdBy: creator.id,
    admins: [creator.id],
    participants: allParticipants,
    lastMessage: `${creator.displayName} created group "${trimmedName}"`,
    lastMessageSenderId: creator.id,
    lastMessageType: 'text',
    lastMessageAt: serverTimestamp(),
    lastMessageStatus: 'sent',
    unreadCounts: initialUnread,
    typing: {},
    ephemeralTimer: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Initial system announcement message
  const messagesCol = collection(db, 'chats', chatId, 'messages');
  const systemMsgRef = doc(messagesCol);
  batch.set(systemMsgRef, {
    id: systemMsgRef.id,
    chatId,
    senderId: creator.id,
    senderName: creator.displayName,
    senderAvatar: creator.photoURL || null,
    isSystem: true,
    participants: allParticipants,
    type: 'text',
    text: `🎉 ${creator.displayName} created the group "${trimmedName}" with ${allParticipants.length} members`,
    status: 'sent',
    readAt: null,
    readBy: { [creator.id]: serverTimestamp() },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return chatId;
}

/**
 * Updates group conversation metadata (name, avatar, description).
 */
export async function updateGroupChatInfo(
  chatId: string,
  updates: { name?: string; avatar?: string; description?: string },
  updatedByUser?: { id: string; displayName: string }
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  const dataToUpdate: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (trimmed) dataToUpdate.name = trimmed;
  }
  if (updates.avatar !== undefined) {
    dataToUpdate.avatar = updates.avatar.trim() || null;
  }
  if (updates.description !== undefined) {
    dataToUpdate.description = updates.description.trim() || null;
  }

  await updateDoc(chatRef, dataToUpdate);

  if (updatedByUser && (updates.name !== undefined || updates.avatar !== undefined)) {
    try {
      const messagesCol = collection(db, 'chats', chatId, 'messages');
      const systemMsgRef = doc(messagesCol);
      let noticeText = `${updatedByUser.displayName} updated the group profile`;
      if (updates.name) {
        noticeText = `${updatedByUser.displayName} changed the group name to "${updates.name}"`;
      } else if (updates.avatar) {
        noticeText = `${updatedByUser.displayName} updated the group avatar`;
      }

      await setDoc(systemMsgRef, {
        id: systemMsgRef.id,
        chatId,
        senderId: updatedByUser.id,
        senderName: updatedByUser.displayName,
        isSystem: true,
        type: 'text',
        text: noticeText,
        status: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Notice writing system announcement for group update:', e);
    }
  }
}

/**
 * Adds new members to an existing group conversation.
 */
export async function addGroupParticipants(
  chatId: string,
  newParticipantIds: string[],
  addedByUser: { id: string; displayName: string },
  addedUserNames?: string[]
): Promise<void> {
  if (!newParticipantIds.length) return;
  const chatRef = doc(db, 'chats', chatId);

  await updateDoc(chatRef, {
    participants: arrayUnion(...newParticipantIds),
    updatedAt: serverTimestamp(),
  });

  try {
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const systemMsgRef = doc(messagesCol);
    const namesStr = addedUserNames && addedUserNames.length > 0
      ? addedUserNames.join(', ')
      : `${newParticipantIds.length} new member(s)`;

    await setDoc(systemMsgRef, {
      id: systemMsgRef.id,
      chatId,
      senderId: addedByUser.id,
      senderName: addedByUser.displayName,
      isSystem: true,
      type: 'text',
      text: `👤 ${addedByUser.displayName} added ${namesStr} to the group`,
      status: 'sent',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Notice writing system announcement for added members:', e);
  }
}

/**
 * Removes a member from a group conversation.
 */
export async function removeGroupParticipant(
  chatId: string,
  participantId: string,
  removedByUser: { id: string; displayName: string },
  participantName?: string
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);

  await updateDoc(chatRef, {
    participants: arrayRemove(participantId),
    admins: arrayRemove(participantId),
    updatedAt: serverTimestamp(),
  });

  try {
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const systemMsgRef = doc(messagesCol);

    await setDoc(systemMsgRef, {
      id: systemMsgRef.id,
      chatId,
      senderId: removedByUser.id,
      senderName: removedByUser.displayName,
      isSystem: true,
      type: 'text',
      text: `❌ ${removedByUser.displayName} removed ${participantName || 'a member'} from the group`,
      status: 'sent',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Notice writing system announcement for removed member:', e);
  }
}

/**
 * Leaves a group conversation.
 */
export async function leaveGroupChat(
  chatId: string,
  userId: string,
  userName: string
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);

  await updateDoc(chatRef, {
    participants: arrayRemove(userId),
    admins: arrayRemove(userId),
    [`unreadCounts.${userId}`]: 0,
    updatedAt: serverTimestamp(),
  });

  try {
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const systemMsgRef = doc(messagesCol);

    await setDoc(systemMsgRef, {
      id: systemMsgRef.id,
      chatId,
      senderId: userId,
      senderName: userName,
      isSystem: true,
      type: 'text',
      text: `👋 ${userName} left the group`,
      status: 'sent',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Notice writing system announcement for left member:', e);
  }
}

/**
 * Toggles or sets the pinned state for a chat.
 * Updates the 'pinned' boolean field directly on the chat document in Firestore,
 * and maintains user-specific 'pinnedBy' list so pinning can be tracked per-user.
 */
export async function togglePinChat(
  chatId: string,
  pinned: boolean,
  userId?: string
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  try {
    const updateData: Record<string, any> = {
      pinned,
      updatedAt: serverTimestamp(),
    };
    if (userId) {
      updateData.pinnedBy = pinned ? arrayUnion(userId) : arrayRemove(userId);
    }
    await updateDoc(chatRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
}


