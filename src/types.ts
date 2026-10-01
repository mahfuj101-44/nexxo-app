export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'dnd';

export type UserStatus = 'active' | 'suspended';

export type UserRole = 'user' | 'admin';

export type AutoLockTimeout = 'backgrounded' | '1m' | '5m' | '15m' | '30m' | 'never';

export type AppThemeMode = 'light' | 'dark' | 'high-contrast' | 'system';

export type PrivacyAudience = 'everyone' | 'connections' | 'nobody';
export type OnlineAudience = 'everyone' | 'connections' | 'same_as_last_seen' | 'nobody';

export interface UserSettings {
  discoveryAllowed: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  lastSeenPrivacy?: PrivacyAudience; // Who can see last seen: everyone, connections, nobody
  onlineStatusPrivacy?: OnlineAudience; // Who can see online: everyone, same_as_last_seen, nobody
  profilePhotoPrivacy?: PrivacyAudience; // Who can see profile photo: everyone, connections, nobody
  bioPrivacy?: PrivacyAudience; // Who can see bio: everyone, connections, nobody
  readReceipts?: boolean;
  showTypingIndicator?: boolean;
  autoLockTimeout?: AutoLockTimeout;
  themeMode?: AppThemeMode;
  storyVisibility?: 'everyone' | 'connections' | 'selected';
  allowCallsFrom?: 'everyone' | 'connections' | 'nobody';
  allowGroupInvites?: 'everyone' | 'connections' | 'nobody';
  defaultEphemeralTimer?: number; // Default disappearing messages duration in seconds (0 = off)
  aiFeaturesEnabled?: boolean;
  doNotDisturb?: boolean;
  dndUntil?: number | null;
  customStatusText?: string;
  customStatusEmoji?: string;
}

export interface NexxoUser {
  id: string; // Firebase Auth UID
  nexxoId: string; // Permanent Unique NEXXO ID (e.g. NX-4892-1048)
  email: string;
  displayName: string;
  username: string;
  usernameLower: string;
  photoURL: string;
  avatar?: string; // Optional alias for photoURL for backwards compatibility
  bio: string;
  status: UserStatus;
  presence: PresenceStatus;
  role: UserRole;
  lastActiveAt?: any;
  createdAt?: any;
  updatedAt?: any;
  settings: UserSettings;
  isVerified?: boolean; // Blue Tick Verified User
  isPremium?: boolean; // NEXXO Premium subscriber
  premiumTier?: 'free' | 'basic' | 'pro' | 'vip' | 'elite';
  verifiedAt?: any;
  subscriptionAutoRenew?: boolean;
  subscriptionAutoPayMethod?: 'upi_autopay' | 'card_recurring' | 'manual';
  subscriptionRenewalDate?: any;
  dailyConnectionStats?: {
    date: string; // YYYY-MM-DD
    count: number;
  };
}

export interface DailyConnectionLimitStats {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  isExceeded: boolean;
}

export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  users: string[]; // [user1Id, user2Id]
  status: 'connected' | 'blocked';
  blockedBy?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: NexxoUser;
  toUser?: NexxoUser;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  updatedAt?: any;
}

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userPhotoURL: string;
  plan: 'pro' | 'vip';
  planName: string;
  priceAmount: string;
  fullName: string;
  idDocumentType: string;
  idDocumentNumber?: string;
  idDocumentPhotoUrl?: string;
  category: string;
  paymentMethod: string;
  paymentTransactionId: string;
  paymentScreenshotUrl?: string;
  autoRenew?: boolean;
  autoPayMethod?: 'upi_autopay' | 'card_recurring' | 'manual';
  status: VerificationRequestStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'poll' | 'location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  placeName?: string;
  address?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of user IDs
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  multipleAnswers?: boolean;
  isClosed?: boolean;
  createdBy: string;
  createdAt: any;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  storagePath?: string;
  duration?: number; // duration in seconds for voice notes
  thumbnailUrl?: string;
  type?: 'image' | 'video' | 'file' | 'audio';
}

export interface ReplyReference {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  type?: MessageType;
}

export interface Chat {
  id: string;
  participants: string[];
  isGroup?: boolean;
  name?: string;
  avatar?: string;
  description?: string;
  createdBy?: string;
  admins?: string[];
  pinned?: boolean;
  pinnedBy?: string[];
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageType?: MessageType;
  lastMessageAt?: any;
  lastMessageStatus?: MessageDeliveryStatus;
  unreadCounts?: Record<string, number>; // userId -> unread count
  drafts?: Record<string, string>; // userId -> unsent draft text
  typing?: Record<string, any>; // userId -> timestamp of last typing activity
  deletedFor?: string[]; // user IDs who removed/deleted this conversation from their view
  clearedAt?: Record<string, any>; // userId -> timestamp when conversation history was deleted for this user
  ephemeralTimer?: number; // In seconds: 0 = off, 86400 = 24h, 604800 = 7d
  isEncrypted?: boolean; // End-to-End Encryption enabled for this room
  createdAt: any;
  updatedAt?: any;
  otherUser?: NexxoUser; // hydrated in memory
}

export interface ChatMessage {
  id: string;
  chatId: string;
  groupId?: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  isSystem?: boolean;
  participants?: string[];
  type: MessageType;
  text: string;
  status: MessageDeliveryStatus;
  readAt?: any;
  readBy?: Record<string, any>; // userId -> timestamp
  replyTo?: ReplyReference | null;
  isEdited?: boolean;
  editedAt?: any;
  deletedFor?: string[]; // user IDs who deleted this message for themselves
  isDeletedForEveryone?: boolean;
  starredBy?: string[]; // user IDs who starred this message
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
  attachment?: MessageAttachment | null;
  poll?: PollData;
  location?: LocationData;
  isEncrypted?: boolean;
  expiresAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export interface FeatureFlags {
  privateMessaging: boolean;
  groups: boolean;
  stories: boolean;
  channels: boolean;
  communities: boolean;
  voiceCalls: boolean;
  videoCalls: boolean;
  aiAssistant: boolean;
  translation: boolean;
  voiceNotes: boolean;
  qrConnections: boolean;
  notifications: boolean;
  // Modern features
  polls: boolean;
  ephemeralMessages: boolean;
  verifiedBadges: boolean;
  mediaVault: boolean;
  scheduledMessages: boolean;
}

export interface PlatformSettings {
  // General
  platformName?: string;
  platformDescription?: string;
  maintenanceMode: boolean;
  systemNotice: string;
  androidApkDownloadUrl?: string;
  androidVersionName?: string;

  // Announcements
  currentAnnouncement?: {
    id?: string;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'emergency' | 'update';
    active: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt?: any;
    createdBy?: string;
  };

  // Registration & Discovery
  registrationEnabled: boolean;
  discoveryEnabled: boolean;
  googleAuthEnabled?: boolean;

  // Messaging Policies
  maxAttachmentSizeMB?: number;
  allowedFileTypes?: string[];
  maxMessageLength?: number;
  defaultEphemeralSeconds?: number;
  ephemeralEnabled?: boolean;
  pollsEnabled?: boolean;
  maxMediaVaultStorageMB?: number;

  // Groups & Channels Policies
  maxGroupMembers?: number;
  groupCreationRestrictedToAdmins?: boolean;
  channelCreationRestrictedToAdmins?: boolean;

  // Stories Policies
  storyExpirationHours?: number;
  maxStoryUploadsPerDay?: number;

  // AI Controls
  aiEnabled?: boolean;
  aiSmartRepliesEnabled?: boolean;
  aiTranslationEnabled?: boolean;
  aiSummarizeEnabled?: boolean;

  // Feature Flags
  featureFlags?: FeatureFlags;

  updatedAt?: any;
}

export interface AdminRoleDoc {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  role: 'superadmin' | 'admin' | 'moderator';
  assignedAt: any;
  assignedBy?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetId: string;
  details?: Record<string, any>;
  createdAt: any;
}

// Stage 3: Groups
export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupSettings {
  whoCanAddMembers: 'all' | 'admins';
  whoCanEditInfo: 'all' | 'admins';
  whoCanSendMessages: 'all' | 'admins';
  muteNotificationsFor?: string[];
}

export interface Group {
  id: string;
  name: string;
  photoURL?: string;
  description?: string;
  ownerId: string;
  admins: string[]; // user IDs
  members: string[]; // user IDs
  memberCount: number;
  settings: GroupSettings;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageAt?: any;
  unreadCounts?: Record<string, number>;
  typing?: Record<string, any>;
  createdAt: any;
  updatedAt?: any;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  type: MessageType;
  text: string;
  status?: MessageDeliveryStatus;
  replyTo?: ReplyReference | null;
  isEdited?: boolean;
  editedAt?: any;
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
  reactions?: Record<string, string[]>;
  attachment?: MessageAttachment | null;
  poll?: PollData;
  expiresAt?: any;
  createdAt: any;
  updatedAt?: any;
}

// Stage 3: Stories / Status & Media Ecosystem
export type StoryPrivacy = 'everyone' | 'connections' | 'selected' | 'close_friends' | 'hide_from';

export interface StoryViewerRecord {
  userId: string;
  displayName: string;
  username: string;
  photoURL?: string;
  viewedAt: any;
  reaction?: string;
}

export interface StoryReactionRecord {
  userId: string;
  userName: string;
  userPhoto?: string;
  emoji: string;
  createdAt: any;
}

export interface StoryMusicAttachment {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  audioUrl: string;
  duration: number; // total song seconds
  startTime: number; // chosen start offset in seconds
  segmentDuration: number; // 15s, 30s or full duration
  volume: number; // 0 to 1
  source: 'catalog' | 'user_upload' | 'licensed';
  licenseType?: string;
}

export interface StoryStickerOverlay {
  id: string;
  type: 'text' | 'emoji' | 'sticker' | 'gif' | 'music_card' | 'drawing';
  content: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  scale?: number;
  rotation?: number;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface StoryFilterSettings {
  filter: 'none' | 'vintage' | 'vivid' | 'mono' | 'warm' | 'cool' | 'sepia' | 'cyberpunk' | 'noir';
  rotation: number; // 0, 90, 180, 270
  brightness?: number; // percentage
  contrast?: number; // percentage
}

export interface StoryAudioMix {
  originalSound: boolean;
  originalVolume: number; // 0 to 1
  musicSound: boolean;
  musicVolume: number; // 0 to 1
}

export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userUsername: string;
  userPhotoURL?: string;
  userNexxoId: string;
  type: 'text' | 'image' | 'video' | 'audio';
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // duration in seconds (for video / audio)
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  privacy: StoryPrivacy;
  allowedUserIds?: string[];
  hiddenUserIds?: string[];
  views: string[]; // array of viewer user IDs for fast checks
  viewCount: number;
  viewersList?: StoryViewerRecord[];
  reactions?: StoryReactionRecord[];
  reactionsMap?: Record<string, string>; // userId -> emoji
  replyCount?: number;
  musicTrack?: StoryMusicAttachment;
  mediaFilters?: StoryFilterSettings;
  stickers?: StoryStickerOverlay[];
  audioMix?: StoryAudioMix;
  isArchived?: boolean;
  expiresAt: any;
  createdAt: any;
}

export type MusicGenre =
  | 'Trending'
  | 'Popular'
  | 'New'
  | 'Chill'
  | 'Love'
  | 'Party'
  | 'Sad'
  | 'Travel'
  | 'Motivation'
  | 'Instrumental'
  | 'Electronic'
  | 'Acoustic'
  | 'Devotional';

export type MusicLicenseType =
  | 'nexxo_licensed'
  | 'public_domain'
  | 'user_authorized'
  | 'cc_by'
  | 'third_party_licensed';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: MusicGenre;
  artworkUrl: string;
  audioUrl: string;
  duration: number; // seconds
  licenseType: MusicLicenseType;
  licenseNotes?: string;
  isEnabled: boolean;
  storyAvailable: boolean;
  favoritesCount?: number;
  addedBy?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface UserUploadedAudio {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  artist: string;
  audioUrl: string;
  storagePath: string;
  duration: number;
  size: number;
  mimeType: string;
  createdAt: any;
}

export interface StoryDraft {
  id: string;
  userId: string;
  name: string;
  type: 'text' | 'image' | 'video';
  previewDataUrl?: string;
  caption?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  privacy: StoryPrivacy;
  musicTrack?: StoryMusicAttachment;
  mediaFilters?: StoryFilterSettings;
  stickers?: StoryStickerOverlay[];
  audioMix?: StoryAudioMix;
  updatedAt: any;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  name: string;
  coverUrl: string;
  storyIds: string[];
  createdAt: any;
  updatedAt: any;
}

export type UserMediaType = 'image' | 'video' | 'audio' | 'document' | 'story_export';

export interface UserMediaItem {
  id: string;
  ownerId: string;
  type: UserMediaType;
  url: string;
  storagePath?: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  source: 'chat' | 'story' | 'upload' | 'camera' | 'story_export';
  createdAt: any;
}

// Stage 3: Channels
export interface Channel {
  id: string;
  name: string;
  handle: string; // @handle
  description: string;
  photoURL?: string;
  coverURL?: string;
  ownerId: string;
  isVerified?: boolean;
  isPublic: boolean;
  subscribers: string[]; // user IDs
  subscribersCount: number;
  createdAt: any;
  updatedAt?: any;
}

export interface ChannelPost {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link';
  linkUrl?: string;
  likes: string[]; // user IDs
  viewsCount: number;
  createdAt: any;
}

// Stage 3: Communities
export interface Community {
  id: string;
  name: string;
  description: string;
  photoURL?: string;
  coverURL?: string;
  ownerId: string;
  admins: string[];
  members: string[];
  memberCount: number;
  groupIds: string[]; // connected group IDs
  linkedGroupIds?: string[];
  isPrivate?: boolean;
  announcement?: string;
  announcementUpdatedAt?: any;
  createdAt: any;
  updatedAt?: any;
}

// Stage 3: WebRTC Calls
export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'busy';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  callerNexxoId: string;
  calleeId: string;
  calleeName: string;
  calleePhoto?: string;
  type: CallType;
  status: CallStatus;
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  calleeCandidates?: any[];
  callerMuted?: boolean;
  calleeMuted?: boolean;
  callerVideoOff?: boolean;
  calleeVideoOff?: boolean;
  startedAt?: any;
  connectedAt?: any;
  endedAt?: any;
  durationSeconds?: number;
  participantIds?: string[];
  deletedForUsers?: string[];
  createdAt: any;
}

// Stage 3: Safety & Moderation Reports
export type ReportTargetType = 'user' | 'message' | 'group' | 'channel' | 'story';
export type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: any;
  resolvedAt?: any;
  adminNotes?: string;
}

// Stage 3: User Blocks
export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: any;
}

// Stage 3: In-App Notifications
export type NotificationType =
  | 'message'
  | 'group_message'
  | 'connection_request'
  | 'group_invite'
  | 'call'
  | 'story'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: any;
}

export type ActiveTab =
  | 'chats'
  | 'calls'
  | 'groups'
  | 'stories'
  | 'channels'
  | 'communities'
  | 'search'
  | 'connections'
  | 'requests'
  | 'profile'
  | 'admin';
