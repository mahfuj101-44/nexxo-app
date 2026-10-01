import React, { useState } from 'react';
import { X, Users, Check, Camera } from 'lucide-react';
import { NexxoUser } from '../../types';
import { createGroup } from '../../lib/groupService';
import { canInviteUserToGroup } from '../../lib/privacyService';

interface CreateGroupModalProps {
  currentUser: NexxoUser;
  connections: NexxoUser[];
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  currentUser,
  connections,
  onClose,
  onGroupCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const groupId = await createGroup({
        name: name.trim(),
        description: description.trim(),
        photoURL: photoURL.trim(),
        ownerId: currentUser.id,
        initialMemberIds: selectedUserIds,
      });

      onGroupCreated(groupId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Syndicate, Core Engineering"
              maxLength={60}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Group Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Purpose of this group..."
              maxLength={250}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Group Icon URL (Optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
              />
              {photoURL && (
                <img
                  src={photoURL}
                  alt="Preview"
                  className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              )}
            </div>
          </div>

          {/* Members Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Select Connections to Add</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedUserIds.length} selected</span>
            </label>

            {connections.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                You do not have any connections yet. You can still create the group and invite members later.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {connections.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const canInvite = canInviteUserToGroup(currentUser, user, true);

                  return (
                    <div
                      key={user.id}
                      onClick={() => canInvite && toggleSelectUser(user.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        !canInvite
                          ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-600/15 border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white cursor-pointer'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                      }`}
                      title={!canInvite ? 'User privacy settings restrict group invites' : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                          ) : (
                            user.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{user.displayName}</p>
                            {!canInvite && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                                Privacy locked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{user.nexxoId}</p>
                        </div>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                          !canInvite
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-transparent'
                            : isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && canInvite && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
