import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Story,
  StoryPrivacy,
  NexxoUser,
  StoryViewerRecord,
  StoryReactionRecord,
  StoryMusicAttachment,
  StoryFilterSettings,
  StoryStickerOverlay,
  StoryAudioMix,
  StoryDraft,
  StoryHighlight,
} from '../types';
import { createInAppNotification } from './notificationService';
import { ensureChatExists, sendChatMessage, getChatIdForUsers } from './chatService';

export interface CreateStoryParams {
  user: NexxoUser;
  type: 'text' | 'image' | 'video' | 'audio';
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  privacy: StoryPrivacy;
  allowedUserIds?: string[];
  hiddenUserIds?: string[];
  musicTrack?: StoryMusicAttachment;
  mediaFilters?: StoryFilterSettings;
  stickers?: StoryStickerOverlay[];
  audioMix?: StoryAudioMix;
  expirationHours?: number;
}

/**
 * Creates and publishes a new NEXXO Story with media, music, overlays, and privacy.
 */
export async function createStory(params: CreateStoryParams): Promise<string> {
  const storyId = 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Expiration calculation (default 24h)
  const expirationHours = params.expirationHours || 24;
  const expiresAtMillis = Date.now() + expirationHours * 60 * 60 * 1000;
  const expiresAt = Timestamp.fromMillis(expiresAtMillis);

  const storyData: Story = {
    id: storyId,
    userId: params.user.id,
    userDisplayName: params.user.displayName,
    userUsername: params.user.username,
    userPhotoURL: params.user.photoURL || '',
    userNexxoId: params.user.nexxoId,
    type: params.type,
    caption: params.caption?.trim() || '',
    mediaUrl: params.mediaUrl || '',
    thumbnailUrl: params.thumbnailUrl || '',
    duration: params.duration || (params.type === 'video' ? 15 : 6),
    backgroundColor: params.backgroundColor || '#4F46E5',
    textColor: params.textColor || '#FFFFFF',
    fontFamily: params.fontFamily || 'Inter, sans-serif',
    privacy: params.privacy,
    allowedUserIds: params.allowedUserIds || [],
    hiddenUserIds: params.hiddenUserIds || [],
    views: [],
    viewCount: 0,
    viewersList: [],
    reactions: [],
    reactionsMap: {},
    replyCount: 0,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  if (params.musicTrack) {
    storyData.musicTrack = params.musicTrack;
  }
  if (params.mediaFilters) {
    storyData.mediaFilters = params.mediaFilters;
  }
  if (params.stickers && params.stickers.length > 0) {
    storyData.stickers = params.stickers;
  }
  if (params.audioMix) {
    storyData.audioMix = params.audioMix;
  }

  await setDoc(doc(db, 'stories', storyId), storyData);

  // Check for @mentions in caption or stickers and notify mentioned users
  handleMentions(params.caption || '', params.user, storyId);

  return storyId;
}

/**
 * Subscribes to active non-expired stories respecting privacy boundaries.
 */
export function subscribeToActiveStories(
  currentUser: NexxoUser,
  connectionUserIds: string[] = [],
  blockedUserIdsOrCb: string[] | ((stories: Story[]) => void) = [],
  callback?: (stories: Story[]) => void
): () => void {
  const safeBlockedIds = Array.isArray(blockedUserIdsOrCb) ? blockedUserIdsOrCb : [];
  const safeConnectionIds = Array.isArray(connectionUserIds) ? connectionUserIds : [];
  const onUpdate =
    typeof blockedUserIdsOrCb === 'function'
      ? blockedUserIdsOrCb
      : typeof callback === 'function'
      ? callback
      : () => {};

  const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const validStories: Story[] = [];

      for (const d of snapshot.docs) {
        const story = d.data() as Story;
        if (!story || !story.userId) continue;

        // Skip stories from blocked users
        if (safeBlockedIds.includes(story.userId)) {
          continue;
        }

        // Check 24-hour expiration
        const expTime = story.expiresAt?.toMillis ? story.expiresAt.toMillis() : 0;
        if (expTime > 0 && expTime < now) {
          continue; // Expired
        }

        // Check hidden privacy
        if (Array.isArray(story.hiddenUserIds) && story.hiddenUserIds.includes(currentUser.id)) {
          continue;
        }

        // Check privacy tier
        if (story.userId === currentUser.id) {
          validStories.push(story);
        } else if (story.privacy === 'everyone') {
          validStories.push(story);
        } else if (story.privacy === 'connections' && safeConnectionIds.includes(story.userId)) {
          validStories.push(story);
        } else if (story.privacy === 'close_friends' && safeConnectionIds.includes(story.userId)) {
          validStories.push(story);
        } else if (story.privacy === 'selected' && Array.isArray(story.allowedUserIds) && story.allowedUserIds.includes(currentUser.id)) {
          validStories.push(story);
        }
      }

      onUpdate(validStories);
    },
    (err) => {
      console.error('Error listening to stories:', err);
    }
  );
}

/**
 * Subscribes to real-time updates for a single story (views, reactions, replies).
 */
export function subscribeToStory(
  storyId: string,
  onUpdate: (story: Story | null) => void
): () => void {
  const storyRef = doc(db, 'stories', storyId);
  return onSnapshot(
    storyRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snap.data() as Story);
      }
    },
    (err) => {
      console.warn('Error subscribing to story:', err);
    }
  );
}

/**
 * Records a story view with full viewer metadata and deduplication.
 * Does not count story owner as viewer and prevents repeat counting.
 */
export async function recordStoryView(
  storyId: string,
  viewer: NexxoUser,
  storyOwnerId: string
): Promise<void> {
  // Never count the owner's own views
  if (viewer.id === storyOwnerId) {
    return;
  }

  const storyRef = doc(db, 'stories', storyId);
  const snap = await getDoc(storyRef);
  if (!snap.exists()) return;

  const data = snap.data() as Story;
  const existingViews = data.views || [];
  if (existingViews.includes(viewer.id)) {
    return; // Already recorded
  }

  const viewerRecord: StoryViewerRecord = {
    userId: viewer.id,
    displayName: viewer.displayName,
    username: viewer.username,
    photoURL: viewer.photoURL || '',
    viewedAt: new Date().toISOString(),
  };

  await updateDoc(storyRef, {
    views: arrayUnion(viewer.id),
    viewCount: increment(1),
    viewersList: arrayUnion(viewerRecord),
  });
}

/**
 * Adds or updates an emoji reaction to a story in realtime and notifies owner.
 */
export async function addStoryReaction(
  story: Story,
  user: NexxoUser,
  emoji: string
): Promise<void> {
  const storyRef = doc(db, 'stories', story.id);

  const reactionRecord: StoryReactionRecord = {
    userId: user.id,
    userName: user.displayName,
    userPhoto: user.photoURL || '',
    emoji,
    createdAt: new Date().toISOString(),
  };

  const reactionsMap = { ...(story.reactionsMap || {}), [user.id]: emoji };

  await updateDoc(storyRef, {
    reactions: arrayUnion(reactionRecord),
    reactionsMap,
  });

  // Notify owner if not self
  if (story.userId !== user.id) {
    createInAppNotification({
      userId: story.userId,
      type: 'story',
      title: `${user.displayName} reacted to your story`,
      body: `${emoji} on your ${story.type} story`,
      data: {
        storyId: story.id,
        senderId: user.id,
        emoji,
      },
    }).catch(console.warn);
  }
}

/**
 * Sends a reply to a story (text, emoji, voice message, or photo).
 * Updates story reply count, notifies the owner, and dispatches a message to their direct chat.
 */
export async function sendStoryReply(
  story: Story,
  sender: NexxoUser,
  replyText: string
): Promise<void> {
  const storyRef = doc(db, 'stories', story.id);
  await updateDoc(storyRef, {
    replyCount: increment(1),
  });

  if (story.userId !== sender.id) {
    // Send in-app notification
    createInAppNotification({
      userId: story.userId,
      type: 'story',
      title: `Reply from ${sender.displayName}`,
      body: `"${replyText.substring(0, 80)}" on your story`,
      data: {
        storyId: story.id,
        senderId: sender.id,
        replyText,
      },
    }).catch(console.warn);

    // Send real-time chat message into the direct chat between sender and story owner
    try {
      const chatId = getChatIdForUsers(sender.id, story.userId);
      await ensureChatExists(chatId, [sender.id, story.userId]);

      const storyContextSnippet =
        story.type === 'text'
          ? `Story: "${story.caption?.substring(0, 40) || 'Text story'}"`
          : `Story: [${story.type.toUpperCase()}] ${story.caption?.substring(0, 30) || ''}`;

      await sendChatMessage({
        chatId,
        senderId: sender.id,
        senderName: sender.displayName,
        senderAvatar: sender.photoURL,
        recipientId: story.userId,
        participants: [sender.id, story.userId],
        text: `Replied to your story (${storyContextSnippet}):\n${replyText}`,
        type: 'text',
      });
    } catch (chatErr) {
      console.warn('Could not post story reply to direct chat:', chatErr);
    }
  }
}

/**
 * Deletes a story.
 */
export async function deleteStory(storyId: string): Promise<void> {
  await deleteDoc(doc(db, 'stories', storyId));
}

/**
 * Saves a story as a draft.
 */
export async function saveStoryDraft(
  draft: Omit<StoryDraft, 'id' | 'updatedAt'>
): Promise<string> {
  const id = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await setDoc(doc(db, 'storyDrafts', id), {
    ...draft,
    id,
    updatedAt: serverTimestamp(),
  });
  return id;
}

/**
 * Gets saved drafts for a user.
 */
export async function getUserStoryDrafts(userId: string): Promise<StoryDraft[]> {
  const q = query(collection(db, 'storyDrafts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StoryDraft);
}

/**
 * Deletes a story draft.
 */
export async function deleteStoryDraft(draftId: string): Promise<void> {
  await deleteDoc(doc(db, 'storyDrafts', draftId));
}

/**
 * Fetches expired/archived stories for the story owner.
 */
export async function getUserStoryArchive(userId: string): Promise<Story[]> {
  const q = query(
    collection(db, 'stories'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const now = Date.now();
  const archived: Story[] = [];

  snap.docs.forEach((d) => {
    const story = d.data() as Story;
    const expTime = story.expiresAt?.toMillis ? story.expiresAt.toMillis() : 0;
    if (expTime > 0 && expTime < now) {
      archived.push(story);
    }
  });

  return archived;
}

/**
 * Creates a story highlight album.
 */
export async function createStoryHighlight(
  userId: string,
  name: string,
  coverUrl: string,
  storyIds: string[]
): Promise<string> {
  const id = `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const data: StoryHighlight = {
    id,
    userId,
    name: name.trim(),
    coverUrl,
    storyIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'storyHighlights', id), data);
  return id;
}

/**
 * Fetches highlights for a user.
 */
export async function getUserStoryHighlights(userId: string): Promise<StoryHighlight[]> {
  const q = query(
    collection(db, 'storyHighlights'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StoryHighlight);
}

/**
 * Deletes a highlight.
 */
export async function deleteStoryHighlight(highlightId: string): Promise<void> {
  await deleteDoc(doc(db, 'storyHighlights', highlightId));
}

/**
 * Helper to notify @mentioned users in a story.
 */
async function handleMentions(text: string, author: NexxoUser, storyId: string) {
  const mentionMatches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!mentionMatches || mentionMatches.length === 0) return;

  const usernames = Array.from(new Set(mentionMatches.map((m) => m.substring(1).toLowerCase())));
  for (const uname of usernames) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', uname));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const targetUser = snap.docs[0].data() as NexxoUser;
        if (targetUser.id !== author.id) {
          createInAppNotification({
            userId: targetUser.id,
            type: 'story',
            title: `${author.displayName} mentioned you`,
            body: `You were mentioned in their story.`,
            data: { storyId, authorId: author.id },
          }).catch(console.warn);
        }
      }
    } catch (e) {
      // Continue safely
    }
  }
}

/**
 * Subscribes to all platform stories for admin oversight and moderation.
 */
export function subscribeToAllStoriesForAdmin(onUpdate: (stories: Story[]) => void): () => void {
  const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Story);
      onUpdate(list);
    },
    (err) => {
      console.error('Error fetching stories for admin:', err);
    }
  );
}
