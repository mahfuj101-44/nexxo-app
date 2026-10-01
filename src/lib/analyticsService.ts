import {
  collection,
  collectionGroup,
  query,
  where,
  getCountFromServer,
  Timestamp,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface RealtimeAnalyticsData {
  // User Activity (DAU / WAU / MAU)
  dau: number;
  wau: number;
  mau: number;
  onlineNow: number;
  stickiness: number; // (DAU / MAU) * 100

  // Message Volume
  totalMessages: number;
  messagesToday: number;
  totalChats: number;
  totalGroups: number;
  totalPosts: number;

  // Account Signups
  totalSignups: number;
  signupsToday: number;
  signupsWeek: number;
  signupsMonth: number;
  growthRatePct: number;

  // Real-time Communications & Media
  totalCalls: number;
  activeCalls: number;
  totalStories: number;
  totalChannels: number;
  totalCommunities: number;
  pendingReports: number;

  // Performance telemetry
  queryExecutionTimeMs: number;
  lastRefreshed: Date;
  queriesExecuted: number;
}

/**
 * Fetch platform analytics using native Firestore server-side aggregation queries (getCountFromServer).
 * Computes DAU, total message volume, new signups, and platform activity metrics.
 */
export async function fetchRealtimeAnalytics(): Promise<RealtimeAnalyticsData> {
  const startTime = performance.now();
  let queriesCount = 0;

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const ts24h = Timestamp.fromDate(twentyFourHoursAgo);
  const ts7d = Timestamp.fromDate(sevenDaysAgo);
  const ts30d = Timestamp.fromDate(thirtyDaysAgo);

  // Initialize analytics results
  const result: RealtimeAnalyticsData = {
    dau: 0,
    wau: 0,
    mau: 0,
    onlineNow: 0,
    stickiness: 0,
    totalMessages: 0,
    messagesToday: 0,
    totalChats: 0,
    totalGroups: 0,
    totalPosts: 0,
    totalSignups: 0,
    signupsToday: 0,
    signupsWeek: 0,
    signupsMonth: 0,
    growthRatePct: 0,
    totalCalls: 0,
    activeCalls: 0,
    totalStories: 0,
    totalChannels: 0,
    totalCommunities: 0,
    pendingReports: 0,
    queryExecutionTimeMs: 0,
    lastRefreshed: new Date(),
    queriesExecuted: 0,
  };

  const usersCol = collection(db, 'users');

  // 1. Total Registered Users & New Signups Aggregations
  try {
    const totalUsersSnap = await getCountFromServer(usersCol);
    result.totalSignups = totalUsersSnap.data().count;
    queriesCount++;

    // New signups in last 24h
    try {
      const qSignupsToday = query(usersCol, where('createdAt', '>=', ts24h));
      const signupsTodaySnap = await getCountFromServer(qSignupsToday);
      result.signupsToday = signupsTodaySnap.data().count;
      queriesCount++;
    } catch {
      // Fallback if index or timestamp format difference
    }

    // New signups in last 7 days
    try {
      const qSignupsWeek = query(usersCol, where('createdAt', '>=', ts7d));
      const signupsWeekSnap = await getCountFromServer(qSignupsWeek);
      result.signupsWeek = signupsWeekSnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }

    // New signups in last 30 days
    try {
      const qSignupsMonth = query(usersCol, where('createdAt', '>=', ts30d));
      const signupsMonthSnap = await getCountFromServer(qSignupsMonth);
      result.signupsMonth = signupsMonthSnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }
  } catch (err) {
    console.warn('Aggregation error on users signup:', err);
  }

  // 2. Active Users (DAU / WAU / MAU / Online) Aggregations
  try {
    // Online presence count
    const qOnline = query(usersCol, where('presence', '==', 'online'));
    const onlineSnap = await getCountFromServer(qOnline);
    result.onlineNow = onlineSnap.data().count;
    queriesCount++;

    // DAU: active in last 24 hours
    try {
      const qDau = query(usersCol, where('lastActiveAt', '>=', ts24h));
      const dauSnap = await getCountFromServer(qDau);
      result.dau = dauSnap.data().count;
      queriesCount++;
    } catch {
      // If lastActiveAt query needs composite index, fallback to inspecting users
    }

    // WAU: active in last 7 days
    try {
      const qWau = query(usersCol, where('lastActiveAt', '>=', ts7d));
      const wauSnap = await getCountFromServer(qWau);
      result.wau = wauSnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }

    // MAU: active in last 30 days
    try {
      const qMau = query(usersCol, where('lastActiveAt', '>=', ts30d));
      const mauSnap = await getCountFromServer(qMau);
      result.mau = mauSnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }

    // If DAU is 0 or unindexed, evaluate active snapshot with fallback inspection
    if (result.dau === 0 && result.totalSignups > 0) {
      const usersSampleSnap = await getDocs(query(usersCol, limit(100)));
      queriesCount++;
      let activeCount = 0;
      let wauCount = 0;
      let mauCount = 0;
      let signups24 = 0;
      let signups7d = 0;

      usersSampleSnap.forEach((doc) => {
        const u = doc.data();
        const activeTime = u.lastActiveAt?.toMillis ? u.lastActiveAt.toMillis() : u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
        const createdTime = u.createdAt?.toMillis ? u.createdAt.toMillis() : u.createdAt ? new Date(u.createdAt).getTime() : 0;

        if (activeTime >= twentyFourHoursAgo.getTime() || u.presence === 'online') activeCount++;
        if (activeTime >= sevenDaysAgo.getTime()) wauCount++;
        if (activeTime >= thirtyDaysAgo.getTime()) mauCount++;

        if (createdTime >= twentyFourHoursAgo.getTime()) signups24++;
        if (createdTime >= sevenDaysAgo.getTime()) signups7d++;
      });

      result.dau = Math.max(result.dau, activeCount, result.onlineNow);
      result.wau = Math.max(result.wau, wauCount, result.dau);
      result.mau = Math.max(result.mau, mauCount, result.wau);
      if (result.signupsToday === 0) result.signupsToday = signups24;
      if (result.signupsWeek === 0) result.signupsWeek = signups7d;
    }
  } catch (err) {
    console.warn('Aggregation error on active users:', err);
  }

  // Calculate Stickiness (DAU / MAU)
  if (result.mau > 0) {
    result.stickiness = Math.round((result.dau / result.mau) * 100);
  } else if (result.dau > 0) {
    result.stickiness = 100;
  }

  // Calculate Growth Rate
  const previousUsers = Math.max(1, result.totalSignups - result.signupsWeek);
  result.growthRatePct = Math.round((result.signupsWeek / previousUsers) * 100);

  // 3. Total Message Volume Aggregation
  try {
    const messagesGroup = collectionGroup(db, 'messages');
    const msgCountSnap = await getCountFromServer(messagesGroup);
    result.totalMessages = msgCountSnap.data().count;
    queriesCount++;

    // Messages sent today (last 24 hours)
    try {
      const qMsgToday = query(messagesGroup, where('createdAt', '>=', ts24h));
      const msgTodaySnap = await getCountFromServer(qMsgToday);
      result.messagesToday = msgTodaySnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }
  } catch (err) {
    console.warn('CollectionGroup messages aggregation warning:', err);
    // If collectionGroup requires index or permissions, calculate from active chats
    try {
      const chatsSnap = await getDocs(query(collection(db, 'chats'), limit(50)));
      queriesCount++;
      let estimatedMessages = 0;
      chatsSnap.forEach((doc) => {
        if (doc.data().lastMessage) estimatedMessages++;
      });
      result.totalMessages = Math.max(result.totalMessages, estimatedMessages);
    } catch {
      // safe fallback
    }
  }

  // 4. Structural Channels, Groups, & Chats Aggregations
  try {
    const chatsSnap = await getCountFromServer(collection(db, 'chats'));
    result.totalChats = chatsSnap.data().count;
    queriesCount++;

    const groupsSnap = await getCountFromServer(collection(db, 'groups'));
    result.totalGroups = groupsSnap.data().count;
    queriesCount++;

    const channelsSnap = await getCountFromServer(collection(db, 'channels'));
    result.totalChannels = channelsSnap.data().count;
    queriesCount++;

    const commSnap = await getCountFromServer(collection(db, 'communities'));
    result.totalCommunities = commSnap.data().count;
    queriesCount++;

    const storiesSnap = await getCountFromServer(collection(db, 'stories'));
    result.totalStories = storiesSnap.data().count;
    queriesCount++;

    // Calls aggregation
    const callsSnap = await getCountFromServer(collection(db, 'calls'));
    result.totalCalls = callsSnap.data().count;
    queriesCount++;

    try {
      const qActiveCalls = query(collection(db, 'calls'), where('status', 'in', ['ringing', 'accepted']));
      const activeCallsSnap = await getCountFromServer(qActiveCalls);
      result.activeCalls = activeCallsSnap.data().count;
      queriesCount++;
    } catch {
      // Fallback
    }

    // Pending Reports
    const repSnap = await getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending')));
    result.pendingReports = repSnap.data().count;
    queriesCount++;
  } catch (err) {
    console.warn('Secondary structural aggregation warning:', err);
  }

  const endTime = performance.now();
  result.queryExecutionTimeMs = Math.round(endTime - startTime);
  result.queriesExecuted = queriesCount;

  return result;
}
