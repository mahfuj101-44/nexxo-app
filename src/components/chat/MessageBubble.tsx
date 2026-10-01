import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChatMessage, NexxoUser } from '../../types';
import { AudioPlayer } from './AudioPlayer';
import { MessageInfoModal } from './MessageInfoModal';
import { PollCard } from './PollCard';
import { useResolvedMediaUrl, downloadAttachmentFile } from '../../lib/storageService';
import {
  formatTimeShort,
  formatReadReceiptTime,
  formatExactTimestamp,
  parseMessageTimestamp,
} from '../../lib/chatService';
import {
  AccentColor,
  BubbleStyle,
  MessageAnimationType,
  ACCENT_COLOR_CLASSES,
} from '../../lib/wallpaperService';
import {
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Copy,
  Edit3,
  Trash2,
  FileText,
  Download,
  Smile,
  Ban,
  Share2,
  Pin,
  ExternalLink,
  Film,
  Info,
  Star,
  BookmarkPlus,
  BookmarkCheck,
  Maximize,
  MapPin,
  Navigation,
  Lock,
} from 'lucide-react';
import { saveUserMediaItem } from '../../lib/mediaLibraryService';
import { decryptMessageText, isEncryptedPayload } from '../../lib/e2eeService';

interface MessageBubbleProps {
  message: ChatMessage;
  currentUser: NexxoUser;
  partnerUser?: NexxoUser | null;
  isGroup?: boolean;
  senderProfile?: NexxoUser | null;
  isLatestSentByMe?: boolean;
  accentColor?: AccentColor;
  bubbleStyle?: BubbleStyle;
  animationType?: MessageAnimationType;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onToggleStar?: (messageId: string) => void;
  onForward?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onImageClick?: (url: string) => void;
  onMediaClick?: (media: {
    url: string;
    type: 'image' | 'video';
    name?: string;
    size?: number;
    duration?: number;
    senderName?: string;
    senderAvatar?: string;
    timestamp?: string;
  }) => void;
  onVotePoll?: (messageId: string, optionId: string) => void;
  onClosePoll?: (messageId: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUser,
  partnerUser,
  isGroup = false,
  senderProfile,
  isLatestSentByMe,
  accentColor = 'indigo',
  bubbleStyle = 'rounded',
  animationType = 'smooth',
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onToggleReaction,
  onToggleStar,
  onForward,
  onPin,
  onImageClick,
  onMediaClick,
  onVotePoll,
  onClosePoll,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showInlineReadTime, setShowInlineReadTime] = useState(false);
  const [copied, setCopied] = useState(false);

  // If this is an administrative or group lifecycle system message
  if (message.isSystem) {
    return (
      <div className="flex justify-center my-3 w-full animate-in fade-in">
        <div className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] font-medium shadow-2xs max-w-md text-center">
          {message.text}
        </div>
      </div>
    );
  }

  const isMe = message.senderId === currentUser.id;
  const isStarred = Boolean(message.starredBy && message.starredBy.includes(currentUser.id));
  const resolvedAttachmentUrl = useResolvedMediaUrl(message.attachment?.url);

  // Read receipt metadata from Firestore respecting privacy preferences
  const readTimestamp = message.readAt || (partnerUser ? message.readBy?.[partnerUser.id] : null);
  const readReceiptsAllowed =
    Boolean(message.groupId) ||
    ((currentUser.settings?.readReceipts ?? true) && (partnerUser?.settings?.readReceipts ?? true));
  const isRead = readReceiptsAllowed && (message.status === 'read' || Boolean(readTimestamp));
  const readTimeStr = readReceiptsAllowed ? formatReadReceiptTime(readTimestamp) : '';
  const exactReadStr = readReceiptsAllowed ? formatExactTimestamp(readTimestamp) : '';

  // If deleted for me, don't render
  if (message.deletedFor?.includes(currentUser.id)) {
    return null;
  }

  // Format message timestamp
  const timeStr = formatTimeShort(message.createdAt);

  const [isSavedToVault, setIsSavedToVault] = useState(false);

  // E2EE Decryption state
  const [displayText, setDisplayText] = useState<string>(() => {
    if (isEncryptedPayload(message.text)) {
      return 'Decrypting message...';
    }
    return message.text || '';
  });
  const [isDecryptedMessage, setIsDecryptedMessage] = useState<boolean>(Boolean(message.isEncrypted));

  useEffect(() => {
    let isMounted = true;
    if (isEncryptedPayload(message.text)) {
      decryptMessageText(message.text, message.chatId).then(({ text, isDecrypted }) => {
        if (isMounted) {
          setDisplayText(text);
          setIsDecryptedMessage(isDecrypted);
        }
      });
    } else {
      setDisplayText(message.text || '');
    }
    return () => {
      isMounted = false;
    };
  }, [message.text, message.chatId]);

  const handleSaveToVault = async () => {
    if (!message.attachment) return;
    try {
      const isVideo = message.type === 'video' || message.attachment.mimeType?.startsWith('video/');
      const isVoiceOrAudio = message.type === 'voice' || message.attachment.mimeType?.startsWith('audio/');
      const isImg = message.type === 'image' || message.attachment.mimeType?.startsWith('image/');
      const itemType = isImg ? 'image' : isVideo ? 'video' : isVoiceOrAudio ? 'audio' : 'document';

      await saveUserMediaItem({
        ownerId: currentUser.id,
        name: message.attachment.name || 'Saved Attachment',
        type: itemType,
        url: resolvedAttachmentUrl || message.attachment.url,
        storagePath: message.attachment.storagePath || '',
        size: message.attachment.size || 0,
        mimeType: message.attachment.mimeType,
        duration: message.attachment.duration,
        source: 'chat',
      });
      setIsSavedToVault(true);
      setTimeout(() => setIsSavedToVault(false), 2500);
    } catch (err) {
      console.error('Failed to save to vault:', err);
    }
  };

  const handleCopy = () => {
    const textToCopy = displayText || message.text;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if message is deleted for everyone
  if (message.isDeletedForEveryone) {
    return (
      <div className={`flex items-end gap-2.5 my-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 italic text-xs flex items-center gap-2">
          <Ban className="w-3.5 h-3.5" />
          <span>This message was deleted.</span>
        </div>
      </div>
    );
  }

  const isVideo =
    message.type === 'video' ||
    (message.attachment && message.attachment.mimeType?.startsWith('video/'));

  const isAudioOrMusic =
    message.type === 'voice' ||
    (message.attachment && message.attachment.mimeType?.startsWith('audio/'));

  const activeAccent = ACCENT_COLOR_CLASSES[accentColor] || ACCENT_COLOR_CLASSES.indigo;

  // Resolve Bubble Shape Class
  const getBubbleShapeClass = () => {
    if (bubbleStyle === 'minimal') {
      return 'rounded-md';
    }
    if (bubbleStyle === 'modern') {
      return isMe
        ? 'rounded-2xl rounded-br-none border border-white/15'
        : 'rounded-2xl rounded-bl-none border border-slate-200/90 dark:border-slate-800';
    }
    return isMe ? 'rounded-2xl rounded-br-none' : 'rounded-2xl rounded-bl-none';
  };

  // Entrance animation variants
  const getAnimationProps = () => {
    switch (animationType) {
      case 'bounce':
        return {
          initial: { scale: 0.88, y: 12, opacity: 0 },
          animate: { scale: 1, y: 0, opacity: 1 },
          transition: { type: 'spring' as const, damping: 15, stiffness: 300, duration: 0.25 },
        };
      case 'subtle':
        return {
          initial: { y: 4, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.15 },
        };
      case 'instant':
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          transition: { duration: 0 },
        };
      case 'smooth':
      default:
        return {
          initial: { y: 10, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.22, ease: 'easeOut' as const },
        };
    }
  };

  return (
    <motion.div
      {...getAnimationProps()}
      className={`group relative flex items-end gap-2.5 my-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowDeleteConfirm(false);
      }}
    >
      {/* Partner avatar (for incoming messages) */}
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 mb-1">
          {partnerUser.photoURL ? (
            <img
              src={partnerUser.photoURL}
              alt={partnerUser.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {partnerUser.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Floating Action Toolbar */}
      <div
        className={`absolute top-0 -translate-y-full mb-1 z-10 transition-opacity flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1 shadow-md ${
          showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${isMe ? 'right-0' : 'left-9'}`}
      >
        {/* Quick Reaction Picker Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
            title="Add Reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-0 flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reply */}
        <button
          onClick={() => onReply(message)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
          title="Reply"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>

        {/* Forward */}
        {onForward && (
          <button
            onClick={() => onForward(message)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
            title="Forward Message"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Pin */}
        {onPin && (
          <button
            onClick={() => onPin(message)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
            title="Pin Message"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Message Info & Read Receipts (Sender only) */}
        {isMe && (
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
            title="Message Info & Read Receipts"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Copy text */}
        {message.text && (
          <button
            onClick={handleCopy}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
            title={copied ? 'Copied!' : 'Copy text'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Star / Bookmark Message */}
        {onToggleStar && (
          <button
            onClick={() => onToggleStar(message.id)}
            className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
              isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500'
            }`}
            title={isStarred ? 'Unstar Message' : 'Star Message'}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
        )}

        {/* Quick Download Attachment */}
        {message.attachment && (
          <>
            <button
              onClick={() => downloadAttachmentFile(resolvedAttachmentUrl || message.attachment!.url, message.attachment!.name)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              title="Download Attachment Fast"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Save to Media Library Vault */}
            <button
              onClick={handleSaveToVault}
              className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                isSavedToVault
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              title={isSavedToVault ? 'Saved to Media Library Vault!' : 'Save to My Media Library Vault'}
            >
              {isSavedToVault ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
            </button>
          </>
        )}

        {/* Edit (if sender and text message) */}
        {isMe && message.type === 'text' && (
          <button
            onClick={() => onEdit(message)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
            title="Edit Message"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm((prev) => !prev)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 cursor-pointer"
            title="Delete Message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {showDeleteConfirm && (
            <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-xl z-20 space-y-1 text-xs`}>
              <button
                onClick={() => {
                  onDeleteForMe(message.id);
                  setShowDeleteConfirm(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
              >
                Delete for me
              </button>
              {isMe && (
                <button
                  onClick={() => {
                    onDeleteForEveryone(message.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 cursor-pointer font-medium"
                >
                  Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[85%] sm:max-w-[480px] min-w-0 break-words px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed shadow-xs transition-shadow ${getBubbleShapeClass()} ${
          isMe
            ? activeAccent.bubbleSent
            : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}
      >
        {/* Sender Name in Group Conversations */}
        {isGroup && !isMe && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {senderProfile?.displayName || message.senderName || 'Member'}
            </span>
          </div>
        )}

        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div
            className={`mb-2 p-2 rounded-xl border-l-3 text-xs leading-snug ${
              isMe
                ? 'bg-indigo-700/60 border-white/80 text-indigo-100'
                : 'bg-slate-100 dark:bg-slate-800 border-indigo-500 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-bold mb-0.5 text-[11px] opacity-90">
              {message.replyTo.senderName || 'Replied Message'}
            </div>
            <p className="truncate opacity-80">{message.replyTo.text}</p>
          </div>
        )}

        {/* Attachment Content */}
        {message.attachment && (
          <div className="mb-2">
            {/* Image / Sticker Attachment */}
            {(message.type === 'image' || (message.attachment.mimeType?.startsWith('image/') && !isVideo)) && (
              <div
                onClick={() => {
                  const mediaUrl = resolvedAttachmentUrl || message.attachment!.url;
                  if (onMediaClick) {
                    onMediaClick({
                      url: mediaUrl,
                      type: 'image',
                      name: message.attachment!.name || 'photo.jpg',
                      size: message.attachment!.size,
                      senderName: isMe ? 'You' : senderProfile?.displayName || message.senderName || partnerUser?.displayName || 'User',
                      senderAvatar: isMe ? (currentUser.photoURL || currentUser.avatar) : (senderProfile?.photoURL || senderProfile?.avatar || partnerUser?.photoURL || partnerUser?.avatar),
                      timestamp: timeStr || undefined,
                    });
                  } else if (onImageClick) {
                    onImageClick(mediaUrl);
                  }
                }}
                className="relative rounded-xl overflow-hidden cursor-pointer group/img max-h-72 bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-white/10"
              >
                <img
                  src={resolvedAttachmentUrl || message.attachment.url}
                  alt={message.attachment.name}
                  className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-xs text-white flex items-center gap-1.5 text-xs font-semibold shadow-lg">
                    <Maximize className="w-3.5 h-3.5" />
                    <span>View Photo</span>
                  </div>
                </div>
                {/* Fast One-Click Download Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAttachmentFile(resolvedAttachmentUrl || message.attachment!.url, message.attachment!.name || 'image.jpg');
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer shadow-md"
                  title="Fast Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Video Attachment with embedded player & click to view in full player */}
            {isVideo && (
              <div
                onClick={() => {
                  const mediaUrl = resolvedAttachmentUrl || message.attachment!.url;
                  if (onMediaClick) {
                    onMediaClick({
                      url: mediaUrl,
                      type: 'video',
                      name: message.attachment!.name || 'video.mp4',
                      size: message.attachment!.size,
                      duration: message.attachment!.duration,
                      senderName: isMe ? 'You' : senderProfile?.displayName || message.senderName || partnerUser?.displayName || 'User',
                      senderAvatar: isMe ? (currentUser.photoURL || currentUser.avatar) : (senderProfile?.photoURL || senderProfile?.avatar || partnerUser?.photoURL || partnerUser?.avatar),
                      timestamp: timeStr || undefined,
                    });
                  }
                }}
                className="relative rounded-xl overflow-hidden bg-black max-h-72 shadow-inner group/vid cursor-pointer"
              >
                <video
                  src={resolvedAttachmentUrl || message.attachment.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full max-h-72 rounded-xl object-contain bg-black"
                />
                {/* Click to open full player button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const mediaUrl = resolvedAttachmentUrl || message.attachment!.url;
                    if (onMediaClick) {
                      onMediaClick({
                        url: mediaUrl,
                        type: 'video',
                        name: message.attachment!.name || 'video.mp4',
                        size: message.attachment!.size,
                        duration: message.attachment!.duration,
                        senderName: isMe ? 'You' : senderProfile?.displayName || message.senderName || partnerUser?.displayName || 'User',
                        senderAvatar: isMe ? (currentUser.photoURL || currentUser.avatar) : (senderProfile?.photoURL || senderProfile?.avatar || partnerUser?.photoURL || partnerUser?.avatar),
                        timestamp: timeStr || undefined,
                      });
                    }
                  }}
                  className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-semibold flex items-center gap-1.5 opacity-90 group-hover/vid:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs shadow-md"
                  title="Click to view full video"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Click to view</span>
                </button>
                {/* Fast Download Video Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAttachmentFile(resolvedAttachmentUrl || message.attachment!.url, message.attachment!.name || 'video.mp4');
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white opacity-0 group-hover/vid:opacity-100 transition-opacity cursor-pointer shadow-md"
                  title="Fast Download Video"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Audio / Music / Voice Message Attachment */}
            {isAudioOrMusic && !isVideo && (
              <AudioPlayer
                src={resolvedAttachmentUrl || message.attachment.url}
                duration={message.attachment.duration}
                isMe={isMe}
                title={message.attachment.name}
                fileSize={message.attachment.size}
                isMusic={message.attachment.mimeType?.includes('audio/mpeg') || message.attachment.mimeType?.includes('audio/mp3') || message.attachment.mimeType?.includes('audio/wav')}
              />
            )}

            {/* Document / Generic File Attachment (non-image, non-video, non-audio) */}
            {!isVideo && !isAudioOrMusic && !message.attachment.mimeType?.startsWith('image/') && (
              <button
                type="button"
                onClick={() => downloadAttachmentFile(resolvedAttachmentUrl || message.attachment!.url, message.attachment!.name)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer text-left ${
                  isMe
                    ? 'bg-indigo-700/60 hover:bg-indigo-700 border-indigo-500 text-white'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                title="Fast Download Document"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{message.attachment.name}</p>
                  <p className="text-[11px] opacity-75">{formatFileSize(message.attachment.size)}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors shrink-0">
                  <Download className="w-4 h-4 opacity-90" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Location Pin Card */}
        {message.type === 'location' && message.location ? (
          <div className="my-1 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 space-y-2.5 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs truncate">{message.location.placeName || 'Shared Location Pin'}</p>
                <p className="text-[11px] opacity-75 truncate">{message.location.address || `${message.location.latitude.toFixed(4)}, ${message.location.longitude.toFixed(4)}`}</p>
              </div>
            </div>

            {/* Static OSM Embed Mini Map */}
            <div className="relative rounded-xl overflow-hidden h-28 w-full border border-black/10 dark:border-white/10 shadow-xs">
              <iframe
                title="Location Card"
                className="w-full h-full border-0 pointer-events-none"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${message.location.longitude - 0.003}%2C${message.location.latitude - 0.003}%2C${message.location.longitude + 0.003}%2C${message.location.latitude + 0.003}&layer=mapnik&marker=${message.location.latitude}%2C${message.location.longitude}`}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${message.location.latitude},${message.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Navigation className="w-3 h-3" /> Open in Maps
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${message.location?.latitude}, ${message.location?.longitude}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="py-1.5 px-2 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Copy GPS coordinates"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : message.type === 'poll' && message.poll ? (
          <div className="my-1">
            <PollCard
              poll={message.poll}
              currentUserId={currentUser.id}
              onVote={(optionId) => onVotePoll && onVotePoll(message.id, optionId)}
              onClosePoll={() => onClosePoll && onClosePoll(message.id)}
              canClose={isMe}
            />
          </div>
        ) : (
          /* Text Content */
          displayText && (
            <div className="space-y-1">
              {isDecryptedMessage && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 mb-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>End-to-End Encrypted</span>
                </div>
              )}
              <p className="whitespace-pre-wrap break-words text-sm selection:bg-indigo-300 selection:text-indigo-900">
                {displayText}
              </p>
            </div>
          )
        )}

        {/* Metadata Footer (Time + Edited + Star + Status ticks) */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none ${
            isMe ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {isStarred && (
            <span title="Starred Message">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
            </span>
          )}
          {message.isEdited && <span className="italic opacity-80">(edited)</span>}
          {timeStr && <span>{timeStr}</span>}

          {/* Delivery & Read Status Indicators (Sender only) */}
          {isMe && (
            <span className="flex items-center ml-0.5">
              {message.status === 'sending' && (
                <span title="Sending..."><Clock className="w-3 h-3 text-indigo-300 animate-spin" /></span>
              )}
              {message.status === 'sent' && !isRead && (
                <span title="Sent to server"><Check className="w-3.5 h-3.5 text-indigo-200" /></span>
              )}
              {message.status === 'delivered' && !isRead && (
                <span title="Delivered to device"><CheckCheck className="w-3.5 h-3.5 text-indigo-200" /></span>
              )}
              {isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(true);
                  }}
                  className="inline-flex items-center gap-0.5 text-cyan-300 hover:text-cyan-100 cursor-pointer transition-colors"
                  title={`Read by ${partnerUser.displayName}${readTimeStr ? ` (${readTimeStr})` : ''}. Click for details.`}
                >
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 font-bold" />
                </button>
              )}
            </span>
          )}
        </div>

        {/* Message Reaction Badges */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 -mb-0.5">
            {Object.entries(message.reactions).map(([emoji, rawUids]) => {
              const uids = (Array.isArray(rawUids) ? rawUids : []) as string[];
              if (uids.length === 0) return null;
              const hasReacted = uids.includes(currentUser.id);
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border transition-transform active:scale-95 cursor-pointer ${
                    hasReacted
                      ? isMe
                        ? 'bg-indigo-700 border-white text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300'
                      : isMe
                      ? 'bg-indigo-800/80 border-indigo-700 text-indigo-200'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title={`${uids.length} reaction${uids.length > 1 ? 's' : ''}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-bold">{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Read Receipt sub-caption below bubble (for latest sent message or when toggled) */}
      {isMe && isRead && (isLatestSentByMe || showInlineReadTime) && (
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="flex items-center justify-end gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 mt-0.5 mr-1 font-medium select-none transition-colors cursor-pointer"
          title="Click to view detailed read receipt timeline"
        >
          <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>Read {readTimeStr || 'Just now'}</span>
        </button>
      )}

      {/* Message Info Modal */}
      {showInfoModal && (
        <MessageInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          message={message}
          currentUser={currentUser}
          partnerUser={partnerUser}
        />
      )}
    </motion.div>
  );
};
