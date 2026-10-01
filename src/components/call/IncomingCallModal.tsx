import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallSession } from '../../types';
import { playNotificationTone } from '../../lib/notificationService';

interface IncomingCallModalProps {
  call?: CallSession;
  callSession?: CallSession;
  onAccept: () => void;
  onReject?: () => void;
  onDecline?: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  callSession,
  onAccept,
  onReject,
  onDecline,
}) => {
  const activeCall = call || callSession;
  const handleReject = onReject || onDecline || (() => {});

  useEffect(() => {
    // Play ringtone chime periodically while ringing
    playNotificationTone('call');
    const interval = setInterval(() => {
      playNotificationTone('call');
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 text-center shadow-2xl">
        <div className="relative mx-auto mb-4 h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          {activeCall.callerPhoto ? (
            <img
              src={activeCall.callerPhoto}
              alt={activeCall.callerName}
              className="relative h-24 w-24 rounded-full object-cover border-2 border-indigo-500 shadow-lg"
            />
          ) : (
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-3xl font-bold text-white shadow-lg">
              {activeCall.callerName ? activeCall.callerName.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-slate-800 p-2 border border-slate-700 text-indigo-400">
            {activeCall.type === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white">{activeCall.callerName || 'Unknown Caller'}</h3>
        <p className="text-sm font-mono text-indigo-400">{activeCall.callerNexxoId}</p>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Incoming {activeCall.type === 'video' ? 'Video' : 'Voice'} Call...
        </p>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            onClick={handleReject}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500 active:scale-95 transition-all cursor-pointer"
            title="Decline"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer animate-bounce"
            title={activeCall.type === 'video' ? 'Answer Video Call' : 'Answer Voice Call'}
          >
            {activeCall.type === 'video' ? (
              <Video className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
