import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Connection, ConnectionRequest, DailyConnectionLimitStats, NexxoUser } from '../types';

export const DEFAULT_DAILY_REQUEST_LIMIT = 15;
export const PREMIUM_DAILY_REQUEST_LIMIT = 50;

export function getTodayDateKey(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export function formatCooldownTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Fetch current user's daily request limit stats for today
 */
export async function getDailyRequestLimitStats(
  userId: string,
  isPremium: boolean = false,
  isAdmin: boolean = false
): Promise<DailyConnectionLimitStats> {
  const dateKey = getTodayDateKey();
  const limitRef = doc(db, 'dailyLimits', `${userId}_${dateKey}`);
  const limit = isAdmin || isPremium ? PREMIUM_DAILY_REQUEST_LIMIT : DEFAULT_DAILY_REQUEST_LIMIT;

  try {
    const snap = await getDoc(limitRef);
    const used = snap.exists() ? Number(snap.data()?.count || 0) : 0;
    const remaining = Math.max(0, limit - used);
    return {
      used,
      limit,
      remaining,
      resetAt: '00:00 UTC',
      isExceeded: remaining <= 0,
    };
  } catch (error) {
    console.warn('Notice checking daily limits:', error);
    return {
      used: 0,
      limit,
      remaining: limit,
      resetAt: '00:00 UTC',
      isExceeded: false,
    };
  }
}

/**
 * Live subscribe to daily limit stats for the active user
 */
export function subscribeToDailyLimitStats(
  userId: string,
  isPremium: boolean = false,
  isAdmin: boolean = false,
  onUpdate: (stats: DailyConnectionLimitStats) => void
): () => void {
  const dateKey = getTodayDateKey();
  const limitRef = doc(db, 'dailyLimits', `${userId}_${dateKey}`);
  const limit = isAdmin || isPremium ? PREMIUM_DAILY_REQUEST_LIMIT : DEFAULT_DAILY_REQUEST_LIMIT;

  return onSnapshot(
    limitRef,
    (snap) => {
      const used = snap.exists() ? Number(snap.data()?.count || 0) : 0;
      const remaining = Math.max(0, limit - used);
      onUpdate({
        used,
        limit,
        remaining,
        resetAt: '00:00 UTC',
        isExceeded: remaining <= 0,
      });
    },
    (error) => {
      console.warn('Notice listening to daily limit stats:', error);
      onUpdate({
        used: 0,
        limit,
        remaining: limit,
        resetAt: '00:00 UTC',
        isExceeded: false,
      });
    }
  );
}

/**
 * Increments user's daily request count for today
 */
export async function recordDailyRequestSent(userId: string): Promise<void> {
  const dateKey = getTodayDateKey();
  const limitRef = doc(db, 'dailyLimits', `${userId}_${dateKey}`);
  try {
    await setDoc(
      limitRef,
      {
        userId,
        date: dateKey,
        count: increment(1),
        lastSentAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Notice recording daily request limit counter:', e);
  }
}

export function makeConnectionId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Send connection request
export async function sendConnectionRequest(
  fromUserId: string,
  toUserId: string,
  fromUserIsPremium: boolean = false,
  fromUserIsAdmin: boolean = false
): Promise<string> {
  if (fromUserId === toUserId) {
    throw new Error('You cannot send a connection request to yourself.');
  }

  // 1. Verify Daily Connection Request Limit
  const dailyStats = await getDailyRequestLimitStats(fromUserId, fromUserIsPremium, fromUserIsAdmin);
  if (dailyStats.isExceeded) {
    const cooldown = formatCooldownTime(getSecondsUntilMidnightUTC());
    throw new Error(
      `Daily connection request limit reached (${dailyStats.used}/${dailyStats.limit}). Resets in ${cooldown} (at 00:00 UTC) to maintain safety.`
    );
  }

  const connectionId = makeConnectionId(fromUserId, toUserId);
  const connRef = doc(db, 'connections', connectionId);
  try {
    const connSnap = await getDoc(connRef);
    if (connSnap.exists() && connSnap.data()?.status === 'connected') {
      throw new Error('You are already connected with this user.');
    }
  } catch (err: any) {
    if (err.message?.includes('already connected')) throw err;
  }

  // Check if a reverse request is already pending (they invited us)
  const reverseRequestId = `${toUserId}_${fromUserId}`;
  try {
    const reverseSnap = await getDoc(doc(db, 'connectionRequests', reverseRequestId));
    if (reverseSnap.exists() && reverseSnap.data()?.status === 'pending') {
      // Auto-accept: both users want to connect!
      await acceptConnectionRequest(reverseRequestId, toUserId, fromUserId);
      await recordDailyRequestSent(fromUserId);
      return reverseRequestId;
    }
  } catch (err) {
    console.warn('Notice checking reverse request:', err);
  }

  const requestId = `${fromUserId}_${toUserId}`;
  const reqRef = doc(db, 'connectionRequests', requestId);

  try {
    await setDoc(reqRef, {
      id: requestId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Record limit consumption
    await recordDailyRequestSent(fromUserId);
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `connectionRequests/${requestId}`);
  }
}

// Instant Direct Connection (1-Click Connect)
export async function connectUsersDirectly(
  fromUserId: string,
  toUserId: string
): Promise<string> {
  if (fromUserId === toUserId) {
    throw new Error('Cannot connect to yourself.');
  }

  const connectionId = makeConnectionId(fromUserId, toUserId);
  const connRef = doc(db, 'connections', connectionId);
  const chatRef = doc(db, 'chats', connectionId);
  const batch = writeBatch(db);

  try {
    batch.set(connRef, {
      id: connectionId,
      user1Id: fromUserId,
      user2Id: toUserId,
      users: [fromUserId, toUserId],
      status: 'connected',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    batch.set(chatRef, {
      id: connectionId,
      participants: [fromUserId, toUserId],
      lastMessage: 'Connection established. Say hello!',
      lastMessageSenderId: fromUserId,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();
    return connectionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `connections/${connectionId}`);
  }
}

// Accept connection request
export async function acceptConnectionRequest(
  requestId: string,
  fromUserId: string,
  toUserId: string
): Promise<string> {
  const batch = writeBatch(db);
  const reqRef = doc(db, 'connectionRequests', requestId);
  const connectionId = makeConnectionId(fromUserId, toUserId);
  const connRef = doc(db, 'connections', connectionId);
  const chatRef = doc(db, 'chats', connectionId);

  try {
    // 1. Mark request accepted
    batch.update(reqRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });

    // 2. Create connection record
    batch.set(connRef, {
      id: connectionId,
      user1Id: fromUserId,
      user2Id: toUserId,
      users: [fromUserId, toUserId],
      status: 'connected',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. Initialize direct chat room for immediate real-time messaging
    batch.set(chatRef, {
      id: connectionId,
      participants: [fromUserId, toUserId],
      lastMessage: 'Connection established. Say hello!',
      lastMessageSenderId: toUserId,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();
    return connectionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `connections/${connectionId}`);
  }
}

// Decline connection request
export async function declineConnectionRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'connectionRequests', requestId);
  try {
    await updateDoc(reqRef, {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `connectionRequests/${requestId}`);
  }
}

// Cancel / withdraw an outgoing connection request
export async function cancelConnectionRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'connectionRequests', requestId);
  try {
    await deleteDoc(reqRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `connectionRequests/${requestId}`);
  }
}

// Remove connection
export async function removeConnection(connectionId: string): Promise<void> {
  const connRef = doc(db, 'connections', connectionId);
  try {
    await deleteDoc(connRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `connections/${connectionId}`);
  }
}

// Block user
export async function blockUserConnection(connectionId: string, currentUserId: string): Promise<void> {
  const connRef = doc(db, 'connections', connectionId);
  try {
    await updateDoc(connRef, {
      status: 'blocked',
      blockedBy: currentUserId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `connections/${connectionId}`);
  }
}

// Unblock user connection
export async function unblockUserConnection(connectionId: string): Promise<void> {
  const connRef = doc(db, 'connections', connectionId);
  try {
    await updateDoc(connRef, {
      status: 'connected',
      blockedBy: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `connections/${connectionId}`);
  }
}

// Real-time listener for user's established connections
export function subscribeToConnections(
  currentUserId: string,
  onUpdate: (connections: Connection[]) => void
) {
  const q = query(
    collection(db, 'connections'),
    where('users', 'array-contains', currentUserId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Connection[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const users = Array.isArray(data.users)
          ? data.users
          : [data.user1Id, data.user2Id].filter(Boolean);
        list.push({
          id: docSnap.id,
          user1Id: data.user1Id || users[0] || '',
          user2Id: data.user2Id || users[1] || '',
          users,
          status: data.status || 'connected',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Connection);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Notice subscribing to connections:', error);
      onUpdate([]);
    }
  );
}

// Real-time listener for incoming pending connection requests
export function subscribeToIncomingRequests(
  currentUserId: string,
  onUpdate: (requests: ConnectionRequest[]) => void
) {
  const q = query(
    collection(db, 'connectionRequests'),
    where('toUserId', '==', currentUserId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConnectionRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ConnectionRequest, 'id'>) });
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Notice subscribing to incoming requests:', error);
      onUpdate([]);
    }
  );
}

// Real-time listener for outgoing pending connection requests
export function subscribeToOutgoingRequests(
  currentUserId: string,
  onUpdate: (requests: ConnectionRequest[]) => void
) {
  const q = query(
    collection(db, 'connectionRequests'),
    where('fromUserId', '==', currentUserId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConnectionRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ConnectionRequest, 'id'>) });
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Notice subscribing to outgoing requests:', error);
      onUpdate([]);
    }
  );
}
