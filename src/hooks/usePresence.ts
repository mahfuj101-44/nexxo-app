import { useEffect } from 'react';
import { setUserPresence } from '../lib/userService';
import { auth } from '../lib/firebase';
import { PresenceStatus } from '../types';

export function usePresence(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const getPreferredPresence = (): PresenceStatus => {
      try {
        const stored = localStorage.getItem('nexxo_manual_presence') as PresenceStatus | null;
        if (stored && ['online', 'offline', 'away', 'busy', 'dnd'].includes(stored)) {
          return stored;
        }
      } catch {}
      return 'online';
    };

    const safeUpdate = (status: PresenceStatus) => {
      if (!isMounted && status !== 'offline') return;
      if (auth.currentUser && auth.currentUser.uid === userId) {
        setUserPresence(userId, status).catch(() => {});
      }
    };

    // Mark current preferred presence on active session
    const activePref = getPreferredPresence();
    safeUpdate(activePref);

    // Heartbeat to keep lastActiveAt fresh every 45s while tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const pref = getPreferredPresence();
        safeUpdate(pref);
      }
    }, 45000);

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      const pref = getPreferredPresence();
      if (document.visibilityState === 'hidden') {
        if (pref === 'online') {
          safeUpdate('away');
        }
      } else {
        safeUpdate(pref);
      }
    };

    // Handle window beforeunload
    const handleBeforeUnload = () => {
      safeUpdate('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      safeUpdate('offline');
    };
  }, [userId]);
}
