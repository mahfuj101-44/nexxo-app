import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  Crown,
  UserX,
  UserPlus,
  LogOut,
  Trash2,
  Lock,
  Save,
  Check,
} from 'lucide-react';
import { Group, GroupRole, GroupSettings, NexxoUser } from '../../types';
import {
  updateGroupSettings,
  removeGroupMember,
  setMemberAdminRole,
  deleteGroup,
  addGroupMembers,
} from '../../lib/groupService';
import { getUserProfile } from '../../lib/userService';

interface GroupSettingsModalProps {
  group: Group;
  currentUser: NexxoUser;
  connections: NexxoUser[];
  onClose: () => void;
  onGroupUpdated?: () => void;
  onLeftGroup?: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  group,
  currentUser,
  connections,
  onClose,
  onGroupUpdated,
  onLeftGroup,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'permissions'>('members');
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [photoURL, setPhotoURL] = useState(group.photoURL || '');
  const [members, setMembers] = useState<NexxoUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Add members sub-state
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  const isOwner = group.ownerId === currentUser.id;
  const isAdmin = isOwner || group.admins.includes(currentUser.id);

  // Load member user profiles
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoadingMembers(true);
      const loaded: NexxoUser[] = [];
      for (const mId of group.members) {
        try {
          const profile = await getUserProfile(mId);
          if (profile) loaded.push(profile);
        } catch {
          // ignore failed user lookups
        }
      }
      if (isMounted) {
        setMembers(loaded);
        setIsLoadingMembers(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [group.members]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      await updateGroupSettings(group.id, {
        name,
        description,
        photoURL,
      });
      setMessage('Group info updated successfully.');
      onGroupUpdated?.();
    } catch (err: any) {
      setMessage(err.message || 'Failed to update group info.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePermission = async (
    field: keyof GroupSettings,
    value: 'all' | 'admins'
  ) => {
    if (!isAdmin) return;
    try {
      await updateGroupSettings(group.id, {
        settings: { [field]: value },
      });
      onGroupUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAdmin = async (memberId: string, currentlyAdmin: boolean) => {
    if (!isOwner) return;
    try {
      await setMemberAdminRole(group.id, memberId, !currentlyAdmin);
      onGroupUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeGroupMember(group.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onGroupUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await removeGroupMember(group.id, currentUser.id);
      onLeftGroup?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!isOwner) return;
    try {
      await deleteGroup(group.id);
      onLeftGroup?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      await addGroupMembers(group.id, selectedToAdd);
      setSelectedToAdd([]);
      setShowAddMembers(false);
      onGroupUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const availableToAdd = connections.filter((c) => !group.members.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Members ({group.members.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Group Info
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              activeTab === 'permissions'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Permissions
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {message && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs">
              {message}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Member Directory
                </span>
                {(isAdmin || group.settings.whoCanAddMembers === 'all') && (
                  <button
                    onClick={() => setShowAddMembers(!showAddMembers)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {showAddMembers ? 'Cancel' : 'Add Members'}
                  </button>
                )}
              </div>

              {/* Add Members Drawer */}
              {showAddMembers && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">Select Connections to Add</p>
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-slate-500">All of your connections are already in this group.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {availableToAdd.map((u) => {
                        const isSel = selectedToAdd.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() =>
                              setSelectedToAdd((prev) =>
                                isSel ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              )
                            }
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                              isSel
                                ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span>{u.displayName} (@{u.username})</span>
                            {isSel && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {availableToAdd.length > 0 && (
                    <button
                      onClick={handleConfirmAddMembers}
                      disabled={selectedToAdd.length === 0}
                      className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                    >
                      Add Selected ({selectedToAdd.length})
                    </button>
                  )}
                </div>
              )}

              {/* Members List */}
              {isLoadingMembers ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading members...
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const memberIsOwner = member.id === group.ownerId;
                    const memberIsAdmin = group.admins.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                            {member.photoURL ? (
                              <img src={member.photoURL} alt="" className="h-full w-full object-cover" />
                            ) : (
                              member.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {member.displayName}
                              </span>
                              {memberIsOwner && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-bold">
                                  <Crown className="h-3 w-3" /> Owner
                                </span>
                              )}
                              {!memberIsOwner && memberIsAdmin && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                  <Shield className="h-3 w-3" /> Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              @{member.username} • {member.nexxoId}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {isOwner && !memberIsOwner && (
                            <button
                              onClick={() => handleToggleAdmin(member.id, memberIsAdmin)}
                              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 cursor-pointer"
                              title={memberIsAdmin ? 'Demote to member' : 'Promote to admin'}
                            >
                              {memberIsAdmin ? 'Demote' : 'Make Admin'}
                            </button>
                          )}
                          {isAdmin && !memberIsOwner && member.id !== currentUser.id && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              title="Remove member"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Group Info Tab */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Group Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Group Photo URL</label>
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              )}
            </form>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Who can send messages?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanSendMessages', 'all')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanSendMessages === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanSendMessages', 'admins')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanSendMessages === 'admins'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    Admins Only
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Who can edit group info?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanEditInfo', 'all')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanEditInfo === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanEditInfo', 'admins')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanEditInfo === 'admins'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    Admins Only
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Who can add new members?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanAddMembers', 'all')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanAddMembers === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleUpdatePermission('whoCanAddMembers', 'admins')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      group.settings.whoCanAddMembers === 'admins'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    Admins Only
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <button
              onClick={handleLeaveGroup}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Leave Group
            </button>

            {isOwner && (
              <button
                onClick={handleDeleteGroup}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Delete Group Permanently
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
