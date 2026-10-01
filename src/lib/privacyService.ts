import { NexxoUser, PrivacyAudience, OnlineAudience } from '../types';

/**
 * Checks if the viewer has permission to view the target user's Last Seen timestamp.
 * Follows industry-standard reciprocal privacy rules (like WhatsApp / Signal):
 * If the target user restricts Last Seen, or if the viewer disables their own Last Seen,
 * the timestamp is hidden.
 */
export function canViewLastSeen(
  viewer?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (viewer?.id === target.id) return true;
  if (viewer?.role === 'admin') return true;

  // Check target user's preference
  if (target.settings?.showLastSeen === false) return false;

  const targetPrivacy: PrivacyAudience = target.settings?.lastSeenPrivacy || 'everyone';
  if (targetPrivacy === 'nobody') return false;
  if (targetPrivacy === 'connections' && !isConnected) return false;

  // Reciprocal privacy check: if viewer hides their own last seen, they cannot see others
  if (viewer) {
    if (viewer.settings?.showLastSeen === false) return false;
    const viewerPrivacy: PrivacyAudience = viewer.settings?.lastSeenPrivacy || 'everyone';
    if (viewerPrivacy === 'nobody') return false;
  }

  return true;
}

/**
 * Checks if the viewer can see whether the target user is currently Online / Active now.
 */
export function canViewOnlineStatus(
  viewer?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (viewer?.id === target.id) return true;
  if (viewer?.role === 'admin') return true;

  // Check target user's live presence toggle
  if (target.settings?.showOnlineStatus === false) return false;

  const targetOnlinePrivacy: OnlineAudience = target.settings?.onlineStatusPrivacy || 'everyone';
  if (targetOnlinePrivacy === 'nobody') return false;

  if (targetOnlinePrivacy === 'same_as_last_seen') {
    return canViewLastSeen(viewer, target, isConnected);
  }

  if (targetOnlinePrivacy === 'connections' && !isConnected) return false;

  // Reciprocal privacy check
  if (viewer && viewer.settings?.showOnlineStatus === false) {
    return false;
  }

  return true;
}

/**
 * Checks if viewer is permitted to see the target's profile photo.
 */
export function canViewProfilePhoto(
  viewer?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (viewer?.id === target.id || viewer?.role === 'admin') return true;

  const privacy: PrivacyAudience = target.settings?.profilePhotoPrivacy || 'everyone';
  if (privacy === 'nobody') return false;
  if (privacy === 'connections' && !isConnected) return false;

  return true;
}

/**
 * Checks if viewer is permitted to see the target's bio / about.
 */
export function canViewBio(
  viewer?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (viewer?.id === target.id || viewer?.role === 'admin') return true;

  const privacy: PrivacyAudience = target.settings?.bioPrivacy || 'everyone';
  if (privacy === 'nobody') return false;
  if (privacy === 'connections' && !isConnected) return false;

  return true;
}

/**
 * Checks if the viewer can make voice/video calls to the target user based on privacy settings.
 */
export function canMakeCallTo(
  viewer?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (viewer?.id === target.id || viewer?.role === 'admin') return true;

  const audience: PrivacyAudience = target.settings?.allowCallsFrom || 'everyone';
  if (audience === 'nobody') return false;
  if (audience === 'connections' && !isConnected) return false;

  return true;
}

/**
 * Checks if the inviter can add the target user to a group based on their privacy settings.
 */
export function canInviteUserToGroup(
  inviter?: NexxoUser | null,
  target?: NexxoUser | null,
  isConnected: boolean = false
): boolean {
  if (!target) return false;
  if (inviter?.id === target.id || inviter?.role === 'admin') return true;

  const audience: PrivacyAudience = target.settings?.allowGroupInvites || 'everyone';
  if (audience === 'nobody') return false;
  if (audience === 'connections' && !isConnected) return false;

  return true;
}

/**
 * Formats a user's last seen time into a friendly, localized human string.
 * Example outputs:
 * - "Active now" (if online)
 * - "Last seen just now" (< 60s ago)
 * - "Last seen 5m ago" (< 60m ago)
 * - "Last seen today at 3:45 PM"
 * - "Last seen yesterday at 11:20 AM"
 * - "Last seen Wednesday at 7:15 PM"
 * - "Last seen 12 Sep at 4:30 PM"
 */
export function formatLastSeen(lastActiveAt?: any, isOnline?: boolean): string {
  if (isOnline) {
    return 'Active now';
  }

  if (!lastActiveAt) {
    return 'Offline';
  }

  let date: Date;
  if (typeof lastActiveAt === 'number') {
    date = new Date(lastActiveAt);
  } else if (lastActiveAt?.toMillis && typeof lastActiveAt.toMillis === 'function') {
    date = new Date(lastActiveAt.toMillis());
  } else if (lastActiveAt?.seconds && typeof lastActiveAt.seconds === 'number') {
    date = new Date(lastActiveAt.seconds * 1000);
  } else if (lastActiveAt instanceof Date) {
    date = lastActiveAt;
  } else if (typeof lastActiveAt === 'string') {
    date = new Date(lastActiveAt);
  } else {
    return 'Offline';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (isNaN(date.getTime()) || diffMs < 0) {
    return 'Offline';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return 'Last seen just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Last seen ${diffMin}m ago`;
  }

  // Format time (e.g., "3:45 PM")
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  const nowDate = new Date();
  const isToday =
    nowDate.getDate() === date.getDate() &&
    nowDate.getMonth() === date.getMonth() &&
    nowDate.getFullYear() === date.getFullYear();

  if (isToday) {
    return `Last seen today at ${timeStr}`;
  }

  const yesterday = new Date();
  yesterday.setDate(nowDate.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  }

  // If within last 6 days, show day name (e.g., "Last seen Tuesday at 4:15 PM")
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString([], { weekday: 'long' });
    return `Last seen ${dayName} at ${timeStr}`;
  }

  // Older dates
  const dateMonthStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `Last seen ${dateMonthStr} at ${timeStr}`;
}

/**
 * Returns human-friendly label for PrivacyAudience.
 */
export function getPrivacyAudienceLabel(audience?: PrivacyAudience): string {
  switch (audience) {
    case 'everyone':
      return 'Everyone';
    case 'connections':
      return 'My Connections';
    case 'nobody':
      return 'Nobody';
    default:
      return 'Everyone';
  }
}

/**
 * Returns human-friendly label for OnlineAudience.
 */
export function getOnlineAudienceLabel(audience?: OnlineAudience): string {
  switch (audience) {
    case 'everyone':
      return 'Everyone';
    case 'connections':
      return 'My Connections';
    case 'same_as_last_seen':
      return 'Same as Last Seen';
    case 'nobody':
      return 'Nobody';
    default:
      return 'Everyone';
  }
}
