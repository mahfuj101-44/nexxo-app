import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Block, Report, ReportReason, ReportStatus, ReportTargetType, NexxoUser } from '../types';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) return;
  const blockId = `${blockerId}_${blockedId}`;

  // 1. Create entry in blocks collection
  await setDoc(doc(db, 'blocks', blockId), {
    id: blockId,
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });

  // 2. Synchronize any existing direct connection
  try {
    const qConn = query(
      collection(db, 'connections'),
      where('users', 'array-contains', blockerId)
    );
    const snap = await getDocs(qConn);
    for (const d of snap.docs) {
      const data = d.data();
      if (Array.isArray(data.users) && data.users.includes(blockedId)) {
        await updateDoc(d.ref, {
          status: 'blocked',
          blockedBy: blockerId,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.debug('Error syncing connection on block:', err);
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId) return;
  const blockId = `${blockerId}_${blockedId}`;

  // 1. Remove from blocks collection
  await deleteDoc(doc(db, 'blocks', blockId)).catch(() => {});

  // 2. Synchronize any existing direct connection
  try {
    const qConn = query(
      collection(db, 'connections'),
      where('users', 'array-contains', blockerId)
    );
    const snap = await getDocs(qConn);
    for (const d of snap.docs) {
      const data = d.data();
      if (Array.isArray(data.users) && data.users.includes(blockedId) && data.blockedBy === blockerId) {
        await updateDoc(d.ref, {
          status: 'connected',
          blockedBy: null,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.debug('Error syncing connection on unblock:', err);
  }
}

export async function isUserBlocked(userA: string, userB: string): Promise<boolean> {
  if (!userA || !userB) return false;
  try {
    // Check if either A blocked B or B blocked A
    const [snapAtoB, snapBtoA] = await Promise.all([
      getDoc(doc(db, 'blocks', `${userA}_${userB}`)).catch(() => null),
      getDoc(doc(db, 'blocks', `${userB}_${userA}`)).catch(() => null),
    ]);

    return (snapAtoB && snapAtoB.exists()) || (snapBtoA && snapBtoA.exists()) || false;
  } catch (err) {
    console.debug('isUserBlocked check error:', err);
    return false;
  }
}

export function subscribeToBlockedUsers(
  currentUserId: string,
  onUpdate: (blockedUserIds: string[]) => void
): () => void {
  if (!currentUserId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, 'blocks'), where('blockerId', '==', currentUserId));
  return onSnapshot(
    q,
    (snap) => {
      const ids: string[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data && typeof data.blockedId === 'string' && data.blockedId.trim()) {
          ids.push(data.blockedId);
        }
      });
      onUpdate(ids);
    },
    (err) => console.error('Error listening to blocked users:', err)
  );
}

export function subscribeToBlockedUserDetails(
  currentUserId: string,
  onUpdate: (blockedUsers: NexxoUser[]) => void
): () => void {
  if (!currentUserId) {
    onUpdate([]);
    return () => {};
  }
  return subscribeToBlockedUsers(currentUserId, async (ids) => {
    if (ids.length === 0) {
      onUpdate([]);
      return;
    }
    const users: NexxoUser[] = [];
    for (const uid of ids) {
      try {
        const uSnap = await getDoc(doc(db, 'users', uid));
        if (uSnap.exists()) {
          users.push(uSnap.data() as NexxoUser);
        }
      } catch (e) {
        console.debug('Error loading blocked user profile:', e);
      }
    }
    onUpdate(users);
  });
}

export async function submitReport(params: {
  reporter: NexxoUser;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
}): Promise<string> {
  const reportId = 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const reportData: Report = {
    id: reportId,
    reporterId: params.reporter.id,
    reporterName: params.reporter.displayName || params.reporter.username,
    targetType: params.targetType,
    targetId: params.targetId,
    reason: params.reason,
    description: params.description.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'reports', reportId), reportData);
  return reportId;
}

export function subscribeToReports(onUpdate: (reports: Report[]) => void): () => void {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const reports = snap.docs.map((d) => d.data() as Report);
      onUpdate(reports);
    },
    (err) => console.error('Error listening to reports:', err)
  );
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<void> {
  const repRef = doc(db, 'reports', reportId);
  await updateDoc(repRef, {
    status,
    adminNotes: adminNotes || '',
    resolvedAt: serverTimestamp(),
  });
}
