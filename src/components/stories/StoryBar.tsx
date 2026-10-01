import React, { useState, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Story, NexxoUser } from '../../types';
import { subscribeToActiveStories } from '../../lib/storyService';
import { subscribeToBlockedUsers } from '../../lib/safetyService';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';

interface StoryBarProps {
  currentUser: NexxoUser;
  connectionUserIds: string[];
  onOpenStoriesView?: () => void;
}

// WhatsApp & Instagram style segmented arc status ring
const StatusRing: React.FC<{
  count: number;
  unseenCount: number;
  size?: number;
  strokeWidth?: number;
}> = ({ count, unseenCount, size = 62, strokeWidth = 2.5 }) => {
  if (count <= 0) return null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (count === 1) {
    const isUnseen = unseenCount > 0;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        <defs>
          <linearGradient id="storyGradientSingle" x1="0%" y1="0%" x2="100%" y2="100%">
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
          stroke={isUnseen ? 'url(#storyGradientSingle)' : '#94A3B8'}
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
        <linearGradient id="storyGradientMulti" x1="0%" y1="0%" x2="100%" y2="100%">
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
            stroke={isUnseen ? 'url(#storyGradientMulti)' : '#64748B'}
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

export const StoryBar: React.FC<StoryBarProps> = ({ currentUser, connectionUserIds, onOpenStoriesView }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubBlocked = subscribeToBlockedUsers(currentUser.id, setBlockedUserIds);
    return () => unsubBlocked();
  }, [currentUser.id]);

  useEffect(() => {
    const unsub = subscribeToActiveStories(currentUser, connectionUserIds, blockedUserIds, (updatedStories) => {
      setStories(updatedStories);
    });
    return () => unsub();
  }, [currentUser.id, connectionUserIds, blockedUserIds]);

  // Group stories by user so each user has one avatar ring
  const userStoryGroups: Record<string, Story[]> = {};
  stories.forEach((story) => {
    if (!userStoryGroups[story.userId]) {
      userStoryGroups[story.userId] = [];
    }
    userStoryGroups[story.userId].push(story);
  });

  const myStories = userStoryGroups[currentUser.id] || [];
  const otherUserIds = Object.keys(userStoryGroups).filter((id) => id !== currentUser.id);

  // Flatten stories starting from selected user
  const openViewerForUser = (userId: string) => {
    const userStories = userStoryGroups[userId] || [];
    if (userStories.length === 0) return;
    const globalIdx = stories.findIndex((s) => s.id === userStories[0].id);
    setViewerIndex(globalIdx >= 0 ? globalIdx : 0);
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-3 select-none">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {/* Current User Story Avatar & Add Status */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
        >
          <div
            onClick={() => {
              if (myStories.length > 0) {
                openViewerForUser(currentUser.id);
              } else {
                setIsCreateOpen(true);
              }
            }}
            className="relative w-[62px] h-[62px] flex items-center justify-center"
          >
            {/* Segmented Ring if has stories */}
            {myStories.length > 0 ? (
              <StatusRing count={myStories.length} unseenCount={myStories.length} size={62} />
            ) : (
              <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400 dark:border-indigo-500/60 transition-transform group-hover:scale-105" />
            )}

            {/* User Avatar */}
            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-white shadow-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                currentUser.displayName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Add Status Plus Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateOpen(true);
              }}
              className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 hover:bg-indigo-500 shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="Add Status"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[68px] truncate">
            {myStories.length > 0 ? 'Your status' : 'Add status'}
          </span>
        </motion.div>

        {/* Other Users' Stories */}
        {otherUserIds.map((userId) => {
          const userStories = userStoryGroups[userId];
          const firstStory = userStories[0];
          const unseenCount = userStories.filter((s) => !s.views?.includes(currentUser.id)).length;

          return (
            <motion.div
              key={userId}
              whileTap={{ scale: 0.95 }}
              onClick={() => openViewerForUser(userId)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative w-[62px] h-[62px] flex items-center justify-center">
                <StatusRing count={userStories.length} unseenCount={unseenCount} size={62} />

                <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-white shadow-xs">
                  {firstStory.userPhotoURL ? (
                    <img
                      src={firstStory.userPhotoURL}
                      alt={firstStory.userDisplayName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    firstStory.userDisplayName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[68px] truncate">
                {firstStory.userDisplayName}
              </span>
            </motion.div>
          );
        })}

        {stories.length === 0 && (
          <div className="flex items-center gap-2 pl-1 text-xs text-slate-400 dark:text-slate-500 italic">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Share status updates with your connections</span>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateStoryModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => setIsCreateOpen(false)}
        />
      )}

      {/* Viewer Modal with Smooth Gestures */}
      {viewerIndex !== null && stories[viewerIndex] && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerIndex}
          currentUser={currentUser}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};
