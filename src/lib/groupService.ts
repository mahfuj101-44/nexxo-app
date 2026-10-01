import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Group, GroupMessage, GroupRole, GroupSettings, MessageAttachment, ReplyReference, PollData, MessageType } from '../types';

export async function createGroup(params: {
  name: string;
  photoURL?: string;
  description?: string;
  ownerId: string;
  initialMemberIds: string[];
  settings?: Partial<GroupSettings>;
}): Promise<string> {
  const groupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const allMembers = Array.from(new Set([params.ownerId, ...params.initialMemberIds]));

  const defaultSettings: GroupSettings = {
    whoCanAddMembers: 'all',
    whoCanEditInfo: 'admins',
    whoCanSendMessages: 'all',
    muteNotificationsFor: [],
    ...params.settings,
  };

  const groupData: Group = {
    id: groupId,
    name: params.name.trim(),
    photoURL: params.photoURL || '',
    description: params.description?.trim() || '',
    ownerId: params.ownerId,
    admins: [params.ownerId],
    members: allMembers,
    memberCount: allMembers.length,
    settings: defaultSettings,
    lastMessage: 'Group created.',
    lastMessageSenderId: params.ownerId,
    lastMessageSenderName: 'System',
    lastMessageAt: serverTimestamp(),
    unreadCounts: {},
    typing: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'groups', groupId), groupData);
  return groupId;
}

export function subscribeToUserGroups(
  userId: string,
  onUpdate: (groups: Group[]) => void
): () => void {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map((d) => d.data() as Group);
      // Sort by lastMessageAt descending
      groups.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
        const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
        return timeB - timeA;
      });
      onUpdate(groups);
    },
    (err) => {
      console.error('Error listening to user groups:', err);
    }
  );
}

export function subscribeToGroupDoc(
  groupId: string,
  onUpdate: (group: Group | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Group);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Error listening to group doc:', err);
    }
  );
}

export function subscribeToGroupMessages(
  groupId: string,
  onUpdate: (messages: GroupMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => d.data() as GroupMessage);
      onUpdate(msgs);
    },
    (err) => {
      console.error('Error listening to group messages:', err);
    }
  );
}

export async function sendGroupMessage(params: {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  type?: MessageType;
  replyTo?: ReplyReference | null;
  attachment?: MessageAttachment | null;
  poll?: PollData | null;
}): Promise<void> {
  const messageId = 'gmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const msgRef = doc(db, 'groups', params.groupId, 'messages', messageId);

  const messageData: GroupMessage = {
    id: messageId,
    groupId: params.groupId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderPhoto: params.senderPhoto || '',
    type: params.poll ? 'poll' : params.type || 'text',
    text: params.poll ? `📊 Poll: ${params.poll.question}` : params.text,
    status: 'sent',
    replyTo: params.replyTo || null,
    attachment: params.attachment || null,
    poll: params.poll || undefined,
    reactions: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(msgRef, messageData);

  // Update group summary
  const groupRef = doc(db, 'groups', params.groupId);
  await updateDoc(groupRef, {
    lastMessage: params.poll
      ? `📊 Poll: ${params.poll.question}`
      : params.text || (params.type === 'voice' ? '🎤 Voice message' : '📎 Attachment'),
    lastMessageSenderId: params.senderId,
    lastMessageSenderName: params.senderName,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function sendGroupPoll(params: {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  question: string;
  options: string[];
  multipleAnswers?: boolean;
}): Promise<void> {
  const pollId = 'poll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const pollOptions = params.options.map((opt, idx) => ({
    id: `opt_${idx}_${Date.now()}`,
    text: opt.trim(),
    votes: [],
  }));

  const pollData: PollData = {
    id: pollId,
    question: params.question.trim(),
    options: pollOptions,
    multipleAnswers: Boolean(params.multipleAnswers),
    isClosed: false,
    createdBy: params.senderId,
    createdAt: new Date(),
  };

  await sendGroupMessage({
    groupId: params.groupId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderPhoto: params.senderPhoto,
    text: `📊 Poll: ${params.question.trim()}`,
    type: 'poll',
    poll: pollData,
  });
}

export async function voteGroupPoll(
  groupId: string,
  messageId: string,
  optionId: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as GroupMessage;
  const poll = data.poll;
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
      votes = votes.filter((uid) => uid !== userId);
    }
    return { ...opt, votes };
  });

  await updateDoc(msgRef, {
    'poll.options': updatedOptions,
    updatedAt: serverTimestamp(),
  });
}

export async function closeGroupPoll(
  groupId: string,
  messageId: string
): Promise<void> {
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
  await updateDoc(msgRef, {
    'poll.isClosed': true,
    updatedAt: serverTimestamp(),
  });
}

export async function setGroupTypingStatus(
  groupId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  if (isTyping) {
    await updateDoc(groupRef, {
      [`typing.${userId}`]: {
        name: userName,
        timestamp: serverTimestamp(),
      },
    });
  } else {
    await updateDoc(groupRef, {
      [`typing.${userId}`]: null,
    });
  }
}

export async function updateGroupSettings(
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    photoURL?: string;
    settings?: Partial<GroupSettings>;
  }
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const payload: any = { updatedAt: serverTimestamp() };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.photoURL !== undefined) payload.photoURL = updates.photoURL;
  if (updates.settings) {
    Object.entries(updates.settings).forEach(([k, v]) => {
      payload[`settings.${k}`] = v;
    });
  }

  await updateDoc(groupRef, payload);
}

export async function addGroupMembers(
  groupId: string,
  newMemberIds: string[]
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) return;
  const currentMembers: string[] = snap.data().members || [];
  const toAdd = newMemberIds.filter((id) => !currentMembers.includes(id));
  if (toAdd.length === 0) return;

  await updateDoc(groupRef, {
    members: arrayUnion(...toAdd),
    memberCount: increment(toAdd.length),
    updatedAt: serverTimestamp(),
  });
}

export async function removeGroupMember(
  groupId: string,
  memberIdToRemove: string
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    members: arrayRemove(memberIdToRemove),
    admins: arrayRemove(memberIdToRemove),
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
}

export async function setMemberAdminRole(
  groupId: string,
  memberId: string,
  makeAdmin: boolean
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  if (makeAdmin) {
    await updateDoc(groupRef, {
      admins: arrayUnion(memberId),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(groupRef, {
      admins: arrayRemove(memberId),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function toggleGroupMessageReaction(
  groupId: string,
  messageId: string,
  emoji: string,
  userId: string,
  existingReactions?: Record<string, string[]>
): Promise<void> {
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
  const currentReactions = existingReactions ? { ...existingReactions } : {};
  const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];

  if (userList.includes(userId)) {
    const updated = userList.filter((id) => id !== userId);
    if (updated.length > 0) {
      currentReactions[emoji] = updated;
    } else {
      delete currentReactions[emoji];
    }
  } else {
    currentReactions[emoji] = [...userList, userId];
  }

  await updateDoc(msgRef, {
    reactions: currentReactions,
  });
}

export async function editGroupMessage(
  groupId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
  await updateDoc(msgRef, {
    text: newText.trim(),
    isEdited: true,
    editedAt: serverTimestamp(),
  });
}

export async function deleteGroupMessageForEveryone(
  groupId: string,
  messageId: string
): Promise<void> {
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
  await updateDoc(msgRef, {
    isDeletedForEveryone: true,
    text: 'This message was deleted.',
    attachment: null,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToAllGroups(onUpdate: (groups: Group[]) => void): () => void {
  const q = query(collection(db, 'groups'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Group);
      onUpdate(list);
    },
    (err) => console.error('Error listening to all groups:', err)
  );
}

export const subscribeToGroups = subscribeToUserGroups;
