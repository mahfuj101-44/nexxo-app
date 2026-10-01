import React, { useState } from 'react';
import { NexxoUser } from '../../types';
import { createGroupChat, GROUP_AVATAR_PRESETS } from '../../lib/chatService';
import { canInviteUserToGroup } from '../../lib/privacyService';
import {
  X,
  Users,
  Check,
  Search,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Loader2,
  UserCheck
} from 'lucide-react';

interface CreateGroupModalProps {
  isOpen?: boolean;
  currentUser: NexxoUser;
  availableUsers: NexxoUser[];
  onClose: () => void;
  onGroupCreated: (chatId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen = true,
  currentUser,
  availableUsers,
  onClose,
  onGroupCreated,
}) => {
  if (isOpen === false) return null;
  const [groupName, setGroupName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(GROUP_AVATAR_PRESETS[0].url);
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter available contacts (exclude current user and match query)
  const candidateUsers = availableUsers.filter((u) => u.id !== currentUser.id);
  const filteredUsers = candidateUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      setError('Please provide a name for the group.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least 1 member to add to the group.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newChatId = await createGroupChat({
        name: trimmed,
        avatar: avatarUrl.trim() || undefined,
        description: description.trim() || undefined,
        participantIds: selectedUserIds,
        creator: currentUser,
      });

      onGroupCreated(newChatId);
      onClose();
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setError(err.message || 'Failed to create group conversation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                New Group Conversation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chat, collaborate, and share with multiple people
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Identity Section */}
          <div className="flex items-start gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500/30 flex items-center justify-center shadow-xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Group Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users className="w-8 h-8 text-slate-400" />
                )}
              </div>
            </div>

            {/* Name and Description Inputs */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Design Sync, Roommates, Study Group"
                  maxLength={60}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic or Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group about?"
                  maxLength={160}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Avatar Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Choose an Icon or Avatar</span>
              </label>
              <span className="text-[10px] text-slate-400">Click to select preset</span>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-2">
              {GROUP_AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 scale-105 shadow-xs'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100'
                    }`}
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-xs" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Avatar URL input */}
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Or paste custom image URL..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Participant Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Members</span>
                <span className="text-slate-400 font-normal">
                  ({selectedUserIds.length} selected)
                </span>
              </label>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected Members Badges */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl max-h-24 overflow-y-auto">
                {selectedUserIds.map((uid) => {
                  const u = candidateUsers.find((user) => user.id === uid);
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <span className="font-medium truncate max-w-[120px]">
                        {u?.displayName || 'User'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleUser(uid)}
                        className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Contact Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts to add..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Contact Candidates List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {candidateUsers.length === 0
                    ? 'No connections found. Connect with other users first to add them to groups!'
                    : 'No matching contacts found.'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isConnected = availableUsers.some((conn) => conn.id === u.id);
                  const canInvite = canInviteUserToGroup(currentUser, u, isConnected);

                  return (
                    <div
                      key={u.id}
                      onClick={() => canInvite && toggleUser(u.id)}
                      className={`flex items-center justify-between p-2.5 px-3 transition-colors ${
                        !canInvite
                          ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/40'
                          : isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 cursor-pointer'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                      }`}
                      title={!canInvite ? 'User privacy settings restrict group invites' : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            u.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {u.displayName}
                            </p>
                            {!canInvite && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                                Privacy locked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          !canInvite
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-transparent'
                            : isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && canInvite && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selectedUserIds.length === 0}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Group...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Group ({selectedUserIds.length + 1} members)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
