import React, { useState } from 'react';
import { ChatMessage, NexxoUser, Connection } from '../../types';
import { sendChatMessage } from '../../lib/chatService';
import {
  X,
  Search,
  Send,
  Check,
  User,
  Share2,
  AlertCircle
} from 'lucide-react';

interface ForwardModalProps {
  message: ChatMessage;
  currentUser: NexxoUser;
  connections: NexxoUser[];
  onClose: () => void;
  onForwardComplete: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  message,
  currentUser,
  connections,
  onClose,
  onForwardComplete,
}) => {
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredConnections = connections.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setForwarding(true);
      setError(null);

      // Send to each recipient's private chat
      for (const targetUid of selectedUserIds) {
        const chatId = [currentUser.id, targetUid].sort().join('_');
        await sendChatMessage({
          chatId,
          senderId: currentUser.id,
          recipientId: targetUid,
          text: message.text || '',
          type: message.type || 'text',
          attachment: message.attachment,
        });
      }

      onForwardComplete();
      onClose();
    } catch (err: any) {
      console.error('Forwarding error:', err);
      setError(err.message || 'Failed to forward message.');
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Forward Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
          <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
            Forwarding Content:
          </p>
          <p className="text-slate-700 dark:text-slate-300 truncate">
            {message.text || (message.attachment ? `[${message.type.toUpperCase()}] ${message.attachment.name}` : 'Message')}
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search contacts */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search connections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Contacts list */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {filteredConnections.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">
              No connections found
            </p>
          ) : (
            filteredConnections.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleSelectUser(user.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            {selectedUserIds.length} recipient{selectedUserIds.length === 1 ? '' : 's'} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={forwarding}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedUserIds.length === 0 || forwarding}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {forwarding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
