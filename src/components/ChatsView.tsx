import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatDoc,
  markChatMessagesAsRead,
  setTypingStatus,
  toggleMessageReaction,
  toggleStarMessage,
  editChatMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  deleteConversationForUser,
  parseMessageTimestamp,
  ensureChatExists,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  setChatEphemeralTimer,
  voteChatPoll,
  closeChatPoll,
  togglePinChat,
  getChatUnreadCount,
} from '../lib/chatService';
import { uploadChatAttachment } from '../lib/storageService';
import { saveUserMediaItem } from '../lib/mediaLibraryService';
import { blockUser, unblockUser, subscribeToBlockedUsers } from '../lib/safetyService';
import { Chat, ChatMessage, NexxoUser, ReplyReference, MessageAttachment, UserMediaItem, PollData, PresenceStatus, LocationData } from '../types';
import { subscribeToPresence } from '../lib/userService';
import {
  canViewLastSeen,
  canViewOnlineStatus,
  canViewProfilePhoto,
  formatLastSeen,
} from '../lib/privacyService';
import { MessageBubble } from './chat/MessageBubble';
import { VoiceRecorder } from './chat/VoiceRecorder';
import { MediaPicker } from './chat/MediaPicker';
import { ForwardModal } from './chat/ForwardModal';
import { PrivateChatLockModal } from './chat/PrivateChatLockModal';
import { PrivateChatUnlockGate } from './chat/PrivateChatUnlockGate';
import { ChatHideSecurityModal, ChatSecurityConfig } from './chat/ChatHideSecurityModal';
import { ChatUserProfileModal } from './chat/ChatUserProfileModal';
import { UserMediaLibraryModal } from './media/UserMediaLibraryModal';
import { VerifiedBadge } from './common/VerifiedBadge';
import { CreatePollModal } from './chat/CreatePollModal';
import { CreateGroupModal } from './chat/CreateGroupModal';
import { GroupInfoModal } from './chat/GroupInfoModal';
import { MediaPreviewModal, MediaPreviewItem } from './chat/MediaPreviewModal';
import { ImageCropModal } from './chat/ImageCropModal';
import { LocationShareModal } from './chat/LocationShareModal';
import { E2eeVerificationModal } from './chat/E2eeVerificationModal';
import { encryptMessageText } from '../lib/e2eeService';
import {
  Send,
  CornerDownLeft,
  MessageSquare,
  ArrowLeft,
  Copy,
  Check,
  Search,
  Paperclip,
  Crop,
  Mic,
  X,
  ShieldCheck,
  Download,
  AlertCircle,
  Clock,
  CheckCheck,
  Radio,
  Sparkles,
  FileText,
  Phone,
  Video,
  ShieldAlert,
  MapPin,
  Smile,
  Pin,
  PinOff,
  Ban,
  UserCheck,
  MoreVertical,
  Trash2,
  Star,
  Lock,
  Unlock,
  EyeOff,
  Eye,
  Key,
  User,
  Info,
  HardDrive,
  BarChart2,
  Timer,
  Users,
  UserPlus,
  Palette,
} from 'lucide-react';
import { ChatThemeModal } from './theme/ChatThemeModal';
import {
  ChatThemeConfig,
  getChatTheme,
  subscribeToThemeChanges,
  getWallpaperCssStyle,
} from '../lib/wallpaperService';

interface ChatsViewProps {
  currentUser: NexxoUser;
  chats: Chat[];
  activeChatUser: NexxoUser | null;
  setActiveChatUser: (user: NexxoUser | null) => void;
  onNavigateToSearch: () => void;
  onStartCall?: (type: 'voice' | 'video', user: NexxoUser) => void;
  onOpenReport?: (type: 'user', id: string, name?: string) => void;
  onOpenAiAssistant?: () => void;
  appPasscode?: string | null;
  availableUsers?: NexxoUser[];
  activeGroupChat?: Chat | null;
  setActiveGroupChat?: (chat: Chat | null) => void;
  connectionUserIds?: string[];
  onOpenPrivacySettings?: () => void;
}

/**
 * Universal parser to determine whether a partner is currently composing a message.
 * Supports Firestore Timestamp, Date, raw epoch milliseconds, and boolean payloads.
 */
function isPartnerActiveTyping(val: any): boolean {
  if (!val) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'object') {
    if (typeof val.isTyping === 'boolean') {
      if (!val.isTyping) return false;
      const at = val.at;
      if (typeof at === 'number') {
        return Math.abs(Date.now() - at) < 7000;
      }
      return true;
    }
    if (typeof val.toMillis === 'function') {
      return Math.abs(Date.now() - val.toMillis()) < 7000;
    }
    if (typeof val.toDate === 'function') {
      return Math.abs(Date.now() - val.toDate().getTime()) < 7000;
    }
    if (val instanceof Date) {
      return Math.abs(Date.now() - val.getTime()) < 7000;
    }
  }
  if (typeof val === 'number') {
    return Math.abs(Date.now() - val) < 7000;
  }
  return false;
}

export const ChatsView: React.FC<ChatsViewProps> = ({
  currentUser,
  chats,
  activeChatUser,
  setActiveChatUser,
  onNavigateToSearch,
  onStartCall,
  onOpenReport,
  onOpenAiAssistant,
  appPasscode,
  availableUsers,
  activeGroupChat: propActiveGroupChat,
  setActiveGroupChat: propSetActiveGroupChat,
  connectionUserIds,
  onOpenPrivacySettings,
}) => {
  // Local active group chat tracking
  const [localActiveGroupChat, setLocalActiveGroupChat] = useState<Chat | null>(null);
  const activeGroupChat = propActiveGroupChat !== undefined ? propActiveGroupChat : localActiveGroupChat;
  const setActiveGroupChat = (chat: Chat | null) => {
    if (propSetActiveGroupChat) propSetActiveGroupChat(chat);
    setLocalActiveGroupChat(chat);
    if (chat) {
      setActiveChatUser(null);
    }
  };

  // When activeChatUser is selected, clear activeGroupChat
  useEffect(() => {
    if (activeChatUser) {
      setLocalActiveGroupChat(null);
      if (propSetActiveGroupChat) propSetActiveGroupChat(null);
    }
  }, [activeChatUser, propSetActiveGroupChat]);

  // Derive active chat ID (either group chat ID or direct 1-to-1 chat ID)
  const activeChatId = activeGroupChat
    ? activeGroupChat.id
    : activeChatUser
    ? [currentUser.id, activeChatUser.id].sort().join('_')
    : null;

  // Messages & Input State (restores draft immediately on mount/tab switch)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>(() => {
    return activeChatId ? getChatDraft(activeChatId, currentUser.id) : '';
  });
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Draft persistence synchronization refs
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const inputTextRef = useRef<string>(inputText);
  const isSendingRef = useRef<boolean>(false);
  const draftSaveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    isSendingRef.current = sending;
  }, [sending]);

  // Load draft when switching active conversation
  useEffect(() => {
    if (!activeChatId) {
      setInputText('');
      return;
    }
    const currentDraft = getChatDraft(activeChatId, currentUser.id);
    setInputText(currentDraft);
  }, [activeChatId, currentUser.id]);

  // Auto-save draft on unmount (e.g. when user switches to another tab like Profile, Requests, Connections)
  useEffect(() => {
    const chatToSave = activeChatId;
    return () => {
      if (chatToSave && !isSendingRef.current) {
        const text = inputTextRef.current;
        saveChatDraft(chatToSave, currentUser.id, text).catch(() => {});
      }
    };
  }, [activeChatId, currentUser.id]);

  // Private Chat Lock & Hide Security States
  const [securityConfigs, setSecurityConfigs] = useState<Record<string, ChatSecurityConfig>>(() => {
    try {
      const saved = localStorage.getItem('nexxo_chat_security_configs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [lockedUserIds, setLockedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexxo_locked_chat_user_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unlockedUserIds, setUnlockedUserIds] = useState<string[]>([]);
  const [showChatLockModal, setShowChatLockModal] = useState(false);
  const [chatUserToLock, setChatUserToLock] = useState<NexxoUser | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showMediaVaultModal, setShowMediaVaultModal] = useState(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showE2eeModal, setShowE2eeModal] = useState(false);
  const [isE2eeActive, setIsE2eeActive] = useState(true);
  const [pinningChatId, setPinningChatId] = useState<string | null>(null);

  // Helper to determine if a chat is pinned
  const isChatPinned = (c: Chat) => {
    return Boolean(
      c.pinned ||
      (currentUser?.id && c.pinnedBy && Array.isArray(c.pinnedBy) && c.pinnedBy.includes(currentUser.id))
    );
  };

  // Toggle chat pinned state in Firestore
  const handleTogglePin = async (chat: Chat, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (pinningChatId === chat.id) return;
    setPinningChatId(chat.id);
    const currentPinned = isChatPinned(chat);
    const newPinned = !currentPinned;
    try {
      await togglePinChat(chat.id, newPinned, currentUser.id);
    } catch (err) {
      console.error('Failed to toggle pin for chat:', err);
    } finally {
      setPinningChatId(null);
    }
  };

  // Poll Handlers
  const handleSendPoll = async (pollInfo: { question: string; options: string[]; multipleAnswers: boolean }) => {
    if (!activeChatId || (!activeChatUser && !activeGroupChat)) return;
    try {
      setSending(true);
      const pollId = 'poll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const pollData: PollData = {
        id: pollId,
        question: pollInfo.question,
        options: pollInfo.options.map((opt, idx) => ({
          id: `opt_${idx}_${Date.now()}`,
          text: opt,
          votes: [],
        })),
        multipleAnswers: pollInfo.multipleAnswers,
        isClosed: false,
        createdBy: currentUser.id,
        createdAt: new Date(),
      };

      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: `📊 Poll: ${pollInfo.question}`,
        type: 'poll',
        poll: pollData,
        ephemeralTimer: activeChatData?.ephemeralTimer || 0,
      });
      setShowCreatePollModal(false);
    } catch (err: any) {
      console.error('Failed to send poll:', err);
      setErrorNotice(err.message || 'Failed to create poll.');
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (messageId: string, optionId: string) => {
    if (!activeChatId) return;
    try {
      await voteChatPoll(activeChatId, messageId, optionId, currentUser.id);
    } catch (err: any) {
      console.error('Failed to vote on poll:', err);
    }
  };

  const handleClosePoll = async (messageId: string) => {
    if (!activeChatId) return;
    try {
      await closeChatPoll(activeChatId, messageId);
    } catch (err: any) {
      console.error('Failed to close poll:', err);
    }
  };

  const handleSetEphemeralTimer = async (seconds: number) => {
    if (!activeChatId) return;
    try {
      await setChatEphemeralTimer(activeChatId, seconds);
      setShowEphemeralMenu(false);
    } catch (err: any) {
      console.error('Failed to set ephemeral timer:', err);
    }
  };

  // Send an attachment selected directly from the User Media Library Vault
  const handleSendFromVault = async (item: UserMediaItem) => {
    if (!activeChatId || (!activeChatUser && !activeGroupChat)) return;
    try {
      setSending(true);
      setErrorNotice(null);

      const isVideo = item.type === 'video' || item.mimeType?.startsWith('video/');
      const isVoiceOrAudio = item.type === 'audio' || item.mimeType?.startsWith('audio/');
      const isImg = item.type === 'image' || item.type === 'story_export' || item.mimeType?.startsWith('image/');
      const msgType = isImg ? 'image' : isVideo ? 'video' : isVoiceOrAudio ? 'voice' : 'file';

      const attachmentData: MessageAttachment = {
        url: item.url,
        storagePath: item.storagePath || '',
        name: item.name,
        size: item.size || 0,
        mimeType:
          item.mimeType ||
          (isImg
            ? 'image/jpeg'
            : isVideo
            ? 'video/mp4'
            : isVoiceOrAudio
            ? 'audio/webm'
            : 'application/octet-stream'),
        duration: item.duration,
        thumbnailUrl: item.thumbnailUrl,
      };

      const replyRef: ReplyReference | null = replyingTo
        ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName:
              replyingTo.senderId === currentUser.id
                ? 'You'
                : replyingTo.senderName || activeChatUser?.displayName || 'User',
            text: replyingTo.text || (replyingTo.type === 'voice' ? 'Voice message' : 'Attachment'),
            type: replyingTo.type,
          }
        : null;

      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: '',
        type: msgType,
        replyTo: replyRef,
        attachment: attachmentData,
      });

      setReplyingTo(null);
    } catch (err: any) {
      console.error('Failed to send from media vault:', err);
      setErrorNotice(err.message || 'Failed to send media from vault.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveChatSecurity = (targetUserId: string, config: ChatSecurityConfig) => {
    try {
      const updated = { ...securityConfigs, [targetUserId]: config };
      setSecurityConfigs(updated);
      localStorage.setItem('nexxo_chat_security_configs', JSON.stringify(updated));

      // Synchronize PIN if provided
      if (config.pin) {
        localStorage.setItem(`nexxo_chat_lock_${targetUserId}`, config.pin);
      }

      // Add to locked list
      setLockedUserIds((prev) => {
        const next = Array.from(new Set([...prev, targetUserId]));
        localStorage.setItem('nexxo_locked_chat_user_ids', JSON.stringify(next));
        return next;
      });

      // Relock for current session unless user is already actively chatting
      setUnlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
    } catch (e) {
      console.error('Failed to save chat security configuration:', e);
    }
  };

  const handleRemoveChatSecurity = (targetUserId: string) => {
    try {
      const updated = { ...securityConfigs };
      delete updated[targetUserId];
      setSecurityConfigs(updated);
      localStorage.setItem('nexxo_chat_security_configs', JSON.stringify(updated));

      localStorage.removeItem(`nexxo_chat_lock_${targetUserId}`);
      setLockedUserIds((prev) => {
        const next = prev.filter((id) => id !== targetUserId);
        localStorage.setItem('nexxo_locked_chat_user_ids', JSON.stringify(next));
        return next;
      });
      setUnlockedUserIds((prev) => [...prev, targetUserId]);
    } catch (e) {
      console.error('Failed to remove chat security:', e);
    }
  };

  const handleSetChatLock = (targetUserId: string, pin: string) => {
    handleSaveChatSecurity(targetUserId, {
      lockType: 'pin',
      pin,
      isHidden: securityConfigs[targetUserId]?.isHidden || false,
      secretSearchWord: securityConfigs[targetUserId]?.secretSearchWord,
    });
  };

  const handleRemoveChatLock = (targetUserId: string) => {
    handleRemoveChatSecurity(targetUserId);
  };

  const handleUnlockChatForSession = (userId: string) => {
    setUnlockedUserIds((prev) => Array.from(new Set([...prev, userId])));
  };

  // Chat partners & active conversation metadata
  const [userMap, setUserMap] = useState<Record<string, NexxoUser>>({});
  const [activeChatData, setActiveChatData] = useState<Chat | null>(null);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);

  // Group modals & filter tabs
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [chatTabFilter, setChatTabFilter] = useState<'all' | 'direct' | 'groups' | 'unread'>('all');

  // Candidate users for group creation and adding members
  const candidateUsersList = React.useMemo(() => {
    const list = Object.values(userMap);
    if (availableUsers && availableUsers.length > 0) {
      const existingIds = new Set(list.map((u) => u.id));
      availableUsers.forEach((u) => {
        if (!existingIds.has(u.id)) {
          list.push(u);
          existingIds.add(u.id);
        }
      });
    }
    return list.filter((u) => u.id !== currentUser.id);
  }, [userMap, availableUsers, currentUser.id]);

  // Search & Navigation Filters
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // UI Interactive States
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl?: string } | null>(null);
  const [croppingImageFile, setCroppingImageFile] = useState<File | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaPreviewItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockActionLoading, setBlockActionLoading] = useState(false);

  // Chat menu & delete conversation states
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; partnerName: string } | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);

  // Chat Wallpaper & Theme state
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentChatTheme, setCurrentChatTheme] = useState<ChatThemeConfig>(() =>
    getChatTheme(activeChatId || undefined)
  );

  // Sync theme changes in real-time
  useEffect(() => {
    const handleThemeUpdate = () => {
      setCurrentChatTheme(getChatTheme(activeChatId || undefined));
    };
    handleThemeUpdate();
    return subscribeToThemeChanges(handleThemeUpdate);
  }, [activeChatId]);

  const handleConfirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      setDeletingConversation(true);
      await deleteConversationForUser(chatToDelete.id, currentUser.id);
      if (activeChatId === chatToDelete.id) {
        setActiveChatUser(null);
        setMessages([]);
      }
      setShowDeleteChatModal(false);
      setChatToDelete(null);
      setChatMenuOpen(false);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setErrorNotice('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversation(false);
    }
  };

  // Subscribe to blocked users for the current user
  useEffect(() => {
    const unsub = subscribeToBlockedUsers(currentUser.id, (ids) => {
      setBlockedUserIds(ids);
    });
    return () => unsub();
  }, [currentUser.id]);

  const isChatUserBlockedByMe = activeChatUser ? blockedUserIds.includes(activeChatUser.id) : false;

  const handleToggleBlock = async () => {
    if (!activeChatUser) return;
    try {
      setBlockActionLoading(true);
      if (isChatUserBlockedByMe) {
        await unblockUser(currentUser.id, activeChatUser.id);
      } else {
        await blockUser(currentUser.id, activeChatUser.id);
      }
    } catch (err) {
      console.error('Toggle block error:', err);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // DOM Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const partnerTypingTimerRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Hydrate profiles of users in conversations
  useEffect(() => {
    let isMounted = true;
    async function loadChatPartners() {
      const map: Record<string, NexxoUser> = {};
      for (const chat of chats) {
        for (const uid of chat.participants) {
          if (uid !== currentUser.id && !map[uid]) {
            try {
              const snap = await getDoc(doc(db, 'users', uid));
              if (snap.exists()) {
                map[uid] = snap.data() as NexxoUser;
              }
            } catch (e) {
              console.error('Error fetching chat partner profile:', e);
            }
          }
        }
      }
      if (isMounted) {
        setUserMap((prev) => ({ ...prev, ...map }));
      }
    }

    loadChatPartners();
    return () => {
      isMounted = false;
    };
  }, [chats, currentUser.id]);

  // Ensure conversation exists when activeChatUser is chosen
  useEffect(() => {
    if (activeChatId && activeChatUser) {
      ensureChatExists(
        activeChatId,
        [currentUser.id, activeChatUser.id],
        currentUser.settings?.defaultEphemeralTimer || 0
      ).catch(console.error);
    }
  }, [activeChatId, activeChatUser, currentUser.id, currentUser.settings?.defaultEphemeralTimer]);

  // Real-time presence subscription for active chat partner
  const [livePartnerPresence, setLivePartnerPresence] = useState<{
    presence: PresenceStatus;
    lastActiveAt?: any;
  } | null>(null);

  useEffect(() => {
    if (!activeChatUser?.id) {
      setLivePartnerPresence(null);
      return;
    }
    setLivePartnerPresence({
      presence: activeChatUser.presence || 'offline',
      lastActiveAt: activeChatUser.lastActiveAt,
    });
    const unsub = subscribeToPresence(activeChatUser.id, (data) => {
      if (data) {
        setLivePartnerPresence({
          presence: data.presence || 'offline',
          lastActiveAt: data.lastActiveAt || activeChatUser.lastActiveAt,
        });
      }
    });
    return () => unsub();
  }, [activeChatUser?.id, activeChatUser?.presence, activeChatUser?.lastActiveAt]);

  // Subscribe to messages in active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setActiveChatData(null);
      setPartnerIsTyping(false);
      return;
    }

    const unsubMessages = subscribeToChatMessages(activeChatId, (newMsgs) => {
      setMessages(newMsgs);
      // When a new message arrives from a partner, dismiss typing indicator immediately
      if (newMsgs.length > 0) {
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.senderId !== currentUser.id) {
          if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
          setPartnerIsTyping(false);
        }
      }
    });

    const unsubChatDoc = subscribeToChatDoc(activeChatId, (chat) => {
      setActiveChatData(chat);
      if (chat && chat.isGroup) {
        setLocalActiveGroupChat(chat);
      }
      // Hydrate remote draft if present in Firestore and local input is currently blank
      if (chat?.drafts && chat.drafts[currentUser.id] && !inputTextRef.current) {
        setInputText(chat.drafts[currentUser.id]);
      }
      // Check typing of partners
      if (chat?.typing) {
        const otherTyping = Object.entries(chat.typing).some(
          ([uid, raw]) => uid !== currentUser.id && isPartnerActiveTyping(raw)
        );
        if (otherTyping) {
          setPartnerIsTyping(true);
          // Set automatic countdown to clear typing state if no further update received
          if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
          partnerTypingTimerRef.current = setTimeout(() => {
            setPartnerIsTyping(false);
          }, 6000);
        } else {
          if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
          setPartnerIsTyping(false);
        }
      } else {
        if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
        setPartnerIsTyping(false);
      }
    });

    return () => {
      unsubMessages();
      unsubChatDoc();
      if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (activeChatId) {
        setTypingStatus(activeChatId, currentUser.id, false).catch(() => {});
      }
      setPartnerIsTyping(false);
    };
  }, [activeChatId, activeChatUser?.id, currentUser.id]);

  // Mark unread messages as read upon viewing active chat, receiving new messages, or window focus
  useEffect(() => {
    if (!activeChatId) return;

    // Check for unread incoming messages
    const unreadIncomingIds = messages
      .filter((m) => m.senderId !== currentUser.id && m.status !== 'read')
      .map((m) => m.id);

    const myUnreadCount = getChatUnreadCount(activeChatData, currentUser.id);

    if (unreadIncomingIds.length > 0 || myUnreadCount > 0) {
      markChatMessagesAsRead(
        activeChatId,
        currentUser.id,
        activeChatUser ? activeChatUser.id : undefined,
        unreadIncomingIds
      );
    }
  }, [activeChatId, activeChatUser?.id, messages, activeChatData?.unreadCounts, currentUser.id]);

  useEffect(() => {
    const handleFocus = () => {
      if (!activeChatId) return;
      const unreadIncomingIds = messages
        .filter((m) => m.senderId !== currentUser.id && m.status !== 'read')
        .map((m) => m.id);
      if (unreadIncomingIds.length > 0) {
        markChatMessagesAsRead(
          activeChatId,
          currentUser.id,
          activeChatUser ? activeChatUser.id : undefined,
          unreadIncomingIds
        );
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeChatId, activeChatUser?.id, messages, currentUser.id]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, partnerIsTyping]);

  // Handle user typing input throttling & draft auto-persistence
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (!activeChatId) return;

    // Immediately cache draft in localStorage for zero-latency tab switching preservation
    try {
      if (text) {
        localStorage.setItem(`nexxo_chat_draft_${activeChatId}_${currentUser.id}`, text);
        localStorage.setItem(`nexxo_chat_draft_${activeChatId}`, text);
      } else {
        localStorage.removeItem(`nexxo_chat_draft_${activeChatId}_${currentUser.id}`);
        localStorage.removeItem(`nexxo_chat_draft_${activeChatId}`);
      }
    } catch (err) {
      console.warn('Notice writing draft to localStorage:', err);
    }

    // Debounce syncing draft to Firestore 'drafts' field
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => {
      saveChatDraft(activeChatId, currentUser.id, text).catch(() => {});
    }, 1000);

    if (!text.trim()) {
      // Input was erased: notify typing stopped immediately
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      lastTypingSentRef.current = 0;
      setTypingStatus(activeChatId, currentUser.id, false).catch(() => {});
      return;
    }

    // Privacy setting: if user turned off typing indicator, do not broadcast
    if (currentUser.settings?.showTypingIndicator === false) {
      return;
    }

    const now = Date.now();
    // Throttle writes: send at most once every 2 seconds during active typing
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      setTypingStatus(activeChatId, currentUser.id, true).catch(() => {});
    }

    // Debounce end of typing (stops after 3s of no keystrokes)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      setTypingStatus(activeChatId, currentUser.id, false).catch(() => {});
    }, 3000);
  };

  // Handle message submission
  const handleSendMessage = async (
    e?: React.FormEvent,
    directAttachmentOverride?: { file: File; previewUrl?: string }
  ) => {
    if (e) e.preventDefault();
    if (!activeChatId || (!activeChatUser && !activeGroupChat) || sending) return;

    const trimmed = inputText.trim();

    // If in edit mode, submit edit
    if (editingMessage) {
      if (!trimmed) return;
      try {
        setSending(true);
        await editChatMessage(activeChatId, editingMessage.id, trimmed);
        setEditingMessage(null);
        setInputText('');
      } catch (err: any) {
        setErrorNotice(err.message || 'Failed to edit message.');
      } finally {
        setSending(false);
      }
      return;
    }

    const currentAttachment = directAttachmentOverride !== undefined ? directAttachmentOverride : pendingAttachment;

    // Normal message or attachment send
    if (!trimmed && !currentAttachment) return;

    try {
      setSending(true);
      setErrorNotice(null);

      let attachmentData: MessageAttachment | null = null;

      // Upload pending attachment if present
      if (currentAttachment) {
        setUploadProgress(10);
        attachmentData = await uploadChatAttachment(
          currentAttachment.file,
          activeChatId,
          currentAttachment.file.name,
          undefined,
          (pct) => setUploadProgress(pct)
        );
        setUploadProgress(null);

        // Auto-save uploaded chat attachment to user's media library vault
        saveUserMediaItem({
          ownerId: currentUser.id,
          name: currentAttachment.file.name,
          type:
            attachmentData.type === 'image'
              ? 'image'
              : attachmentData.type === 'video'
              ? 'video'
              : attachmentData.type === 'audio'
              ? 'audio'
              : 'document',
          url: attachmentData.url,
          storagePath: attachmentData.storagePath,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          duration: attachmentData.duration,
          source: 'chat',
        }).catch(console.warn);
      }

      const messageType = attachmentData
        ? attachmentData.mimeType.startsWith('image/')
          ? 'image'
          : attachmentData.mimeType.startsWith('video/')
          ? 'video'
          : attachmentData.mimeType.startsWith('audio/')
          ? 'voice'
          : 'file'
        : 'text';

      const replyRef: ReplyReference | null = replyingTo
        ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName:
              replyingTo.senderId === currentUser.id
                ? 'You'
                : replyingTo.senderName || activeChatUser?.displayName || 'User',
            text: replyingTo.text || (replyingTo.type === 'voice' ? 'Voice message' : 'Attachment'),
            type: replyingTo.type,
          }
        : null;

      // Clear input & draft state immediately from both state and storage
      setInputText('');
      setPendingAttachment(null);
      setReplyingTo(null);

      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
      if (activeChatId) {
        clearChatDraft(activeChatId, currentUser.id).catch(() => {});
      }

      // Reset typing state immediately
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      lastTypingSentRef.current = 0;
      if (activeChatId) {
        setTypingStatus(activeChatId, currentUser.id, false).catch(() => {});
      }

      let textToSend = trimmed;
      let isMsgEncrypted = false;
      if (isE2eeActive && trimmed) {
        textToSend = await encryptMessageText(trimmed, activeChatId);
        isMsgEncrypted = true;
      }

      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: textToSend,
        type: messageType,
        replyTo: replyRef,
        attachment: attachmentData,
        isEncrypted: isMsgEncrypted,
      });
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setErrorNotice(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  // Handle Location Pin Sending
  const handleSendLocationPin = async (loc: LocationData) => {
    if (!activeChatId || (!activeChatUser && !activeGroupChat)) return;
    try {
      setSending(true);
      setErrorNotice(null);

      const allParticipants = activeGroupChat?.participants ||
        (activeChatUser ? [currentUser.id, activeChatUser.id] : [currentUser.id]);

      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        participants: allParticipants,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: loc.placeName || 'Shared Location Pin',
        type: 'location',
        location: loc,
      });
    } catch (err: any) {
      console.error('Failed to share location:', err);
      setErrorNotice(err.message || 'Failed to share location.');
    } finally {
      setSending(false);
    }
  };

  // Handle Voice Note Sending
  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!activeChatId || (!activeChatUser && !activeGroupChat)) return;
    try {
      setSending(true);
      setErrorNotice(null);
      setIsRecordingVoice(false);

      const attachment = await uploadChatAttachment(
        audioBlob,
        activeChatId,
        `voice_${Date.now()}.webm`,
        duration
      );

      // Auto-save voice note to user's media library vault
      saveUserMediaItem({
        ownerId: currentUser.id,
        name: `Voice Note (${Math.round(duration)}s)`,
        type: 'audio',
        url: attachment.url,
        storagePath: attachment.storagePath,
        size: attachment.size,
        mimeType: attachment.mimeType,
        duration: Math.round(duration),
        source: 'chat',
      }).catch(console.warn);

      const replyRef: ReplyReference | null = replyingTo
        ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName:
              replyingTo.senderId === currentUser.id
                ? 'You'
                : replyingTo.senderName || activeChatUser?.displayName || 'User',
            text: replyingTo.text || 'Voice message',
            type: replyingTo.type,
          }
        : null;

      setReplyingTo(null);

      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: '🎤 Voice message',
        type: 'voice',
        replyTo: replyRef,
        attachment,
      });
    } catch (err: any) {
      console.error('Failed to send voice message:', err);
      setErrorNotice(err.message || 'Failed to upload voice message.');
    } finally {
      setSending(false);
    }
  };

  // Send Media from MediaPicker (Curated GIF or Sticker)
  const handleSendMedia = async (url: string, type: 'image' | 'sticker', name: string) => {
    if (!activeChatId || (!activeChatUser && !activeGroupChat)) return;
    try {
      setSending(true);
      setErrorNotice(null);
      await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUser.id,
        recipientId: activeChatUser ? activeChatUser.id : (activeGroupChat?.id || ''),
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatar,
        text: '',
        type: 'image',
        replyTo: null,
        attachment: {
          url,
          name,
          size: 64000,
          mimeType: 'image/gif',
        },
      });
    } catch (err: any) {
      console.error('Failed to send media:', err);
      setErrorNotice(err.message || 'Failed to send media.');
    } finally {
      setSending(false);
    }
  };

  // Attachment file selection handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorNotice('File exceeds 20 MB size limit.');
      return;
    }

    const isImage = file.type.startsWith('image/') && !file.type.includes('gif') && !file.type.includes('svg');
    if (isImage) {
      // Launch image cropping & adjustment utility before final upload
      setCroppingImageFile(file);
    } else {
      const isVideo = file.type.startsWith('video/');
      const previewUrl = (file.type.startsWith('image/') || isVideo) ? URL.createObjectURL(file) : undefined;
      setPendingAttachment({ file, previewUrl });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Copy partner NEXXO ID
  const copyNexxoId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter conversations in sidebar with Secret Search Word & Hide Chat support
  const queryLower = chatSearchQuery.trim().toLowerCase();

  const totalUnreadCount = chats.reduce((sum, c) => sum + getChatUnreadCount(c, currentUser.id), 0);
  const directUnreadCount = chats.filter((c) => !c.isGroup).reduce((sum, c) => sum + getChatUnreadCount(c, currentUser.id), 0);
  const groupsUnreadCount = chats.filter((c) => c.isGroup).reduce((sum, c) => sum + getChatUnreadCount(c, currentUser.id), 0);

  const filteredChats = chats.filter((c) => {
    if (chatTabFilter === 'direct' && c.isGroup) return false;
    if (chatTabFilter === 'groups' && !c.isGroup) return false;
    if (chatTabFilter === 'unread' && getChatUnreadCount(c, currentUser.id) === 0) return false;

    if (c.isGroup) {
      if (!queryLower) return true;
      const groupName = (c.name || '').toLowerCase();
      const groupDesc = (c.description || '').toLowerCase();
      const lastMsg = (c.lastMessage || '').toLowerCase();
      const matchesMember = c.participants.some((uid) => {
        const u = userMap[uid];
        return (
          u?.displayName.toLowerCase().includes(queryLower) ||
          u?.username.toLowerCase().includes(queryLower)
        );
      });
      return groupName.includes(queryLower) || groupDesc.includes(queryLower) || lastMsg.includes(queryLower) || matchesMember;
    }

    const otherUid = c.participants.find((id) => id !== currentUser.id);
    const other = otherUid ? userMap[otherUid] : null;
    const config = otherUid ? securityConfigs[otherUid] : undefined;

    // Check if chat is marked as Hidden
    const isChatHidden = Boolean(config?.isHidden);
    const secretWord = config?.secretSearchWord?.trim().toLowerCase();

    // If chat is hidden:
    // It should ONLY appear if user explicitly typed its secret search word!
    if (isChatHidden) {
      if (!queryLower || !secretWord || queryLower !== secretWord) {
        return false;
      }
    }

    if (!queryLower) return true;

    return (
      other?.displayName.toLowerCase().includes(queryLower) ||
      other?.username.toLowerCase().includes(queryLower) ||
      other?.nexxoId.toLowerCase().includes(queryLower) ||
      c.lastMessage?.toLowerCase().includes(queryLower) ||
      (isChatHidden && queryLower === secretWord)
    );
  });

  // Sort filtered conversations with pinned chats at the top, followed by lastMessageAt descending
  const sortedFilteredChats = [...filteredChats].sort((a, b) => {
    const isPinnedA = isChatPinned(a);
    const isPinnedB = isChatPinned(b);
    if (isPinnedA !== isPinnedB) {
      return isPinnedA ? -1 : 1;
    }
    const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : 0);
    const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : 0);
    return timeB - timeA;
  });

  // Calculate count of hidden chats
  const hiddenChatsCount = chats.filter((c) => {
    const otherUid = c.participants.find((id) => id !== currentUser.id);
    return otherUid ? Boolean(securityConfigs[otherUid]?.isHidden) : false;
  }).length;

  const isSecretWordRevealing = Boolean(
    queryLower &&
      chats.some((c) => {
        const otherUid = c.participants.find((id) => id !== currentUser.id);
        const sec = otherUid ? securityConfigs[otherUid] : undefined;
        return sec?.isHidden && sec?.secretSearchWord?.trim().toLowerCase() === queryLower;
      })
  );

  // Filter messages in active chat
  const displayedMessages = messages.filter((m) => {
    // Hide if deleted for current user
    if (m.deletedFor?.includes(currentUser.id)) return false;

    // Hide if sent prior to conversation cleared/deleted timestamp for this user
    const clearedTimestamp = activeChatData?.clearedAt?.[currentUser.id];
    if (clearedTimestamp) {
      const clearedDate = parseMessageTimestamp(clearedTimestamp);
      const msgDate = parseMessageTimestamp(m.createdAt);
      if (clearedDate && msgDate && msgDate.getTime() <= clearedDate.getTime()) {
        return false;
      }
    }

    // Filter by starred if starred filter is active
    if (showStarredOnly) {
      if (!m.starredBy?.includes(currentUser.id)) return false;
    }

    // Filter by search query if in-chat search is active
    if (inChatSearchOpen && inChatSearchQuery.trim()) {
      return m.text?.toLowerCase().includes(inChatSearchQuery.toLowerCase());
    }

    // Ephemeral / Disappearing message expiration filter
    if (m.expiresAt) {
      const expDate = parseMessageTimestamp(m.expiresAt);
      if (expDate && Date.now() > expDate.getTime()) {
        return false;
      }
    } else if (activeChatData?.ephemeralTimer && activeChatData.ephemeralTimer > 0) {
      const msgDate = parseMessageTimestamp(m.createdAt);
      if (msgDate && Date.now() > msgDate.getTime() + (activeChatData.ephemeralTimer * 1000)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex-1 flex h-full max-w-7xl mx-auto w-full overflow-hidden bg-white dark:bg-slate-950">
      {/* 1. Left Sidebar: Conversations Directory */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0 ${
          activeChatUser || activeGroupChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Directory Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Conversations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time synchronized messaging
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="create-group-btn"
                onClick={() => setShowCreateGroupModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Create a new group conversation"
              >
                <Users className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
            </div>
          </div>

          {/* Quick Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder={
                hiddenChatsCount > 0
                  ? `Filter chats or enter secret word (${hiddenChatsCount} hidden)...`
                  : 'Filter chats by name, group, or ID...'
              }
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {chatSearchQuery && (
              <button
                onClick={() => setChatSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chat Category Filters: All / Direct / Groups / Unread */}
          <div className="flex items-center gap-1 mt-2.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              id="filter-all-chats-btn"
              onClick={() => setChatTabFilter('all')}
              className={`flex-1 py-1 px-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                chatTabFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All ({chats.length})</span>
            </button>
            <button
              type="button"
              id="filter-direct-chats-btn"
              onClick={() => setChatTabFilter('direct')}
              className={`flex-1 py-1 px-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                chatTabFilter === 'direct'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Direct</span>
              {directUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow-2xs">
                  {directUnreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              id="filter-groups-chats-btn"
              onClick={() => setChatTabFilter('groups')}
              className={`flex-1 py-1 px-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                chatTabFilter === 'groups'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Groups</span>
              {groupsUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow-2xs">
                  {groupsUnreadCount}
                </span>
              )}
            </button>
            {totalUnreadCount > 0 && (
              <button
                type="button"
                id="filter-unread-chats-btn"
                onClick={() => setChatTabFilter('unread')}
                className={`flex-1 py-1 px-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  chatTabFilter === 'unread'
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                }`}
              >
                <span>Unread</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    chatTabFilter === 'unread' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {totalUnreadCount}
                </span>
              </button>
            )}
          </div>

          {/* Secret Word Unlocked Banner when matching hidden chat */}
          {isSecretWordRevealing && (
            <div className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-2 text-[11px] text-indigo-400 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span className="font-semibold">Secret word matched! Showing hidden chat(s).</span>
              </div>
              <button
                onClick={() => setChatSearchQuery('')}
                className="text-[10px] underline font-medium hover:text-indigo-300"
              >
                Hide again
              </button>
            </div>
          )}
        </div>

        {/* Conversation List / Empty State */}
        {chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No active conversations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs leading-relaxed">
              Find colleagues or friends via Discover to establish real-time direct messaging.
            </p>
            <button
              onClick={onNavigateToSearch}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Discover Users
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {sortedFilteredChats.map((chat) => {
              if (chat.isGroup) {
                const isSelected = activeGroupChat?.id === chat.id;
                const isGroupPinned = isChatPinned(chat);
                const unreadCount = getChatUnreadCount(chat, currentUser.id);

                // Format last message time
                let timeFormatted = '';
                if (chat.lastMessageAt?.toDate) {
                  const date = chat.lastMessageAt.toDate();
                  const now = new Date();
                  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                  if (diffHours < 24) {
                    timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } else if (diffHours < 48) {
                    timeFormatted = 'Yesterday';
                  } else {
                    timeFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }
                }

                const isMeLastSender = chat.lastMessageSenderId === currentUser.id;
                const lastSenderName = isMeLastSender
                  ? 'You'
                  : chat.lastMessageSenderId && userMap[chat.lastMessageSenderId]
                  ? userMap[chat.lastMessageSenderId].displayName.split(' ')[0]
                  : '';

                return (
                  <div key={chat.id} className="relative group/chat-item">
                    <button
                      onClick={() => setActiveGroupChat(chat)}
                      className={`w-full text-left px-4 sm:px-5 py-3.5 transition-colors flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-r-4 border-indigo-600 dark:border-indigo-500'
                          : isGroupPinned
                          ? 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-r-4 border-indigo-300 dark:border-indigo-700/60'
                          : unreadCount > 0
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60 border-r-4 border-indigo-600 dark:border-indigo-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-r-4 border-transparent'
                      }`}
                    >
                      {/* Group Avatar */}
                      <div className="relative w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0">
                        {chat.avatar ? (
                          <img
                            src={chat.avatar}
                            alt={chat.name || 'Group'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                        {unreadCount > 0 && (
                          <span
                            id={`group-avatar-unread-${chat.id}`}
                            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs animate-pulse z-10"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Summary Details */}
                      <div className="flex-1 min-w-0 pr-14">
                        <div className="flex items-baseline justify-between gap-1 mb-1">
                          <span
                            className={`text-sm truncate flex items-center gap-1.5 ${
                              isSelected || unreadCount > 0
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span>{chat.name || 'Group Conversation'}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/50">
                              Group
                            </span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isGroupPinned && (
                              <span title="Pinned conversation">
                                <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 rotate-45 shrink-0 fill-indigo-600 dark:fill-indigo-400" />
                              </span>
                            )}
                            {timeFormatted && (
                              <span className={`text-[10px] shrink-0 font-medium ${unreadCount > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                                {timeFormatted}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate flex items-center gap-1 ${
                              unreadCount > 0
                                ? 'font-bold text-slate-900 dark:text-slate-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {lastSenderName && (
                              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                {lastSenderName}:
                              </span>
                            )}
                            <span className="truncate">{chat.lastMessage || `${chat.participants.length} members`}</span>
                          </p>

                          {unreadCount > 0 && (
                            <span
                              id={`group-unread-pill-${chat.id}`}
                              className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold shrink-0 min-w-[20px] text-center shadow-xs flex items-center justify-center animate-in zoom-in-75 duration-200"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Quick Pin & Quick Delete / Leave Action */}
                    <div className="opacity-0 group-hover/chat-item:opacity-100 focus-within:opacity-100 absolute right-2.5 top-3.5 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(chat, e)}
                        disabled={pinningChatId === chat.id}
                        className={`p-1.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                          isGroupPinned
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-white/95 dark:bg-slate-800/95 text-slate-400 hover:text-indigo-600 border-slate-200/90 dark:border-slate-700'
                        }`}
                        title={isGroupPinned ? 'Unpin group' : 'Pin group to top'}
                      >
                        {isGroupPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 rotate-45" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete({
                            id: chat.id,
                            partnerName: chat.name || 'Group Conversation',
                          });
                          setShowDeleteChatModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 hover:bg-rose-50 dark:hover:bg-rose-950/70 text-slate-400 hover:text-rose-600 border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              const otherUid = chat.participants.find((id) => id !== currentUser.id) || '';
              const otherUser = userMap[otherUid];
              const isSelected = !activeGroupChat && activeChatUser?.id === otherUid;
              const isDirectPinned = isChatPinned(chat);
              const unreadCount = getChatUnreadCount(chat, currentUser.id);

              // Format last message time
              let timeFormatted = '';
              if (chat.lastMessageAt?.toDate) {
                const date = chat.lastMessageAt.toDate();
                const now = new Date();
                const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                  timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (diffHours < 48) {
                  timeFormatted = 'Yesterday';
                } else {
                  timeFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
              }

              const isMeLastSender = chat.lastMessageSenderId === currentUser.id;
              const isOtherUserTyping = Boolean(chat.typing && otherUid && isPartnerActiveTyping(chat.typing[otherUid]));

              const isChatLocked = otherUser ? lockedUserIds.includes(otherUser.id) : false;
              const isChatUnlockedInSession = otherUser ? unlockedUserIds.includes(otherUser.id) : false;
              const chatSecurity = otherUser ? securityConfigs[otherUser.id] : undefined;
              const isChatHidden = Boolean(chatSecurity?.isHidden);

              return (
                <div key={chat.id} className="relative group/chat-item">
                  <button
                    onClick={() => otherUser && setActiveChatUser(otherUser)}
                    className={`w-full text-left px-4 sm:px-5 py-3.5 transition-colors flex items-center gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-r-4 border-indigo-600 dark:border-indigo-500'
                        : isDirectPinned
                        ? 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-r-4 border-indigo-300 dark:border-indigo-700/60'
                        : unreadCount > 0
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60 border-r-4 border-indigo-600 dark:border-indigo-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-r-4 border-transparent'
                    }`}
                  >
                    {/* User Profile Avatar with Presence Badge & Lock Badge */}
                    {(() => {
                      const isOtherConnected = Boolean(otherUser && connectionUserIds?.includes(otherUser.id));
                      const canSeeOtherOnline = otherUser ? canViewOnlineStatus(currentUser, otherUser, isOtherConnected) : false;
                      const canSeeOtherPhoto = otherUser ? canViewProfilePhoto(currentUser, otherUser, isOtherConnected) : false;

                      return (
                        <div className="relative w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {otherUser?.photoURL && canSeeOtherPhoto ? (
                            <img
                              src={otherUser.photoURL}
                              alt={otherUser.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                              {otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                          {otherUser && (
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                canSeeOtherOnline && otherUser.presence === 'online'
                                  ? 'bg-emerald-500'
                                  : canSeeOtherOnline && otherUser.presence === 'away'
                                  ? 'bg-amber-500'
                                  : canSeeOtherOnline && otherUser.presence === 'busy'
                                  ? 'bg-rose-500'
                                  : canSeeOtherOnline && otherUser.presence === 'dnd'
                                  ? 'bg-purple-500'
                                  : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                            />
                          )}
                          {unreadCount > 0 && (
                            <span
                              id={`direct-avatar-unread-${chat.id}`}
                              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs animate-pulse z-10"
                            >
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {isChatLocked && !isChatUnlockedInSession && (
                            <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                              <Lock className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Summary Details */}
                    <div className="flex-1 min-w-0 pr-14">
                      <div className="flex items-baseline justify-between gap-1 mb-1">
                        <span
                          className={`text-sm truncate flex items-center gap-1.5 ${
                            isSelected || unreadCount > 0
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-medium text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span>{otherUser?.displayName || 'Loading...'}</span>
                          {otherUser && (
                            <VerifiedBadge
                              isVerified={otherUser.isVerified}
                              isPremium={otherUser.isPremium}
                              premiumTier={otherUser.premiumTier}
                              size="xs"
                            />
                          )}
                          {isChatHidden && (
                            <span
                              title="Chat is hidden by secret search word"
                              className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold border border-amber-500/30 flex items-center gap-0.5"
                            >
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Hidden</span>
                            </span>
                          )}
                          {isChatLocked && (
                            <Lock
                              className={`w-3 h-3 shrink-0 ${
                                isChatUnlockedInSession
                                  ? 'text-emerald-500'
                                  : 'text-indigo-600 dark:text-indigo-400'
                              }`}
                            />
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isDirectPinned && (
                            <span title="Pinned conversation">
                              <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 rotate-45 shrink-0 fill-indigo-600 dark:fill-indigo-400" />
                            </span>
                          )}
                          {timeFormatted && (
                            <span className={`text-[10px] shrink-0 font-medium ${unreadCount > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                              {timeFormatted}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {(() => {
                          const itemDraft = chat.drafts?.[currentUser.id] || getChatDraft(chat.id, currentUser.id);
                          if (itemDraft) {
                            return (
                              <p className="text-xs truncate flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <span className="font-bold shrink-0">Draft:</span>
                                <span className="truncate text-slate-600 dark:text-slate-300 font-normal">{itemDraft}</span>
                              </p>
                            );
                          }

                          return (
                            <p
                              className={`text-xs truncate flex items-center gap-1 ${
                                unreadCount > 0
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isChatLocked && !isChatUnlockedInSession ? (
                                <span className="text-slate-400 italic flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Private conversation locked</span>
                                </span>
                              ) : isOtherUserTyping ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                                  </span>
                                  <span>typing...</span>
                                </span>
                              ) : (
                                <>
                                  {/* Delivery Status Tick for My Outgoing Messages */}
                                  {isMeLastSender && (
                                    <span className="inline-flex items-center shrink-0">
                                      {chat.lastMessageStatus === 'read' ? (
                                        <span title="Read by recipient"><CheckCheck className="w-3.5 h-3.5 text-sky-500" /></span>
                                      ) : (
                                        <span title="Delivered"><Check className="w-3.5 h-3.5 text-slate-400" /></span>
                                      )}
                                    </span>
                                  )}
                                  <span>{chat.lastMessage || 'Conversation established.'}</span>
                                </>
                              )}
                            </p>
                          );
                        })()}

                        {/* Real Unread Count Pill Badge */}
                        {unreadCount > 0 && (
                          <span
                            id={`chat-item-unread-${chat.id}`}
                            className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold shrink-0 min-w-[20px] text-center shadow-xs flex items-center justify-center animate-in zoom-in-75 duration-200"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Sidebar Quick Pin, Quick Lock & Quick Delete Action Buttons */}
                  <div className="opacity-0 group-hover/chat-item:opacity-100 focus-within:opacity-100 absolute right-2.5 top-3.5 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(chat, e)}
                      disabled={pinningChatId === chat.id}
                      className={`p-1.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                        isDirectPinned
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                          : 'bg-white/95 dark:bg-slate-800/95 text-slate-400 hover:text-indigo-600 border-slate-200/90 dark:border-slate-700'
                      }`}
                      title={isDirectPinned ? 'Unpin chat' : 'Pin chat to top'}
                    >
                      {isDirectPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 rotate-45" />}
                    </button>

                    {otherUser && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatUserToLock(otherUser);
                          setShowChatLockModal(true);
                        }}
                        className={`p-1.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                          isChatHidden
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : isChatLocked
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-white/95 dark:bg-slate-800/95 text-slate-400 hover:text-indigo-600 border-slate-200/90 dark:border-slate-700'
                        }`}
                        title={
                          isChatHidden
                            ? 'Manage hidden chat & security'
                            : isChatLocked
                            ? 'Manage chat lock'
                            : 'Lock or hide this private chat'
                        }
                      >
                        {isChatHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete({
                          id: chat.id,
                          partnerName: otherUser?.displayName || 'User',
                        });
                        setShowDeleteChatModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 hover:bg-rose-50 dark:hover:bg-rose-950/70 text-slate-400 hover:text-rose-600 border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Right Panel: Active Conversation Viewport */}
      <div
        className={`flex-1 flex flex-col bg-white dark:bg-slate-950 ${
          activeChatUser || activeGroupChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeChatUser && lockedUserIds.includes(activeChatUser.id) && !unlockedUserIds.includes(activeChatUser.id) ? (
          <PrivateChatUnlockGate
            partnerUser={activeChatUser}
            securityConfig={securityConfigs[activeChatUser.id] || null}
            onUnlocked={() => handleUnlockChatForSession(activeChatUser.id)}
            onBackToConversations={() => setActiveChatUser(null)}
          />
        ) : (activeChatUser || activeGroupChat) ? (
          <>
            {activeGroupChat ? (
              /* Group Conversation Header */
              <div className="h-[68px] sm:h-[72px] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setActiveGroupChat(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Clickable Group Profile Area */}
                  <div
                    onClick={() => setShowGroupInfoModal(true)}
                    className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer p-1 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all active:scale-[0.99] group"
                    title="Click to view group details & members"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 group-hover:ring-2 ring-indigo-500/40 transition-all">
                      {activeGroupChat.avatar ? (
                        <img
                          src={activeGroupChat.avatar}
                          alt={activeGroupChat.name || 'Group'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                          <span className="truncate">{activeGroupChat.name || 'Group Conversation'}</span>
                          {isChatPinned(activeGroupChat) && (
                            <span title="Pinned group">
                              <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 rotate-45 shrink-0 fill-indigo-600 dark:fill-indigo-400" />
                            </span>
                          )}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                          Group
                        </span>
                      </div>

                      <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate h-4 text-slate-500 dark:text-slate-400">
                        {partnerIsTyping ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-200">
                            <span className="flex items-center gap-0.5 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                            </span>
                            <span className="tracking-tight">Someone is typing...</span>
                          </div>
                        ) : (
                          <span className="truncate">
                            {activeGroupChat.participants.length} members &bull; tap for details
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Header Action Controls */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Search in group chat */}
                  <button
                    onClick={() => {
                      setInChatSearchOpen((prev) => !prev);
                      if (inChatSearchOpen) setInChatSearchQuery('');
                    }}
                    className={`hidden sm:flex p-2 rounded-xl transition-colors cursor-pointer ${
                      inChatSearchOpen
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Search messages in group"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Filter Starred */}
                  <button
                    onClick={() => setShowStarredOnly((prev) => !prev)}
                    className={`hidden md:flex p-2 rounded-xl transition-colors cursor-pointer ${
                      showStarredOnly
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={showStarredOnly ? 'Show all messages' : 'Show starred messages'}
                  >
                    <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>

                  {/* Group Details Button */}
                  <button
                    onClick={() => setShowGroupInfoModal(true)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Group settings & members"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-semibold">Details</span>
                  </button>

                  {/* Group Options Menu */}
                  <div className="relative">
                    <button
                      id="group-menu-button"
                      onClick={() => setChatMenuOpen((prev) => !prev)}
                      className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        chatMenuOpen
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Group menu options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {chatMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setChatMenuOpen(false)}
                        />
                        <div
                          className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl z-30 space-y-1 text-xs animate-in fade-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              setShowGroupInfoModal(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                          >
                            <Info className="w-4 h-4 text-indigo-500" />
                            <span>Group Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleTogglePin(activeGroupChat);
                              setChatMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                          >
                            {isChatPinned(activeGroupChat) ? (
                              <>
                                <PinOff className="w-4 h-4 text-slate-400" />
                                <span>Unpin Group</span>
                              </>
                            ) : (
                              <>
                                <Pin className="w-4 h-4 text-indigo-500 rotate-45" />
                                <span>Pin Group to Top</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              setInChatSearchOpen(true);
                            }}
                            className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                          >
                            <Search className="w-4 h-4 text-slate-400" />
                            <span>Search in Group</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              setShowStarredOnly((prev) => !prev);
                            }}
                            className="md:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                          >
                            <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                            <span>{showStarredOnly ? 'Show all messages' : 'Starred messages'}</span>
                          </button>
                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              if (activeChatId) {
                                setChatToDelete({
                                  id: activeChatId,
                                  partnerName: activeGroupChat.name || 'Group Conversation',
                                });
                                setShowDeleteChatModal(true);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Clear Conversation History</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : activeChatUser ? (
              /* Conversation Header */
              <div className="h-[68px] sm:h-[72px] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                {/* Back button for mobile */}
                <button
                  onClick={() => setActiveChatUser(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Clickable Profile Area (Avatar, Name, Status) */}
                {(() => {
                  const isPartnerConnected = Boolean(
                    activeChatUser && connectionUserIds?.includes(activeChatUser.id)
                  );
                  const canSeeOnline = activeChatUser ? canViewOnlineStatus(currentUser, activeChatUser, isPartnerConnected) : false;
                  const canSeeLastSeen = activeChatUser ? canViewLastSeen(currentUser, activeChatUser, isPartnerConnected) : false;
                  const canSeePhoto = activeChatUser ? canViewProfilePhoto(currentUser, activeChatUser, isPartnerConnected) : false;

                  const partnerPresence = livePartnerPresence?.presence || activeChatUser.presence || 'offline';
                  const partnerLastActiveAt = livePartnerPresence?.lastActiveAt || activeChatUser.lastActiveAt;
                  const isPartnerOnline = partnerPresence === 'online';

                  let partnerPresenceText = 'Offline';
                  if (isPartnerOnline) {
                    if (canSeeOnline) {
                      partnerPresenceText = 'Active now';
                    } else {
                      partnerPresenceText = canSeeLastSeen ? formatLastSeen(partnerLastActiveAt, false) : 'Offline';
                    }
                  } else if (partnerPresence === 'away') {
                    partnerPresenceText = canSeeOnline ? 'Away' : canSeeLastSeen ? formatLastSeen(partnerLastActiveAt, false) : 'Offline';
                  } else if (partnerPresence === 'busy') {
                    partnerPresenceText = canSeeOnline ? 'Busy' : canSeeLastSeen ? formatLastSeen(partnerLastActiveAt, false) : 'Offline';
                  } else if (partnerPresence === 'dnd') {
                    partnerPresenceText = canSeeOnline ? 'Do Not Disturb' : canSeeLastSeen ? formatLastSeen(partnerLastActiveAt, false) : 'Offline';
                  } else {
                    partnerPresenceText = canSeeLastSeen ? formatLastSeen(partnerLastActiveAt, false) : 'Offline';
                  }

                  return (
                    <div
                      onClick={() => setShowUserProfileModal(true)}
                      className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer p-1 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all active:scale-[0.99] group flex-1"
                      title="Click to view full user profile & chat options"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 group-hover:ring-2 ring-indigo-500/40 transition-all">
                        {activeChatUser.photoURL && canSeePhoto ? (
                          <img
                            src={activeChatUser.photoURL}
                            alt={activeChatUser.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {(activeChatUser.displayName || activeChatUser.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900 transition-all ${
                            partnerIsTyping
                              ? 'w-3 h-3 bg-emerald-500 animate-pulse'
                              : isPartnerOnline && canSeeOnline
                              ? 'w-2.5 h-2.5 bg-emerald-500'
                              : partnerPresence === 'away' && canSeeOnline
                              ? 'w-2.5 h-2.5 bg-amber-500'
                              : partnerPresence === 'busy' && canSeeOnline
                              ? 'w-2.5 h-2.5 bg-rose-500'
                              : partnerPresence === 'dnd' && canSeeOnline
                              ? 'w-2.5 h-2.5 bg-purple-500'
                              : 'w-2.5 h-2.5 bg-slate-400 dark:bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                            <span className="truncate">{activeChatUser.displayName}</span>
                            <VerifiedBadge
                              isVerified={activeChatUser.isVerified}
                              isPremium={activeChatUser.isPremium}
                              premiumTier={activeChatUser.premiumTier}
                              size="sm"
                            />
                            {(() => {
                              const activeDirectChat = chats.find(
                                (c) => !c.isGroup && c.participants.includes(currentUser.id) && c.participants.includes(activeChatUser.id)
                              );
                              return activeDirectChat && isChatPinned(activeDirectChat) ? (
                                <span title="Pinned conversation">
                                  <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 rotate-45 shrink-0 fill-indigo-600 dark:fill-indigo-400" />
                                </span>
                              ) : null;
                            })()}
                          </h3>
                          {activeChatUser.role === 'admin' && (
                            <span title="Admin"><ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /></span>
                          )}
                        </div>

                        {/* Presence or Real-Time Typing Status in Chat Header */}
                        <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate h-4">
                          {partnerIsTyping ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-200">
                              <span className="flex items-center gap-0.5 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                              </span>
                              <span className="tracking-tight">typing...</span>
                            </div>
                          ) : (
                            <>
                              <span
                                className={`truncate ${
                                  isPartnerOnline && canSeeOnline
                                    ? 'text-emerald-500 font-medium'
                                    : partnerPresence === 'away' && canSeeOnline
                                    ? 'text-amber-500 font-medium'
                                    : partnerPresence === 'busy' && canSeeOnline
                                    ? 'text-rose-500 font-medium'
                                    : partnerPresence === 'dnd' && canSeeOnline
                                    ? 'text-purple-400 font-medium'
                                    : 'text-slate-400'
                                }`}
                              >
                                {partnerPresenceText}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                              <span className="text-slate-400 font-normal truncate">@{activeChatUser.username}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Voice Call */}
                {onStartCall && !isChatUserBlockedByMe && (
                  <button
                    onClick={() => onStartCall('voice', activeChatUser)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Start Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}

                {/* Video Call */}
                {onStartCall && !isChatUserBlockedByMe && (
                  <button
                    onClick={() => onStartCall('video', activeChatUser)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Start Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                )}

                {/* End-to-End Encryption Verification Button & Toggle */}
                {activeChatUser && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowE2eeModal(true)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        isE2eeActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      title="End-to-End Encryption active (AES-256-GCM). Click to verify security safety number."
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden md:inline text-[11px]">E2EE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsE2eeActive((prev) => !prev)}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        isE2eeActive
                          ? 'text-emerald-500 hover:bg-emerald-500/10'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isE2eeActive ? 'E2EE is Enabled for this chat. Click to disable.' : 'E2EE is Disabled. Click to enable AES-256 encryption.'}
                    >
                      {isE2eeActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* AI Assistant Help */}
                {onOpenAiAssistant && (
                  <button
                    onClick={onOpenAiAssistant}
                    className="hidden sm:flex p-2 rounded-xl text-indigo-400 hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    title="Ask AI Assistant"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}

                {/* Search In Chat */}
                <button
                  onClick={() => {
                    setInChatSearchOpen((prev) => !prev);
                    if (inChatSearchOpen) setInChatSearchQuery('');
                  }}
                  className={`hidden sm:flex p-2 rounded-xl transition-colors cursor-pointer ${
                    inChatSearchOpen
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Search messages in conversation"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Filter Starred Messages */}
                <button
                  onClick={() => setShowStarredOnly((prev) => !prev)}
                  className={`hidden md:flex p-2 rounded-xl transition-colors cursor-pointer ${
                    showStarredOnly
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={showStarredOnly ? 'Show all messages' : 'Show starred messages'}
                >
                  <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>

                {/* Report User */}
                {onOpenReport && (
                  <button
                    onClick={() => onOpenReport('user', activeChatUser.id, activeChatUser.displayName)}
                    className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Report user"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                )}

                {/* Block / Unblock User Action */}
                <button
                  id={`chat-toggle-block-${activeChatUser.id}`}
                  onClick={handleToggleBlock}
                  disabled={blockActionLoading}
                  className={`hidden lg:flex p-2 rounded-xl transition-colors cursor-pointer ${
                    isChatUserBlockedByMe
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={isChatUserBlockedByMe ? 'Unblock user' : 'Block user'}
                >
                  {isChatUserBlockedByMe ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>

                {/* Permanent NEXXO ID */}
                <button
                  onClick={() => copyNexxoId(activeChatUser.nexxoId)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Copy permanent NEXXO ID"
                >
                  <span>{activeChatUser.nexxoId}</span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* View Profile & Options */}
                <button
                  onClick={() => setShowUserProfileModal(true)}
                  className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="View contact profile & options"
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* Disappearing Messages Quick Action */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowEphemeralMenu((prev) => !prev)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                      activeChatData?.ephemeralTimer && activeChatData.ephemeralTimer > 0
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-800'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={
                      activeChatData?.ephemeralTimer && activeChatData.ephemeralTimer > 0
                        ? `Disappearing Messages: ${
                            activeChatData.ephemeralTimer === 86400
                              ? '24h'
                              : activeChatData.ephemeralTimer === 604800
                              ? '7d'
                              : `${activeChatData.ephemeralTimer / 3600}h`
                          }`
                        : 'Set Disappearing Messages'
                    }
                  >
                    <Timer className="w-4 h-4" />
                    {activeChatData?.ephemeralTimer && activeChatData.ephemeralTimer > 0 ? (
                      <span className="text-[10px] font-bold">
                        {activeChatData.ephemeralTimer === 86400
                          ? '24h'
                          : activeChatData.ephemeralTimer === 604800
                          ? '7d'
                          : `${activeChatData.ephemeralTimer / 3600}h`}
                      </span>
                    ) : null}
                  </button>

                  {/* Disappearing Messages Dropdown */}
                  {showEphemeralMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() => setShowEphemeralMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl z-30 space-y-1 text-xs animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Disappearing Messages
                        </div>
                        {[
                          { label: 'Off', seconds: 0 },
                          { label: '24 Hours', seconds: 86400 },
                          { label: '7 Days', seconds: 604800 },
                          { label: '30 Days', seconds: 2592000 },
                        ].map((opt) => {
                          const isSelected = (activeChatData?.ephemeralTimer || 0) === opt.seconds;
                          return (
                            <button
                              key={opt.seconds}
                              type="button"
                              onClick={() => handleSetEphemeralTimer(opt.seconds)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-sky-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Wallpaper & Theme Quick Trigger */}
                <button
                  type="button"
                  id="chat-theme-quick-btn"
                  onClick={() => setIsThemeModalOpen(true)}
                  className="hidden md:flex p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors cursor-pointer"
                  title="Chat Wallpaper & Theme Tweaks"
                  aria-label="Chat Wallpaper & Theme Tweaks"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {/* Chat Options Menu */}
                <div className="relative">
                  <button
                    id="chat-menu-button"
                    onClick={() => setChatMenuOpen((prev) => !prev)}
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                      chatMenuOpen
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Chat menu options"
                    aria-label="Chat menu options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {chatMenuOpen && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() => setChatMenuOpen(false)}
                      />
                      <div
                        id="chat-menu-dropdown"
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl z-30 space-y-1 text-xs animate-in fade-in zoom-in-95"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserProfileModal(true);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold transition-colors cursor-pointer"
                        >
                          <User className="w-4 h-4" />
                          <span>View Profile & Info</span>
                        </button>
                        {(() => {
                          const activeDirectChat = chats.find(
                            (c) => !c.isGroup && c.participants.includes(currentUser.id) && c.participants.includes(activeChatUser.id)
                          );
                          const isPinned = activeDirectChat ? isChatPinned(activeDirectChat) : false;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (activeDirectChat) {
                                  handleTogglePin(activeDirectChat);
                                }
                                setChatMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                            >
                              {isPinned ? (
                                <>
                                  <PinOff className="w-4 h-4 text-slate-400" />
                                  <span>Unpin Chat</span>
                                </>
                              ) : (
                                <>
                                  <Pin className="w-4 h-4 text-indigo-500 rotate-45" />
                                  <span>Pin Chat to Top</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => {
                            setInChatSearchOpen(true);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Search className="w-4 h-4 text-slate-400" />
                          <span>Search in chat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowStarredOnly((prev) => !prev);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                          <span>{showStarredOnly ? 'Show all messages' : 'Starred messages'}</span>
                        </button>

                        <button
                          type="button"
                          id="chat-menu-theme-btn"
                          onClick={() => {
                            setIsThemeModalOpen(true);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Palette className="w-4 h-4 text-indigo-500" />
                          <span>Wallpaper & Theme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowEphemeralMenu(true);
                            setChatMenuOpen(false);
                          }}
                          className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Timer className="w-4 h-4 text-sky-500" />
                          <span>Disappearing Messages</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            copyNexxoId(activeChatUser.nexxoId);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copy NEXXO ID</span>
                        </button>

                        {onOpenReport && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenReport('user', activeChatUser.id, activeChatUser.displayName);
                              setChatMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="w-4 h-4 text-slate-400" />
                            <span>Report user</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            handleToggleBlock();
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          <Ban className="w-4 h-4 text-slate-400" />
                          <span>{isChatUserBlockedByMe ? 'Unblock user' : 'Block user'}</span>
                        </button>

                        <button
                          type="button"
                          id="chat-menu-lock-chat-btn"
                          onClick={() => {
                            setChatUserToLock(activeChatUser);
                            setShowChatLockModal(true);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                        >
                          {securityConfigs[activeChatUser.id]?.isHidden ? (
                            <EyeOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-indigo-500" />
                          )}
                          <span>
                            {securityConfigs[activeChatUser.id]?.isHidden
                              ? 'Manage Hidden Chat'
                              : lockedUserIds.includes(activeChatUser.id)
                              ? 'Manage Chat Lock'
                              : 'Lock or Hide Chat'}
                          </span>
                        </button>

                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                        {/* Delete Conversation Option */}
                        <button
                          type="button"
                          id="chat-menu-delete-conversation-btn"
                          onClick={() => {
                            setChatToDelete({
                              id: activeChatId,
                              partnerName: activeChatUser.displayName,
                            });
                            setShowDeleteChatModal(true);
                            setChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span>Delete Conversation</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}

            {/* Blocked Notification Banner */}
            {activeChatUser && isChatUserBlockedByMe && (
              <div className="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>You have blocked @{activeChatUser.username}. Unblock to exchange messages and see active status.</span>
                </div>
                <button
                  onClick={handleToggleBlock}
                  disabled={blockActionLoading}
                  className="px-3 py-1 bg-white dark:bg-rose-900/80 hover:bg-rose-100 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer shrink-0"
                >
                  {blockActionLoading ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            )}

            {/* Disappearing Messages Active Banner */}
            {Boolean(activeChatData?.ephemeralTimer && activeChatData.ephemeralTimer > 0) && (
              <div className="px-6 py-2 bg-sky-50 dark:bg-sky-950/60 border-b border-sky-100 dark:border-sky-900/50 flex items-center justify-between text-xs text-sky-800 dark:text-sky-200">
                <div className="flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-sky-500 shrink-0 animate-pulse" />
                  <span>
                    Disappearing messages is active ({activeChatData?.ephemeralTimer === 86400 ? '24h' : activeChatData?.ephemeralTimer === 604800 ? '7d' : `${(activeChatData?.ephemeralTimer || 0) / 3600}h`}). New messages will self-destruct after this duration.
                  </span>
                </div>
                <button
                  onClick={() => setShowEphemeralMenu(true)}
                  className="px-2.5 py-1 bg-white dark:bg-sky-900/80 hover:bg-sky-100 dark:hover:bg-sky-800 text-sky-700 dark:text-sky-200 border border-sky-200 dark:border-sky-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Configure
                </button>
              </div>
            )}

            {/* Pinned Message Banner (if any) */}
            {pinnedMessage && (
              <div className="px-6 py-2 bg-indigo-50/80 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs transition-all">
                <div className="flex items-center gap-2 truncate">
                  <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    Pinned:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 truncate">
                    {pinnedMessage.text || (pinnedMessage.attachment ? `[${pinnedMessage.attachment.name}]` : 'Message')}
                  </span>
                </div>
                <button
                  onClick={() => setPinnedMessage(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Unpin message"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* In-Chat Search Bar (if activated) */}
            {inChatSearchOpen && (
              <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={inChatSearchQuery}
                    onChange={(e) => setInChatSearchQuery(e.target.value)}
                    placeholder="Search messages by text..."
                    autoFocus
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {displayedMessages.length} match{displayedMessages.length === 1 ? '' : 'es'}
                  </span>
                  <button
                    onClick={() => {
                      setInChatSearchOpen(false);
                      setInChatSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Starred Messages Filter Active Banner */}
            {showStarredOnly && (
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                  <span className="font-semibold text-amber-900 dark:text-amber-200">
                    Showing {displayedMessages.length} starred message{displayedMessages.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  onClick={() => setShowStarredOnly(false)}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 text-amber-900 dark:text-amber-100 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}

            {/* Error / Warning Notice */}
            {errorNotice && (
              <div className="mx-6 mt-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl p-2.5 flex items-center justify-between gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorNotice}</span>
                </div>
                <button
                  onClick={() => setErrorNotice(null)}
                  className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Canvas Container with Wallpaper & Dimming Layers */}
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {/* Wallpaper Background Canvas Layer */}
              <div
                className={`absolute inset-0 transition-all duration-300 pointer-events-none ${
                  currentChatTheme.animateWallpaper ? 'animate-pulse' : ''
                }`}
                style={{
                  ...getWallpaperCssStyle(currentChatTheme),
                  ...(currentChatTheme.wallpaperId !== 'default' && (currentChatTheme.darkTone === 'oled' || currentChatTheme.darkTone === 'obsidian')
                    ? {
                        backgroundColor:
                          currentChatTheme.darkTone === 'oled' ? '#000000' : '#18181b',
                      }
                    : {}),
                }}
              />

              {/* Wallpaper Dimming Overlay for Text Readability */}
              {currentChatTheme.wallpaperId !== 'default' && (
                <div
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-200"
                  style={{ opacity: currentChatTheme.dimming / 100 }}
                />
              )}

              {/* Scrollable Message List Canvas */}
              <div
                className={`relative z-10 flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 ${
                  currentChatTheme.wallpaperId === 'default'
                    ? currentChatTheme.darkTone === 'oled'
                      ? 'bg-white dark:bg-black'
                      : currentChatTheme.darkTone === 'obsidian'
                      ? 'bg-[#F8FAFC] dark:bg-[#18181b]'
                      : 'bg-[#F8FAFC] dark:bg-slate-950'
                    : 'bg-transparent'
                }`}
              >
                {/* Date Header Pill */}
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                    Today
                  </span>
                </div>

                {/* Empty Message State */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-2">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      No messages yet in this direct room.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Send a message, audio clip, or attachment to begin real-time communication.
                    </p>
                  </div>
                )}

                {/* Render Messages */}
                {(() => {
                  const latestSentMsgId = [...displayedMessages]
                    .reverse()
                    .find((m) => m.senderId === currentUser.id)?.id;

                  return displayedMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      currentUser={currentUser}
                      partnerUser={activeChatUser}
                      isGroup={Boolean(activeGroupChat)}
                      senderProfile={userMap[msg.senderId] || null}
                      isLatestSentByMe={msg.id === latestSentMsgId}
                      accentColor={currentChatTheme.accentColor}
                      bubbleStyle={currentChatTheme.bubbleStyle}
                      animationType={currentChatTheme.messageAnimation}
                      onReply={(m) => setReplyingTo(m)}
                      onEdit={(m) => {
                        setEditingMessage(m);
                        setInputText(m.text || '');
                      }}
                      onDeleteForMe={(mid) => deleteMessageForMe(activeChatId, mid, currentUser.id)}
                      onDeleteForEveryone={(mid) => deleteMessageForEveryone(activeChatId, mid)}
                      onToggleReaction={(mid, emoji) =>
                        toggleMessageReaction(activeChatId, mid, emoji, currentUser.id, msg.reactions)
                      }
                      onToggleStar={(mid) => toggleStarMessage(activeChatId, mid, currentUser.id)}
                      onForward={(m) => setForwardingMessage(m)}
                      onPin={(m) => setPinnedMessage((prev) => (prev?.id === m.id ? null : m))}
                      onImageClick={(url) => setPreviewMedia({ url, type: 'image' })}
                      onMediaClick={(media) => setPreviewMedia(media)}
                      onVotePoll={handleVotePoll}
                      onClosePoll={handleClosePoll}
                    />
                  ));
                })()}

                {/* Live Partner Typing Bubble */}
                {partnerIsTyping && (
                  <div className="flex items-end gap-2.5 my-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 mb-1">
                      {activeChatUser?.photoURL ? (
                        <img
                          src={activeChatUser.photoURL}
                          alt={activeChatUser.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {(activeChatUser?.displayName || activeChatUser?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div className="px-6 py-2 bg-indigo-50 dark:bg-indigo-950/70 border-t border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold">
                    Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : replyingTo.senderName || activeChatUser?.displayName || 'User'}:
                  </span>
                  <span className="truncate opacity-80">{replyingTo.text || 'Attachment'}</span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded hover:bg-indigo-200/50 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editing Banner */}
            {editingMessage && (
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/70 border-t border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Editing Message:</span>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setInputText('');
                  }}
                  className="px-2 py-0.5 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Attachment Draft Preview */}
            {pendingAttachment && (
              <div className="px-3 sm:px-6 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {pendingAttachment.file.type.startsWith('video/') && pendingAttachment.previewUrl ? (
                    <video
                      src={pendingAttachment.previewUrl}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-black cursor-pointer shrink-0"
                      muted
                      onClick={() =>
                        setPreviewMedia({
                          url: pendingAttachment.previewUrl!,
                          type: 'video',
                          name: pendingAttachment.file.name,
                          size: pendingAttachment.file.size,
                        })
                      }
                    />
                  ) : pendingAttachment.previewUrl ? (
                    <img
                      src={pendingAttachment.previewUrl}
                      alt="Upload preview"
                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                      onClick={() =>
                        setPreviewMedia({
                          url: pendingAttachment.previewUrl!,
                          type: 'image',
                          name: pendingAttachment.file.name,
                          size: pendingAttachment.file.size,
                        })
                      }
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {pendingAttachment.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(pendingAttachment.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Photo Crop & Adjust Button */}
                  {pendingAttachment.file.type.startsWith('image/') && !pendingAttachment.file.type.includes('gif') && (
                    <button
                      type="button"
                      onClick={() => setCroppingImageFile(pendingAttachment.file)}
                      className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer border border-indigo-200/80 dark:border-indigo-800/60 shrink-0"
                      title="Crop and adjust this photo"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Crop / Adjust</span>
                      <span className="sm:hidden">Crop</span>
                    </button>
                  )}

                  <button
                    onClick={() => setPendingAttachment(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress Bar & Speed Indicator */}
            {uploadProgress !== null && (
              <div className="w-full bg-indigo-50/80 dark:bg-indigo-950/50 border-t border-indigo-100 dark:border-indigo-900/50 px-3 sm:px-6 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
                  <span>Fast uploading attachment... {uploadProgress}%</span>
                </div>
                <div className="w-28 sm:w-44 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 3. Message Composer & Voice Recorder Bar */}
            <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]">
              {activeChatUser && isChatUserBlockedByMe ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60">
                  <div className="flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
                    <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>You blocked @{activeChatUser.displayName || activeChatUser.username}. Unblock to send messages.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={blockActionLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{blockActionLoading ? 'Unblocking...' : `Unblock @${activeChatUser.username}`}</span>
                  </button>
                </div>
              ) : isRecordingVoice ? (
                <VoiceRecorder
                  onSend={handleSendVoiceMessage}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <>
                  {inputText && !editingMessage && (
                    <div className="flex items-center justify-between px-1 pb-2 text-[11px]">
                      <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span>Draft auto-saved &bull; preserved across tabs</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInputText('');
                          if (activeChatId) {
                            clearChatDraft(activeChatId, currentUser.id).catch(() => {});
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Discard draft
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
                    {/* File Attachment Hidden Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.ogg,.m4a"
                    />

                    {/* Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Attach image, video, audio or document"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Choose from Media Library Vault */}
                    <button
                      type="button"
                      onClick={() => setShowMediaVaultModal(true)}
                      className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Choose file from your Media Library Vault"
                    >
                      <HardDrive className="w-5 h-5" />
                    </button>

                    {/* Create Poll Button */}
                    <button
                      type="button"
                      onClick={() => setShowCreatePollModal(true)}
                      className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Create interactive Poll"
                    >
                      <BarChart2 className="w-5 h-5" />
                    </button>

                    {/* Share Live Location Pin */}
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Share live location pin"
                    >
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Emojis, GIFs & Stickers Picker Toggle */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowMediaPicker(!showMediaPicker)}
                        className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
                          showMediaPicker
                            ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                            : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Emojis, GIFs & Stickers"
                      >
                        <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {showMediaPicker && (
                        <div className="fixed sm:absolute bottom-16 sm:bottom-full mb-2 sm:mb-3 left-2 right-2 sm:left-0 sm:right-auto z-50 flex justify-center sm:block">
                          <MediaPicker
                            onSelectEmoji={(emoji) => {
                              const newText = inputText + emoji;
                              setInputText(newText);
                              if (activeChatId) {
                                try {
                                  localStorage.setItem(`nexxo_chat_draft_${activeChatId}_${currentUser.id}`, newText);
                                  localStorage.setItem(`nexxo_chat_draft_${activeChatId}`, newText);
                                } catch {}
                                if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
                                draftSaveTimeoutRef.current = setTimeout(() => {
                                  saveChatDraft(activeChatId, currentUser.id, newText).catch(() => {});
                                }, 1000);
                              }
                            }}
                            onSendMedia={handleSendMedia}
                            onClose={() => setShowMediaPicker(false)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Voice Note Button (Quick access in toolbar) */}
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Record voice message"
                    >
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Built-in Input Box with Integrated Send Button */}
                    <div className="relative flex-1 min-w-0 flex items-center">
                      <input
                        id="chat-message-input"
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={
                          activeChatUser?.displayName
                            ? `Message ${activeChatUser.displayName}...`
                            : activeGroupChat?.name
                            ? `Message ${activeGroupChat.name}...`
                            : 'Type a message...'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-3 sm:pl-4 pr-11 sm:pr-14 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-xs"
                      />

                      {/* Integrated Built-in Send Button */}
                      <button
                        id="chat-enter-send-btn"
                        type="submit"
                        disabled={sending || (!inputText.trim() && !pendingAttachment && !editingMessage)}
                        className={`absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          inputText.trim() || pendingAttachment || editingMessage
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 scale-100 cursor-pointer active:scale-95'
                            : 'bg-transparent text-slate-400 dark:text-slate-500 opacity-40 cursor-not-allowed'
                        }`}
                        title={
                          editingMessage
                            ? 'Save Edit (Enter ↵)'
                            : pendingAttachment
                            ? `Send with attachment (Enter ↵)`
                            : 'Send Message (Enter ↵)'
                        }
                      >
                        {sending ? (
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform translate-x-px" />
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          /* Empty Active Selection Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC] dark:bg-slate-950">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Select a Conversation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              Pick a contact from the list or start a new conversation via Discovery to send real-time synchronized messages.
            </p>
            <button
              onClick={onNavigateToSearch}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              Explore Network Directory
            </button>
          </div>
        )}
      </div>

      {/* 4. Fullscreen Media Preview Modal for Photos & Videos */}
      {previewMedia && (
        <MediaPreviewModal
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
        />
      )}

      {/* 4.1 Image Crop & Adjust Modal */}
      {croppingImageFile && (
        <ImageCropModal
          file={croppingImageFile}
          onApply={(croppedFile, previewUrl, autoSend) => {
            setCroppingImageFile(null);
            const attachment = { file: croppedFile, previewUrl };
            setPendingAttachment(attachment);
            if (autoSend) {
              handleSendMessage(undefined, attachment);
            }
          }}
          onSkipCrop={(originalFile) => {
            setCroppingImageFile(null);
            const previewUrl = URL.createObjectURL(originalFile);
            setPendingAttachment({ file: originalFile, previewUrl });
          }}
          onClose={() => setCroppingImageFile(null)}
        />
      )}

      {/* 5. Forward Message Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          currentUser={currentUser}
          connections={Object.values(userMap)}
          onClose={() => setForwardingMessage(null)}
          onForwardComplete={() => {
            setForwardingMessage(null);
          }}
        />
      )}

      {/* 6. Delete Conversation Confirmation Modal */}
      {showDeleteChatModal && chatToDelete && (
        <div
          id="delete-conversation-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            if (!deletingConversation) {
              setShowDeleteChatModal(false);
              setChatToDelete(null);
            }
          }}
        >
          <div
            id="delete-conversation-modal-card"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Conversation?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Are you sure you want to delete the conversation with{' '}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {chatToDelete.partnerName}
                  </strong>
                  ?
                </p>
                <div className="mt-2.5 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  This action removes the entire conversation and message history from your view. The other participant will still retain their message history.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="cancel-delete-conversation-btn"
                disabled={deletingConversation}
                onClick={() => {
                  setShowDeleteChatModal(false);
                  setChatToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-conversation-btn"
                disabled={deletingConversation}
                onClick={handleConfirmDeleteChat}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingConversation ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Conversation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Private Chat Lock & Hide Security Configuration Modal */}
      {showChatLockModal && chatUserToLock && (
        <ChatHideSecurityModal
          isOpen={showChatLockModal}
          onClose={() => {
            setShowChatLockModal(false);
            setChatUserToLock(null);
          }}
          partnerUser={chatUserToLock}
          isCurrentlyHidden={Boolean(securityConfigs[chatUserToLock.id]?.isHidden)}
          isCurrentlyLocked={lockedUserIds.includes(chatUserToLock.id)}
          currentConfig={securityConfigs[chatUserToLock.id] || null}
          onSaveSecurity={(config) => handleSaveChatSecurity(chatUserToLock.id, config)}
          onRemoveSecurity={() => handleRemoveChatSecurity(chatUserToLock.id)}
          appPasscode={appPasscode}
        />
      )}

      {/* 6. Contact Profile & Full Options Modal */}
      {showUserProfileModal && activeChatUser && (
        <ChatUserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          partnerUser={activeChatUser}
          currentUser={currentUser}
          isConnected={Boolean(activeChatUser && connectionUserIds?.includes(activeChatUser.id))}
          isBlockedByMe={isChatUserBlockedByMe}
          onToggleBlock={handleToggleBlock}
          blockLoading={blockActionLoading}
          onStartVoiceCall={onStartCall ? () => onStartCall('voice', activeChatUser) : undefined}
          onStartVideoCall={onStartCall ? () => onStartCall('video', activeChatUser) : undefined}
          onOpenSearch={() => {
            setInChatSearchOpen(true);
          }}
          onToggleStarred={() => setShowStarredOnly((prev) => !prev)}
          isStarredActive={showStarredOnly}
          onOpenChatLock={() => {
            setChatUserToLock(activeChatUser);
            setShowChatLockModal(true);
          }}
          isChatLocked={lockedUserIds.includes(activeChatUser.id)}
          onOpenReport={onOpenReport ? () => onOpenReport('user', activeChatUser.id, activeChatUser.displayName) : undefined}
          onClearHistory={() => {
            if (activeChatId) {
              setChatToDelete({
                id: activeChatId,
                partnerName: activeChatUser.displayName,
              });
              setShowDeleteChatModal(true);
            }
          }}
        />
      )}

      {/* Media Library Vault Modal for Chat File Picking */}
      {showMediaVaultModal && (
        <UserMediaLibraryModal
          currentUser={currentUser}
          onClose={() => setShowMediaVaultModal(false)}
          onSelectMedia={(item) => {
            setShowMediaVaultModal(false);
            handleSendFromVault(item);
          }}
          title="Send from Media Library Vault"
        />
      )}

      {/* Create Interactive Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onSubmit={handleSendPoll}
      />

      {/* Create Group Conversation Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        currentUser={currentUser}
        availableUsers={candidateUsersList}
        onGroupCreated={(groupId) => {
          setShowCreateGroupModal(false);
          const found = chats.find((c) => c.id === groupId);
          if (found) {
            setActiveGroupChat(found);
          } else {
            setActiveGroupChat({
              id: groupId,
              participants: [currentUser.id],
              isGroup: true,
              type: 'group',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as any);
          }
        }}
      />

      {/* Group Info & Management Modal */}
      {showGroupInfoModal && activeGroupChat && (
        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          groupChat={activeGroupChat}
          currentUser={currentUser}
          userMap={userMap}
          availableUsers={candidateUsersList}
          onGroupUpdated={(updated) => {
            setActiveGroupChat(updated);
          }}
          onGroupLeftOrDeleted={() => {
            setShowGroupInfoModal(false);
            setActiveGroupChat(null);
          }}
        />
      )}

      {/* Chat Wallpaper & Theme Customization Modal */}
      {isThemeModalOpen && (
        <ChatThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          chatId={activeChatId || undefined}
          chatTitle={
            activeGroupChat
              ? activeGroupChat.name
              : activeChatUser
              ? activeChatUser.displayName
              : 'Global Chat Theme'
          }
        />
      )}

      {/* Share Location Pin Modal */}
      {showLocationModal && (
        <LocationShareModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSendLocation={handleSendLocationPin}
        />
      )}

      {/* End-to-End Encryption Verification Modal */}
      {showE2eeModal && activeChatId && (
        <E2eeVerificationModal
          isOpen={showE2eeModal}
          onClose={() => setShowE2eeModal(false)}
          chatId={activeChatId}
          partnerUser={activeChatUser}
        />
      )}
    </div>
  );
};
