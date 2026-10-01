import React, { useState, useEffect } from 'react';
import { searchUsers } from '../lib/searchService';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  cancelConnectionRequest,
  connectUsersDirectly
} from '../lib/connectionService';
import { subscribeToBlockedUsers, unblockUser } from '../lib/safetyService';
import { NexxoUser, Connection, ConnectionRequest } from '../types';
import {
  Search,
  UserPlus,
  Check,
  Clock,
  MessageSquare,
  Copy,
  AlertCircle,
  Radio,
  Sparkles,
  ShieldCheck,
  Ban,
  UserCheck,
  X,
  Zap,
  Fingerprint,
  Hash,
  Info
} from 'lucide-react';

interface SearchViewProps {
  currentUser: NexxoUser;
  connections: Connection[];
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  onOpenChatWithUser: (targetUser: NexxoUser) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  currentUser,
  connections,
  incomingRequests,
  outgoingRequests,
  onOpenChatWithUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<NexxoUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Subscribe to blocked users for the current user
  useEffect(() => {
    const unsub = subscribeToBlockedUsers(currentUser.id, (ids) => {
      setBlockedUserIds(ids);
    });
    return () => unsub();
  }, [currentUser.id]);

  // Debounced search - strictly by NEXXO ID
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const found = await searchUsers(trimmed, currentUser.id);
        setResults(found);
      } catch (err: any) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, currentUser.id]);

  const copyId = (nexxoId: string) => {
    navigator.clipboard.writeText(nexxoId);
    setCopiedId(nexxoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendRequest = async (targetUser: NexxoUser) => {
    try {
      setActionLoadingId(targetUser.id);
      setStatusMessage(null);
      await sendConnectionRequest(currentUser.id, targetUser.id);
      setStatusMessage({
        type: 'success',
        text: `Connection request sent to ${targetUser.nexxoId}!`,
      });
    } catch (err: any) {
      console.error('Request error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to send connection request.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (req: ConnectionRequest, targetUser: NexxoUser) => {
    try {
      setActionLoadingId(targetUser.id);
      setStatusMessage(null);
      await acceptConnectionRequest(req.id, req.fromUserId, currentUser.id);
      setStatusMessage({
        type: 'success',
        text: `You are now connected with ${targetUser.nexxoId}!`,
      });
    } catch (err: any) {
      console.error('Accept error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to accept request.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblock = async (targetUser: NexxoUser) => {
    try {
      setActionLoadingId(targetUser.id);
      setStatusMessage(null);
      await unblockUser(currentUser.id, targetUser.id);
      setStatusMessage({
        type: 'success',
        text: `Unblocked ${targetUser.nexxoId} successfully.`,
      });
    } catch (err: any) {
      console.error('Unblock error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to unblock user.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to determine relationship with a user in results
  const getRelationship = (user: NexxoUser) => {
    if (blockedUserIds.includes(user.id)) {
      return { type: 'blocked' as const };
    }

    const isConnected = connections.some(c => {
      if (c.status !== 'connected') return false;
      if (Array.isArray(c.users) && c.users.includes(user.id)) return true;
      return c.user1Id === user.id || c.user2Id === user.id;
    });
    if (isConnected) return { type: 'connected' as const };

    const incoming = incomingRequests.find(r => r.fromUserId === user.id && r.status === 'pending');
    if (incoming) return { type: 'incoming' as const, request: incoming };

    const outgoing = outgoingRequests.find(r => r.toUserId === user.id && r.status === 'pending');
    if (outgoing) return { type: 'outgoing' as const, request: outgoing };

    return { type: 'none' as const };
  };

  const handleCancelRequest = async (req: ConnectionRequest, targetUser: NexxoUser) => {
    try {
      setActionLoadingId(targetUser.id);
      setStatusMessage(null);
      await cancelConnectionRequest(req.id);
      setStatusMessage({
        type: 'success',
        text: `Withdrew connection invitation to ${targetUser.nexxoId}.`,
      });
    } catch (err: any) {
      console.error('Cancel request error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to withdraw connection request.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectConnect = async (targetUser: NexxoUser) => {
    try {
      setActionLoadingId(targetUser.id);
      setStatusMessage(null);
      await connectUsersDirectly(currentUser.id, targetUser.id);
      setStatusMessage({
        type: 'success',
        text: `Connected directly with ${targetUser.nexxoId}! You can chat anytime.`,
      });
      onOpenChatWithUser(targetUser);
    } catch (err: any) {
      console.error('Direct connect error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to establish direct connection.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full p-6 sm:p-8 overflow-y-auto">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Global NEXXO Discovery
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
            <Hash className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            NEXXO ID Search Only
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Find and connect with users worldwide exclusively by their unique Permanent NEXXO ID (e.g. <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">NX-XXXX-XXXX</span>).
        </p>
      </div>

      {/* User's Own NEXXO ID Card */}
      <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Your NEXXO ID:</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-indigo-900 dark:text-indigo-200 tracking-wider">
                {currentUser.nexxoId}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Share your NEXXO ID with others so they can find and connect with you here.
            </p>
          </div>
        </div>
        <button
          onClick={() => copyId(currentUser.nexxoId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs self-end sm:self-center shrink-0"
        >
          {copiedId === currentUser.nexxoId ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy My ID</span>
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500/70 dark:text-indigo-400/70" />
        <input
          id="global-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter NEXXO ID (e.g. NX-4892-1048)..."
          className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm font-mono tracking-wide shadow-xs"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 select-none">
              ID ONLY
            </span>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Search Results / Empty States */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((user) => {
            const rel = getRelationship(user);
            const isProcessing = actionLoadingId === user.id;

            return (
              <div
                key={user.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || user.username}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-base font-bold text-slate-600 dark:text-slate-300">
                            {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        {/* Live presence indicator */}
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            user.presence === 'online'
                              ? 'bg-emerald-500'
                              : user.presence === 'away'
                              ? 'bg-amber-500'
                              : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                          title={`Status: ${user.presence}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {user.displayName}
                          </h3>
                          {user.role === 'admin' && (
                            <span title="Platform Administrator"><ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {user.presence}
                    </span>
                  </div>

                  {user.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 italic">
                      "{user.bio}"
                    </p>
                  )}

                  {/* Permanent NEXXO ID chip */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs font-mono mb-4">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-indigo-950 dark:text-indigo-300 font-bold tracking-wider">
                        {user.nexxoId}
                      </span>
                    </div>
                    <button
                      onClick={() => copyId(user.nexxoId)}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                      title="Copy NEXXO ID"
                    >
                      {copiedId === user.nexxoId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Relationship Action Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  {rel.type === 'blocked' ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <Ban className="w-3.5 h-3.5" />
                        Blocked
                      </span>
                      <button
                        id={`unblock-search-user-${user.id}`}
                        onClick={() => handleUnblock(user)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </button>
                    </div>
                  ) : rel.type === 'connected' ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Connected
                      </span>
                      <button
                        id={`msg-user-${user.id}`}
                        onClick={() => onOpenChatWithUser(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    </div>
                  ) : rel.type === 'outgoing' ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`direct-connect-${user.id}`}
                          onClick={() => handleDirectConnect(user)}
                          disabled={isProcessing}
                          title="Connect instantly without waiting for approval"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-all disabled:opacity-60 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Connect</span>
                        </button>
                        {rel.request && (
                          <button
                            id={`cancel-search-req-${user.id}`}
                            onClick={() => handleCancelRequest(rel.request!, user)}
                            disabled={isProcessing}
                            title="Cancel pending invitation"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-60 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : rel.type === 'incoming' && rel.request ? (
                    <button
                      id={`accept-user-${user.id}`}
                      onClick={() => handleAcceptRequest(rel.request!, user)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Request</span>
                    </button>
                  ) : (
                    <button
                      id={`connect-user-${user.id}`}
                      onClick={() => handleSendRequest(user)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {isProcessing ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : searchTerm.trim() && !loading ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Hash className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No registered users found for NEXXO ID "{searchTerm}"
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Search is strictly restricted to Permanent NEXXO IDs (e.g. NX-XXXX-XXXX). Please check the ID and try again.
          </p>
        </div>
      ) : (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Search by Permanent NEXXO ID
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Global discovery is strictly conducted via Permanent NEXXO IDs (format: <span className="font-mono font-semibold">NX-XXXX-XXXX</span>). Enter any user's NEXXO ID above to locate and connect with them.
          </p>
        </div>
      )}
    </div>
  );
};
