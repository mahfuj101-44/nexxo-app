import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  NexxoUser,
  PlatformSettings,
  FeatureFlags,
  AuditLog,
  UserStatus,
  UserRole,
  AdminRoleDoc,
} from '../types';

export const BOOTSTRAP_ADMIN_EMAILS = [
  'mahfuj101.mtw@gmail.com',
  'silentkillerrider101@gmail.com',
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  privateMessaging: true,
  groups: true,
  stories: true,
  channels: true,
  communities: true,
  voiceCalls: true,
  videoCalls: true,
  aiAssistant: true,
  translation: true,
  voiceNotes: true,
  qrConnections: true,
  notifications: true,
  polls: true,
  ephemeralMessages: true,
  verifiedBadges: true,
  mediaVault: true,
  scheduledMessages: true,
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'NEXXO Global Network',
  platformDescription: 'Unified real-time messaging, groups, status stories, and WebRTC calling.',
  maintenanceMode: false,
  systemNotice: '',
  registrationEnabled: true,
  discoveryEnabled: true,
  googleAuthEnabled: true,
  maxAttachmentSizeMB: 25,
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/webm',
    'audio/mp3',
    'video/mp4',
    'application/pdf',
  ],
  maxMessageLength: 4000,
  maxGroupMembers: 500,
  groupCreationRestrictedToAdmins: false,
  channelCreationRestrictedToAdmins: false,
  storyExpirationHours: 24,
  maxStoryUploadsPerDay: 10,
  aiEnabled: true,
  aiSmartRepliesEnabled: true,
  aiTranslationEnabled: true,
  aiSummarizeEnabled: true,
  defaultEphemeralSeconds: 0,
  ephemeralEnabled: true,
  pollsEnabled: true,
  maxMediaVaultStorageMB: 500,
  featureFlags: DEFAULT_FEATURE_FLAGS,
};

export function isUserAuthorizedAdmin(user: NexxoUser | null): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    BOOTSTRAP_ADMIN_EMAILS.includes(user.email)
  );
}

export function isUserSuperAdmin(user: NexxoUser | null): boolean {
  if (!user) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(user.email);
}

// Subscribe to all real registered users for Admin User Management
export function subscribeToAllRegisteredUsers(onUpdate: (users: NexxoUser[]) => void) {
  const usersCol = collection(db, 'users');
  const q = query(usersCol, limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const users: NexxoUser[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as NexxoUser);
      });
      users.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      onUpdate(users);
    },
    (error) => {
      console.warn('Notice listening to registered users:', error);
    }
  );
}

// Toggle or update account status (active/suspended)
export async function setUserAccountStatus(
  adminId: string,
  targetUserId: string,
  status: UserStatus,
  reason?: string
): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  try {
    await updateDoc(userRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    // Record audit log
    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      targetId: targetUserId,
      details: { status, reason: reason || 'Administrative action' },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

// Update User Role (promote to admin / demote to user)
export async function setUserRole(
  adminId: string,
  targetUser: NexxoUser,
  newRole: UserRole
): Promise<void> {
  const userRef = doc(db, 'users', targetUser.id);
  try {
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });

    // Maintain adminRoles collection document
    const adminRoleRef = doc(db, 'adminRoles', targetUser.id);
    if (newRole === 'admin') {
      await setDoc(adminRoleRef, {
        uid: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        username: targetUser.username,
        role: 'admin',
        assignedAt: serverTimestamp(),
        assignedBy: adminId,
      });
    } else {
      await deleteDoc(adminRoleRef).catch(() => {});
    }

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: newRole === 'admin' ? 'USER_PROMOTED_ADMIN' : 'USER_DEMOTED',
      targetId: targetUser.id,
      details: { role: newRole },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.id}`);
  }
}

// Toggle or update user Blue Tick Verification and Premium status
export async function setUserVerification(
  adminId: string,
  targetUserId: string,
  isVerified: boolean,
  isPremium: boolean = false,
  premiumTier: 'free' | 'basic' | 'pro' | 'vip' | 'elite' = 'pro'
): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  try {
    await updateDoc(userRef, {
      isVerified,
      isPremium,
      premiumTier: isPremium ? premiumTier : 'free',
      verifiedAt: isVerified ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: isVerified ? 'USER_VERIFIED_BADGE_GRANTED' : 'USER_VERIFIED_BADGE_REVOKED',
      targetId: targetUserId,
      details: { isVerified, isPremium, premiumTier },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

// Reset User Avatar to default Dicebear avatar
export async function resetUserAvatar(adminId: string, targetUserId: string): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  try {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUserId}`;
    await updateDoc(userRef, {
      photoURL: defaultAvatar,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'USER_AVATAR_RESET',
      targetId: targetUserId,
      details: { defaultAvatar },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

// Reset User Bio and status message
export async function resetUserBio(adminId: string, targetUserId: string): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  try {
    await updateDoc(userRef, {
      bio: '',
      statusMessage: '',
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'USER_BIO_RESET',
      targetId: targetUserId,
      details: { cleared: true },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

// Delete / Purge User Account (Super Admin action)
export async function deleteUserAccount(adminId: string, targetUserId: string): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  try {
    await deleteDoc(userRef);

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'USER_ACCOUNT_PURGED',
      targetId: targetUserId,
      details: { purged: true },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUserId}`);
  }
}

// Publish or Update Global System Announcement Broadcast
export interface SystemAnnouncementPayload {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'emergency' | 'update';
  active: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export async function publishSystemAnnouncement(
  adminId: string,
  announcement: SystemAnnouncementPayload
): Promise<void> {
  const settingsRef = doc(db, 'platformSettings', 'general');
  try {
    const formattedNotice = announcement.active && announcement.message.trim()
      ? `[${announcement.level.toUpperCase()}] ${announcement.title}: ${announcement.message}`
      : '';

    await setDoc(
      settingsRef,
      {
        systemNotice: formattedNotice,
        currentAnnouncement: {
          ...announcement,
          createdBy: adminId,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: announcement.active ? 'SYSTEM_ANNOUNCEMENT_PUBLISHED' : 'SYSTEM_ANNOUNCEMENT_CLEARED',
      targetId: 'platformSettings/general',
      details: { ...announcement },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'platformSettings/general');
  }
}

// Real-time listener for Platform Settings
export function subscribeToPlatformSettings(
  onUpdate: (settings: PlatformSettings) => void
) {
  const settingsRef = doc(db, 'platformSettings', 'general');

  return onSnapshot(
    settingsRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PlatformSettings;
        onUpdate({
          ...DEFAULT_PLATFORM_SETTINGS,
          ...data,
          featureFlags: {
            ...DEFAULT_FEATURE_FLAGS,
            ...(data.featureFlags || {}),
          },
        });
      } else {
        onUpdate(DEFAULT_PLATFORM_SETTINGS);
      }
    },
    (error) => {
      console.warn('Notice subscribing to platform settings:', error);
      onUpdate(DEFAULT_PLATFORM_SETTINGS);
    }
  );
}

// Update Platform Settings
export async function updatePlatformSettings(
  adminId: string,
  settings: Partial<PlatformSettings>
): Promise<void> {
  const settingsRef = doc(db, 'platformSettings', 'general');
  try {
    await setDoc(
      settingsRef,
      {
        ...settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetId: 'platformSettings/general',
      details: { keysUpdated: Object.keys(settings) },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'platformSettings/general');
  }
}

// Subscribe to Audit Logs
export function subscribeToAuditLogs(onUpdate: (logs: AuditLog[]) => void) {
  const q = query(
    collection(db, 'auditLogs'),
    orderBy('createdAt', 'desc'),
    limit(75)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...(doc.data() as Omit<AuditLog, 'id'>),
        });
      });
      onUpdate(logs);
    },
    (error) => {
      console.warn('Notice listening to audit logs:', error);
    }
  );
}

// Subscribe to Admin Roles
export function subscribeToAdminRoles(onUpdate: (roles: AdminRoleDoc[]) => void) {
  const q = query(collection(db, 'adminRoles'));
  return onSnapshot(
    q,
    (snap) => {
      const list: AdminRoleDoc[] = [];
      snap.forEach((d) => {
        list.push(d.data() as AdminRoleDoc);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Notice listening to admin roles:', err);
    }
  );
}

// Fetch real Platform Metrics for Admin Overview
export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  onlineUsers: number;
  totalGroups: number;
  totalChannels: number;
  totalCommunities: number;
  totalStories: number;
  pendingReports: number;
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const metrics: PlatformMetrics = {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    onlineUsers: 0,
    totalGroups: 0,
    totalChannels: 0,
    totalCommunities: 0,
    totalStories: 0,
    pendingReports: 0,
  };

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    metrics.totalUsers = usersSnap.size;
    usersSnap.forEach((d) => {
      const u = d.data() as NexxoUser;
      if (u.status === 'active') metrics.activeUsers++;
      if (u.status === 'suspended') metrics.suspendedUsers++;
      if (u.presence === 'online') metrics.onlineUsers++;
    });

    const groupsSnap = await getDocs(collection(db, 'groups'));
    metrics.totalGroups = groupsSnap.size;

    const channelsSnap = await getDocs(collection(db, 'channels'));
    metrics.totalChannels = channelsSnap.size;

    const commSnap = await getDocs(collection(db, 'communities'));
    metrics.totalCommunities = commSnap.size;

    const storiesSnap = await getDocs(collection(db, 'stories'));
    metrics.totalStories = storiesSnap.size;

    const repQ = query(collection(db, 'reports'), where('status', '==', 'pending'));
    const reportsSnap = await getDocs(repQ);
    metrics.pendingReports = reportsSnap.size;
  } catch (e) {
    console.warn('Error computing platform metrics:', e);
  }

  return metrics;
}
