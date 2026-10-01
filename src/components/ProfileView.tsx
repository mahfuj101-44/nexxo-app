import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { updateUserProfile, changeUsername, isValidUsername } from '../lib/userService';
import { subscribeToBlockedUserDetails, unblockUser } from '../lib/safetyService';
import { NexxoUser, AutoLockTimeout, AppThemeMode, VerificationRequest, PrivacyAudience, OnlineAudience } from '../types';
import { ProfilePhotoModal } from './profile/ProfilePhotoModal';
import { AppLockModal } from './profile/AppLockModal';
import { ThemeSettingsCard } from './profile/ThemeSettingsCard';
import { ApplyBlueTickModal } from './profile/ApplyBlueTickModal';
import { PrivacySettingsModal } from './privacy/PrivacySettingsModal';
import {
  subscribeToUserLatestVerificationRequest,
  NEXXO_SUPPORT_WHATSAPP_NUMBER,
  getWhatsAppSupportUrl,
} from '../lib/verificationService';
import { VerifiedBadge } from './common/VerifiedBadge';
import { WhatsAppHelpModal } from './common/WhatsAppHelpModal';
import { DownloadApkModal } from './common/DownloadApkModal';
import {
  User,
  Shield,
  ShieldCheck,
  Copy,
  Check,
  Edit2,
  Lock,
  Globe,
  Radio,
  Clock,
  Timer,
  LogOut,
  AlertCircle,
  Sparkles,
  Key,
  KeyRound,
  Camera,
  QrCode,
  Share2,
  Calendar,
  Users,
  Eye,
  CheckCheck,
  Ban,
  UserCheck,
  BadgeCheck,
  Crown,
  X,
  MessageCircle,
  Phone,
  Smartphone,
  Download,
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: NexxoUser;
  connectionsCount?: number;
  onOpenQrModal?: () => void;
  appPasscode?: string | null;
  onPasscodeChange?: (newPasscode: string | null) => void;
  autoLockTimeout?: AutoLockTimeout;
  onAutoLockTimeoutChange?: (timeout: AutoLockTimeout) => void;
  onLockNow?: () => void;
  themeMode?: AppThemeMode;
  onThemeModeChange?: (newMode: AppThemeMode) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  connectionsCount = 0,
  onOpenQrModal,
  appPasscode,
  onPasscodeChange,
  autoLockTimeout: initialAutoLockTimeout,
  onAutoLockTimeoutChange,
  onLockNow,
  themeMode,
  onThemeModeChange,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [localThemeMode, setLocalThemeMode] = useState<AppThemeMode>(
    themeMode || currentUser.settings?.themeMode || 'dark'
  );
  const [discoveryAllowed, setDiscoveryAllowed] = useState(currentUser.settings?.discoveryAllowed ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(currentUser.settings?.showOnlineStatus ?? true);
  const [showLastSeen, setShowLastSeen] = useState(currentUser.settings?.showLastSeen ?? true);
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<PrivacyAudience>(
    currentUser.settings?.lastSeenPrivacy || (currentUser.settings?.showLastSeen === false ? 'nobody' : 'everyone')
  );
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<OnlineAudience>(
    currentUser.settings?.onlineStatusPrivacy || (currentUser.settings?.showOnlineStatus === false ? 'nobody' : 'everyone')
  );
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<PrivacyAudience>(
    currentUser.settings?.profilePhotoPrivacy || 'everyone'
  );
  const [bioPrivacy, setBioPrivacy] = useState<PrivacyAudience>(
    currentUser.settings?.bioPrivacy || 'everyone'
  );
  const [readReceipts, setReadReceipts] = useState(currentUser.settings?.readReceipts ?? true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(currentUser.settings?.showTypingIndicator ?? true);
  const [defaultEphemeralTimer, setDefaultEphemeralTimer] = useState<number>(
    currentUser.settings?.defaultEphemeralTimer || 0
  );
  const [allowCallsFrom, setAllowCallsFrom] = useState<'everyone' | 'connections' | 'nobody'>(
    currentUser.settings?.allowCallsFrom || 'everyone'
  );
  const [allowGroupInvites, setAllowGroupInvites] = useState<'everyone' | 'connections' | 'nobody'>(
    currentUser.settings?.allowGroupInvites || 'everyone'
  );
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<AutoLockTimeout>(
    initialAutoLockTimeout || currentUser.settings?.autoLockTimeout || 'backgrounded'
  );
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isWhatsAppHelpOpen, setIsWhatsAppHelpOpen] = useState(false);
  const [latestVerificationReq, setLatestVerificationReq] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    const unsub = subscribeToUserLatestVerificationRequest(currentUser.id, (req) => {
      setLatestVerificationReq(req);
    });
    return () => unsub();
  }, [currentUser.id]);

  useEffect(() => {
    if (themeMode) {
      setLocalThemeMode(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (initialAutoLockTimeout) {
      setAutoLockTimeout(initialAutoLockTimeout);
    }
  }, [initialAutoLockTimeout]);

  const handleTimeoutSelect = (newTimeout: AutoLockTimeout) => {
    setAutoLockTimeout(newTimeout);
    if (onAutoLockTimeoutChange) {
      onAutoLockTimeoutChange(newTimeout);
    }
  };

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [isAppLockModalOpen, setIsAppLockModalOpen] = useState(false);
  const [showDownloadApkModal, setShowDownloadApkModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<NexxoUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingUsername, setChangingUsername] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [sharedProfile, setSharedProfile] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToBlockedUserDetails(currentUser.id, (users) => {
      setBlockedUsers(users);
    });
    return () => unsub();
  }, [currentUser.id]);

  const handleUnblockUser = async (targetUserId: string) => {
    try {
      setUnblockingId(targetUserId);
      await unblockUser(currentUser.id, targetUserId);
      setNotification({
        type: 'success',
        text: 'User unblocked successfully.',
      });
    } catch (e) {
      console.error('Unblock error:', e);
      setNotification({
        type: 'error',
        text: 'Failed to unblock user. Please try again.',
      });
    } finally {
      setUnblockingId(null);
    }
  };

  const copyNexxoId = () => {
    navigator.clipboard.writeText(currentUser.nexxoId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyUsername = () => {
    navigator.clipboard.writeText(`@${currentUser.username}`);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  const handleShareProfile = () => {
    const text = `Connect with me on NEXXO! @${currentUser.username} (ID: ${currentUser.nexxoId})`;
    if (navigator.share) {
      navigator.share({
        title: `${currentUser.displayName} on NEXXO`,
        text,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setSharedProfile(true);
      setTimeout(() => setSharedProfile(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setNotification(null);
      await updateUserProfile(currentUser.id, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        settings: {
          ...currentUser.settings,
          discoveryAllowed,
          showOnlineStatus: onlineStatusPrivacy !== 'nobody' && showOnlineStatus,
          showLastSeen: lastSeenPrivacy !== 'nobody' && showLastSeen,
          lastSeenPrivacy,
          onlineStatusPrivacy,
          profilePhotoPrivacy,
          bioPrivacy,
          readReceipts,
          showTypingIndicator,
          defaultEphemeralTimer,
          allowCallsFrom,
          allowGroupInvites,
          autoLockTimeout,
          themeMode: localThemeMode,
        },
      });
      setNotification({
        type: 'success',
        text: 'Profile and privacy settings saved successfully.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim();
    const validation = isValidUsername(clean);
    if (!validation.valid) {
      setNotification({ type: 'error', text: validation.reason! });
      return;
    }

    if (clean.toLowerCase() === currentUser.usernameLower) {
      setNotification({ type: 'error', text: 'New username is the same as your current username.' });
      return;
    }

    try {
      setChangingUsername(true);
      setNotification(null);
      await changeUsername(currentUser.id, clean, currentUser.usernameLower);
      setNotification({
        type: 'success',
        text: `Username successfully updated to @${clean}.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to change username. It may already be taken.',
      });
    } finally {
      setChangingUsername(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  // Formatted Member Since Date
  const memberSince = currentUser.createdAt?.toDate
    ? currentUser.createdAt.toDate().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : 'Recently';

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-8 overflow-y-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Account & NEXXO Identity
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your permanent ID, profile photo, verified handle, and privacy settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              title="Show Personal QR Code"
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>My QR</span>
            </button>
          )}

          <button
            onClick={handleShareProfile}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Share Profile"
          >
            {sharedProfile ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4 text-indigo-500" />
            )}
            <span>{sharedProfile ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Hero Permanent NEXXO ID Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-xl shadow-indigo-950/20 text-white">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {/* Clickable Profile Photo with Edit Indicator */}
            <div className="relative group/dp cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
              <div className="relative w-20 h-20 rounded-2xl bg-indigo-950 border-2 border-indigo-400/50 overflow-hidden flex items-center justify-center shrink-0 shadow-lg group-hover/dp:border-indigo-300 transition-colors">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-10 h-10 text-indigo-200" />
                )}
                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/dp:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-indigo-950" title="Online" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
                  <span>{currentUser.displayName}</span>
                  <VerifiedBadge
                    isVerified={currentUser.isVerified}
                    isPremium={currentUser.isPremium}
                    premiumTier={currentUser.premiumTier}
                    size="md"
                  />
                </h3>
                {currentUser.role === 'admin' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}
                {currentUser.isVerified && (
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3 text-sky-400" />
                    Verified {currentUser.premiumTier === 'vip' ? 'VIP' : currentUser.premiumTier === 'pro' ? 'Pro' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-indigo-200 font-mono">@{currentUser.username}</p>
                <button
                  onClick={copyUsername}
                  className="p-1 hover:bg-indigo-800/60 rounded text-indigo-300 hover:text-white transition-colors"
                  title="Copy username"
                >
                  {copiedUsername ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <p className="text-xs text-indigo-300/80 mt-0.5">{currentUser.email}</p>

              <div className="flex items-center gap-4 mt-2 text-[11px] text-indigo-300/70">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Joined {memberSince}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {connectionsCount} Connections
                </span>
              </div>
            </div>
          </div>

          {/* Permanent ID Box */}
          <div className="p-4 rounded-2xl bg-black/40 border border-indigo-400/30 flex flex-col items-start sm:items-end">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">
              <Key className="w-3 h-3" />
              <span>Permanent NEXXO ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-mono font-black tracking-wider text-white">
                {currentUser.nexxoId}
              </span>
              <button
                id="copy-profile-nexxo-id-btn"
                onClick={copyNexxoId}
                className="p-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 hover:text-white transition-colors cursor-pointer"
                title="Copy Permanent NEXXO ID"
              >
                {copiedId ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <span className="text-[10px] text-indigo-300/70 mt-1">
              Immutable &bull; Globally Unique
            </span>
          </div>
        </div>
      </div>

      {/* Appearance & Workspace Color Mode Settings */}
      <ThemeSettingsCard
        currentThemeMode={localThemeMode}
        onThemeModeChange={(mode) => {
          setLocalThemeMode(mode);
          if (onThemeModeChange) {
            onThemeModeChange(mode);
          }
        }}
      />

      {/* Verified Premium Membership Card */}
      <div className="p-6 rounded-2xl bg-linear-to-br from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>Verified Premium Membership</span>
                    <VerifiedBadge
                      isVerified={currentUser.isVerified}
                      isPremium={currentUser.isPremium}
                      premiumTier={currentUser.premiumTier}
                      size="sm"
                    />
                  </h3>
                  {currentUser.isVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {currentUser.isVerified
                    ? `You are a verified ${currentUser.premiumTier ? currentUser.premiumTier.toUpperCase() : ''} member with an official Blue Tick badge on your profile.`
                    : 'Get the official Blue Tick badge, create group polls, priority messaging, and unlock VIP identity.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Blue Tick Badge</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Group Polls</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Disappearing Chat</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  {currentUser.premiumTier === 'vip'
                    ? '5 GB Vault'
                    : currentUser.isVerified
                    ? '1 GB Vault'
                    : '1 GB / 5 GB Vault'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            {currentUser.isVerified ? (
              <div className="px-4 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-sky-400" />
                <span>
                  {currentUser.premiumTier === 'vip' ? 'VIP Verified Member' : 'Blue Tick Verified Member'}
                </span>
              </div>
            ) : latestVerificationReq?.status === 'pending' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    <span>Application Under Review</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Plan: <span className="font-semibold text-white">{latestVerificationReq.planName}</span> | UTR: <span className="font-mono text-amber-300">{latestVerificationReq.paymentTransactionId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Your payment reference is being audited by admin.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppHelpOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title={`Customer Support WhatsApp: ${NEXXO_SUPPORT_WHATSAPP_NUMBER}`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Help</span>
                </button>
              </div>
            ) : latestVerificationReq?.status === 'rejected' ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                  <strong>Rejected:</strong> {latestVerificationReq.rejectionReason || 'Invalid payment or ID'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Re-Apply for Blue Tick
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppHelpOpen(true)}
                    className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition-colors cursor-pointer"
                    title={`Customer Support WhatsApp: ${NEXXO_SUPPORT_WHATSAPP_NUMBER}`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span>Apply for Blue Tick (Official)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppHelpOpen(true)}
                  className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-colors cursor-pointer shrink-0"
                  title={`Customer Support WhatsApp: ${NEXXO_SUPPORT_WHATSAPP_NUMBER}`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form: Edit Profile & Username */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Profile Details</span>
            </h3>

            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Photo</span>
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <input
                id="profile-display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                About / Bio
              </label>
              <textarea
                id="profile-bio-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Share a short bio or status..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
              />
            </div>

            {/* Privacy & Communication */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Privacy & Visibility Controls
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage who can see your activity, photo, and profile details.
                  </p>
                </div>
                <button
                  type="button"
                  id="open-privacy-modal-btn"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Open full Privacy & Security Settings modal"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Privacy Center</span>
                </button>
              </div>

              {/* Who can see Last Seen */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Who can see my Last Seen</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {lastSeenPrivacy === 'everyone' ? 'Everyone' : lastSeenPrivacy === 'connections' ? 'Connections' : 'Nobody'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['everyone', 'connections', 'nobody'] as PrivacyAudience[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setLastSeenPrivacy(val);
                        setShowLastSeen(val !== 'nobody');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                        lastSeenPrivacy === val
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {val === 'everyone' ? 'Everyone' : val === 'connections' ? 'Connections' : 'Nobody'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {lastSeenPrivacy === 'nobody'
                    ? "You won't share your last active time, and you won't be able to see other users' last seen."
                    : 'Choose who can view when you were last online.'}
                </p>
              </div>

              {/* Who can see Online Status */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Who can see when I'm Online</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {onlineStatusPrivacy === 'everyone' ? 'Everyone' : onlineStatusPrivacy === 'same_as_last_seen' ? 'Same as Last Seen' : 'Nobody'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['everyone', 'same_as_last_seen', 'nobody'] as OnlineAudience[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setOnlineStatusPrivacy(val);
                        setShowOnlineStatus(val !== 'nobody');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                        onlineStatusPrivacy === val
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {val === 'everyone' ? 'Everyone' : val === 'same_as_last_seen' ? 'Match Last Seen' : 'Nobody'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Photo Visibility */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Profile Photo Visibility</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {profilePhotoPrivacy === 'everyone' ? 'Everyone' : profilePhotoPrivacy === 'connections' ? 'Connections' : 'Nobody'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['everyone', 'connections', 'nobody'] as PrivacyAudience[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProfilePhotoPrivacy(val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                        profilePhotoPrivacy === val
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {val === 'everyone' ? 'Everyone' : val === 'connections' ? 'Connections' : 'Nobody'}
                    </button>
                  ))}
                </div>
              </div>

              {/* About / Bio Visibility */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-500" />
                    <span>About / Bio Visibility</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {bioPrivacy === 'everyone' ? 'Everyone' : bioPrivacy === 'connections' ? 'Connections' : 'Nobody'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['everyone', 'connections', 'nobody'] as PrivacyAudience[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBioPrivacy(val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                        bioPrivacy === val
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {val === 'everyone' ? 'Everyone' : val === 'connections' ? 'Connections' : 'Nobody'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Read Receipts and Typing Toggles */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Read Receipts (Blue Ticks)</span>
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Show when messages are read. If turned off, you won't see receipts from others.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Typing Indicator</span>
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Broadcast real-time typing animation while composing messages.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTypingIndicator}
                    onChange={(e) => setShowTypingIndicator(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Allow Global Discovery in Search</span>
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Allow other members to discover you by username or display name.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={discoveryAllowed}
                    onChange={(e) => setDiscoveryAllowed(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Default Disappearing Messages */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Default Disappearing Messages</span>
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Auto-expire messages in new individual chats.
                  </p>
                </div>
                <select
                  value={defaultEphemeralTimer}
                  onChange={(e) => setDefaultEphemeralTimer(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shrink-0"
                >
                  <option value={0}>Off</option>
                  <option value={86400}>24 Hours</option>
                  <option value={604800}>7 Days</option>
                  <option value={7776000}>90 Days</option>
                </select>
              </div>

              {/* App Lock & Passcode Row */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="open-app-lock-modal-btn"
                  onClick={() => setIsAppLockModalOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Lock className="w-4 h-4" />
                    <span>App Lock & Passcode</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    appPasscode
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {appPasscode ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>

              {/* Auto-Lock Timeout Configuration */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Auto-Lock Timeout
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {appPasscode
                            ? autoLockTimeout === 'backgrounded'
                              ? 'Backgrounded'
                              : autoLockTimeout === '1m'
                              ? '1 min'
                              : autoLockTimeout === '5m'
                              ? '5 min'
                              : autoLockTimeout === '15m'
                              ? '15 min'
                              : autoLockTimeout === '30m'
                              ? '30 min'
                              : 'Never'
                            : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {appPasscode
                          ? 'Trigger the PIN lock screen automatically when idle or app is backgrounded'
                          : 'Set up an App Lock PIN above to activate auto-lock protection.'}
                      </p>
                    </div>
                  </div>

                  {appPasscode && onLockNow && (
                    <button
                      type="button"
                      id="profile-lock-now-btn"
                      onClick={onLockNow}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                      title="Lock Screen Immediately"
                    >
                      <Lock className="w-3 h-3 text-indigo-500" />
                      <span>Lock Now</span>
                    </button>
                  )}
                </div>

                {appPasscode ? (
                  <div className="pt-1">
                    <label htmlFor="profile-auto-lock-select" className="sr-only">
                      Select Auto-Lock Timeout
                    </label>
                    <select
                      id="profile-auto-lock-select"
                      value={autoLockTimeout}
                      onChange={(e) => handleTimeoutSelect(e.target.value as AutoLockTimeout)}
                      className="w-full text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                    >
                      <option value="backgrounded">Immediately when backgrounded / tab switched</option>
                      <option value="1m">After 1 minute of inactivity</option>
                      <option value="5m">After 5 minutes of inactivity (Recommended)</option>
                      <option value="15m">After 15 minutes of inactivity</option>
                      <option value="30m">After 30 minutes of inactivity</option>
                      <option value="never">Never (Manual lock only)</option>
                    </select>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="profile-enable-app-lock-prompt-btn"
                    onClick={() => setIsAppLockModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/80 transition-colors cursor-pointer text-center"
                  >
                    Enable 4-Digit Passcode to Configure Auto-Lock
                  </button>
                )}
              </div>

              {/* Blocked Accounts Management Row */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="open-blocked-accounts-modal-btn"
                  onClick={() => setIsBlockedModalOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <Ban className="w-4 h-4" />
                    <span>Blocked Accounts</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                    {blockedUsers.length} blocked
                  </span>
                </button>
              </div>
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Unique Username Management */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Unique Username</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Your @username is unique across the entire NEXXO network. Changing it updates the global registry atomically.
            </p>

            <form onSubmit={handleChangeUsername} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Change Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">
                    @
                  </span>
                  <input
                    id="new-username-input"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                    minLength={3}
                    maxLength={20}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  3-20 characters, lowercase letters, numbers, underscores only.
                </span>
              </div>

              <button
                id="update-username-btn"
                type="submit"
                disabled={changingUsername || newUsername.toLowerCase() === currentUser.usernameLower}
                className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-all disabled:opacity-50 cursor-pointer"
              >
                {changingUsername ? 'Checking availability...' : 'Update Username'}
              </button>
            </form>
          </div>

          {/* Android App Download Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">NEXXO for Android</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Download native mobile APK</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDownloadApkModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get APK</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of NEXXO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Photo Editor Modal */}
      {isPhotoModalOpen && (
        <ProfilePhotoModal
          userId={currentUser.id}
          currentPhotoUrl={currentUser.photoURL}
          onClose={() => setIsPhotoModalOpen(false)}
          onPhotoUpdated={(newUrl) => {
            setNotification({
              type: 'success',
              text: 'Profile photo updated successfully across NEXXO.',
            });
          }}
        />
      )}

      {/* Blocked Accounts Management Modal */}
      {isBlockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Blocked Accounts ({blockedUsers.length})
                </h3>
              </div>
              <button
                onClick={() => setIsBlockedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Ban className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    No blocked accounts found.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    When you block someone on NEXXO, they will appear here and can be unblocked anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((bUser) => (
                    <div
                      key={bUser.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm">
                          {bUser.photoURL ? (
                            <img
                              src={bUser.photoURL}
                              alt={bUser.displayName || bUser.username}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (bUser.displayName || bUser.username || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {bUser.displayName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            @{bUser.username} · {bUser.nexxoId}
                          </p>
                        </div>
                      </div>

                      <button
                        id={`unblock-modal-btn-${bUser.id}`}
                        onClick={() => handleUnblockUser(bUser.id)}
                        disabled={unblockingId === bUser.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{unblockingId === bUser.id ? 'Unblocking...' : 'Unblock'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
              <button
                onClick={() => setIsBlockedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Blue Tick Verification Modal */}
      <ApplyBlueTickModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        currentUser={currentUser}
        onSuccess={() => {
          setNotification({
            type: 'success',
            text: 'Your Blue Tick verification application has been submitted and is under review.',
          });
        }}
      />

      {/* App Lock & Passcode Modal */}
      <AppLockModal
        isOpen={isAppLockModalOpen}
        onClose={() => setIsAppLockModalOpen(false)}
        currentPasscode={appPasscode || null}
        autoLockTimeout={autoLockTimeout}
        onAutoLockTimeoutChange={handleTimeoutSelect}
        onPasscodeSet={(newCode) => {
          if (onPasscodeChange) {
            onPasscodeChange(newCode);
          }
          setNotification({
            type: 'success',
            text: newCode
              ? 'App lock enabled. Your messenger is secured with a 4-digit PIN.'
              : 'App lock disabled.',
          });
        }}
      />

      {/* Official WhatsApp Customer Support Modal */}
      <WhatsAppHelpModal
        isOpen={isWhatsAppHelpOpen}
        onClose={() => setIsWhatsAppHelpOpen(false)}
        username={currentUser.username}
        context={latestVerificationReq?.status === 'pending' ? 'verification' : 'general'}
        transactionId={latestVerificationReq?.paymentTransactionId}
        plan={latestVerificationReq?.planName}
      />

      {/* Comprehensive Privacy Settings Center Modal */}
      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        currentUser={currentUser}
        onSaved={(updatedSettings) => {
          if (updatedSettings.lastSeenPrivacy) setLastSeenPrivacy(updatedSettings.lastSeenPrivacy);
          if (updatedSettings.onlineStatusPrivacy) setOnlineStatusPrivacy(updatedSettings.onlineStatusPrivacy);
          if (updatedSettings.profilePhotoPrivacy) setProfilePhotoPrivacy(updatedSettings.profilePhotoPrivacy);
          if (updatedSettings.bioPrivacy) setBioPrivacy(updatedSettings.bioPrivacy);
          if (updatedSettings.readReceipts !== undefined) setReadReceipts(updatedSettings.readReceipts);
          if (updatedSettings.showTypingIndicator !== undefined) setShowTypingIndicator(updatedSettings.showTypingIndicator);
          if (updatedSettings.defaultEphemeralTimer !== undefined) setDefaultEphemeralTimer(updatedSettings.defaultEphemeralTimer);
          if (updatedSettings.allowCallsFrom) setAllowCallsFrom(updatedSettings.allowCallsFrom);
          if (updatedSettings.allowGroupInvites) setAllowGroupInvites(updatedSettings.allowGroupInvites);
          setNotification({
            type: 'success',
            text: 'Privacy and visibility settings updated successfully.',
          });
        }}
      />

      {/* Download Android APK Modal */}
      {showDownloadApkModal && (
        <DownloadApkModal
          isOpen={showDownloadApkModal}
          onClose={() => setShowDownloadApkModal(false)}
        />
      )}
    </div>
  );
};
