import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserSettings } from '../types';

const DND_STORAGE_KEY = 'nexxo_dnd_active';
const DND_UNTIL_STORAGE_KEY = 'nexxo_dnd_until';
const DND_REASON_STORAGE_KEY = 'nexxo_dnd_reason';
const DND_EVENT_NAME = 'nexxo_dnd_changed';

export interface DndState {
  isActive: boolean;
  until: number | null; // epoch ms or null for indefinite
  remainingMs: number | null;
  reason?: string;
}

/**
 * Check if Do Not Disturb mode is currently active (taking expiration into account).
 */
export function isDndActive(): boolean {
  try {
    const rawActive = localStorage.getItem(DND_STORAGE_KEY);
    if (rawActive !== 'true') return false;

    const rawUntil = localStorage.getItem(DND_UNTIL_STORAGE_KEY);
    if (rawUntil) {
      const untilEpoch = parseInt(rawUntil, 10);
      if (!isNaN(untilEpoch) && untilEpoch > 0) {
        if (Date.now() >= untilEpoch) {
          // Time expired, auto turn off
          localStorage.removeItem(DND_STORAGE_KEY);
          localStorage.removeItem(DND_UNTIL_STORAGE_KEY);
          localStorage.removeItem(DND_REASON_STORAGE_KEY);
          window.dispatchEvent(
            new CustomEvent(DND_EVENT_NAME, { detail: { isActive: false, until: null } })
          );
          return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get detailed DND state.
 */
export function getDndState(): DndState {
  const active = isDndActive();
  if (!active) {
    return { isActive: false, until: null, remainingMs: null };
  }

  let until: number | null = null;
  let remainingMs: number | null = null;
  const rawUntil = localStorage.getItem(DND_UNTIL_STORAGE_KEY);
  if (rawUntil) {
    const parsed = parseInt(rawUntil, 10);
    if (!isNaN(parsed) && parsed > 0) {
      until = parsed;
      remainingMs = Math.max(0, until - Date.now());
    }
  }

  const reason = localStorage.getItem(DND_REASON_STORAGE_KEY) || undefined;
  return { isActive: true, until, remainingMs, reason };
}

/**
 * Set Do Not Disturb mode on or off, optionally for a specified duration in minutes.
 * @param enabled whether DND is on
 * @param durationMinutes duration in minutes (null/undefined = indefinite until turned off)
 * @param userId optional current user UID to persist to Firestore
 * @param reason optional status reason (e.g. "In a meeting", "Focusing")
 */
export async function setDndMode(
  enabled: boolean,
  durationMinutes?: number | null,
  userId?: string,
  reason?: string
): Promise<DndState> {
  let until: number | null = null;

  if (enabled) {
    if (durationMinutes && durationMinutes > 0) {
      until = Date.now() + durationMinutes * 60 * 1000;
    }

    localStorage.setItem(DND_STORAGE_KEY, 'true');
    if (until) {
      localStorage.setItem(DND_UNTIL_STORAGE_KEY, until.toString());
    } else {
      localStorage.removeItem(DND_UNTIL_STORAGE_KEY);
    }

    if (reason) {
      localStorage.setItem(DND_REASON_STORAGE_KEY, reason);
    } else {
      localStorage.removeItem(DND_REASON_STORAGE_KEY);
    }
  } else {
    localStorage.removeItem(DND_STORAGE_KEY);
    localStorage.removeItem(DND_UNTIL_STORAGE_KEY);
    localStorage.removeItem(DND_REASON_STORAGE_KEY);
  }

  const newState: DndState = {
    isActive: enabled,
    until,
    remainingMs: until ? Math.max(0, until - Date.now()) : null,
    reason: enabled ? reason : undefined,
  };

  // Dispatch local event for instant reactivity across all components
  window.dispatchEvent(
    new CustomEvent(DND_EVENT_NAME, { detail: newState })
  );

  // Sync to Firestore user profile settings if user is authenticated
  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'settings.doNotDisturb': enabled,
        'settings.dndUntil': until,
      });
    } catch (err) {
      console.debug('Failed to sync DND setting to Firestore user document:', err);
    }
  }

  return newState;
}

/**
 * Synchronize local DND state when user profile is loaded from Firestore.
 */
export function syncDndWithUserSettings(settings?: UserSettings): void {
  if (!settings) return;
  if (settings.doNotDisturb) {
    if (settings.dndUntil && Date.now() >= settings.dndUntil) {
      // Expired in cloud
      return;
    }
    localStorage.setItem(DND_STORAGE_KEY, 'true');
    if (settings.dndUntil) {
      localStorage.setItem(DND_UNTIL_STORAGE_KEY, settings.dndUntil.toString());
    } else {
      localStorage.removeItem(DND_UNTIL_STORAGE_KEY);
    }
  }
}

/**
 * Subscribe to Do Not Disturb changes.
 */
export function subscribeToDnd(callback: (state: DndState) => void): () => void {
  const handler = () => {
    callback(getDndState());
  };

  // Immediate callback
  callback(getDndState());

  window.addEventListener(DND_EVENT_NAME, handler);

  // Periodic check to auto-expire timed DND
  const interval = setInterval(() => {
    const curr = getDndState();
    callback(curr);
  }, 15000);

  return () => {
    window.removeEventListener(DND_EVENT_NAME, handler);
    clearInterval(interval);
  };
}

/**
 * Helper to format DND status and remaining time for user display.
 */
export function formatDndLabel(until: number | null): string {
  if (!until) return 'Until turned off';
  const remainingMinutes = Math.round((until - Date.now()) / (60 * 1000));
  if (remainingMinutes <= 0) return 'Expiring now';
  if (remainingMinutes < 60) return `For ${remainingMinutes}m`;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  return mins > 0 ? `For ${hours}h ${mins}m` : `For ${hours}h`;
}
