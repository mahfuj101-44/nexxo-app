import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { NexxoUser, ActiveTab, AppNotification, PlatformSettings, AppThemeMode, PresenceStatus } from '../types';
import { NexxoLogo } from './NexxoLogo';
import {
  LogOut,
  Shield,
  Copy,
  Check,
  Radio,
  User,
  Settings,
  Bell,
  BellOff,
  Zap,
  QrCode,
  Sparkles,
  HardDrive,
  Lock,
  Menu,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { WhatsAppHelpModal } from './common/WhatsAppHelpModal';
import { NotificationDropdown } from './notifications/NotificationDropdown';
import { ThemeToggleDropdown } from './theme/ThemeToggleDropdown';
import { QuickActionsMenu } from './navbar/QuickActionsMenu';
import { subscribeToDnd, getDndState, DndState } from '../lib/dndService';
import { VerifiedBadge } from './common/VerifiedBadge';
import { isUserAuthorizedAdmin } from '../lib/adminService';

interface NavbarProps {
  currentUser: NexxoUser;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingRequestsCount: number;
  notifications?: AppNotification[];
  themeMode: AppThemeMode;
  onSelectThemeMode: (mode: AppThemeMode) => void;
  toggleTheme: () => void;
  systemNotice?: string;
  onOpenQrModal?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenMediaLibrary?: () => void;
  platformSettings?: PlatformSettings | null;
  appPasscode?: string | null;
  onLockApp?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  pendingRequestsCount,
  notifications = [],
  themeMode,
  onSelectThemeMode,
  toggleTheme,
  systemNotice,
  onOpenQrModal,
  onOpenAiAssistant,
  onOpenMediaLibrary,
  platformSettings,
  appPasscode,
  onLockApp,
  onShowToast,
  onOpenMobileMenu,
}) => {
  const [copied, setCopied] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const announcement = platformSettings?.currentAnnouncement;
  const isAnnouncementActive = announcement?.active && !dismissedNotice;
  const [dndState, setDndState] = useState<DndState>(getDndState());
  const isAdmin = isUserAuthorizedAdmin(currentUser);

  // Listen to Do Not Disturb changes
  useEffect(() => {
    const unsub = subscribeToDnd((state) => {
      setDndState(state);
    });
    return () => unsub();
  }, []);

  const getPresenceColor = (presence?: PresenceStatus) => {
    switch (presence) {
      case 'online':
        return 'bg-emerald-500';
      case 'away':
        return 'bg-amber-500';
      case 'busy':
        return 'bg-rose-500';
      case 'dnd':
        return 'bg-purple-500';
      case 'offline':
      default:
        return 'bg-slate-400';
    }
  };

  const getPresenceLabel = (presence?: PresenceStatus) => {
    switch (presence) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'dnd':
        return 'Do Not Disturb';
      case 'offline':
        return 'Invisible';
      default:
        return 'Online';
    }
  };

  const flags = platformSettings?.featureFlags;
  const isAiAllowed = flags ? flags.aiAssistant !== false && platformSettings?.aiEnabled !== false : true;
  const isQrAllowed = flags ? flags.qrConnections !== false : true;
  const isNotificationsAllowed = flags ? flags.notifications !== false : true;

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const copyNexxoId = () => {
    navigator.clipboard.writeText(currentUser.nexxoId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white sticky top-0 z-40 transition-colors shadow-2xs">
      {isAnnouncementActive && announcement ? (
        <div
          className={`border-b px-4 py-1.5 flex items-center justify-between gap-3 text-xs font-medium ${
            announcement.level === 'emergency'
              ? 'bg-rose-950/90 border-rose-800/80 text-rose-200'
              : announcement.level === 'warning'
              ? 'bg-amber-950/90 border-amber-800/80 text-amber-200'
              : announcement.level === 'update'
              ? 'bg-emerald-950/90 border-emerald-800/80 text-emerald-200'
              : 'bg-indigo-950/90 border-indigo-800/80 text-indigo-200'
          }`}
        >
          <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
            <span className="font-bold tracking-wide uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
              {announcement.level}
            </span>
            <span className="font-semibold">{announcement.title}:</span>
            <span className="truncate">{announcement.message}</span>
            {announcement.actionUrl && (
              <a
                href={announcement.actionUrl}
                target="_blank"
                rel="noreferrer"
                className="underline font-bold hover:opacity-80 ml-2"
              >
                {announcement.actionLabel || 'Learn More'} &rarr;
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            className="text-white/60 hover:text-white px-1 font-bold cursor-pointer"
            title="Dismiss announcement"
          >
            &times;
          </button>
        </div>
      ) : systemNotice && !dismissedNotice ? (
        <div className="bg-indigo-50 dark:bg-indigo-950/80 border-b border-indigo-100 dark:border-indigo-800/80 px-4 py-1 flex items-center justify-between text-xs font-medium text-indigo-700 dark:text-indigo-300">
          <div className="flex-1 text-center truncate">{systemNotice}</div>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            className="text-indigo-500 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-white px-1 text-xs cursor-pointer"
            title="Dismiss notice"
          >
            &times;
          </button>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Platform Tag */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Sidebar Navigation Drawer Trigger */}
          {onOpenMobileMenu && (
            <button
              id="mobile-nav-hamburger-btn"
              type="button"
              onClick={onOpenMobileMenu}
              className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden cursor-pointer"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div onClick={() => setActiveTab('chats')} className="cursor-pointer">
            <NexxoLogo size="sm" />
          </div>

          {/* Interactive Presence & Status Pill */}
          <button
            id="nav-presence-pill"
            type="button"
            onClick={() => {
              setIsQuickActionsOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] transition-all cursor-pointer shadow-2xs ${
              dndState.isActive
                ? 'bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-700/80 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/80'
                : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Click for Quick Actions: Change presence or toggle Do Not Disturb"
          >
            <span className="relative flex h-2 w-2">
              {currentUser.presence === 'online' && !dndState.isActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  dndState.isActive ? 'bg-purple-500' : getPresenceColor(currentUser.presence)
                }`}
              />
            </span>
            <span className="font-medium">
              {dndState.isActive ? 'Do Not Disturb' : getPresenceLabel(currentUser.presence)}
            </span>
          </button>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* AI Assistant Button */}
          {isAiAllowed && (
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
              title="NEXXO AI Assistant (Gemini 2.5)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
          )}

          {/* Media Library Vault Button */}
          {onOpenMediaLibrary && (
            <button
              onClick={onOpenMediaLibrary}
              className="hidden sm:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Media Library Vault"
            >
              <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {/* QR Code Action Button */}
          {isQrAllowed && (
            <button
              onClick={onOpenQrModal}
              className="hidden sm:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="My QR Code & Scan Connect"
            >
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {/* In-App Notifications Bell */}
          {isNotificationsAllowed && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen((prev) => !prev);
                  setIsQuickActionsOpen(false);
                }}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </button>

              <NotificationDropdown
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                userId={currentUser.id}
                onSelectNotification={(notif) => {
                  setIsNotifOpen(false);
                  if (notif.type === 'call') {
                    // call related
                  } else if (notif.type === 'story') {
                    setActiveTab('stories');
                  } else if (notif.type === 'group_message') {
                    setActiveTab('groups');
                  } else {
                    setActiveTab('chats');
                  }
                }}
              />
            </div>
          )}

          {/* QUICK ACTIONS MENU TRIGGER (DND & Presence) */}
          <div className="relative">
            <button
              id="nav-quick-actions-btn"
              type="button"
              onClick={() => {
                setIsQuickActionsOpen((prev) => !prev);
                setIsNotifOpen(false);
              }}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isQuickActionsOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                  : dndState.isActive
                  ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/80 hover:bg-purple-100 dark:hover:bg-purple-900/80 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={`Quick Actions: ${
                dndState.isActive ? 'Do Not Disturb Active' : getPresenceLabel(currentUser.presence)
              }`}
              aria-label="Quick Actions"
            >
              <div className="relative flex items-center justify-center">
                {dndState.isActive ? (
                  <BellOff className="w-4 h-4 text-purple-600 dark:text-purple-300 animate-pulse" />
                ) : (
                  <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
                {/* Live presence indicator dot */}
                <span
                  className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    dndState.isActive ? 'bg-purple-500' : getPresenceColor(currentUser.presence)
                  }`}
                />
              </div>
              {dndState.isActive && (
                <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  DND
                </span>
              )}
            </button>

            {/* Quick Actions Dropdown Menu */}
            <QuickActionsMenu
              currentUser={currentUser}
              isOpen={isQuickActionsOpen}
              onClose={() => setIsQuickActionsOpen(false)}
              onLockApp={onLockApp}
              onOpenVault={onOpenMediaLibrary}
              onOpenAi={onOpenAiAssistant}
              onShowToast={onShowToast}
            />
          </div>

          {/* Direct Admin Panel Access Button for Authorized Admins */}
          {isAdmin && (
            <button
              id="nav-admin-console-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 font-bold'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
              title="Open Admin Console"
            >
              <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="hidden lg:inline text-xs font-bold text-amber-700 dark:text-amber-300">Admin</span>
            </button>
          )}

          {/* Quick Lock Button (when App Lock PIN is enabled) */}
          {appPasscode && onLockApp && (
            <button
              id="nav-quick-lock-btn"
              onClick={onLockApp}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Lock NEXXO Messenger"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Customer Support WhatsApp & Payment Help */}
          <button
            id="nav-help-support-btn"
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Customer Support & Payment Help (WhatsApp +91 7352622862 / UPI)"
            aria-label="Help & Support"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">Help</span>
          </button>

          {/* Expanded Theme & Display Mode Dropdown */}
          <ThemeToggleDropdown
            themeMode={themeMode}
            onSelectThemeMode={onSelectThemeMode}
            onCycleTheme={toggleTheme}
          />

          {/* Permanent NEXXO ID copy chip */}
          <button
            id="nav-copy-nexxo-id-btn"
            onClick={copyNexxoId}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
            title="Click to copy your Permanent NEXXO ID"
          >
            <span>{currentUser.nexxoId}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            )}
          </button>

          {/* User profile avatar & trigger */}
          <button
            id="nav-profile-btn"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white text-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || currentUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                (currentUser.displayName || currentUser.username || 'U').charAt(0).toUpperCase()
              )}
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  dndState.isActive ? 'bg-purple-500' : getPresenceColor(currentUser.presence)
                }`}
              />
            </div>
            <span className="hidden lg:inline text-xs font-semibold max-w-[120px] truncate text-slate-800 dark:text-slate-200">
              {currentUser.displayName}
            </span>
            <VerifiedBadge
              isVerified={currentUser.isVerified}
              isPremium={currentUser.isPremium}
              premiumTier={currentUser.premiumTier}
              size="xs"
              className="hidden lg:inline-flex"
            />
          </button>

          {/* Sign Out Action */}
          <button
            id="nav-signout-btn"
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Support / Payment WhatsApp Help Modal */}
      {isHelpOpen && (
        <WhatsAppHelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          username={currentUser.username}
          context="payment"
        />
      )}
    </header>
  );
};
