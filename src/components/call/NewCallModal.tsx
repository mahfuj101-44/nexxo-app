import React, { useState } from 'react';
import {
  X,
  Search,
  Phone,
  Video,
  UserPlus,
  BadgeCheck,
  PhoneCall,
} from 'lucide-react';
import { NexxoUser } from '../../types';

interface NewCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: NexxoUser[];
  onStartCall: (type: 'voice' | 'video', user: NexxoUser) => void;
  onNavigateToSearch: () => void;
}

export const NewCallModal: React.FC<NewCallModalProps> = ({
  isOpen,
  onClose,
  connections,
  onStartCall,
  onNavigateToSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredConnections = connections.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.nexxoId?.toLowerCase().includes(query)
    );
  });

  const handleCall = (type: 'voice' | 'video', user: NexxoUser) => {
    onClose();
    onStartCall(type, user);
  };

  return (
    <div
      id="nexxo-new-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Call</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a contact for voice or video call
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts by name or NEXXO ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-3 space-y-1">
          {filteredConnections.length > 0 ? (
            filteredConnections.map((user) => {
              const isOnline = user.presence === 'online';
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || user.username}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-semibold flex items-center justify-center text-sm shadow-sm">
                          {(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {user.displayName || user.username}
                        </span>
                        {user.isVerified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        {user.nexxoId || `@${user.username}`}
                      </p>
                    </div>
                  </div>

                  {/* Call Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCall('voice', user)}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-all active:scale-95 shadow-sm"
                      title={`Audio call ${user.displayName || user.username}`}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCall('video', user)}
                      className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition-all active:scale-95 shadow-sm"
                      title={`Video call ${user.displayName || user.username}`}
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching contacts
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {connections.length === 0
                  ? 'Connect with people on NEXXO to start audio and video calls.'
                  : 'Try searching with another name or NEXXO ID.'}
              </p>
              {connections.length === 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToSearch();
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Discover People
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
