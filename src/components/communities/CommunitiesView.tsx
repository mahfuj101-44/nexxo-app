import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Plus,
  Users,
  Search,
  Check,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { Community, NexxoUser } from '../../types';
import {
  subscribeToCommunities,
  joinCommunity,
  leaveCommunity,
} from '../../lib/communityService';
import { CreateCommunityModal } from './CreateCommunityModal';

interface CommunitiesViewProps {
  currentUser: NexxoUser;
  onSelectGroup?: (groupId: string) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  currentUser,
  onSelectGroup,
}) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeToCommunities((list) => {
      setCommunities(list);
      if (list.length > 0 && !selectedCommunity) {
        setSelectedCommunity(list[0]);
      }
    });
    return () => unsub();
  }, []);

  const filtered = communities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinToggle = async (comm: Community) => {
    const isMember = comm.members.includes(currentUser.id);
    if (isMember) {
      await leaveCommunity(comm.id, currentUser.id);
    } else {
      await joinCommunity(comm.id, currentUser.id);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Sidebar Directory */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0 ${
          selectedCommunity ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Communities</h2>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow-sm"
            title="Create Community"
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
              placeholder="Search communities..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 px-4">
              No communities found. Create your own organization or hub!
            </div>
          ) : (
            filtered.map((comm) => {
              const isSelected = selectedCommunity?.id === comm.id;
              const isMember = comm.members.includes(currentUser.id);

              return (
                <div
                  key={comm.id}
                  onClick={() => setSelectedCommunity(comm)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-white shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {comm.photoURL ? (
                        <img src={comm.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        comm.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate leading-tight text-slate-900 dark:text-white">{comm.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {comm.memberCount || comm.members.length} members
                      </p>
                    </div>
                  </div>

                  {isMember && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-500/20">
                      Member
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Community Details */}
      {selectedCommunity ? (
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 overflow-y-auto w-full">
          {/* Hero Banner */}
          <div className="p-4 sm:p-6 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <button
                  onClick={() => setSelectedCommunity(null)}
                  type="button"
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Back to Communities"
                  title="Back to Communities"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-xl sm:text-2xl text-white shadow-xl shrink-0">
                  {selectedCommunity.photoURL ? (
                    <img
                      src={selectedCommunity.photoURL}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    selectedCommunity.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <span className="truncate">{selectedCommunity.name}</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCommunity.memberCount || selectedCommunity.members.length} members
                  </p>
                  {selectedCommunity.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 sm:mt-2 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {selectedCommunity.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Join / Leave button */}
              <button
                onClick={() => handleJoinToggle(selectedCommunity)}
                className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                  selectedCommunity.members.includes(currentUser.id)
                    ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {selectedCommunity.members.includes(currentUser.id) ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> Joined
                  </span>
                ) : (
                  'Join Community'
                )}
              </button>
            </div>
          </div>

          {/* Linked Groups Section */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Community Sub-Groups & Topics</span>
            </div>

            {selectedCommunity.linkedGroupIds && selectedCommunity.linkedGroupIds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCommunity.linkedGroupIds.map((groupId) => (
                  <div
                    key={groupId}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Subgroup</p>
                        <p className="text-[11px] font-mono text-slate-500">{groupId}</p>
                      </div>
                    </div>

                    {onSelectGroup && (
                      <button
                        onClick={() => onSelectGroup(groupId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  No linked group chat rooms in this community yet.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Community administrators can connect group chats for segmented team discussions.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-500 text-center p-8 bg-slate-50/50 dark:bg-transparent">
          <Globe2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select or Create a Community</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Communities unify multiple groups, topics, and broadcast channels under one umbrella.
          </p>
        </div>
      )}

      {/* Create Community Modal */}
      {isCreateOpen && (
        <CreateCommunityModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCommunityCreated={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
};
