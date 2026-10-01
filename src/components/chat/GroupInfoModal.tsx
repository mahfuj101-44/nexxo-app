import React, { useState } from 'react';
import { Chat, NexxoUser } from '../../types';
import {
  updateGroupChatInfo,
  addGroupParticipants,
  removeGroupParticipant,
  leaveGroupChat,
  deleteConversationForUser,
  GROUP_AVATAR_PRESETS,
} from '../../lib/chatService';
import {
  X,
  Users,
  Edit2,
  Check,
  UserPlus,
  Trash2,
  LogOut,
  Shield,
  Search,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface GroupInfoModalProps {
  isOpen?: boolean;
  chat?: Chat;
  groupChat?: Chat;
  currentUser: NexxoUser;
  participantProfiles?: Record<string, NexxoUser>;
  userMap?: Record<string, NexxoUser>;
  availableUsers: NexxoUser[];
  onClose: () => void;
  onGroupLeftOrDeleted?: () => void;
  onGroupUpdated?: (updated: Chat) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen = true,
  chat: propChat,
  groupChat,
  currentUser,
  participantProfiles: propParticipantProfiles,
  userMap,
  availableUsers,
  onClose,
  onGroupLeftOrDeleted,
  onGroupUpdated,
}) => {
  if (isOpen === false) return null;
  const chat = groupChat || propChat;
  if (!chat) return null;
  const participantProfiles = userMap || propParticipantProfiles || {};
  // Editing state for group name and description
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(chat.name || 'Group Chat');
  const [descriptionInput, setDescriptionInput] = useState(chat.description || '');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState(chat.avatar || '');

  // Add members state
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // Loading & status
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCreator = chat.createdBy === currentUser.id;
  const isAdmin = isCreator || (Array.isArray(chat.admins) && chat.admins.includes(currentUser.id));

  // Users who can be added (not currently participants)
  const candidateUsersToAdd = availableUsers.filter(
    (u) => !chat.participants.includes(u.id) && u.id !== currentUser.id
  );

  const filteredCandidates = candidateUsersToAdd.filter((u) => {
    const q = searchMemberQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const toggleSelectNewUser = (userId: string) => {
    setSelectedNewUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveInfo = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMessage('Group name cannot be empty.');
      return;
    }

    try {
      setLoadingAction('saveInfo');
      setErrorMessage(null);
      await updateGroupChatInfo(
        chat.id,
        {
          name: trimmedName,
          description: descriptionInput.trim(),
        },
        { id: currentUser.id, displayName: currentUser.displayName }
      );
      setIsEditingName(false);
      setSuccessMessage('Group information updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to update group info:', e);
      setErrorMessage(e.message || 'Failed to update group information.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveAvatar = async (newAvatarUrl: string) => {
    try {
      setLoadingAction('saveAvatar');
      setErrorMessage(null);
      await updateGroupChatInfo(
        chat.id,
        { avatar: newAvatarUrl.trim() || undefined },
        { id: currentUser.id, displayName: currentUser.displayName }
      );
      setAvatarInput(newAvatarUrl);
      setIsEditingAvatar(false);
      setSuccessMessage('Group avatar updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to update group avatar:', e);
      setErrorMessage(e.message || 'Failed to update group avatar.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedNewUserIds.length === 0) return;
    try {
      setLoadingAction('addMembers');
      setErrorMessage(null);
      const names = selectedNewUserIds.map((uid) => {
        const u = availableUsers.find((user) => user.id === uid);
        return u?.displayName || 'User';
      });

      await addGroupParticipants(
        chat.id,
        selectedNewUserIds,
        { id: currentUser.id, displayName: currentUser.displayName },
        names
      );

      setSelectedNewUserIds([]);
      setIsAddingMembers(false);
      setSuccessMessage('Added members to the group!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to add members:', e);
      setErrorMessage(e.message || 'Failed to add members.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!isAdmin) return;
    try {
      setLoadingAction(`remove_${userId}`);
      setErrorMessage(null);
      await removeGroupParticipant(
        chat.id,
        userId,
        { id: currentUser.id, displayName: currentUser.displayName },
        userName
      );
      setSuccessMessage(`Removed ${userName} from group`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to remove member:', e);
      setErrorMessage(e.message || 'Failed to remove member.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      setLoadingAction('leave');
      await leaveGroupChat(chat.id, currentUser.id, currentUser.displayName);
      onClose();
      if (onGroupLeftOrDeleted) onGroupLeftOrDeleted();
    } catch (e: any) {
      console.error('Failed to leave group:', e);
      setErrorMessage(e.message || 'Failed to leave group.');
      setLoadingAction(null);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setLoadingAction('delete');
      await deleteConversationForUser(chat.id, currentUser.id);
      onClose();
      if (onGroupLeftOrDeleted) onGroupLeftOrDeleted();
    } catch (e: any) {
      console.error('Failed to delete group:', e);
      setErrorMessage(e.message || 'Failed to delete group.');
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Group Details & Settings
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {chat.participants.length} participants
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Group Identity Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 relative">
            {/* Avatar with edit overlay */}
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-indigo-500/40 flex items-center justify-center shadow-md">
                {chat.avatar ? (
                  <img
                    src={chat.avatar}
                    alt={chat.name || 'Group'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <button
                onClick={() => setIsEditingAvatar((prev) => !prev)}
                className="absolute bottom-0 right-0 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
                title="Change Avatar"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Avatar Editor Accordion */}
            {isEditingAvatar && (
              <div className="w-full mb-4 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Select New Avatar
                  </span>
                  <button
                    onClick={() => setIsEditingAvatar(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {GROUP_AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSaveAvatar(preset.url)}
                      disabled={loadingAction === 'saveAvatar'}
                      className="rounded-lg overflow-hidden aspect-square border-2 border-transparent hover:border-indigo-500 transition-all hover:scale-105 cursor-pointer"
                      title={preset.name}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    placeholder="Or paste custom image URL..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <button
                    onClick={() => handleSaveAvatar(avatarInput)}
                    disabled={loadingAction === 'saveAvatar' || !avatarInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Name & Description Display / Edit */}
            {isEditingName ? (
              <div className="w-full space-y-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Group Name"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-center text-slate-900 dark:text-white"
                  autoFocus
                />
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Group description (optional)"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                />
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInfo}
                    disabled={loadingAction === 'saveInfo'}
                    className="px-4 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {chat.name || 'Group Conversation'}
                  </h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Edit name & description"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {chat.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {chat.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Members List Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Participants ({chat.participants.length})</span>
              </h4>
              <button
                onClick={() => setIsAddingMembers((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Members</span>
              </button>
            </div>

            {/* Add Members Drawer / Accordion */}
            {isAddingMembers && (
              <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Add People to this Group
                  </span>
                  <button
                    onClick={() => setIsAddingMembers(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search candidate contacts..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  {filteredCandidates.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {candidateUsersToAdd.length === 0
                        ? 'All available contacts are already in this group!'
                        : 'No matching contacts found.'}
                    </div>
                  ) : (
                    filteredCandidates.map((u) => {
                      const isSelected = selectedNewUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleSelectNewUser(u.id)}
                          className={`flex items-center justify-between p-2 px-3 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
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
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {u.displayName}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
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

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleAddMembersSubmit}
                    disabled={selectedNewUserIds.length === 0 || loadingAction === 'addMembers'}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {loadingAction === 'addMembers' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Add Selected ({selectedNewUserIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Current Members List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
              {chat.participants.map((uid) => {
                const profile = participantProfiles[uid] || (uid === currentUser.id ? currentUser : null);
                const isMemberCreator = chat.createdBy === uid;
                const isMemberAdmin = Array.isArray(chat.admins) && chat.admins.includes(uid);
                const isSelf = uid === currentUser.id;

                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 px-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                        {profile?.photoURL ? (
                          <img
                            src={profile.photoURL}
                            alt={profile.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          profile?.displayName?.charAt(0).toUpperCase() || '?'
                        )}
                        {profile && (
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                              profile.presence === 'online'
                                ? 'bg-emerald-500'
                                : profile.presence === 'away'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {profile?.displayName || 'NEXXO User'}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (You)
                            </span>
                          )}
                          {profile && (
                            <VerifiedBadge
                              isVerified={profile.isVerified}
                              isPremium={profile.isPremium}
                              premiumTier={profile.premiumTier}
                              size="xs"
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {profile?.username ? `@${profile.username}` : uid.substring(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isMemberCreator ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <Shield className="w-3 h-3" />
                          <span>Creator</span>
                        </span>
                      ) : isMemberAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Member
                        </span>
                      )}

                      {/* Remove Member button (Creator/Admin can remove other members) */}
                      {isAdmin && !isSelf && !isMemberCreator && (
                        <button
                          onClick={() => handleRemoveMember(uid, profile?.displayName || 'member')}
                          disabled={loadingAction === `remove_${uid}`}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove from group"
                        >
                          {loadingAction === `remove_${uid}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Actions (Leave / Delete) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {confirmLeave ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2 text-left">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Are you sure you want to leave "{chat.name || 'this group'}"?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveGroup}
                    disabled={loadingAction === 'leave'}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                  >
                    Yes, Leave Group
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group</span>
              </button>
            )}

            {/* Creator / Admin can delete conversation */}
            {isCreator && (
              confirmDelete ? (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-2 text-left">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Permanently remove this group conversation for you?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      disabled={loadingAction === 'delete'}
                      className="px-3 py-1 rounded-lg bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 cursor-pointer"
                    >
                      Delete Conversation
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Conversation</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
