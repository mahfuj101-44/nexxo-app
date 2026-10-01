import React, { useState } from 'react';
import {
  X,
  Phone,
  Video,
  Search,
  Star,
  Lock,
  Unlock,
  ShieldAlert,
  Ban,
  UserCheck,
  Copy,
  Check,
  Mail,
  Calendar,
  Clock,
  ShieldCheck,
  EyeOff,
  Trash2,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { NexxoUser } from '../../types';
import { VerifiedBadge } from '../common/VerifiedBadge';
import {
  canViewLastSeen,
  canViewOnlineStatus,
  canViewProfilePhoto,
  canViewBio,
  canMakeCallTo,
  formatLastSeen,
} from '../../lib/privacyService';

interface ChatUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: NexxoUser;
  currentUser: NexxoUser;
  isConnected?: boolean;
  isBlockedByMe: boolean;
  onToggleBlock: () => void;
  blockLoading?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onOpenSearch?: () => void;
  onToggleStarred?: () => void;
  isStarredActive?: boolean;
  onOpenChatLock?: () => void;
  isChatLocked?: boolean;
  onOpenReport?: () => void;
  onClearHistory?: () => void;
}

export const ChatUserProfileModal: React.FC<ChatUserProfileModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  currentUser,
  isConnected = true,
  isBlockedByMe,
  onToggleBlock,
  blockLoading = false,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenSearch,
  onToggleStarred,
  isStarredActive = false,
  onOpenChatLock,
  isChatLocked = false,
  onOpenReport,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  const canSeePhoto = canViewProfilePhoto(currentUser, partnerUser, isConnected);
  const canSeeBio = canViewBio(currentUser, partnerUser, isConnected);
  const canSeeOnline = canViewOnlineStatus(currentUser, partnerUser, isConnected);
  const canSeeLastSeen = canViewLastSeen(currentUser, partnerUser, isConnected);
  const canCall = canMakeCallTo(currentUser, partnerUser, isConnected);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (partnerUser.nexxoId) {
      navigator.clipboard.writeText(partnerUser.nexxoId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyEmail = () => {
    if (partnerUser.email) {
      navigator.clipboard.writeText(partnerUser.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const formattedDate = partnerUser.createdAt?.toDate
    ? partnerUser.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : partnerUser.createdAt
    ? new Date(partnerUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Member';

  return (
    <div
      id="nexxo-chat-user-profile-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Bar */}
        <div className="relative h-28 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card & Avatar */}
        <div className="relative px-6 pb-6 overflow-y-auto flex-1">
          {/* Avatar floating over cover */}
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              <div
                onClick={() => partnerUser.photoURL && canSeePhoto && setIsPhotoZoomed(true)}
                className={`w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-lg flex items-center justify-center ${
                  partnerUser.photoURL && canSeePhoto ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                title={partnerUser.photoURL && canSeePhoto ? 'Click to view full photo' : ''}
              >
                {partnerUser.photoURL && canSeePhoto ? (
                  <img
                    src={partnerUser.photoURL}
                    alt={partnerUser.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-bold text-slate-600 dark:text-slate-300">
                    {(partnerUser.displayName || partnerUser.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Status Ring */}
              <div
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                  canSeeOnline && partnerUser.presence === 'online'
                    ? 'bg-emerald-500'
                    : canSeeOnline && partnerUser.presence === 'away'
                    ? 'bg-amber-500'
                    : canSeeOnline && partnerUser.presence === 'busy'
                    ? 'bg-rose-500'
                    : canSeeOnline && partnerUser.presence === 'dnd'
                    ? 'bg-purple-500'
                    : 'bg-slate-400'
                }`}
                title={
                  canSeeOnline
                    ? (partnerUser.presence || 'Offline')
                    : canSeeLastSeen
                    ? formatLastSeen(partnerUser.lastActiveAt, false)
                    : 'Offline'
                }
              />
            </div>

            {/* Admin or Verified Badge */}
            {partnerUser.role === 'admin' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/80">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Admin
              </span>
            )}
            {(partnerUser.isVerified || partnerUser.isPremium) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 text-xs font-semibold border border-sky-200 dark:border-sky-800/80">
                <VerifiedBadge
                  isVerified={partnerUser.isVerified}
                  isPremium={partnerUser.isPremium}
                  premiumTier={partnerUser.premiumTier}
                  size="sm"
                />
                <span>{partnerUser.premiumTier === 'vip' ? 'VIP Verified' : 'Verified Member'}</span>
              </span>
            )}
          </div>

          {/* User Name & Handle */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{partnerUser.displayName}</span>
              <VerifiedBadge
                isVerified={partnerUser.isVerified}
                isPremium={partnerUser.isPremium}
                premiumTier={partnerUser.premiumTier}
                size="md"
              />
              {partnerUser.role === 'admin' && (
                <span title="Administrator">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 inline" />
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
              @{partnerUser.username}
            </p>
            {canSeeBio && partnerUser.bio && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                {partnerUser.bio}
              </p>
            )}
          </div>

          {/* Permanent NEXXO ID Card */}
          <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                Permanent NEXXO ID
              </span>
              <span className="font-mono text-sm font-bold text-indigo-950 dark:text-indigo-200">
                {partnerUser.nexxoId || 'NX-NEXXO-USER'}
              </span>
            </div>
            <button
              onClick={handleCopyId}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-indigo-900/80 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-200 text-xs font-medium border border-indigo-200 dark:border-indigo-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Action Grid (Calls, Search, Stars, Lock) */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {/* Voice Call */}
            <button
              onClick={() => {
                onClose();
                onStartVoiceCall && onStartVoiceCall();
              }}
              disabled={isBlockedByMe || !onStartVoiceCall || !canCall}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed group"
              title={!canCall ? 'Calls restricted by user privacy settings' : 'Voice Call'}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold">Voice</span>
            </button>

            {/* Video Call */}
            <button
              onClick={() => {
                onClose();
                onStartVideoCall && onStartVideoCall();
              }}
              disabled={isBlockedByMe || !onStartVideoCall || !canCall}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed group"
              title={!canCall ? 'Calls restricted by user privacy settings' : 'Video Call'}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold">Video</span>
            </button>

            {/* In-Chat Search */}
            <button
              onClick={() => {
                onClose();
                onOpenSearch && onOpenSearch();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 group"
              title="Search Messages"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold">Search</span>
            </button>

            {/* Starred Messages */}
            <button
              onClick={() => {
                onClose();
                onToggleStarred && onToggleStarred();
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer border group ${
                isStarredActive
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60'
              }`}
              title="Starred Messages"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Star className={`w-4 h-4 ${isStarredActive ? 'fill-amber-500' : ''}`} />
              </div>
              <span className="text-[11px] font-semibold">Starred</span>
            </button>
          </div>

          {/* Privacy & Security Section */}
          <div className="mb-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Privacy & Security
            </h4>

            {/* Private Chat Lock */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isChatLocked ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  {isChatLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Private Chat PIN Lock
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isChatLocked ? 'Protected with 4-digit PIN' : 'Unlocked (no PIN required)'}
                  </p>
                </div>
              </div>

              {onOpenChatLock && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenChatLock();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  {isChatLocked ? 'Configure' : 'Lock Chat'}
                </button>
              )}
            </div>

            {/* E2EE Security Badge */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">End-to-End P2P Protected</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Messages and calls between you and {partnerUser.displayName} are private and encrypted.
                </p>
              </div>
            </div>
          </div>

          {/* User Details Section */}
          <div className="mb-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Contact Details
            </h4>

            {partnerUser.email && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {partnerUser.email}
                  </span>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Joined NEXXO in {formattedDate}</span>
            </div>

            {canSeeLastSeen && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Last seen: {formatLastSeen(partnerUser.lastActiveAt, false)}</span>
              </div>
            )}
          </div>

          {/* Danger / Moderation Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Safety & Actions
            </h4>

            {/* Block / Unblock Button */}
            <button
              onClick={onToggleBlock}
              disabled={blockLoading}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border font-semibold text-xs transition-all cursor-pointer ${
                isBlockedByMe
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isBlockedByMe ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                <span>{isBlockedByMe ? `Unblock ${partnerUser.displayName}` : `Block ${partnerUser.displayName}`}</span>
              </div>
              <span className="text-[10px] font-normal opacity-75">
                {isBlockedByMe ? 'Tap to unblock' : 'Cannot message or call'}
              </span>
            </button>

            {/* Report User */}
            {onOpenReport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReport();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report User</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Spam, harassment or abuse</span>
              </button>
            )}

            {/* Clear Chat History */}
            {onClearHistory && (
              <div className="pt-1">
                {showConfirmClear ? (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      Clear all messages for me?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClearHistory();
                          setShowConfirmClear(false);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setShowConfirmClear(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="w-full flex items-center gap-2.5 p-3 rounded-2xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Messages for Me</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Zoom Lightbox Modal */}
      {isPhotoZoomed && partnerUser.photoURL && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <div className="relative max-w-md w-full max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setIsPhotoZoomed(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={partnerUser.photoURL}
              alt={partnerUser.displayName}
              className="max-h-[75vh] w-auto rounded-3xl object-contain shadow-2xl border border-white/20"
            />
            <p className="mt-4 text-sm font-semibold text-white">
              {partnerUser.displayName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
