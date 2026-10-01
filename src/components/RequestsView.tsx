import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  connectUsersDirectly
} from '../lib/connectionService';
import { ConnectionRequest, NexxoUser } from '../types';
import {
  UserPlus,
  Check,
  X,
  Clock,
  Send,
  Inbox,
  AlertCircle,
  Copy,
  Zap
} from 'lucide-react';

interface RequestsViewProps {
  currentUser: NexxoUser;
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  onOpenChatWithUser?: (targetUser: NexxoUser) => void;
}

export const RequestsView: React.FC<RequestsViewProps> = ({
  currentUser,
  incomingRequests,
  outgoingRequests,
  onOpenChatWithUser,
}) => {
  const [userProfiles, setUserProfiles] = useState<Record<string, NexxoUser>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProfiles() {
      setLoadingProfiles(true);
      const map: Record<string, NexxoUser> = {};
      const allUids = new Set<string>();

      incomingRequests.forEach(r => allUids.add(r.fromUserId));
      outgoingRequests.forEach(r => allUids.add(r.toUserId));

      for (const uid of allUids) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            map[uid] = snap.data() as NexxoUser;
          } else {
            map[uid] = {
              id: uid,
              nexxoId: `NX-${uid.slice(0, 8).toUpperCase()}`,
              displayName: 'NEXXO Member',
              username: uid.slice(0, 8),
              usernameLower: uid.slice(0, 8).toLowerCase(),
              email: '',
              photoURL: '',
              bio: '',
              status: 'active',
              presence: 'offline',
              role: 'user',
              settings: { discoveryAllowed: true, showOnlineStatus: true, showLastSeen: true },
            };
          }
        } catch (e) {
          console.warn('Notice fetching profile for request:', e);
        }
      }

      if (isMounted) {
        setUserProfiles(map);
        setLoadingProfiles(false);
      }
    }

    loadProfiles();
    return () => { isMounted = false; };
  }, [incomingRequests, outgoingRequests]);

  const handleAccept = async (req: ConnectionRequest) => {
    try {
      setActionId(req.id);
      setMessage(null);
      await acceptConnectionRequest(req.id, req.fromUserId, currentUser.id);
      const otherUser = userProfiles[req.fromUserId];
      setMessage({
        type: 'success',
        text: `Accepted request from @${otherUser?.username || 'user'}.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to accept connection request.',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (req: ConnectionRequest) => {
    try {
      setActionId(req.id);
      setMessage(null);
      await declineConnectionRequest(req.id);
      setMessage({
        type: 'success',
        text: 'Connection request declined.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to decline request.',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleCancelOutgoing = async (req: ConnectionRequest) => {
    try {
      setActionId(req.id);
      setMessage(null);
      await cancelConnectionRequest(req.id);
      const otherUser = userProfiles[req.toUserId];
      setMessage({
        type: 'success',
        text: `Withdrew invitation to @${otherUser?.username || 'user'}.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to withdraw connection request.',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleInstantConnect = async (targetUser: NexxoUser) => {
    try {
      setActionId(targetUser.id);
      setMessage(null);
      await connectUsersDirectly(currentUser.id, targetUser.id);
      setMessage({
        type: 'success',
        text: `Connected directly with @${targetUser.username}! You can now chat anytime.`,
      });
      if (onOpenChatWithUser) {
        onOpenChatWithUser(targetUser);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to establish direct connection.',
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-6 sm:p-8 overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Connection Requests
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage incoming requests from other users or review your pending outgoing invites.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section 1: Incoming Requests */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Incoming Requests ({incomingRequests.length})
          </h3>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No pending incoming connection requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((req) => {
              const fromUser = userProfiles[req.fromUserId];
              const isProcessing = actionId === req.id;

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {fromUser?.photoURL ? (
                        <img
                          src={fromUser.photoURL}
                          alt={fromUser.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {fromUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {fromUser?.displayName || 'NEXXO User'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        @{fromUser?.username || 'unknown'} &bull; <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">{fromUser?.nexxoId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      id={`accept-req-${req.id}`}
                      onClick={() => handleAccept(req)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>

                    <button
                      id={`decline-req-${req.id}`}
                      onClick={() => handleDecline(req)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Outgoing Requests */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Outgoing Requests ({outgoingRequests.length})
          </h3>
        </div>

        {outgoingRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You have no pending outgoing connection requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {outgoingRequests.map((req) => {
              const toUser = userProfiles[req.toUserId];
              const isProcessing = actionId === req.id || (toUser && actionId === toUser.id);

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {toUser?.photoURL ? (
                        <img
                          src={toUser.photoURL}
                          alt={toUser.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {toUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {toUser?.displayName || 'NEXXO User'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        @{toUser?.username || 'unknown'} &bull; <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">{toUser?.nexxoId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                      <span>Awaiting Acceptance</span>
                    </div>

                    {toUser && (
                      <button
                        id={`connect-direct-btn-${req.id}`}
                        onClick={() => handleInstantConnect(toUser)}
                        disabled={isProcessing}
                        title="Establish an immediate real-time connection without waiting"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Connect Now</span>
                      </button>
                    )}

                    <button
                      id={`cancel-req-${req.id}`}
                      onClick={() => handleCancelOutgoing(req)}
                      disabled={isProcessing}
                      title="Cancel this connection invitation"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
