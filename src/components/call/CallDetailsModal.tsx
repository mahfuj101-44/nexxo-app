import React from 'react';
import {
  X,
  Phone,
  Video,
  MessageSquare,
  Trash2,
  Clock,
  Calendar,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  BadgeCheck,
} from 'lucide-react';
import { CallSession, NexxoUser } from '../../types';

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: CallSession | null;
  currentUser: NexxoUser;
  onStartCall: (type: 'voice' | 'video', user: NexxoUser) => void;
  onOpenChatWithUser: (user: NexxoUser) => void;
  onDeleteCall: (callId: string) => Promise<void>;
  allCalls?: CallSession[];
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
  isOpen,
  onClose,
  call,
  currentUser,
  onStartCall,
  onOpenChatWithUser,
  onDeleteCall,
  allCalls = [],
}) => {
  if (!isOpen || !call) return null;

  const isCaller = call.callerId === currentUser.id;
  const partnerId = isCaller ? call.calleeId : call.callerId;
  const partnerName = isCaller ? call.calleeName : call.callerName;
  const partnerPhoto = isCaller ? call.calleePhoto : call.callerPhoto;
  const partnerNexxoId = isCaller ? (call as any).calleeNexxoId : call.callerNexxoId;

  // Synthesize a NexxoUser object for action callbacks
  const synthesizedUsername = partnerNexxoId ? partnerNexxoId.toLowerCase().replace(/[^a-z0-9_]/g, '') : partnerName.toLowerCase().replace(/\s+/g, '_');
  const partnerUser: NexxoUser = {
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

  // Determine Call Status classification
  const isMissed = call.status === 'missed' || (isCaller ? false : call.status === 'rejected');
  const isDeclined = call.status === 'rejected' && isCaller;
  const isEnded = call.status === 'ended' || call.status === 'accepted';

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) {
      if (isMissed) return 'Missed (0s)';
      if (isDeclined) return 'Declined';
      return '0s';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs} seconds`;
  };

  const formatExactDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Find other calls with this partner
  const relatedCalls = allCalls
    .filter(
      (c) =>
        c.id !== call.id &&
        ((c.callerId === partnerId && c.calleeId === currentUser.id) ||
          (c.callerId === currentUser.id && c.calleeId === partnerId)) &&
        !c.deletedForUsers?.includes(currentUser.id)
    )
    .slice(0, 5);

  const handleDelete = async () => {
    try {
      await onDeleteCall(call.id);
      onClose();
    } catch (e) {
      console.error('Error deleting call:', e);
    }
  };

  return (
    <div
      id="nexxo-call-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              Call Info
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Profile Header */}
        <div className="p-6 flex flex-col items-center text-center bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <div className="relative mb-3">
            {partnerPhoto ? (
              <img
                src={partnerPhoto}
                alt={partnerName}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl ring-4 ring-white dark:ring-slate-800 shadow-md">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 p-1.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                call.type === 'video' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {call.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            {partnerName}
            <BadgeCheck className="w-4 h-4 text-indigo-500" />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {partnerNexxoId || `@${partnerName.toLowerCase().replace(/\s+/g, '')}`}
          </p>

          {/* Action Row: Message, Audio Call, Video Call */}
          <div className="flex items-center gap-4 mt-5">
            <button
              onClick={() => {
                onClose();
                onOpenChatWithUser(partnerUser);
              }}
              className="flex flex-col items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 group transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors">
                <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <span className="text-[11px] font-medium">Message</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartCall('voice', partnerUser);
              }}
              className="flex flex-col items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 group transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] font-medium">Audio Call</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartCall('video', partnerUser);
              }}
              className="flex flex-col items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 group transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center transition-colors">
                <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[11px] font-medium">Video Call</span>
            </button>
          </div>
        </div>

        {/* Call Metadata & Status Breakdown */}
        <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto custom-scrollbar">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5" /> Date & Time
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatExactDate(call.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                {isMissed ? (
                  <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                ) : isCaller ? (
                  <PhoneOutgoing className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                )}
                Call Direction
              </span>
              <span
                className={`font-semibold capitalize flex items-center gap-1 ${
                  isMissed
                    ? 'text-rose-600 dark:text-rose-400'
                    : isCaller
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isMissed
                  ? 'Missed Call'
                  : isCaller
                  ? 'Outgoing Call'
                  : 'Incoming Call'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" /> Duration
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDuration(call.durationSeconds)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Security
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                WebRTC End-to-End Encrypted
              </span>
            </div>
          </div>

          {/* Past calls with this user */}
          {relatedCalls.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Past Calls with {partnerName}
              </p>
              <div className="space-y-2">
                {relatedCalls.map((rc) => {
                  const rcIsCaller = rc.callerId === currentUser.id;
                  const rcIsMissed = rc.status === 'missed' || (!rcIsCaller && rc.status === 'rejected');
                  return (
                    <div
                      key={rc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {rcIsMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                        ) : rcIsCaller ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {rc.type} call ({formatDuration(rc.durationSeconds)})
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {rc.createdAt ? formatExactDate(rc.createdAt).split(',')[0] : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete Option */}
          <div className="pt-2">
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove from Call History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
