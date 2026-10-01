import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Plus,
  Trash2,
  Info,
  MessageSquare,
  BadgeCheck,
  ShieldCheck,
  PhoneCall,
  Calendar,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react';
import { CallSession, NexxoUser } from '../../types';
import {
  subscribeToCallHistory,
  deleteCallLog,
  clearCallHistory,
} from '../../lib/callService';
import { CallDetailsModal } from './CallDetailsModal';
import { NewCallModal } from './NewCallModal';

interface CallsViewProps {
  currentUser: NexxoUser;
  connections: NexxoUser[];
  onStartCall: (type: 'voice' | 'video', user: NexxoUser) => void;
  onOpenChatWithUser: (user: NexxoUser) => void;
  onNavigateToSearch: () => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  currentUser,
  connections,
  onStartCall,
  onOpenChatWithUser,
  onNavigateToSearch,
}) => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedCallForDetails, setSelectedCallForDetails] = useState<CallSession | null>(null);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Real-time call history subscription
  useEffect(() => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    const unsub = subscribeToCallHistory(currentUser.id, (list) => {
      setCalls(list);
      setIsLoading(false);
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Fast connection lookup map for presence and verification badges
  const connectionMap = useMemo(() => {
    const map = new Map<string, NexxoUser>();
    connections.forEach((user) => map.set(user.id, user));
    return map;
  }, [connections]);

  // Filter out calls marked as deleted by current user
  const visibleCalls = useMemo(() => {
    return calls.filter((c) => !c.deletedForUsers?.includes(currentUser.id));
  }, [calls, currentUser.id]);

  // Calculate missed calls count
  const missedCalls = useMemo(() => {
    return visibleCalls.filter((c) => {
      const isCaller = c.callerId === currentUser.id;
      return c.status === 'missed' || (!isCaller && c.status === 'rejected');
    });
  }, [visibleCalls, currentUser.id]);

  // Filtered by tab and search
  const filteredCalls = useMemo(() => {
    let list = activeTab === 'missed' ? missedCalls : visibleCalls;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      list = list.filter((c) => {
        const isCaller = c.callerId === currentUser.id;
        const partnerName = (isCaller ? c.calleeName : c.callerName) || '';
        const partnerNexxoId = (isCaller ? (c as any).calleeNexxoId : c.callerNexxoId) || '';
        return (
          partnerName.toLowerCase().includes(query) ||
          partnerNexxoId.toLowerCase().includes(query)
        );
      });
    }
    return list;
  }, [visibleCalls, missedCalls, activeTab, searchQuery, currentUser.id]);

  // Helper to format timestamps gracefully
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const formatDurationBadge = (seconds?: number, isMissed?: boolean, isDeclined?: boolean) => {
    if (isMissed) return 'Missed';
    if (isDeclined) return 'Declined';
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Helper to synthesize NexxoUser from call info and connectionMap
  const getPartnerUser = (call: CallSession): NexxoUser => {
    const isCaller = call.callerId === currentUser.id;
    const partnerId = isCaller ? call.calleeId : call.callerId;
    const known = connectionMap.get(partnerId);
    if (known) return known;

    const partnerName = isCaller ? call.calleeName : call.callerName;
    const partnerPhoto = isCaller ? call.calleePhoto : call.callerPhoto;
    const partnerNexxoId = isCaller ? (call as any).calleeNexxoId : call.callerNexxoId;
    const synthesizedUsername = partnerNexxoId ? partnerNexxoId.toLowerCase().replace(/[^a-z0-9_]/g, '') : partnerName.toLowerCase().replace(/\s+/g, '_');

    return {
      id: partnerId,
      username: synthesizedUsername,
      usernameLower: synthesizedUsername.toLowerCase(),
      displayName: partnerName,
      nexxoId: partnerNexxoId || `@${partnerName.toLowerCase().replace(/\s+/g, '')}`,
      photoURL: partnerPhoto || '',
      email: '',
      bio: '',
      role: 'user',
      status: 'active',
      presence: 'offline',
      createdAt: null,
      settings: {
        discoveryAllowed: true,
        showOnlineStatus: true,
        showLastSeen: true,
      },
    };
  };

  const handleDeleteCall = async (callId: string) => {
    try {
      await deleteCallLog(callId, currentUser.id);
    } catch (err) {
      console.error('Failed to delete call log:', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (visibleCalls.length === 0) return;
    setIsClearing(true);
    try {
      const callIds = visibleCalls.map((c) => c.id);
      await clearCallHistory(currentUser.id, callIds);
      setIsClearConfirmOpen(false);
    } catch (err) {
      console.error('Failed to clear call history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div
      id="nexxo-calls-view"
      className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans"
    >
      {/* Top Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Calls
                </h1>
                {missedCalls.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                    {missedCalls.length} missed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end encrypted voice and video call logs
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {visibleCalls.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors flex items-center gap-1.5"
                title="Clear Call Log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Log</span>
              </button>
            )}

            <button
              onClick={() => setIsNewCallModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Call</span>
            </button>
          </div>
        </div>

        {/* Sub-Header Filters & Search */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Pills (All / Missed) */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Calls ({visibleCalls.length})
            </button>
            <button
              onClick={() => setActiveTab('missed')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'missed'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Missed</span>
              {missedCalls.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {missedCalls.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by contact or NEXXO ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Call Log List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-2">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading call history...</p>
          </div>
        ) : filteredCalls.length > 0 ? (
          filteredCalls.map((call) => {
            const isCaller = call.callerId === currentUser.id;
            const partnerId = isCaller ? call.calleeId : call.callerId;
            const partnerName = isCaller ? call.calleeName : call.callerName;
            const partnerPhoto = isCaller ? call.calleePhoto : call.callerPhoto;
            const partnerNexxoId = isCaller ? (call as any).calleeNexxoId : call.callerNexxoId;
            const partnerUser = getPartnerUser(call);

            const isMissed = call.status === 'missed' || (!isCaller && call.status === 'rejected');
            const isDeclined = call.status === 'rejected' && isCaller;
            const isVideo = call.type === 'video';

            return (
              <div
                key={call.id}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md transition-all group select-none"
              >
                {/* Left Side: Avatar + Details */}
                <div
                  className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => setSelectedCallForDetails(call)}
                >
                  <div className="relative shrink-0">
                    {partnerPhoto ? (
                      <img
                        src={partnerPhoto}
                        alt={partnerName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-semibold flex items-center justify-center text-sm shadow-sm">
                        {partnerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {partnerUser.presence === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Partner Name + Verified Badge */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isMissed
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {partnerName}
                      </span>
                      {partnerUser.isVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      )}
                    </div>

                    {/* Call Status & Direction Indicator */}
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <div className="flex items-center gap-1 shrink-0 font-medium">
                        {isMissed ? (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <PhoneMissed className="w-3.5 h-3.5" />
                            <span>Missed {isVideo ? 'video' : 'voice'}</span>
                          </span>
                        ) : isCaller ? (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <PhoneOutgoing className="w-3.5 h-3.5" />
                            <span>Outgoing {isVideo ? 'video' : 'voice'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <PhoneIncoming className="w-3.5 h-3.5" />
                            <span>Incoming {isVideo ? 'video' : 'voice'}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-slate-300 dark:text-slate-700">•</span>

                      {/* Timestamp */}
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate">
                        {formatTime(call.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Duration Pill + Instant Actions */}
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* Duration Pill */}
                  <span
                    className={`hidden md:inline-flex px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium ${
                      isMissed
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {formatDurationBadge(call.durationSeconds, isMissed, isDeclined)}
                  </span>

                  {/* 1-Tap Audio Call */}
                  <button
                    onClick={() => onStartCall('voice', partnerUser)}
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title={`Audio call ${partnerName}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  {/* 1-Tap Video Call */}
                  <button
                    onClick={() => onStartCall('video', partnerUser)}
                    className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title={`Video call ${partnerName}`}
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  {/* 1-Tap Message */}
                  <button
                    onClick={() => onOpenChatWithUser(partnerUser)}
                    className="hidden sm:inline-flex p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all active:scale-95 cursor-pointer"
                    title={`Message ${partnerName}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Info Modal Button */}
                  <button
                    onClick={() => setSelectedCallForDetails(call)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Call details & history"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {/* Delete from log */}
                  <button
                    onClick={() => handleDeleteCall(call.id)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                    title="Remove from call history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="py-20 px-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              {activeTab === 'missed' ? (
                <PhoneMissed className="w-8 h-8 text-rose-500" />
              ) : (
                <PhoneCall className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {activeTab === 'missed'
                ? searchQuery
                  ? 'No matching missed calls'
                  : 'No missed calls'
                : searchQuery
                ? 'No matching calls'
                : 'No call history yet'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {activeTab === 'missed'
                ? 'You do not have any missed calls in your log.'
                : 'Connect with your friends, colleagues, or communities to start crystal clear, peer-to-peer WebRTC voice and video calls.'}
            </p>

            {activeTab === 'all' && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsNewCallModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Start a Call
                </button>

                <button
                  onClick={onNavigateToSearch}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  Find People
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear Call Log Confirmation Modal */}
      {isClearConfirmOpen && (
        <div
          id="nexxo-clear-call-log-confirm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => !isClearing && setIsClearConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clear entire call history?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This will remove all {visibleCalls.length} call logs from your account. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isClearing}
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isClearing}
                onClick={handleClearAllHistory}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-colors flex items-center justify-center gap-1.5"
              >
                {isClearing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Details / Info Modal */}
      <CallDetailsModal
        isOpen={!!selectedCallForDetails}
        onClose={() => setSelectedCallForDetails(null)}
        call={selectedCallForDetails}
        currentUser={currentUser}
        onStartCall={onStartCall}
        onOpenChatWithUser={onOpenChatWithUser}
        onDeleteCall={handleDeleteCall}
        allCalls={visibleCalls}
      />

      {/* New Call Contact Picker Modal */}
      <NewCallModal
        isOpen={isNewCallModalOpen}
        onClose={() => setIsNewCallModalOpen(false)}
        connections={connections}
        onStartCall={onStartCall}
        onNavigateToSearch={onNavigateToSearch}
      />
    </div>
  );
};
