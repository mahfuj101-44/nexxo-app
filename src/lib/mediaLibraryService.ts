import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { UserMediaItem, UserMediaType, NexxoUser } from '../types';

export const VAULT_LIMITS = {
  FREE_MB: 250,
  PRO_MB: 1024,      // 1 GB for Blue Tick Verified users
  VIP_MB: 5120,      // 5 GB for VIP Gold Badge users
} as const;

/**
 * Returns the maximum media vault storage in Megabytes for a given user.
 * Pro / Blue Tick: 1 GB (1,024 MB)
 * VIP: 5 GB (5,120 MB)
 * Free / Standard: 250 MB
 */
export function getUserVaultQuotaMB(user: NexxoUser | null | undefined): number {
  if (!user) return VAULT_LIMITS.FREE_MB;
  if (user.premiumTier === 'vip') return VAULT_LIMITS.VIP_MB;
  if (user.isVerified || user.isPremium) return VAULT_LIMITS.PRO_MB;
  return VAULT_LIMITS.FREE_MB;
}

/**
 * Returns the maximum media vault storage in Bytes.
 */
export function getUserVaultQuotaBytes(user: NexxoUser | null | undefined): number {
  return getUserVaultQuotaMB(user) * 1024 * 1024;
}

/**
 * Human-readable size format (KB, MB, GB).
 */
export function formatStorageSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Subscribes to real-time media items uploaded or saved by the user.
 */
export function subscribeToUserMedia(
  userId: string,
  onUpdate: (items: UserMediaItem[]) => void
): () => void {
  const q = query(
    collection(db, 'userMedia'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserMediaItem[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserMediaItem);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Error fetching user media:', err);
    }
  );
}

/**
 * Saves a new media item record to the user's media library.
 */
export async function saveUserMediaItem(
  item: Omit<UserMediaItem, 'id' | 'createdAt'>
): Promise<string> {
  const id = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await setDoc(doc(db, 'userMedia', id), {
    ...item,
    id,
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * Deletes a media item from the user's library and removes from Firebase Storage.
 */
export async function deleteUserMediaItem(itemId: string, storagePath?: string): Promise<void> {
  await deleteDoc(doc(db, 'userMedia', itemId));

  if (storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Could not delete storage object:', e);
    }
  }
}
