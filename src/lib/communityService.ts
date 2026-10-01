import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Community } from '../types';

export async function createCommunity(params: {
  name: string;
  description: string;
  photoURL?: string;
  coverURL?: string;
  ownerId: string;
  groupIds?: string[];
  isPrivate?: boolean;
}): Promise<string> {
  const communityId = 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const communityData: Community = {
    id: communityId,
    name: params.name.trim(),
    description: params.description.trim(),
    photoURL: params.photoURL || '',
    coverURL: params.coverURL || '',
    ownerId: params.ownerId,
    admins: [params.ownerId],
    members: [params.ownerId],
    memberCount: 1,
    groupIds: params.groupIds || [],
    isPrivate: !!params.isPrivate,
    announcement: 'Welcome to our new community!',
    announcementUpdatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'communities', communityId), communityData);
  return communityId;
}

export function subscribeToCommunities(onUpdate: (communities: Community[]) => void): () => void {
  const q = query(collection(db, 'communities'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const comms = snapshot.docs.map((d) => d.data() as Community);
      onUpdate(comms);
    },
    (err) => {
      console.error('Error listening to communities:', err);
    }
  );
}

export async function toggleCommunityMembership(
  communityId: string,
  userId: string,
  isMember: boolean
): Promise<void> {
  const commRef = doc(db, 'communities', communityId);
  if (isMember) {
    await updateDoc(commRef, {
      members: arrayRemove(userId),
      admins: arrayRemove(userId),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(commRef, {
      members: arrayUnion(userId),
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateCommunityAnnouncement(
  communityId: string,
  announcement: string
): Promise<void> {
  const commRef = doc(db, 'communities', communityId);
  await updateDoc(commRef, {
    announcement: announcement.trim(),
    announcementUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function linkGroupToCommunity(
  communityId: string,
  groupId: string
): Promise<void> {
  const commRef = doc(db, 'communities', communityId);
  await updateDoc(commRef, {
    groupIds: arrayUnion(groupId),
    updatedAt: serverTimestamp(),
  });
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  await toggleCommunityMembership(communityId, userId, false);
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  await toggleCommunityMembership(communityId, userId, true);
}

export async function deleteCommunity(communityId: string): Promise<void> {
  await deleteDoc(doc(db, 'communities', communityId));
}

