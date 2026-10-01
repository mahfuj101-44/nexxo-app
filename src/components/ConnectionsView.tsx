import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { removeConnection, unblockUserConnection, blockUserConnection } from '../lib/connectionService';
import { blockUser, unblockUser, subscribeToBlockedUsers } from '../lib/safetyService';
import { Connection, NexxoUser } from '../types';
import { VerifiedBadge } from './common/VerifiedBadge';
import {
  Users,
  MessageSquare,
  UserX,
  UserCheck,
  Copy,
  Check,
  Search,
  Radio,
  Clock,
  ShieldCheck,
  Ban,
  ShieldAlert,
} from 'lucide-react';

interface ConnectionsViewProps {
  currentUser: NexxoUser;
  connections: Connection[];
  onOpenChatWithUser: (targetUser: NexxoUser) => void;
  onNavigateToSearch: () => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  currentUser,
  connections,
  onOpenChatWithUser,
  onNavigateToSearch,
}) => {
  const [usersMap, setUsersMap] = useState<Record<string, NexxoUser>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'blocked'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Subscribe to blocked users for the current user
  useEffect(() => {
    const unsub = subscribeToBlockedUsers(currentUser.id, (ids) => {
      setBlockedIds(ids);
    });
    return () => unsub();
  }, [currentUser.id]);

  // Helper to safely extract the other party's user ID from a connection record
  const getOtherUserId = (conn: Connection): string => {
    if (Array.isArray(conn.users)) {
      const found = conn.users.find((id) => Boolean(id) && id !== currentUser.id);
      if (found) return found;
    }
    if (conn.user1Id && conn.user1Id !== currentUser.id) return conn.user1Id;
    if (conn.user2Id && conn.user2Id !== currentUser.id) return conn.user2Id;
    return '';
  };

  const getFallbackUser = (id: string): NexxoUser => ({
    id,
    nexxoId: `NX-${(id || 'USER').slice(0, 8).toUpperCase()}`,
    displayName: 'NEXXO Member',
    username: (id || 'user').slice(0, 8),
    usernameLower: (id || 'user').slice(0, 8).toLowerCase(),
    email: '',
    photoURL: '',
    bio: '',
    status: 'active',
    presence: 'offline',
    role: 'user',
    settings: { discoveryAllowed: true, showOnlineStatus: true, showLastSeen: true },
  });

  // Fetch full user profiles for connections and blocked users
  useEffect(() => {
    let isMounted = true;
    async function loadConnectedUsers() {
      setLoadingUsers(true);
      const map: Record<string, NexxoUser> = {};

      const allIds = new Set<string>();
      for (const conn of connections) {
        const otherId = getOtherUserId(conn);
        if (otherId) allIds.add(otherId);
      }
      blockedIds.forEach((id) => {
        if (id) allIds.add(id);
      });

      for (const otherId of allIds) {
        try {
          const snap = await getDoc(doc(db, 'users', otherId));
          if (snap.exists()) {
            map[otherId] = snap.data() as NexxoUser;
          } else {
            map[otherId] = getFallbackUser(otherId);
          }
        } catch (e) {
          console.warn('Notice fetching user profile:', e);
          map[otherId] = getFallbackUser(otherId);
        }
      }

      if (isMounted) {
        setUsersMap(map);
        setLoadingUsers(false);
      }
    }

    loadConnectedUsers();
    return () => {
      isMounted = false;
    };
  }, [connections, blockedIds, currentUser.id]);

  const copyId = (nexxoId?: string) => {
    if (!nexxoId) return;
    navigator.clipboard.writeText(nexxoId);
    setCopiedId(nexxoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemove = async (connectionId: string) => {
    try {
      setRemovingId(connectionId);
      await removeConnection(connectionId);
    } catch (err) {
      console.error('Remove connection error:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleBlock = async (targetUser: NexxoUser, connectionId?: string) => {
    try {
      setActionLoadingId(targetUser.id);
      await blockUser(currentUser.id, targetUser.id);
      if (connectionId) {
        await blockUserConnection(connectionId, currentUser.id);
      }
    } catch (err) {
      console.error('Block user error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblock = async (targetUser: NexxoUser, connectionId?: string) => {
    try {
      setActionLoadingId(targetUser.id);
      await unblockUser(currentUser.id, targetUser.id);
      if (connectionId) {
        await unblockUserConnection(connectionId);
      }
    } catch (err) {
      console.error('Unblock user error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayedConnections = connections.filter((conn) => {
    const otherId = getOtherUserId(conn);
    if (!otherId) return false;
    const isBlocked = conn.status === 'blocked' || blockedIds.includes(otherId);
    if (activeFilter === 'blocked') {
      return isBlocked;
    }
    return !isBlocked;
  });

  return (
    <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full p-6 sm:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              My NEXXO Connections
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time verified connections within your trusted global communication network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active ({connections.filter((c) => c.status !== 'blocked' && !blockedIds.includes(getOtherUserId(c))).length})
            </button>
            <button
              onClick={() => setActiveFilter('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'blocked'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              <Ban className="w-3 h-3" />
              <span>Blocked ({blockedIds.length})</span>
            </button>
          </div>

          <button
            onClick={onNavigateToSearch}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discover Users</span>
          </button>
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Loading connected directory...</span>
          </div>
        </div>
      ) : displayedConnections.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
          {activeFilter === 'blocked' ? (
            <>
              <Ban className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Blocked Users
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                You haven't blocked any users. Any blocked contacts will appear here and can be unblocked anytime.
              </p>
            </>
          ) : (
            <>
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Active Connections Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-6">
                Search for other users by their Permanent NEXXO ID to establish real-time connections.
              </p>
              <button
                onClick={onNavigateToSearch}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Find Users Now
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedConnections.map((conn) => {
            const otherId = getOtherUserId(conn);
            const otherUser = usersMap[otherId] || getFallbackUser(otherId);

            const isBlocked = conn.status === 'blocked' || blockedIds.includes(otherUser.id);
            const isBlockedByMe = conn.blockedBy === currentUser.id || blockedIds.includes(otherUser.id);
            const initialLetter = (otherUser.displayName || otherUser.username || 'U').charAt(0).toUpperCase();

            return (
              <div
                key={conn.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex flex-col justify-between ${
                  isBlocked
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {otherUser.photoURL ? (
                          <img
                            src={otherUser.photoURL}
                            alt={otherUser.displayName || otherUser.username}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-base font-bold text-slate-600 dark:text-slate-300">
                            {initialLetter}
                          </span>
                        )}
                        {!isBlocked && (
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              otherUser.presence === 'online'
                                ? 'bg-emerald-500'
                                : otherUser.presence === 'away'
                                ? 'bg-amber-500'
                                : otherUser.presence === 'busy'
                                ? 'bg-rose-500'
                                : otherUser.presence === 'dnd'
                                ? 'bg-purple-500'
                                : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {otherUser.displayName || otherUser.username || 'NEXXO User'}
                          </h3>
                          <VerifiedBadge
                            isVerified={otherUser.isVerified}
                            isPremium={otherUser.isPremium}
                            premiumTier={otherUser.premiumTier}
                            size="xs"
                          />
                          {otherUser.role === 'admin' && (
                            <span title="Platform Administrator">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          @{otherUser.username || 'user'}
                        </p>
                      </div>
                    </div>

                    {isBlocked ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Blocked
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {otherUser.presence}
                      </span>
                    )}
                  </div>

                  {otherUser.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      "{otherUser.bio}"
                    </p>
                  )}

                  {/* Permanent NEXXO ID chip */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs font-mono mb-4">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      Permanent ID
                    </span>
                    <button
                      onClick={() => copyId(otherUser.nexxoId)}
                      className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      <span>{otherUser.nexxoId}</span>
                      {copiedId === otherUser.nexxoId ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {isBlocked ? (
                    <button
                      id={`unblock-user-${otherUser.id}`}
                      onClick={() => handleUnblock(otherUser, conn.id)}
                      disabled={actionLoadingId === otherUser.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === otherUser.id ? 'Unblocking...' : 'Unblock User'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        id={`open-chat-${otherUser.id}`}
                        onClick={() => onOpenChatWithUser(otherUser)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Chat</span>
                      </button>

                      <button
                        id={`block-user-${otherUser.id}`}
                        onClick={() => handleBlock(otherUser, conn.id)}
                        disabled={actionLoadingId === otherUser.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Block user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    id={`remove-conn-${conn.id}`}
                    onClick={() => handleRemove(conn.id)}
                    disabled={removingId === conn.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title="Remove connection"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
