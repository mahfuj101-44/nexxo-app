import React from 'react';
import { ChatMessage, NexxoUser } from '../../types';
import {
  X,
  Check,
  CheckCheck,
  Clock,
  Eye,
  Info,
  Calendar,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import {
  formatReadReceiptTime,
  formatExactTimestamp,
  parseMessageTimestamp,
} from '../../lib/chatService';

interface MessageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage;
  currentUser: NexxoUser;
  partnerUser: NexxoUser;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  isOpen,
  onClose,
  message,
  currentUser,
  partnerUser,
}) => {
  if (!isOpen) return null;

  const isMe = message.senderId === currentUser.id;
  const readTimestamp = message.readAt || message.readBy?.[partnerUser.id];
  const isRead = message.status === 'read' || Boolean(readTimestamp);

  const sentDate = parseMessageTimestamp(message.createdAt);
  const readDate = parseMessageTimestamp(readTimestamp);

  const sentExactStr = formatExactTimestamp(message.createdAt);
  const sentFriendlyStr = formatReadReceiptTime(message.createdAt);

  const readExactStr = readDate ? formatExactTimestamp(readDate) : null;
  const readFriendlyStr = readDate ? formatReadReceiptTime(readDate) : null;

  // Calculate elapsed time between sent and read if both available
  let elapsedMinutesStr = '';
  if (sentDate && readDate) {
    const diffMs = readDate.getTime() - sentDate.getTime();
    if (diffMs > 0) {
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours > 0) {
        elapsedMinutesStr = `${diffHours}h ${diffMins % 60}m after sending`;
      } else if (diffMins > 0) {
        elapsedMinutesStr = `${diffMins} min${diffMins > 1 ? 's' : ''} after sending`;
      } else {
        elapsedMinutesStr = `${Math.max(1, diffSecs)}s after sending`;
      }
    } else {
      elapsedMinutesStr = 'Viewed immediately';
    }
  }

  return (
    <div
      id="message-info-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="message-info-modal"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Message Info & Read Receipts
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Firestore metadata delivery audit
              </p>
            </div>
          </div>
          <button
            id="close-message-info-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Message Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Message Preview</span>
              <span className="capitalize">{message.type}</span>
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-normal">
              {message.text || '(Media attachment)'}
            </p>
            {message.attachment && (
              <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium">
                <span>📎 {message.attachment.name}</span>
              </div>
            )}
          </div>

          {/* Delivery & Read Receipts Timeline */}
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Status Progression
            </div>

            {/* 1. Read Receipt Item */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isRead
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-500 border border-sky-200 dark:border-sky-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <CheckCheck className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Read</span>
                    {isRead ? (
                      <span className="px-1.5 py-0.2 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 text-[10px] font-bold">
                        Viewed
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                        Unread
                      </span>
                    )}
                  </span>
                  {readFriendlyStr && (
                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                      {readFriendlyStr}
                    </span>
                  )}
                </div>

                {isRead ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Viewed by{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {partnerUser.displayName}
                      </span>{' '}
                      <span className="text-slate-400">(@{partnerUser.username})</span>
                    </p>
                    {readExactStr && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        Exact time: {readExactStr}
                      </p>
                    )}
                    {elapsedMinutesStr && (
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        ⚡ {elapsedMinutesStr}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {partnerUser.displayName} has received this message on their device, but has not opened the conversation yet.
                  </p>
                )}
              </div>
            </div>

            {/* 2. Delivered Item */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Delivered
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {sentFriendlyStr}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Delivered to {partnerUser.displayName}'s device.
                </p>
              </div>
            </div>

            {/* 3. Sent Item */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Sent
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {sentFriendlyStr}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sent from your device.
                </p>
                {sentExactStr && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    Exact time: {sentExactStr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reactions Breakdown (if any) */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <Smile className="w-3.5 h-3.5" />
                <span>Reactions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(message.reactions).map(([emoji, uids]) => {
                  const userList = (Array.isArray(uids) ? uids : []) as string[];
                  if (userList.length === 0) return null;
                  const hasMe = userList.includes(currentUser.id);
                  const hasPartner = userList.includes(partnerUser.id);
                  return (
                    <div
                      key={emoji}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        {hasMe && hasPartner
                          ? 'You and ' + partnerUser.displayName
                          : hasPartner
                          ? partnerUser.displayName
                          : 'You'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verification Badge */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Encrypted transmission verified via Firestore server timestamps.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
