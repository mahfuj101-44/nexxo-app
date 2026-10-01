import React, { useState, useEffect } from 'react';
import {
  subscribeToAllRegisteredUsers,
  setUserAccountStatus,
  setUserRole,
  setUserVerification,
  resetUserAvatar,
  resetUserBio,
  deleteUserAccount,
  publishSystemAnnouncement,
  SystemAnnouncementPayload,
  subscribeToPlatformSettings,
  updatePlatformSettings,
  subscribeToAuditLogs,
  subscribeToAdminRoles,
  fetchPlatformMetrics,
  isUserAuthorizedAdmin,
  isUserSuperAdmin,
  PlatformMetrics,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
} from '../lib/adminService';
import {
  NexxoUser,
  PlatformSettings,
  FeatureFlags,
  AuditLog,
  UserStatus,
  UserRole,
  Report,
  Group,
  Channel,
  AdminRoleDoc,
  Community,
  Story,
} from '../types';
import {
  ShieldCheck,
  Users,
  Settings,
  FileText,
  Search,
  Check,
  AlertTriangle,
  Radio,
  Sliders,
  ShieldAlert,
  Layers,
  Trash2,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Globe,
  Globe2,
  Film,
  MessageSquare,
  Sparkles,
  Phone,
  Video,
  Mic,
  QrCode,
  Bell,
  RefreshCw,
  UserX,
  UserCheck,
  Lock,
  Flame,
  Info,
  BarChart3,
  Music,
  Megaphone,
  CheckSquare,
  Crown,
  RotateCcw,
  Send,
  Timer,
  ExternalLink,
} from 'lucide-react';
import { subscribeToReports, updateReportStatus } from '../lib/safetyService';
import { subscribeToAllGroups, deleteGroup } from '../lib/groupService';
import { subscribeToChannels, toggleChannelVerification } from '../lib/channelService';
import { subscribeToCommunities, deleteCommunity } from '../lib/communityService';
import { subscribeToAllStoriesForAdmin, deleteStory } from '../lib/storyService';
import { createInAppNotification } from '../lib/notificationService';
import { Analytics } from './admin/Analytics';
import { AdminMusicManagement } from './admin/AdminMusicManagement';
import { AdminVerificationManagement } from './admin/AdminVerificationManagement';
import { VerifiedBadge } from './common/VerifiedBadge';

interface AdminViewProps {
  currentUser: NexxoUser;
}

type AdminTab =
  | 'overview'
  | 'analytics'
  | 'music'
  | 'users'
  | 'verification'
  | 'announcements'
  | 'reports'
  | 'groups'
  | 'channels'
  | 'communities'
  | 'stories'
  | 'settings'
  | 'featureFlags'
  | 'roles'
  | 'audit';

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const isAdmin = isUserAuthorizedAdmin(currentUser);
  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Datasets
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [users, setUsers] = useState<NexxoUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<NexxoUser | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');

  const [groups, setGroups] = useState<Group[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [storyTypeFilter, setStoryTypeFilter] = useState<'all' | 'image' | 'video' | 'text' | 'audio'>('all');
  const [adminRoles, setAdminRoles] = useState<AdminRoleDoc[]>([]);

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Broadcast announcement state
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLevel, setAnnouncementLevel] = useState<'info' | 'warning' | 'emergency' | 'update'>('info');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementUrl, setAnnouncementUrl] = useState('');
  const [announcementLabel, setAnnouncementLabel] = useState('');
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);

  // Direct In-App Alert state
  const [directAlertTitle, setDirectAlertTitle] = useState('');
  const [directAlertBody, setDirectAlertBody] = useState('');
  const [directAlertTarget, setDirectAlertTarget] = useState<'all' | string>('all');
  const [sendingDirectAlert, setSendingDirectAlert] = useState(false);

  // Sync announcement form from platformSettings
  useEffect(() => {
    if (platformSettings.currentAnnouncement) {
      setAnnouncementTitle(platformSettings.currentAnnouncement.title || '');
      setAnnouncementMessage(platformSettings.currentAnnouncement.message || '');
      setAnnouncementLevel(platformSettings.currentAnnouncement.level || 'info');
      setAnnouncementActive(platformSettings.currentAnnouncement.active || false);
      setAnnouncementUrl(platformSettings.currentAnnouncement.actionUrl || '');
      setAnnouncementLabel(platformSettings.currentAnnouncement.actionLabel || '');
    }
  }, [platformSettings.currentAnnouncement]);

  // Load real metrics
  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const data = await fetchPlatformMetrics();
      setMetrics(data);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadMetrics();
    }
  }, [isAdmin]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = subscribeToAllRegisteredUsers(setUsers);
    const unsubSettings = subscribeToPlatformSettings((s) => {
      setPlatformSettings(s);
      if (s.featureFlags) {
        setFeatureFlags(s.featureFlags);
      }
    });
    const unsubLogs = subscribeToAuditLogs(setAuditLogs);
    const unsubReports = subscribeToReports(setReports);
    const unsubGroups = subscribeToAllGroups(setGroups);
    const unsubChannels = subscribeToChannels(setChannels);
    const unsubCommunities = subscribeToCommunities(setCommunities);
    const unsubStories = subscribeToAllStoriesForAdmin(setStories);
    const unsubRoles = subscribeToAdminRoles(setAdminRoles);

    return () => {
      unsubUsers();
      unsubSettings();
      unsubLogs();
      unsubReports();
      unsubGroups();
      unsubChannels();
      unsubCommunities();
      unsubStories();
      unsubRoles();
    };
  }, [isAdmin, currentUser.id]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Restricted Access</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
          This portal is strictly reserved for authorized NEXXO administrators.
        </p>
      </div>
    );
  }

  // Handle User Status
  const handleToggleStatus = async (user: NexxoUser) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      setUpdatingId(user.id);
      setNotice(null);
      await setUserAccountStatus(currentUser.id, user.id, nextStatus, 'Admin panel action');
      setNotice({
        type: 'success',
        text: `User @${user.username} is now marked as ${nextStatus}.`,
      });
      loadMetrics();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle User Role
  const handleToggleRole = async (user: NexxoUser) => {
    if (!isSuperAdmin) {
      setNotice({ type: 'error', text: 'Only Super Administrators can modify user roles.' });
      return;
    }
    const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      setUpdatingId(user.id);
      setNotice(null);
      await setUserRole(currentUser.id, user, nextRole);
      setNotice({
        type: 'success',
        text: `User @${user.username} role updated to ${nextRole}.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Role change failed.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotice(null);
    try {
      await updatePlatformSettings(currentUser.id, {
        ...platformSettings,
        featureFlags,
      });
      setNotice({ type: 'success', text: 'Platform settings and feature flags successfully updated.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to update platform settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle single feature flag
  const handleToggleFlag = async (key: keyof FeatureFlags) => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlags(updated);
    try {
      await updatePlatformSettings(currentUser.id, {
        featureFlags: updated,
      });
      setNotice({ type: 'success', text: `Feature flag "${key}" set to ${updated[key] ? 'ENABLED' : 'DISABLED'}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to toggle flag.' });
    }
  };

  // Toggle Blue Tick Verification
  const handleToggleVerification = async (
    user: NexxoUser,
    isVerified: boolean,
    isPremium?: boolean,
    premiumTier?: 'free' | 'pro' | 'vip' | 'elite'
  ) => {
    try {
      setUpdatingId(user.id);
      setNotice(null);
      const prem = isPremium !== undefined ? isPremium : (user.isPremium || false);
      const tier = premiumTier || user.premiumTier || 'pro';
      await setUserVerification(currentUser.id, user.id, isVerified, prem, tier);
      setNotice({
        type: 'success',
        text: `Blue tick verification for @${user.username} set to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}.`,
      });
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, isVerified, isPremium: prem, premiumTier: tier } : null));
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to update verification status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Change Premium Membership Tier
  const handleSetPremiumTier = async (user: NexxoUser, premiumTier: 'free' | 'basic' | 'pro' | 'vip' | 'elite') => {
    try {
      setUpdatingId(user.id);
      setNotice(null);
      const isPremium = premiumTier !== 'free';
      const isVerified = isPremium ? true : (user.isVerified || false);
      await setUserVerification(currentUser.id, user.id, isVerified, isPremium, premiumTier);
      setNotice({
        type: 'success',
        text: `Membership tier for @${user.username} updated to ${premiumTier.toUpperCase()}.`,
      });
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, isPremium, premiumTier, isVerified } : null));
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to set membership tier.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Reset User Avatar to default
  const handleResetAvatar = async (user: NexxoUser) => {
    if (!confirm(`Are you sure you want to reset avatar for @${user.username}?`)) return;
    try {
      setUpdatingId(user.id);
      setNotice(null);
      await resetUserAvatar(currentUser.id, user.id);
      setNotice({ type: 'success', text: `Avatar for @${user.username} reset to default.` });
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}` } : null
        );
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to reset avatar.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Reset User Bio & Status
  const handleResetBio = async (user: NexxoUser) => {
    if (!confirm(`Are you sure you want to clear bio and status for @${user.username}?`)) return;
    try {
      setUpdatingId(user.id);
      setNotice(null);
      await resetUserBio(currentUser.id, user.id);
      setNotice({ type: 'success', text: `Bio and status for @${user.username} cleared.` });
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, bio: '', statusMessage: '' } : null));
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to reset bio.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Purge User Account (Super Admin)
  const handleDeleteUser = async (user: NexxoUser) => {
    if (!confirm(`⚠️ PERMANENT ACTION: Purge user account @${user.username}? This cannot be undone!`)) return;
    try {
      setUpdatingId(user.id);
      setNotice(null);
      await deleteUserAccount(currentUser.id, user.id);
      setNotice({ type: 'success', text: `Account for @${user.username} has been permanently purged.` });
      setSelectedUser(null);
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Publish or deactivate System Broadcast Announcement
  const handleBroadcastAnnouncement = async (active: boolean) => {
    if (active && (!announcementTitle.trim() || !announcementMessage.trim())) {
      setNotice({ type: 'error', text: 'Announcement requires both a title and message content.' });
      return;
    }
    setPublishingAnnouncement(true);
    setNotice(null);
    try {
      const payload: SystemAnnouncementPayload = {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        level: announcementLevel,
        active,
        actionUrl: announcementUrl.trim() || undefined,
        actionLabel: announcementLabel.trim() || undefined,
      };
      await publishSystemAnnouncement(currentUser.id, payload);
      setAnnouncementActive(active);
      setNotice({
        type: 'success',
        text: active
          ? 'System Announcement broadcasted live across the entire platform!'
          : 'System Announcement deactivated and cleared.',
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to publish announcement.' });
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  // Send instant In-App Notification alert to users
  const handleSendDirectAlert = async () => {
    if (!directAlertTitle.trim() || !directAlertBody.trim()) {
      setNotice({ type: 'error', text: 'Please enter both an alert title and message body.' });
      return;
    }
    setSendingDirectAlert(true);
    setNotice(null);
    try {
      const targetUserIds =
        directAlertTarget === 'all'
          ? users.map((u) => u.id)
          : [directAlertTarget];

      if (targetUserIds.length === 0) {
        setNotice({ type: 'error', text: 'No users found to send the alert to.' });
        return;
      }

      await Promise.all(
        targetUserIds.map((uid) =>
          createInAppNotification({
            userId: uid,
            type: 'system',
            title: `🔔 ${directAlertTitle.trim()}`,
            body: directAlertBody.trim(),
            data: { fromAdmin: true, sentAt: new Date().toISOString() },
          })
        )
      );

      setNotice({
        type: 'success',
        text: `Direct alert dispatched to ${targetUserIds.length} user(s) successfully!`,
      });
      setDirectAlertTitle('');
      setDirectAlertBody('');
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to dispatch alert notifications.' });
    } finally {
      setSendingDirectAlert(false);
    }
  };

  // Delete Community
  const handleDeleteCommunity = async (communityId: string, communityName: string) => {
    if (!confirm(`Are you sure you want to permanently delete community "${communityName}"?`)) return;
    try {
      setUpdatingId(communityId);
      setNotice(null);
      await deleteCommunity(communityId);
      setNotice({ type: 'success', text: `Community "${communityName}" has been deleted.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to delete community.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Story
  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story as administrator?')) return;
    try {
      setUpdatingId(storyId);
      setNotice(null);
      await deleteStory(storyId);
      setNotice({ type: 'success', text: 'Story removed successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to remove story.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.nexxoId.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Filtered Reports
  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* Admin Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">NEXXO Command Center</h1>
              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live Governance, Security Policies, Moderation & Audit Logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMetrics}
            disabled={metricsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notice && (
        <div
          className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-b border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-b border-rose-500/20'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 font-bold ml-4 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 flex gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & DAU</span>
        </button>

        <button
          onClick={() => setActiveTab('music')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'music'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Music Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'verification'
              ? 'border-sky-600 text-sky-600 dark:border-sky-500 dark:text-sky-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BadgeCheck className="w-3.5 h-3.5 text-sky-500" />
          <span>Blue Tick Requests</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>System Broadcasts</span>
          {platformSettings?.currentAnnouncement?.active && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Safety Reports</span>
          {reports.filter((r) => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Groups ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'channels'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Channels ({channels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('communities')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'communities'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Communities ({communities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'stories'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Stories ({stories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('featureFlags')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'featureFlags'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Feature Flags</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Platform Policies</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'roles'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Roles ({adminRoles.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: OVERVIEW & COMMAND CENTER */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Real Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Total Registered Users</span>
                  <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metrics?.totalUsers ?? users.length}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>{metrics?.activeUsers ?? users.filter((u) => u.status === 'active').length} active</span>
                  <span>&bull;</span>
                  <span className="text-rose-600 dark:text-rose-400">{metrics?.suspendedUsers ?? users.filter((u) => u.status === 'suspended').length} suspended</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Online Users</span>
                  <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics?.onlineUsers ?? users.filter((u) => u.presence === 'online').length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time heartbeat sync
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Active Groups</span>
                  <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metrics?.totalGroups ?? groups.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Multi-member channels & chats
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Broadcast Channels</span>
                  <Radio className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metrics?.totalChannels ?? channels.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Public & verified broadcast feeds
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Communities</span>
                  <Globe className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metrics?.totalCommunities ?? communities.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Topic-based hubs
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Active Stories</span>
                  <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metrics?.totalStories ?? stories.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  24h ephemeral status updates
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Safety Reports</span>
                  <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {reports.filter((r) => r.status === 'pending').length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {reports.length} total reports filed
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Audit Events</span>
                  <FileText className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {auditLogs.length}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Immutable records logged
                </div>
              </div>
            </div>

            {/* Platform Subsystem Health */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span>NEXXO Subsystem Health & Readiness</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Firestore Database</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Real-time snapshots online</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Google Authentication</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Firebase Auth provider</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">WebRTC Media Engine</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">STUN/ICE Signaling ready</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">AI Gemini 2.5 Gateway</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Server-side proxy routes</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Operational</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Administrative Shortcuts</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('featureFlags')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Configure Feature Flags</span>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Review Pending Reports</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>System Broadcast Notice</span>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-xs font-semibold dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>View Full Server Analytics & DAU &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REAL-TIME PLATFORM ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <Analytics />
          </div>
        )}

        {/* TAB: LICENSED MUSIC MANAGEMENT */}
        {activeTab === 'music' && (
          <div className="max-w-6xl mx-auto">
            <AdminMusicManagement currentUserId={currentUser.id} />
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by username, NEXXO ID (NX-...), display name, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUserStatusFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    userStatusFilter === 'all'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('active')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    userStatusFilter === 'active'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                  }`}
                >
                  Active ({users.filter((u) => u.status === 'active').length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('suspended')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    userStatusFilter === 'suspended'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                  }`}
                >
                  Suspended ({users.filter((u) => u.status === 'suspended').length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">User Identity</th>
                      <th className="p-3.5">Permanent NEXXO ID</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Verification & Tier</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Presence</th>
                      <th className="p-3.5 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                          No users matched the search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                                alt={u.username}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{u.displayName || u.username}</span>
                                  <VerifiedBadge
                                    isVerified={u.isVerified}
                                    isPremium={u.isPremium}
                                    premiumTier={u.premiumTier}
                                    size="xs"
                                  />
                                  <span className="text-slate-500 dark:text-slate-400 font-normal">@{u.username}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                              {u.nexxoId}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleToggleVerification(u, !u.isVerified)}
                                disabled={updatingId === u.id}
                                title={u.isVerified ? 'Click to revoke Blue Tick' : 'Click to grant Blue Tick'}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  u.isVerified
                                    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <BadgeCheck className={`w-3 h-3 ${u.isVerified ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                <span>{u.isVerified ? 'Blue Tick' : 'Unverified'}</span>
                              </button>

                              <select
                                value={u.premiumTier || (u.isPremium ? 'pro' : 'free')}
                                onChange={(e) => handleSetPremiumTier(u, e.target.value as any)}
                                disabled={updatingId === u.id}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded px-1.5 py-1 text-[10px] font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="free">Tier: Free</option>
                                <option value="pro">⭐ Pro Tier</option>
                                <option value="vip">👑 VIP Tier</option>
                                <option value="elite">💎 Elite Tier</option>
                              </select>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                u.presence === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.presence === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
                                }`}
                              />
                              {u.presence}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                              >
                                Manage
                              </button>

                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={updatingId === u.id || u.id === currentUser.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                {updatingId === u.id ? 'Saving...' : u.status === 'active' ? 'Suspend' : 'Restore'}
                              </button>

                              {isSuperAdmin && u.id !== currentUser.id && (
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  disabled={updatingId === u.id}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/30 text-[11px] font-semibold cursor-pointer transition-colors"
                                  title="Toggle Administrator Role"
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BLUE TICK VERIFICATION REQUESTS */}
        {activeTab === 'verification' && (
          <div className="max-w-6xl mx-auto">
            <AdminVerificationManagement currentUser={currentUser} />
          </div>
        )}

        {/* TAB: SYSTEM BROADCAST ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-600/20 dark:border-indigo-500/30 dark:text-indigo-400 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Platform System Broadcast Center
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Instantly publish emergency alerts, maintenance notices, and update banners across all active user sessions.
                    </p>
                  </div>
                </div>

                {announcementActive && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>BROADCASTING LIVE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Current Broadcast Preview */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Live Banner Preview (As seen by all users)</span>
              </div>

              {announcementTitle.trim() || announcementMessage.trim() ? (
                <div
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 text-xs font-medium ${
                    announcementLevel === 'emergency'
                      ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'
                      : announcementLevel === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200'
                      : announcementLevel === 'update'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/90 dark:border-indigo-800 dark:text-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="font-bold tracking-wide uppercase text-[10px] px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border border-black/15 dark:border-white/20">
                      {announcementLevel}
                    </span>
                    <span className="font-semibold">{announcementTitle || 'Announcement Title'}:</span>
                    <span className="truncate">{announcementMessage || 'Message body will appear here...'}</span>
                    {announcementUrl && (
                      <span className="underline font-bold text-slate-900 dark:text-white ml-2 flex items-center gap-1">
                        <span>{announcementLabel || 'Learn More'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="opacity-60 text-sm font-bold">&times;</span>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
                  No announcement drafted yet. Fill out the composer below to preview and broadcast.
                </div>
              )}
            </div>

            {/* Broadcast Composer */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Compose System Broadcast</span>
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Alert Priority Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { level: 'info', label: 'Info Notice', color: 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' },
                      { level: 'warning', label: 'Warning / Notice', color: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
                      { level: 'emergency', label: 'Emergency Alert', color: 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
                      { level: 'update', label: 'Product Update', color: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
                    ].map((item) => (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setAnnouncementLevel(item.level as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          announcementLevel === item.level
                            ? `${item.color} shadow-sm ring-1 ring-indigo-400/30 dark:ring-white/20`
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Broadcast Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Scheduled Maintenance Window or NEXXO 2.0 Live"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Broadcast Message Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed explanation that will scroll or display across top headers for all connected users..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                      Optional Action URL (External or Internal link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://nexxo.app/status"
                      value={announcementUrl}
                      onChange={(e) => setAnnouncementUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                      Action Button Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Check Status / Read More"
                      value={announcementLabel}
                      onChange={(e) => setAnnouncementLabel(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleBroadcastAnnouncement(false)}
                    disabled={publishingAnnouncement}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Clear / Disable Banner
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBroadcastAnnouncement(true)}
                    disabled={publishingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim()}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {publishingAnnouncement ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Megaphone className="w-3.5 h-3.5" />
                    )}
                    <span>Broadcast Live to All Users</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Direct In-App Push Notification Alert Dispatcher */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Instant In-App Push Notification Alert</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dispatch an immediate notification chime and alert to all active registered users or a targeted user.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Alert Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Scheduled System Upgrade in 15 Minutes"
                      value={directAlertTitle}
                      onChange={(e) => setDirectAlertTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Recipient Target</label>
                    <select
                      value={directAlertTarget}
                      onChange={(e) => setDirectAlertTarget(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Registered Users ({users.length})</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          @{u.username} ({u.displayName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Notification Body</label>
                  <textarea
                    rows={2}
                    placeholder="Type the message body to be delivered directly into user notification centers..."
                    value={directAlertBody}
                    onChange={(e) => setDirectAlertBody(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSendDirectAlert}
                    disabled={sendingDirectAlert || !directAlertTitle.trim() || !directAlertBody.trim()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {sendingDirectAlert ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Dispatch Instant Alert</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY & REPORTS MODERATION */}
        {activeTab === 'reports' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {(['pending', 'resolved', 'dismissed', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setReportFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-colors cursor-pointer ${
                      reportFilter === s
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                    }`}
                  >
                    {s} ({reports.filter((r) => s === 'all' || r.status === s).length})
                  </button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No reports to display</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">All content and users are currently within community safety standards.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((rep) => (
                  <div key={rep.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-bold uppercase border border-rose-500/30">
                          {rep.reason.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Target: {rep.targetType.toUpperCase()} ({rep.targetId})
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rep.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : rep.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                      "{rep.description || 'No descriptive comments provided.'}"
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                      <div>Reported by: <span className="text-slate-700 dark:text-slate-200 font-semibold">{rep.reporterName}</span></div>
                      <div className="flex items-center gap-2">
                        {rep.status === 'pending' && (
                          <>
                            <button
                              onClick={async () => {
                                await updateReportStatus(rep.id, 'resolved', 'Resolved by admin.');
                                setNotice({ type: 'success', text: 'Report marked as resolved.' });
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-sm"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={async () => {
                                await updateReportStatus(rep.id, 'dismissed', 'Dismissed by admin as benign.');
                                setNotice({ type: 'success', text: 'Report dismissed.' });
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-xs cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GROUPS & CHANNELS MODERATION */}
        {activeTab === 'groups' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Platform Groups ({groups.length})</h3>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Group Name</th>
                    <th className="p-3.5">Members</th>
                    <th className="p-3.5">Owner ID</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No groups created yet.
                      </td>
                    </tr>
                  ) : (
                    groups.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{g.name}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{g.memberCount || g.members.length} members</td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">{g.ownerId}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={async () => {
                              try {
                                await deleteGroup(g.id);
                                setNotice({ type: 'success', text: `Group "${g.name}" deleted.` });
                              } catch (err: any) {
                                setNotice({ type: 'error', text: err.message || 'Failed to delete group.' });
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            Delete Group
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Channels ({channels.length})</h3>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Subscribers</th>
                    <th className="p-3.5">Verified Badge</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {channels.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No channels created yet.
                      </td>
                    </tr>
                  ) : (
                    channels.map((ch) => (
                      <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{ch.name}</span>
                            {ch.isVerified && <BadgeCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 inline" />}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">@{ch.handle}</div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{ch.subscribersCount || 0}</td>
                        <td className="p-3.5">
                          <button
                            onClick={async () => {
                              await toggleChannelVerification(ch.id, !ch.isVerified);
                              setNotice({
                                type: 'success',
                                text: `Channel @${ch.handle} verified badge set to ${!ch.isVerified}.`,
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                              ch.isVerified
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {ch.isVerified ? 'Verified' : 'Unverified'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="text-[11px] text-slate-500">Owner: {ch.ownerId.slice(0, 8)}...</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: COMMUNITIES MODERATION */}
        {activeTab === 'communities' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>All Platform Communities ({communities.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage, inspect, and moderate community hubs.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Community</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Members</th>
                      <th className="p-3.5">Groups</th>
                      <th className="p-3.5">Owner UID</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {communities.filter((c) =>
                      !communitySearch.trim() ||
                      c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
                      c.description?.toLowerCase().includes(communitySearch.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                          No communities found.
                        </td>
                      </tr>
                    ) : (
                      communities
                        .filter((c) =>
                          !communitySearch.trim() ||
                          c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
                          c.description?.toLowerCase().includes(communitySearch.toLowerCase())
                        )
                        .map((comm) => (
                          <tr key={comm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden text-xs">
                                  {comm.photoURL ? (
                                    <img src={comm.photoURL} alt={comm.name} className="w-full h-full object-cover" />
                                  ) : (
                                    comm.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{comm.name}</div>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-[220px] truncate">
                              {comm.description || 'No description provided'}
                            </td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                              {comm.memberCount || comm.members?.length || 1} members
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400">
                              {comm.groupIds?.length || 0} linked
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                              {comm.ownerId?.slice(0, 10)}...
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleDeleteCommunity(comm.id, comm.name)}
                                disabled={updatingId === comm.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {updatingId === comm.id ? 'Deleting...' : 'Delete Community'}
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STORIES MODERATION */}
        {activeTab === 'stories' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span>All Active Platform Stories ({stories.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Review, moderate, and remove inappropriate status updates.</p>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-2xs">
                {(['all', 'image', 'video', 'text', 'audio'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStoryTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      storyTypeFilter === t
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Author</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Content / Caption</th>
                      <th className="p-3.5">Views</th>
                      <th className="p-3.5">Privacy</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {stories.filter((s) => storyTypeFilter === 'all' || s.type === storyTypeFilter).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                          No stories found matching filter.
                        </td>
                      </tr>
                    ) : (
                      stories
                        .filter((s) => storyTypeFilter === 'all' || s.type === storyTypeFilter)
                        .map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">{st.userDisplayName || 'User'}</div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {st.userId?.slice(0, 10)}...</div>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {st.type}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300 max-w-[260px] truncate">
                              {st.caption || (st.mediaUrl ? 'Media Attachment' : 'Text Story')}
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400">
                              {st.viewCount || st.views?.length || 0} views
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400 capitalize">
                              {st.privacy || 'everyone'}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleDeleteStory(st.id)}
                                disabled={updatingId === st.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {updatingId === st.id ? 'Removing...' : 'Delete Story'}
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FEATURE FLAGS CONTROLLER */}
        {activeTab === 'featureFlags' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Global Feature Flags Architecture</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly enable or disable individual communication modules across the entire NEXXO platform.
                Changes propagate in real-time to all connected active clients.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  key: 'privateMessaging' as keyof FeatureFlags,
                  label: '1:1 Direct Messaging',
                  desc: 'Encrypted private user-to-user messaging',
                  icon: MessageSquare,
                },
                {
                  key: 'groups' as keyof FeatureFlags,
                  label: 'Group Chats',
                  desc: 'Multi-member group discussions & admin roles',
                  icon: Layers,
                },
                {
                  key: 'stories' as keyof FeatureFlags,
                  label: 'Status Stories',
                  desc: '24-hour ephemeral visual & text updates',
                  icon: Sparkles,
                },
                {
                  key: 'channels' as keyof FeatureFlags,
                  label: 'Broadcast Channels',
                  desc: 'One-to-many public & verified broadcasting feeds',
                  icon: Radio,
                },
                {
                  key: 'communities' as keyof FeatureFlags,
                  label: 'Communities',
                  desc: 'Multi-group umbrellas and organized hubs',
                  icon: Globe,
                },
                {
                  key: 'voiceCalls' as keyof FeatureFlags,
                  label: 'WebRTC Voice Calling',
                  desc: 'P2P real-time audio calls with STUN signaling',
                  icon: Phone,
                },
                {
                  key: 'videoCalls' as keyof FeatureFlags,
                  label: 'WebRTC Video Calling',
                  desc: 'High-definition 2-way video stream sessions',
                  icon: Video,
                },
                {
                  key: 'voiceNotes' as keyof FeatureFlags,
                  label: 'Voice Audio Messages',
                  desc: 'Microphone audio recording and instant upload',
                  icon: Mic,
                },
                {
                  key: 'aiAssistant' as keyof FeatureFlags,
                  label: 'AI Assistant (Gemini 2.5)',
                  desc: 'Floating AI companion drawer for user assistance',
                  icon: Sparkles,
                },
                {
                  key: 'translation' as keyof FeatureFlags,
                  label: 'Multilingual Translation',
                  desc: 'In-chat automated message language translation',
                  icon: Globe,
                },
                {
                  key: 'polls' as keyof FeatureFlags,
                  label: 'Interactive Polls Engine',
                  desc: 'Live voting questions and result tallies in groups and direct chats',
                  icon: CheckSquare,
                },
                {
                  key: 'ephemeralMessages' as keyof FeatureFlags,
                  label: 'Disappearing Messages',
                  desc: 'Configurable self-destruct timers (1 hour to 30 days) for chats',
                  icon: Timer,
                },
                {
                  key: 'verifiedBadges' as keyof FeatureFlags,
                  label: 'Blue Tick & VIP Memberships',
                  desc: 'Verified identity badges and tier styling (Pro, VIP, Elite)',
                  icon: BadgeCheck,
                },
                {
                  key: 'mediaVault' as keyof FeatureFlags,
                  label: 'Media Library Vault',
                  desc: 'Centralized gallery, voice memos, and document management',
                  icon: Music,
                },
                {
                  key: 'scheduledMessages' as keyof FeatureFlags,
                  label: 'Scheduled Messages',
                  desc: 'Queue messages to automatically deliver at a designated future time',
                  icon: Clock,
                },
                {
                  key: 'qrConnections' as keyof FeatureFlags,
                  label: 'QR Code Quick Pairing',
                  desc: 'Camera scanner and user QR identity cards',
                  icon: QrCode,
                },
                {
                  key: 'notifications' as keyof FeatureFlags,
                  label: 'In-App Notifications',
                  desc: 'System sound chimes and dropdown alert center',
                  icon: Bell,
                },
              ].map((flag) => {
                const Icon = flag.icon;
                const isEnabled = featureFlags[flag.key];
                return (
                  <div
                    key={flag.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isEnabled
                        ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isEnabled
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{flag.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{flag.desc}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFlag(flag.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isEnabled
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: PLATFORM POLICIES & SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl mx-auto">
            {/* General Settings */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>General Platform Identity & Maintenance</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Platform Name</label>
                  <input
                    type="text"
                    value={platformSettings.platformName || ''}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, platformName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Platform Description</label>
                  <input
                    type="text"
                    value={platformSettings.platformDescription || ''}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, platformDescription: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Global System Notice Banner</label>
                  <input
                    type="text"
                    placeholder="e.g., Scheduled infrastructure upgrade at 02:00 UTC."
                    value={platformSettings.systemNotice || ''}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, systemNotice: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-slate-950 border border-amber-200/80 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={platformSettings.maintenanceMode || false}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                    <div>
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Maintenance Mode</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        When enabled, only administrators can access NEXXO. All other users will see a maintenance notice.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Registration & Discovery */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Registration & User Discovery Policies</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Enable New User Registration</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Allow new users to sign in and allocate permanent NEXXO IDs</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings.registrationEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, registrationEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Global User Discovery</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Allow users to discover others by username or permanent NEXXO ID</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings.discoveryEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, discoveryEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Messaging & File Size Policies */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Messaging & File Size Policies</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Max Attachment Size (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={platformSettings.maxAttachmentSizeMB || 25}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        maxAttachmentSizeMB: parseInt(e.target.value) || 25,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Max Message Character Limit
                  </label>
                  <input
                    type="number"
                    min={200}
                    max={10000}
                    value={platformSettings.maxMessageLength || 4000}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        maxMessageLength: parseInt(e.target.value) || 4000,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Privacy, Disappearing Messages & Polling Policies */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Disappearing Messages & Interactive Features</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Disappearing Messages Architecture</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Allow users to configure self-destruct timers for messages in chats</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings.ephemeralEnabled !== false}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, ephemeralEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Default Disappearing Message Timer for New Chats
                  </label>
                  <select
                    value={platformSettings.defaultEphemeralSeconds || 0}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        defaultEphemeralSeconds: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Off (Messages Persist Permanently)</option>
                    <option value={3600}>1 Hour Lifespan</option>
                    <option value={86400}>24 Hours Lifespan (1 Day)</option>
                    <option value={604800}>7 Days Lifespan (1 Week)</option>
                    <option value={2592000}>30 Days Lifespan (1 Month)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Interactive Polls Engine</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Permit members to launch multi-option live polls in groups and direct chats</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings.pollsEnabled !== false}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, pollsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {savingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save All Platform Policies</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 7: ADMIN ROLES (SUPERADMIN ONLY) */}
        {activeTab === 'roles' && isSuperAdmin && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Authorized Administrative Directory</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Strict role-based access control (RBAC). Only Super Administrators can grant or revoke governance privileges.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Administrator</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">UID</th>
                    <th className="p-3.5 text-right">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {/* Bootstrap Super Admins */}
                  <tr className="bg-amber-500/5">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">mahfuj101.mtw@gmail.com</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase">
                        Super Admin (Owner)
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">Master Cloud Key</td>
                    <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Full Unrestricted</td>
                  </tr>

                  {adminRoles.map((role) => (
                    <tr key={role.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{role.displayName || role.email}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{role.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 text-[10px] font-bold uppercase">
                          {role.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">{role.uid.slice(0, 10)}...</td>
                      <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">Governance & Moderation</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Platform Audit Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Security-verified ledger of all administrative events, suspensions, and configuration changes.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor ID</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 font-sans">
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const date = log.createdAt?.toDate
                        ? log.createdAt.toDate().toLocaleString()
                        : 'Just now';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{date}</td>
                          <td className="p-3.5 text-indigo-600 dark:text-indigo-300">{log.actorId.slice(0, 8)}...</td>
                          <td className="p-3.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-bold border border-slate-200 dark:border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300">{log.targetId}</td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-400 truncate max-w-xs font-sans">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">NEXXO User Profile Record</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={selectedUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.id}`}
                alt={selectedUser.username}
                className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span className="truncate">{selectedUser.displayName || selectedUser.username}</span>
                  <VerifiedBadge
                    isVerified={selectedUser.isVerified}
                    isPremium={selectedUser.isPremium}
                    premiumTier={selectedUser.premiumTier}
                    size="sm"
                  />
                </div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">@{selectedUser.username}</div>
                <div className="text-xs text-slate-500 truncate">{selectedUser.email}</div>
              </div>
            </div>

            {/* Blue Tick Verification & Membership Governance */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Verification & VIP Membership Governance</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Blue Tick Status</div>
                  <div className="text-[10px] text-slate-500">Official authentic account badge</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVerification(selectedUser, !selectedUser.isVerified)}
                  disabled={updatingId === selectedUser.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedUser.isVerified
                      ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <BadgeCheck className={`w-3.5 h-3.5 ${selectedUser.isVerified ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{selectedUser.isVerified ? 'Verified (Revoke)' : 'Grant Blue Tick'}</span>
                </button>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Membership Tier</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['free', 'pro', 'vip', 'elite'] as const).map((tier) => {
                    const activeTier = selectedUser.premiumTier || (selectedUser.isPremium ? 'pro' : 'free');
                    const isCurrent = activeTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleSetPremiumTier(selectedUser, tier)}
                        disabled={updatingId === selectedUser.id}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                          isCurrent
                            ? tier === 'elite'
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                              : tier === 'vip'
                              ? 'bg-purple-600 text-white'
                              : tier === 'pro'
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-700 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Permanent NEXXO ID</div>
                <div className="font-mono text-indigo-600 dark:text-indigo-300 font-bold">{selectedUser.nexxoId}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Account Status</div>
                <div className="font-bold text-slate-900 dark:text-white uppercase">{selectedUser.status}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">User Role</div>
                <div className="font-bold text-slate-900 dark:text-white uppercase">{selectedUser.role}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Presence Status</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{selectedUser.presence}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-1">User Bio</div>
              <p className="text-slate-700 dark:text-slate-300">{selectedUser.bio || 'No bio provided.'}</p>
            </div>

            {/* Moderation Sanitize Tools */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Sanitization & Content Moderation
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleResetAvatar(selectedUser)}
                  disabled={updatingId === selectedUser.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Reset Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleResetBio(selectedUser)}
                  disabled={updatingId === selectedUser.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Clear Bio</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                {isSuperAdmin && selectedUser.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser)}
                    disabled={updatingId === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Purge User</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Close
                </button>

                {isSuperAdmin && selectedUser.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => handleToggleRole(selectedUser)}
                    disabled={updatingId === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {selectedUser.role === 'admin' ? 'Demote Admin' : 'Grant Admin'}
                  </button>
                )}

                <button
                  onClick={() => {
                    handleToggleStatus(selectedUser);
                  }}
                  disabled={updatingId === selectedUser.id || selectedUser.id === currentUser.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm ${
                    selectedUser.status === 'active' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {selectedUser.status === 'active' ? 'Suspend Account' : 'Restore Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
