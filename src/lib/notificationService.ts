import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, NotificationType } from '../types';
import { isDndActive } from './dndService';

let audioCtx: AudioContext | null = null;

export function playNotificationTone(type: 'message' | 'call' | 'ping' = 'message') {
  // Respect Do Not Disturb mode
  if (isDndActive()) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'call') {
      // Ring chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Gentle notification pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // AudioContext autoplay restrictions or inactive tab
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (isDndActive()) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon.png',
        badge: '/icon.png',
        ...options,
      });
    } catch {
      // Service worker or system restriction fallback
    }
  }
}

export async function createInAppNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const notifData: AppNotification = {
    id: notifId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data || {},
    isRead: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'notifications', notifId), notifData);
}

export function subscribeToUserNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as AppNotification);
      onUpdate(list);
    },
    (err) => console.error('Error listening to notifications:', err)
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), {
    isRead: true,
  });
}

export async function clearNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notificationId));
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snapshot = await import('firebase/firestore').then(({ getDocs }) => getDocs(q));
  const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
}

export const subscribeToNotifications = subscribeToUserNotifications;
export const playNotificationChime = playNotificationTone;
