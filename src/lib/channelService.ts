import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Channel, ChannelPost, NexxoUser } from '../types';

export async function createChannel(params: {
  name: string;
  handle: string;
  description: string;
  photoURL?: string;
  coverURL?: string;
  ownerId: string;
  isPublic?: boolean;
}): Promise<string> {
  const cleanHandle = params.handle.replace(/^@/, '').toLowerCase().trim();
  const channelId = 'chn_' + cleanHandle + '_' + Math.random().toString(36).substring(2, 5);

  const channelData: Channel = {
    id: channelId,
    name: params.name.trim(),
    handle: cleanHandle,
    description: params.description.trim(),
    photoURL: params.photoURL || '',
    coverURL: params.coverURL || '',
    ownerId: params.ownerId,
    isVerified: false,
    isPublic: params.isPublic !== false,
    subscribers: [params.ownerId],
    subscribersCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'channels', channelId), channelData);
  return channelId;
}

export function subscribeToChannels(onUpdate: (channels: Channel[]) => void): () => void {
  const q = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const channels = snapshot.docs.map((d) => d.data() as Channel);
      onUpdate(channels);
    },
    (err) => {
      console.error('Error listening to channels:', err);
    }
  );
}

export function subscribeToChannelPosts(
  channelId: string,
  onUpdate: (posts: ChannelPost[]) => void
): () => void {
  const q = query(
    collection(db, 'channels', channelId, 'posts'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map((d) => d.data() as ChannelPost);
      onUpdate(posts);
    },
    (err) => {
      console.error('Error listening to channel posts:', err);
    }
  );
}

export async function toggleChannelSubscription(
  channelId: string,
  userId: string,
  isSubscribed: boolean
): Promise<void> {
  const channelRef = doc(db, 'channels', channelId);
  if (isSubscribed) {
    await updateDoc(channelRef, {
      subscribers: arrayRemove(userId),
      subscribersCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(channelRef, {
      subscribers: arrayUnion(userId),
      subscribersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function createChannelPost(params: {
  channelId: string;
  author: NexxoUser;
  title?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link';
  linkUrl?: string;
}): Promise<string> {
  const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const postRef = doc(db, 'channels', params.channelId, 'posts', postId);

  const postData: ChannelPost = {
    id: postId,
    channelId: params.channelId,
    authorId: params.author.id,
    authorName: params.author.displayName,
    authorPhoto: params.author.photoURL || '',
    title: params.title?.trim() || '',
    content: params.content.trim(),
    mediaUrl: params.mediaUrl || '',
    mediaType: params.mediaType,
    linkUrl: params.linkUrl || '',
    likes: [],
    viewsCount: 1,
    createdAt: serverTimestamp(),
  };

  await setDoc(postRef, postData);
  return postId;
}

export async function togglePostLike(
  channelId: string,
  postId: string,
  userId: string,
  hasLiked: boolean
): Promise<void> {
  const postRef = doc(db, 'channels', channelId, 'posts', postId);
  if (hasLiked) {
    await updateDoc(postRef, {
      likes: arrayRemove(userId),
    });
  } else {
    await updateDoc(postRef, {
      likes: arrayUnion(userId),
    });
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  await deleteDoc(doc(db, 'channels', channelId));
}

export async function toggleChannelVerification(channelId: string, isVerified: boolean): Promise<void> {
  const channelRef = doc(db, 'channels', channelId);
  await updateDoc(channelRef, {
    isVerified,
    updatedAt: serverTimestamp(),
  });
}

