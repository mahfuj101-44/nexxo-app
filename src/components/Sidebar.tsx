import React, { useState } from 'react';
import { ActiveTab, NexxoUser, PlatformSettings } from '../types';
import { isUserAuthorizedAdmin } from '../lib/adminService';
import { NEXXO_SUPPORT_WHATSAPP_NUMBER } from '../lib/verificationService';
import { WhatsAppHelpModal } from './common/WhatsAppHelpModal';
import {
  MessageSquare,
  Users2,
  Sparkles,
  Radio,
  Globe2,
  Search,
  Users,
  UserPlus,
  UserCheck,
  ShieldCheck,
  MoreHorizontal,
  X,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  PhoneCall,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: NexxoUser;
  pendingRequestsCount: number;
  connectionsCount: number;
  chatsCount: number;
  unreadChatsCount?: number;
  missedCallsCount?: number;
  platformSettings?: PlatformSettings | null;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  isChatActiveOnMobile?: boolean;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  pendingRequestsCount,
  connectionsCount,
  chatsCount,
  unreadChatsCount = 0,
  missedCallsCount = 0,
  platformSettings,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
  isChatActiveOnMobile = false,
}) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const isAdmin = isUserAuthorizedAdmin(currentUser);

  const rawNavItems: NavItem[] = [
    {
      id: 'chats' as ActiveTab,
      label: '1:1 Chats',
      icon: MessageSquare,
      badge: unreadChatsCount > 0 ? unreadChatsCount : chatsCount > 0 ? chatsCount : undefined,
      badgeColor: unreadChatsCount > 0 ? 'bg-indigo-600 text-white font-bold animate-pulse' : undefined,
    },
    {
      id: 'calls' as ActiveTab,
      label: 'Calls',
      icon: PhoneCall,
      badge: missedCallsCount && missedCallsCount > 0 ? missedCallsCount : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'groups' as ActiveTab,
      label: 'Groups',
      icon: Users2,
    },
    {
      id: 'stories' as ActiveTab,
      label: 'Status & Stories',
      icon: Sparkles,
    },
    {
      id: 'channels' as ActiveTab,
      label: 'Channels',
      icon: Radio,
    },
    {
      id: 'communities' as ActiveTab,
      label: 'Communities',
      icon: Globe2,
    },
    {
      id: 'search' as ActiveTab,
      label: 'Discover',
      icon: Search,
    },
    {
      id: 'connections' as ActiveTab,
      label: 'Connections',
      icon: Users,
      badge: connectionsCount > 0 ? connectionsCount : undefined,
    },
    {
      id: 'requests' as ActiveTab,
      label: 'Requests',
      icon: UserPlus,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'profile' as ActiveTab,
      label: 'My NEXXO ID',
      icon: UserCheck,
    },
  ];

  if (isAdmin) {
    rawNavItems.push({
      id: 'admin' as ActiveTab,
      label: 'Admin Panel',
      icon: ShieldCheck,
      badgeColor: 'bg-amber-600 text-white',
    });
  }

  const flags = platformSettings?.featureFlags;
  const navItems = rawNavItems.filter((item) => {
    if (flags) {
      if (item.id === 'chats' && flags.privateMessaging === false) return false;
      if (item.id === 'calls' && flags.videoCalls === false) return false;
      if (item.id === 'groups' && flags.groups === false) return false;
      if (item.id === 'stories' && flags.stories === false) return false;
      if (item.id === 'channels' && flags.channels === false) return false;
      if (item.id === 'communities' && flags.communities === false) return false;
    }
    return true;
  });

  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Split items for mobile: First 4 primary tabs + 1 'More' button that opens full navigation sheet
  const primaryMobileTabs = navItems.slice(0, 4);
  const remainingMobileTabs = navItems.slice(4);

  const isDrawerVisible = isMobileDrawerOpen || isMobileMoreOpen;

  const handleCloseDrawer = () => {
    setIsMobileMoreOpen(false);
    onCloseMobileDrawer?.();
  };

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shrink-0 transition-colors">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-2">
          Navigation
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* WhatsApp Customer Support CTA */}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Help & Support</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
              WhatsApp
            </span>
          </button>
        </div>

        {/* User Identity Mini Card */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Permanent NEXXO ID
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 tracking-wide select-all">
              {currentUser.nexxoId}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              @{currentUser.username}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar with All Features Support (hidden when typing inside active 1:1 chat on mobile) */}
      {!isChatActiveOnMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0.375rem))] flex items-center justify-around overflow-x-auto no-scrollbar shadow-lg">
          {primaryMobileTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  handleCloseDrawer();
                }}
                className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-colors cursor-pointer flex-1 min-w-[56px] ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] leading-none whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-0 right-3 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Mobile 'All Features / More' button */}
          <button
            type="button"
            id="mobile-tab-more"
            onClick={() => setIsMobileMoreOpen((prev) => !prev)}
            className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-colors cursor-pointer flex-1 min-w-[56px] ${
              isDrawerVisible || remainingMobileTabs.some((t) => t.id === activeTab)
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[10px] leading-none">More</span>
            {remainingMobileTabs.some((t) => t.badge !== undefined) && (
              <span className="absolute top-0 right-3 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
            )}
          </button>
        </nav>
      )}

      {/* Mobile Features Bottom Sheet / Navigation Drawer */}
      {isDrawerVisible && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in"
          onClick={handleCloseDrawer}
        >
          <div
            className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 max-h-[85vh] flex flex-col shadow-2xl pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">NEXXO Navigation & Features</h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Profile / NEXXO ID Summary */}
            <div className="my-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.displayName}</p>
                <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.nexxoId}</p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  handleCloseDrawer();
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 dark:hover:bg-indigo-600/50 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                My Account
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      handleCloseDrawer();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-indigo-500/50 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.badgeColor || 'bg-indigo-500/30 text-indigo-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mobile Drawer Customer Support WhatsApp Link */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsHelpModalOpen(true);
                  handleCloseDrawer();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold">Customer Support (WhatsApp)</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +91 {NEXXO_SUPPORT_WHATSAPP_NUMBER}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global WhatsApp Customer Support Modal */}
      <WhatsAppHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        username={currentUser.username}
      />
    </>
  );
};
