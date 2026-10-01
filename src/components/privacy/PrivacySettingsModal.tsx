import React, { useState } from 'react';
import {
  X,
  Shield,
  Clock,
  Radio,
  Eye,
  CheckCheck,
  Edit3,
  Phone,
  Users,
  Search,
  UserX,
  Lock,
  Timer,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  NexxoUser,
  UserSettings,
  PrivacyAudience,
  OnlineAudience,
  AutoLockTimeout,
} from '../../types';
import { updateUserProfile } from '../../lib/userService';

interface PrivacySettingsModalProps {
  currentUser: NexxoUser;
  isOpen: boolean;
  onClose: () => void;
  onOpenBlockedModal?: () => void;
  onOpenAppLockModal?: () => void;
  blockedCount?: number;
  appPasscode?: string | null;
  onLockNow?: () => void;
  onSaved?: (newSettings: UserSettings) => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onOpenBlockedModal,
  onOpenAppLockModal,
  blockedCount = 0,
  appPasscode,
  onLockNow,
  onSaved,
}) => {
  const currentSettings: Partial<UserSettings> = currentUser.settings || {};

  // Form State
  const [showLastSeen, setShowLastSeen] = useState(currentSettings.showLastSeen ?? true);
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<PrivacyAudience>(
    currentSettings.lastSeenPrivacy || (currentSettings.showLastSeen === false ? 'nobody' : 'everyone')
  );

  const [showOnlineStatus, setShowOnlineStatus] = useState(currentSettings.showOnlineStatus ?? true);
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<OnlineAudience>(
    currentSettings.onlineStatusPrivacy || (currentSettings.showOnlineStatus === false ? 'nobody' : 'everyone')
  );

  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<PrivacyAudience>(
    currentSettings.profilePhotoPrivacy || 'everyone'
  );

  const [bioPrivacy, setBioPrivacy] = useState<PrivacyAudience>(
    currentSettings.bioPrivacy || 'everyone'
  );

  const [readReceipts, setReadReceipts] = useState(currentSettings.readReceipts ?? true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(currentSettings.showTypingIndicator ?? true);

  const [defaultEphemeralTimer, setDefaultEphemeralTimer] = useState<number>(
    currentSettings.defaultEphemeralTimer || 0
  );

  const [allowCallsFrom, setAllowCallsFrom] = useState<'everyone' | 'connections' | 'nobody'>(
    currentSettings.allowCallsFrom || 'everyone'
  );

  const [allowGroupInvites, setAllowGroupInvites] = useState<'everyone' | 'connections' | 'nobody'>(
    currentSettings.allowGroupInvites || 'everyone'
  );

  const [discoveryAllowed, setDiscoveryAllowed] = useState(currentSettings.discoveryAllowed ?? true);

  const [autoLockTimeout, setAutoLockTimeout] = useState<AutoLockTimeout>(
    currentSettings.autoLockTimeout || 'backgrounded'
  );

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);

      const updatedSettings: UserSettings = {
        ...currentSettings,
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
      };

      await updateUserProfile(currentUser.id, {
        settings: updatedSettings,
      });

      setStatusMessage({
        type: 'success',
        text: 'Privacy settings updated and enforced across all conversations.',
      });

      if (onSaved) {
        onSaved(updatedSettings);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save privacy settings:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update privacy settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Privacy & Security</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  NEXXO Shield
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control who sees your Last Seen, Online status, profile, and messages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* Notification Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Section 1: Last Seen & Online */}
          <div className="space-y-4 pt-1 first:pt-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Last Seen & Online Status
              </h3>
            </div>

            {/* Who can see Last Seen */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Who can see my Last Seen timestamp
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'connections', label: 'My Connections' },
                  { value: 'nobody', label: 'Nobody' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setLastSeenPrivacy(opt.value as PrivacyAudience);
                      setShowLastSeen(opt.value !== 'nobody');
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                      lastSeenPrivacy === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Who can see Online Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Who can see when I&apos;m Online
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'same_as_last_seen', label: 'Same as Last Seen' },
                  { value: 'nobody', label: 'Nobody' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setOnlineStatusPrivacy(opt.value as OnlineAudience);
                      setShowOnlineStatus(opt.value !== 'nobody');
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                      onlineStatusPrivacy === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Educational Helper Note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Privacy Principle:</strong> If you don&apos;t share your Last Seen or Online status, you won&apos;t be able to see other users&apos; Last Seen and Online status either.
              </span>
            </div>
          </div>

          {/* Section 2: Profile Photo & Bio Visibility */}
          <div className="space-y-4 pt-5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Profile Photo & About Info
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Profile Photo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Profile Photo Visibility
                </label>
                <select
                  value={profilePhotoPrivacy}
                  onChange={(e) => setProfilePhotoPrivacy(e.target.value as PrivacyAudience)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">My Connections only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* Bio / About */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  About & Bio Visibility
                </label>
                <select
                  value={bioPrivacy}
                  onChange={(e) => setBioPrivacy(e.target.value as PrivacyAudience)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">My Connections only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Read Receipts & Messaging */}
          <div className="space-y-4 pt-5">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Chat & Read Receipts
              </h3>
            </div>

            <div className="space-y-3">
              {/* Read Receipts Toggle */}
              <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                    <span>Read Receipts (Blue Ticks)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If turned off, you won&apos;t send or receive read receipts. Group chats always have read receipts.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-0.5 shrink-0"
                />
              </label>

              {/* Typing Indicator Toggle */}
              <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Typing Indicator</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Show &quot;typing...&quot; in active chat when you are actively composing a message.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showTypingIndicator}
                  onChange={(e) => setShowTypingIndicator(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-0.5 shrink-0"
                />
              </label>

              {/* Default Disappearing Messages */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Default Disappearing Messages</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                    {defaultEphemeralTimer === 0
                      ? 'Off'
                      : defaultEphemeralTimer === 86400
                      ? '24 Hours'
                      : defaultEphemeralTimer === 604800
                      ? '7 Days'
                      : '90 Days'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically start all new direct chats with disappearing messages set to this timer.
                </p>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { val: 0, label: 'Off' },
                    { val: 86400, label: '24 Hours' },
                    { val: 604800, label: '7 Days' },
                    { val: 7776000, label: '90 Days' },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setDefaultEphemeralTimer(t.val)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all border text-center cursor-pointer ${
                        defaultEphemeralTimer === t.val
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Calls & Group Invites */}
          <div className="space-y-4 pt-5">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Calls & Groups
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Who can call */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Who can call me</span>
                </label>
                <select
                  value={allowCallsFrom}
                  onChange={(e) => setAllowCallsFrom(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">My Connections only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* Who can add to groups */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Who can add me to groups</span>
                </label>
                <select
                  value={allowGroupInvites}
                  onChange={(e) => setAllowGroupInvites(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">My Connections only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Search & Discovery */}
          <div className="space-y-4 pt-5">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Discovery & Search
              </h3>
            </div>

            <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Allow Discovery in Global Search
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When turned on, other users can find your profile using your username or permanent NEXXO ID.
                </p>
              </div>
              <input
                type="checkbox"
                checked={discoveryAllowed}
                onChange={(e) => setDiscoveryAllowed(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-0.5 shrink-0"
              />
            </label>
          </div>

          {/* Section 6: Blocked Contacts & App Lock */}
          <div className="space-y-4 pt-5">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Blocked Contacts & App Lock
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Blocked Users Button */}
              {onOpenBlockedModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenBlockedModal();
                    onClose();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <UserX className="w-4 h-4 text-rose-500" />
                    <span>Blocked Contacts</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold">
                    {blockedCount}
                  </span>
                </button>
              )}

              {/* App Lock Button */}
              {onOpenAppLockModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAppLockModal();
                    onClose();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    <span>Passcode & PIN Lock</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      appPasscode
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {appPasscode ? 'Active' : 'Disabled'}
                  </span>
                </button>
              )}
            </div>

            {/* Auto Lock Timeout (if passcode is set) */}
            {appPasscode && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Auto-Lock Screen After</span>
                  </span>
                  {onLockNow && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLockNow();
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Lock Now
                    </button>
                  )}
                </div>
                <select
                  value={autoLockTimeout}
                  onChange={(e) => setAutoLockTimeout(e.target.value as AutoLockTimeout)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="backgrounded">Immediately when backgrounded</option>
                  <option value="1m">1 minute idle</option>
                  <option value="5m">5 minutes idle</option>
                  <option value="15m">15 minutes idle</option>
                  <option value="30m">30 minutes idle</option>
                  <option value="never">Never</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Privacy Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
