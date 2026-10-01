import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Group, NexxoUser } from '../../types';
import { subscribeToGroups } from '../../lib/groupService';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupChatView } from './GroupChatView';

interface GroupsViewProps {
  currentUser: NexxoUser;
  connections: NexxoUser[];
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string | null) => void;
  onStartCall?: (type: 'voice' | 'video') => void;
  onOpenAiAssistant?: () => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  currentUser,
  connections,
  selectedGroupId,
  onSelectGroup,
  onStartCall,
  onOpenAiAssistant,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Subscribe to user's real-time groups
  useEffect(() => {
    const unsub = subscribeToGroups(currentUser.id, (list) => {
      setGroups(list);
      // Auto-select if selectedGroupId provided or preserve current
      if (selectedGroupId) {
        const found = list.find((g) => g.id === selectedGroupId);
        if (found) setActiveGroup(found);
      } else if (!activeGroup && list.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
        setActiveGroup(list[0]);
      } else if (activeGroup) {
        // Keep active group fresh
        const updated = list.find((g) => g.id === activeGroup.id);
        if (updated) setActiveGroup(updated);
      }
    });
    return () => unsub();
  }, [currentUser.id, selectedGroupId]);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupSelect = (group: Group) => {
    setActiveGroup(group);
    onSelectGroup?.(group.id);
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Sidebar List */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0 ${
          activeGroup ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Group Chats</h2>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow-sm"
            title="Create Group"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 px-4">
              No groups found. Create one with your connections!
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;

              return (
                <div
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-white shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {group.photoURL ? (
                        <img src={group.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        group.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{group.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {group.lastMessage || `${group.memberCount} members`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 font-mono">
                    {group.memberCount}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Group Chat Main Panel */}
      {activeGroup ? (
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <GroupChatView
            group={activeGroup}
            currentUser={currentUser}
            connections={connections}
            onStartCall={onStartCall}
            onLeftGroup={() => {
              setActiveGroup(null);
              onSelectGroup?.(null);
            }}
            onOpenAiAssistant={onOpenAiAssistant}
            onBack={() => {
              setActiveGroup(null);
              onSelectGroup?.(null);
            }}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-500 text-center p-8 bg-slate-50/50 dark:bg-transparent">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select or Create a Group Chat</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Collaborate in real-time with multi-user groups, roles, permissions, attachments, and voice notes.
          </p>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateGroupModal
          currentUser={currentUser}
          connections={connections}
          onClose={() => setIsCreateOpen(false)}
          onGroupCreated={(id) => {
            setIsCreateOpen(false);
            onSelectGroup?.(id);
          }}
        />
      )}
    </div>
  );
};
