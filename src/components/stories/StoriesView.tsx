import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Eye,
  Clock,
  Trash2,
  Lock,
  Globe,
  Users,
  Bookmark,
  Archive,
  FileText,
  Play,
  Download,
  Share2,
  Disc,
} from 'lucide-react';
import { Story, NexxoUser, StoryHighlight, StoryDraft } from '../../types';
import {
  subscribeToActiveStories,
  deleteStory,
  getUserStoryArchive,
  getUserStoryHighlights,
  getUserStoryDrafts,
  deleteStoryDraft,
  deleteStoryHighlight,
} from '../../lib/storyService';
import { subscribeToBlockedUsers } from '../../lib/safetyService';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';
import { motion } from 'motion/react';

// Segmented Arc Status Ring
const StatusRing: React.FC<{
  count: number;
  unseenCount: number;
  size?: number;
  strokeWidth?: number;
}> = ({ count, unseenCount, size = 52, strokeWidth = 2.5 }) => {
  if (count <= 0) return null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (count === 1) {
    const isUnseen = unseenCount > 0;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        <defs>
          <linearGradient id="svStoryGradSingle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isUnseen ? 'url(#svStoryGradSingle)' : '#94A3B8'}
          strokeWidth={strokeWidth}
          className="transition-colors duration-300"
        />
      </svg>
    );
  }

  const gap = count > 8 ? 2 : count > 4 ? 3 : 4;
  const segmentLength = (circumference - count * gap) / count;

  return (
    <svg className="absolute inset-0 pointer-events-none -rotate-90" width={size} height={size}>
      <defs>
        <linearGradient id="svStoryGradMulti" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {Array.from({ length: count }).map((_, i) => {
        const isUnseen = i < unseenCount;
        const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
        const strokeDashoffset = -i * (segmentLength + gap);

        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isUnseen ? 'url(#svStoryGradMulti)' : '#64748B'}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-colors duration-300"
          />
        );
      })}
    </svg>
  );
};

interface StoriesViewProps {
  currentUser: NexxoUser;
  connectionUserIds: string[];
}

export const StoriesView: React.FC<StoriesViewProps> = ({
  currentUser,
  connectionUserIds,
}) => {
  const [activeTab, setActiveTab] = useState<'stories' | 'highlights' | 'archive' | 'drafts'>('stories');
  const [stories, setStories] = useState<Story[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [archiveStories, setArchiveStories] = useState<Story[]>([]);
  const [drafts, setDrafts] = useState<StoryDraft[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Subscribe to blocked users
  useEffect(() => {
    const unsub = subscribeToBlockedUsers(currentUser.id, setBlockedUserIds);
    return () => unsub();
  }, [currentUser.id]);

  // Subscribe to active stories
  useEffect(() => {
    const unsub = subscribeToActiveStories(currentUser, connectionUserIds, blockedUserIds, setStories);
    return () => unsub();
  }, [currentUser.id, connectionUserIds, blockedUserIds]);

  // Fetch highlights, archive, drafts when tab switches
  useEffect(() => {
    if (activeTab === 'highlights') {
      getUserStoryHighlights(currentUser.id).then(setHighlights).catch(console.warn);
    } else if (activeTab === 'archive') {
      getUserStoryArchive(currentUser.id).then(setArchiveStories).catch(console.warn);
    } else if (activeTab === 'drafts') {
      getUserStoryDrafts(currentUser.id).then(setDrafts).catch(console.warn);
    }
  }, [activeTab, currentUser.id]);

  const myStories = stories.filter((s) => s.userId === currentUser.id);
  const connectionStories = stories.filter((s) => s.userId !== currentUser.id);

  // Group connection stories by user
  const groupedOtherStories: Record<string, Story[]> = {};
  connectionStories.forEach((s) => {
    if (!groupedOtherStories[s.userId]) {
      groupedOtherStories[s.userId] = [];
    }
    groupedOtherStories[s.userId].push(s);
  });

  const openViewerForStory = (storyList: Story[], story: Story) => {
    const idx = storyList.findIndex((s) => s.id === story.id);
    setViewerStories(storyList);
    setViewerIndex(idx >= 0 ? idx : 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">NEXXO Stories & Social Media</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ephemeral updates, video & photo stories, licensed music, and highlights.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add Story / Status
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('stories')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'stories'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Active Stories ({stories.length})
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'highlights'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Highlights
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'archive'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          Story Archive
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'drafts'
              ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Drafts
        </button>
      </div>

      {/* TAB 1: ACTIVE STORIES */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          {/* My Status Section */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Status Updates ({myStories.length})
              </h3>
            </div>

            {myStories.length === 0 ? (
              <div
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Create a story or status update</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Post video, photo, music, or text that vanishes after 24 hours
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {myStories.map((story) => (
                  <div
                    key={story.id}
                    onClick={() => openViewerForStory(myStories, story)}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-800 group shadow-md"
                    style={
                      story.type === 'text' && (story.backgroundColor || '#4F46E5').includes('gradient')
                        ? { backgroundImage: story.backgroundColor || '#4F46E5' }
                        : { backgroundColor: story.type === 'text' ? story.backgroundColor || '#4F46E5' : '#000' }
                    }
                  >
                    {story.type === 'image' && (
                      <img
                        src={story.mediaUrl}
                        alt=""
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    {story.type === 'video' && (
                      <video
                        src={story.mediaUrl}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        muted
                      />
                    )}
                    {story.type === 'text' && (
                      <div className="h-full w-full p-4 flex items-center justify-center text-center">
                        <p className="text-xs font-bold text-white line-clamp-4">
                          {story.caption}
                        </p>
                      </div>
                    )}

                    {/* View Count Badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white backdrop-blur-sm flex items-center gap-1 font-mono">
                      <Eye className="h-3 w-3 text-indigo-400" />
                      <span>{story.viewCount || story.views?.length || 0}</span>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] text-slate-300 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {story.expiresAt?.toDate
                          ? `${Math.max(
                              0,
                              Math.round(
                                (story.expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60)
                              )
                            )}h left`
                          : 'Active'}
                      </span>
                      <span>{story.privacy === 'everyone' ? 'Public' : 'Connections'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connections' Status Section */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Connection Updates
            </h3>

            {Object.keys(groupedOtherStories).length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">
                No active stories from connections right now. Check back soon!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(groupedOtherStories).map(([userId, userStories]) => {
                  const latestStory = userStories[0];
                  const allSeen = userStories.every((s) => s.views?.includes(currentUser.id));
                  const unseenCount = userStories.filter((s) => !s.views?.includes(currentUser.id)).length;

                  return (
                    <motion.div
                      key={userId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openViewerForStory(userStories, latestStory)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 select-none ${
                        allSeen
                          ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          : 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/40 shadow-xs'
                      }`}
                    >
                      <div className="relative w-[52px] h-[52px] flex items-center justify-center flex-shrink-0">
                        <StatusRing count={userStories.length} unseenCount={unseenCount} size={52} strokeWidth={2.5} />
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-white shadow-xs">
                          {latestStory.userPhotoURL ? (
                            <img
                              src={latestStory.userPhotoURL}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            latestStory.userDisplayName.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>

                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {latestStory.userDisplayName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          @{latestStory.userUsername}
                        </p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                          {userStories.length} update{userStories.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HIGHLIGHTS */}
      {activeTab === 'highlights' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Story Highlights ({highlights.length})
            </h3>
          </div>

          {highlights.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Bookmark className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No highlights created yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Save your favorite stories permanently to your profile highlights from the story viewer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {highlights.map((hl) => (
                <div key={hl.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="relative h-20 w-20 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-pink-500 group-hover:scale-105 transition-transform">
                    <div className="h-full w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                      {hl.coverUrl ? (
                        <img src={hl.coverUrl} alt={hl.name} className="h-full w-full object-cover" />
                      ) : (
                        <Bookmark className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px]">
                    {hl.name}
                  </span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteStoryHighlight(hl.id);
                        setHighlights((prev) => prev.filter((h) => h.id !== hl.id));
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STORY ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expired Story Archive ({archiveStories.length})
            </h3>
          </div>

          {archiveStories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Archive className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Your archive is empty</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When your stories expire after 24 hours, they are preserved securely here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {archiveStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => openViewerForStory(archiveStories, story)}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-800 group shadow-md"
                  style={
                    story.type === 'text' && (story.backgroundColor || '#4F46E5').includes('gradient')
                      ? { backgroundImage: story.backgroundColor || '#4F46E5' }
                      : { backgroundColor: story.type === 'text' ? story.backgroundColor || '#4F46E5' : '#000' }
                  }
                >
                  {story.type === 'image' && (
                    <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  {story.type === 'video' && (
                    <video src={story.mediaUrl} className="h-full w-full object-cover" muted />
                  )}
                  {story.type === 'text' && (
                    <div className="h-full w-full p-4 flex items-center justify-center text-center">
                      <p className="text-xs font-bold text-white line-clamp-4">{story.caption}</p>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white backdrop-blur-sm flex items-center gap-1 font-mono">
                    <Eye className="h-3 w-3 text-indigo-400" />
                    <span>{story.viewCount || story.views?.length || 0}</span>
                  </div>

                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] text-slate-400 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <span>Expired</span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteStory(story.id);
                          setArchiveStories((prev) => prev.filter((s) => s.id !== story.id));
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DRAFTS */}
      {activeTab === 'drafts' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Saved Story Drafts ({drafts.length})
            </h3>
          </div>

          {drafts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No drafts saved</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can save drafts while editing a story to continue later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{draft.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{draft.type} draft</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Continue
                    </button>
                    <button
                      onClick={async () => {
                        await deleteStoryDraft(draft.id);
                        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateStoryModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => setIsCreateOpen(false)}
        />
      )}

      {/* Viewer Modal */}
      {viewerIndex !== null && viewerStories[viewerIndex] && (
        <StoryViewerModal
          stories={viewerStories}
          initialIndex={viewerIndex}
          currentUser={currentUser}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};
