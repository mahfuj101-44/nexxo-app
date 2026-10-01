import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { NexxoUser, UserSettings, PresenceStatus } from '../types';

// Designate the bootstrap admin from runtime metadata
export const BOOTSTRAP_ADMIN_EMAIL = 'mahfuj101.mtw@gmail.com';

// Generate a random block for Permanent NEXXO ID (NX-XXXX-XXXX)
// Uses alphanumeric characters excluding confusing glyphs (0, O, 1, I, L)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRandomBlock(length = 4): string {
  let result = '';
  const cryptoObj = window.crypto || (window as any).msCrypto;
  const values = new Uint32Array(length);
  cryptoObj.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += CHARSET[values[i] % CHARSET.length];
  }
  return result;
}

export function generateCandidateNexxoId(): string {
  return `NX-${generateRandomBlock(4)}-${generateRandomBlock(4)}`;
}

// Clean and sanitize username string
export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export function isValidUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long.' };
  }
  if (username.length > 20) {
    return { valid: false, reason: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}

// Ensure and register user profile upon Google Auth login
export async function syncOrRegisterUser(firebaseUser: FirebaseUser): Promise<NexxoUser> {
  const userRef = doc(db, 'users', firebaseUser.uid);

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Existing user: Update lastActiveAt & presence
      const existingData = userSnap.data() as NexxoUser;
      const isAdminEmail = firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL;
      const updates: Partial<NexxoUser> = {
        presence: 'online',
        lastActiveAt: serverTimestamp(),
      };

      if (isAdminEmail && existingData.role !== 'admin') {
        updates.role = 'admin';
      }

      await updateDoc(userRef, updates);
      return {
        ...existingData,
        ...updates,
      };
    }

    // New User: Atomically provision permanent NEXXO ID, unique username, and profile
    return await provisionNewUser(firebaseUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }
}

// Atomic provisioning with transaction
async function provisionNewUser(firebaseUser: FirebaseUser): Promise<NexxoUser> {
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || '';
  const displayName = firebaseUser.displayName || 'NEXXO Explorer';
  const photoURL = firebaseUser.photoURL || '';

  // Base username from Google display name or email prefix
  let baseUsername = sanitizeUsername(
    displayName.replace(/\s+/g, '_') || email.split('@')[0] || 'user'
  );
  if (baseUsername.length < 3) baseUsername = `user_${baseUsername}`;

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const candidateNexxoId = generateCandidateNexxoId();
    const candidateUsername = attempts === 1 ? baseUsername : `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
    const candidateUsernameLower = candidateUsername.toLowerCase();

    try {
      const userProfile = await runTransaction(db, async (transaction) => {
        const nexxoIdRef = doc(db, 'nexxoIds', candidateNexxoId);
        const usernameRef = doc(db, 'usernames', candidateUsernameLower);
        const userDocRef = doc(db, 'users', uid);

        // Read phase
        const nexxoIdDoc = await transaction.get(nexxoIdRef);
        if (nexxoIdDoc.exists()) {
          throw new Error('COLLISION_NEXXO_ID');
        }

        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists()) {
          throw new Error('COLLISION_USERNAME');
        }

        const isAdmin = email === BOOTSTRAP_ADMIN_EMAIL;

        const newUser: NexxoUser = {
          id: uid,
          nexxoId: candidateNexxoId,
          email,
          displayName,
          username: candidateUsername,
          usernameLower: candidateUsernameLower,
          photoURL,
          bio: 'Connecting globally with NEXXO.',
          status: 'active',
          presence: 'online',
          role: isAdmin ? 'admin' : 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          settings: {
            discoveryAllowed: true,
            showOnlineStatus: true,
            showLastSeen: true,
            themeMode: 'light',
          }
        };

        // Write phase
        transaction.set(nexxoIdRef, { uid, assignedAt: serverTimestamp() });
        transaction.set(usernameRef, { uid, createdAt: serverTimestamp() });
        transaction.set(userDocRef, newUser);

        if (isAdmin) {
          const adminRef = doc(db, 'adminRoles', uid);
          transaction.set(adminRef, {
            uid,
            email,
            role: 'superadmin',
            assignedAt: serverTimestamp(),
          });
        }

        return newUser;
      });

      return userProfile;
    } catch (err: any) {
      if (err.message === 'COLLISION_NEXXO_ID' || err.message === 'COLLISION_USERNAME') {
        continue;
      }
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  }

  throw new Error('Failed to allocate unique permanent NEXXO ID or Username after multiple attempts.');
}

// Real-time listener for current user document
export async function getUserProfile(uid: string): Promise<NexxoUser | null> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as NexxoUser) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

export function subscribeToUserProfile(
  uid: string,
  onUpdate: (user: NexxoUser | null) => void,
  onError?: (err: any) => void
) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as NexxoUser);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn(`Notice subscribing to user profile ${uid}:`, err);
      if (onError) onError(err);
    }
  );
}

// Update editable user profile properties
export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    bio?: string;
    photoURL?: string;
    settings?: UserSettings;
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// Change username with uniqueness guarantee
export async function changeUsername(uid: string, newUsername: string, currentUsernameLower: string): Promise<void> {
  const validation = isValidUsername(newUsername);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const newLower = newUsername.toLowerCase();
  if (newLower === currentUsernameLower) return;

  try {
    await runTransaction(db, async (transaction) => {
      const newUsernameRef = doc(db, 'usernames', newLower);
      const oldUsernameRef = doc(db, 'usernames', currentUsernameLower);
      const userRef = doc(db, 'users', uid);

      // Check if new username exists
      const targetDoc = await transaction.get(newUsernameRef);
      if (targetDoc.exists()) {
        throw new Error(`The username '@${newLower}' is already claimed by another user.`);
      }

      // Reserve new username
      transaction.set(newUsernameRef, { uid, createdAt: serverTimestamp() });
      // Delete old username
      transaction.delete(oldUsernameRef);
      // Update user document
      transaction.update(userRef, {
        username: newUsername,
        usernameLower: newLower,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `usernames/${newLower}`);
  }
}

// Set user presence status
export async function setUserPresence(uid: string, presence: PresenceStatus): Promise<void> {
  // If user is not authenticated or not matching the target uid, skip update safely
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }

  // Persist preference locally
  try {
    localStorage.setItem('nexxo_manual_presence', presence);
  } catch {}

  const userRef = doc(db, 'users', uid);
  const presenceRef = doc(db, 'presence', uid);
  const payload = {
    presence,
    lastActiveAt: serverTimestamp(),
  };

  try {
    await Promise.allSettled([
      // Update the user profile document (fallback to merge if initializing)
      updateDoc(userRef, payload).catch(async (err: any) => {
        if (err?.code === 'not-found' || err?.message?.includes('No document to update')) {
          await setDoc(userRef, payload, { merge: true }).catch(() => {});
        }
      }),
      // Maintain real-time status in the dedicated presence collection
      setDoc(
        presenceRef,
        {
          userId: uid,
          ...payload,
        },
        { merge: true }
      ).catch(() => {}),
    ]);
  } catch (error: any) {
    // If permission was denied or not found during auth transition, logout, or unload, handle gracefully
    if (
      error?.code === 'permission-denied' ||
      error?.code === 'not-found' ||
      error?.message?.includes('insufficient permissions') ||
      error?.message?.includes('No document to update')
    ) {
      return;
    }
    console.debug('Presence update suppressed:', error?.message || error);
  }
}

/**
 * Set custom status message and emoji in user profile settings
 */
export async function setUserCustomStatus(
  uid: string,
  customStatusText: string,
  customStatusEmoji?: string
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }

  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      'settings.customStatusText': customStatusText.trim(),
      'settings.customStatusEmoji': customStatusEmoji || '',
    });
  } catch (err) {
    console.debug('Custom status update error:', err);
  }
}

/**
 * Real-time listener for a specific user's presence
 */
export function subscribeToPresence(
  uid: string,
  onUpdate: (data: { presence: PresenceStatus; lastActiveAt?: any } | null) => void
): () => void {
  if (!uid || typeof uid !== 'string') {
    onUpdate(null);
    return () => {};
  }
  const presenceRef = doc(db, 'presence', uid);
  return onSnapshot(
    presenceRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as any);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.debug('Presence subscription warning:', err?.message || err);
    }
  );
}

/**
 * Real-time listener for active presence map across authenticated users
 */
export function subscribeToAllPresence(
  onUpdate: (presenceMap: Record<string, { presence: PresenceStatus; lastActiveAt?: any }>) => void
): () => void {
  const presenceCol = collection(db, 'presence');
  return onSnapshot(
    presenceCol,
    (snapshot) => {
      const map: Record<string, { presence: PresenceStatus; lastActiveAt?: any }> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId) {
          map[data.userId] = {
            presence: (data.presence as PresenceStatus) || 'offline',
            lastActiveAt: data.lastActiveAt,
          };
        }
      });
      onUpdate(map);
    },
    (err) => {
      console.debug('All-presence subscription warning:', err?.message || err);
    }
  );
}

export async function findUserByNexxoId(nexxoId: string): Promise<NexxoUser | null> {
  const cleanId = nexxoId.toUpperCase().trim();
  const q = query(collection(db, 'users'), where('nexxoId', '==', cleanId), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as NexxoUser;
  }
  return null;
}

export async function findUserByUsername(username: string): Promise<NexxoUser | null> {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  const q = query(collection(db, 'users'), where('usernameLower', '==', clean), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as NexxoUser;
  }
  return null;
}

/**
 * Toggle or set verified blue tick status and premium status on a user profile (Admin only)
 */
export async function toggleUserVerification(
  userId: string,
  isVerified: boolean,
  isPremium?: boolean,
  premiumTier: 'basic' | 'pro' | 'vip' = 'pro'
): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Unauthorized. Sign-in required.');
  }

  const userRef = doc(db, 'users', userId);
  const updates: Partial<NexxoUser> = {
    isVerified,
    isPremium: isPremium !== undefined ? isPremium : isVerified,
    premiumTier: isVerified ? premiumTier : 'basic',
    updatedAt: serverTimestamp(),
  };
  await updateDoc(userRef, updates);
}

