import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Music,
  Bookmark,
  Volume2,
  VolumeX,
  Heart,
  Sparkles,
  Share2,
  Download,
  Flame,
  Check,
  Smile,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story, NexxoUser } from '../../types';
import {
  recordStoryView,
  deleteStory,
  addStoryReaction,
  sendStoryReply,
  createStoryHighlight,
  subscribeToStory,
} from '../../lib/storyService';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex?: number;
  currentUser: NexxoUser;
  onClose: () => void;
  onStoryDeleted?: () => void;
}

const FILTER_CLASSES: Record<string, string> = {
  none: '',
  vintage: 'sepia-[0.35] contrast-125 brightness-95 saturate-125',
  vivid: 'saturate-150 contrast-110',
  mono: 'grayscale contrast-125',
  warm: 'sepia-[0.2] hue-rotate-[-10deg] saturate-120',
  cool: 'hue-rotate-[15deg] saturate-110 brightness-105',
  sepia: 'sepia contrast-110',
  cyberpunk: 'hue-rotate-[180deg] saturate-200 contrast-125',
  noir: 'grayscale contrast-150 brightness-90',
};

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '🎉', '💯'];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex = 0,
  currentUser,
  onClose,
  onStoryDeleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audio / Sound state
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeToast, setShowVolumeToast] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Interaction feedback (flying reactions and double-tap heart)
  const [flyingEmoji, setFlyingEmoji] = useState<{ id: number; emoji: string } | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySentSuccess, setReplySentSuccess] = useState(false);

  // Viewers Sheet state (for story author)
  const [isViewersSheetOpen, setIsViewersSheetOpen] = useState(false);

  // Highlights state
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  // Drag down to dismiss state
  const [dragY, setDragY] = useState(0);

  // Ref tracking for touch / click vs hold
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const baseStory = stories[currentIndex];
  const [liveStory, setLiveStory] = useState<Story | null>(baseStory || null);

  // Navigate Previous Story
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Navigate Next Story
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Sync when index or base stories change
  useEffect(() => {
    setLiveStory(stories[currentIndex] || null);
  }, [currentIndex, stories]);

  // Real-time listener on active story document for immediate viewers list & reactions update
  useEffect(() => {
    const targetId = stories[currentIndex]?.id;
    if (!targetId) return;

    const unsub = subscribeToStory(targetId, (updated) => {
      if (updated) {
        setLiveStory(updated);
      } else {
        // Story was deleted or expired while viewing
        if (currentIndex < stories.length - 1) {
          handleNext();
        } else {
          onClose();
        }
      }
    });
    return () => unsub();
  }, [currentIndex, stories, handleNext, onClose]);

  const currentStory = liveStory || baseStory;
  const isOwnStory = currentStory?.userId === currentUser.id;

  // Slide duration
  const slideDurationSecs =
    currentStory?.type === 'video' && currentStory?.duration
      ? Math.min(30, Math.max(4, currentStory.duration))
      : currentStory?.duration || 6;
  const slideDurationMs = slideDurationSecs * 1000;

  // Record story view
  useEffect(() => {
    if (currentStory && currentUser) {
      recordStoryView(currentStory.id, currentUser, currentStory.userId).catch(console.warn);
    }
  }, [currentStory?.id, currentUser]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isViewersSheetOpen || isHighlightModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
        setShowVolumeToast(true);
        setTimeout(() => setShowVolumeToast(false), 1200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose, isViewersSheetOpen, isHighlightModalOpen]);

  // Handle Music Playback
  useEffect(() => {
    if (!currentStory) return;

    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.src = '';
    }

    if (currentStory.musicTrack?.audioUrl) {
      const audio = new Audio(currentStory.musicTrack.audioUrl);
      audio.currentTime = currentStory.musicTrack.startTime || 0;
      audio.volume = isMuted
        ? 0
        : (currentStory.audioMix?.musicVolume ?? currentStory.musicTrack.volume ?? 0.85);
      musicAudioRef.current = audio;

      if (!isPaused && !isHolding) {
        audio.play().catch(console.warn);
      }
    }

    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.src = '';
      }
    };
  }, [currentIndex, isMuted, currentStory]);

  // Sync Pause/Resume with media
  useEffect(() => {
    const paused = isPaused || isHolding || isViewersSheetOpen || isHighlightModalOpen;
    if (paused) {
      musicAudioRef.current?.pause();
      videoRef.current?.pause();
    } else {
      musicAudioRef.current?.play().catch(console.warn);
      videoRef.current?.play().catch(console.warn);
    }
  }, [isPaused, isHolding, isViewersSheetOpen, isHighlightModalOpen]);

  // Progress timer loop (high precision 60fps)
  useEffect(() => {
    if (!currentStory || isPaused || isHolding || isViewersSheetOpen || isHighlightModalOpen) return;

    setProgress(0);
    const stepInterval = 40;
    const increment = (stepInterval / slideDurationMs) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (currentIndex < stories.length - 1) {
            setDirection(1);
            setCurrentIndex((idx) => idx + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return Math.min(100, prev + increment);
      });
    }, stepInterval);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, isHolding, slideDurationMs, stories.length, isViewersSheetOpen, isHighlightModalOpen, onClose]);

  // Gesture Handlers: Hold to Pause & Hide UI, Tap Left/Right, Double-tap to Like
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Start hold timer - if held > 160ms, enter Hold state (pause & hide UI)
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding(true);
    }, 160);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const deltaY = e.clientY - pointerStartRef.current.y;
    const deltaX = Math.abs(e.clientX - pointerStartRef.current.x);

    // If user is dragging downward to dismiss, cancel hold and track drag
    if (deltaY > 20 && deltaY > deltaX) {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      setIsHolding(false);
      setDragY(deltaY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    // If dragged down past 120px, dismiss story smoothly
    if (dragY > 120) {
      onClose();
      return;
    }
    setDragY(0);

    // If was holding, release hold and return
    if (isHolding) {
      setIsHolding(false);
      pointerStartRef.current = null;
      return;
    }

    // Process Quick Tap or Double Tap
    if (pointerStartRef.current) {
      const duration = Date.now() - pointerStartRef.current.time;
      const moveX = Math.abs(e.clientX - pointerStartRef.current.x);
      const moveY = Math.abs(e.clientY - pointerStartRef.current.y);

      // Verify it was a clean tap without large swipe
      if (duration < 250 && moveX < 15 && moveY < 15) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTimeRef.current;

        // Double tap detection (< 280ms)
        if (timeSinceLastTap < 280) {
          triggerDoubleTapHeart();
          lastTapTimeRef.current = 0;
          pointerStartRef.current = null;
          return;
        }

        lastTapTimeRef.current = now;

        // Horizontal zones: Left 35% is Prev, Right 35% is Next
        const rect = e.currentTarget.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const width = rect.width;

        if (tapX < width * 0.35) {
          handlePrev();
        } else if (tapX > width * 0.65) {
          handleNext();
        } else {
          // Middle tap toggles pause
          setIsPaused((p) => !p);
        }
      }
    }

    pointerStartRef.current = null;
  };

  const handlePointerCancel = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    setIsHolding(false);
    setDragY(0);
    pointerStartRef.current = null;
  };

  // Double tap heart pop
  const triggerDoubleTapHeart = () => {
    setShowHeartPop(true);
    handleReaction('❤️');
    setTimeout(() => setShowHeartPop(false), 900);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentStory || currentStory.userId !== currentUser.id) return;

    setIsDeleting(true);
    try {
      await deleteStory(currentStory.id);
      onStoryDeleted?.();
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Emoji Reaction
  const handleReaction = async (emoji: string) => {
    if (!currentStory) return;

    setFlyingEmoji({ id: Date.now(), emoji });
    setTimeout(() => setFlyingEmoji(null), 1200);

    try {
      await addStoryReaction(currentStory, currentUser, emoji);
    } catch (err) {
      console.warn('Reaction error:', err);
    }
  };

  // Send Story Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await sendStoryReply(currentStory, currentUser, replyText.trim());
      setReplyText('');
      setReplySentSuccess(true);
      setTimeout(() => setReplySentSuccess(false), 2000);
    } catch (err) {
      console.warn('Reply error:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Add to Highlights
  const handleSaveHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightTitle.trim() || !currentStory || isSavingHighlight) return;

    setIsSavingHighlight(true);
    try {
      await createStoryHighlight(
        currentUser.id,
        highlightTitle.trim(),
        currentStory.mediaUrl || currentStory.userPhotoURL || '',
        [currentStory.id]
      );
      setIsHighlightModalOpen(false);
      setHighlightTitle('');
    } catch (err) {
      console.warn('Highlight save error:', err);
    } finally {
      setIsSavingHighlight(false);
    }
  };

  if (!currentStory) return null;

  const filterClass =
    currentStory.mediaFilters?.filter && FILTER_CLASSES[currentStory.mediaFilters.filter]
      ? FILTER_CLASSES[currentStory.mediaFilters.filter]
      : '';
  const rotation = currentStory.mediaFilters?.rotation || 0;

  const formatExpiresIn = (expiresAt: any) => {
    if (!expiresAt) return '24h';
    const exp = expiresAt.toMillis ? expiresAt.toMillis() : Date.now();
    const remainingHours = Math.max(0, Math.round((exp - Date.now()) / (1000 * 60 * 60)));
    return `${remainingHours}h left`;
  };

  // UI elements fade out smoothly when holding to pause
  const uiOpacityClass = isHolding
    ? 'opacity-0 pointer-events-none transition-opacity duration-200'
    : 'opacity-100 transition-opacity duration-200';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none touch-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0.4, 0.95 - dragY / 400)})`,
      }}
    >
      {/* Story Stage Container with pull-down gesture physics */}
      <motion.div
        style={{
          transform: `translateY(${dragY}px) scale(${Math.max(0.85, 1 - dragY / 1000)})`,
          borderRadius: `${Math.min(36, 24 + dragY / 10)}px`,
        }}
        className="relative w-full max-w-sm sm:max-w-md h-full sm:h-[94vh] sm:max-h-[820px] overflow-hidden shadow-2xl flex flex-col bg-slate-950 sm:border sm:border-white/10 sm:rounded-3xl"
      >
        {/* Top Progress Bars (Smooth Segmented Multi-Story Progress) */}
        <div className={`absolute top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] inset-x-3 z-40 flex gap-1 ${uiOpacityClass}`}>
          {stories.map((s, idx) => (
            <div
              key={s.id}
              className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden backdrop-blur-xs"
            >
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                  transition: isPaused || isHolding ? 'none' : 'width 60ms linear',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div
          className={`absolute top-[calc(max(0.75rem,env(safe-area-inset-top,0.75rem))+0.75rem)] inset-x-4 z-40 flex items-center justify-between text-white drop-shadow-md ${uiOpacityClass}`}
        >
          {/* Author info */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-indigo-400 bg-indigo-600 flex items-center justify-center font-bold text-xs shadow-md">
              {currentStory.userPhotoURL ? (
                <img
                  src={currentStory.userPhotoURL}
                  alt={currentStory.userDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                currentStory.userDisplayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white leading-tight">
                  {currentStory.userDisplayName}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-slate-300 font-mono">
                  {formatExpiresIn(currentStory.expiresAt)}
                </span>
              </div>
              <span className="text-[10px] text-slate-300 font-mono">
                @{currentStory.userUsername}
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Audio Mute/Unmute */}
            {(currentStory.musicTrack || currentStory.type === 'video') && (
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  setShowVolumeToast(true);
                  setTimeout(() => setShowVolumeToast(false), 1200);
                }}
                className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-transform active:scale-95"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}

            {isOwnStory && (
              <>
                <button
                  onClick={() => setIsHighlightModalOpen(true)}
                  className="p-2 rounded-full bg-black/40 hover:bg-indigo-600/80 text-white backdrop-blur-md transition-transform active:scale-95"
                  title="Add to Highlights"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 rounded-full bg-black/40 hover:bg-rose-600/80 text-white backdrop-blur-md transition-transform active:scale-95"
                  title="Delete Story"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-transform active:scale-95"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Music Track Pill overlay */}
        {currentStory.musicTrack && (
          <div
            className={`absolute top-[calc(max(0.75rem,env(safe-area-inset-top,0.75rem))+3.5rem)] left-4 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-md max-w-[85%] ${uiOpacityClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-4 w-4 rounded-full overflow-hidden bg-indigo-600 flex-shrink-0 flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
              {currentStory.musicTrack.artworkUrl ? (
                <img
                  src={currentStory.musicTrack.artworkUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music className="h-2.5 w-2.5" />
              )}
            </div>
            <div className="min-w-0 pr-1">
              <p className="text-[10px] font-bold truncate">
                {currentStory.musicTrack.title} • {currentStory.musicTrack.artist}
              </p>
            </div>
          </div>
        )}

        {/* Volume status toast indicator */}
        <AnimatePresence>
          {showVolumeToast && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top,0.75rem))+6rem)] inset-x-0 z-40 flex justify-center pointer-events-none"
            >
              <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sound On</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Viewport with Gesture Surface */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer bg-black"
        >
          {/* Animated Slide Switcher */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStory.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center w-full h-full"
            >
              {currentStory.type === 'text' ? (
                <div
                  className="h-full w-full flex items-center justify-center p-8 text-center"
                  style={
                    (currentStory.backgroundColor || '#4F46E5').includes('gradient')
                      ? { backgroundImage: currentStory.backgroundColor || '#4F46E5' }
                      : { backgroundColor: currentStory.backgroundColor || '#4F46E5' }
                  }
                >
                  <p
                    className="text-2xl font-bold leading-relaxed max-w-sm drop-shadow-xl"
                    style={{
                      color: currentStory.textColor || '#FFFFFF',
                      fontFamily: currentStory.fontFamily || 'Inter, sans-serif',
                    }}
                  >
                    {currentStory.caption}
                  </p>
                </div>
              ) : currentStory.type === 'video' ? (
                <div className="h-full w-full relative flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    src={currentStory.mediaUrl}
                    autoPlay
                    playsInline
                    loop
                    muted={isMuted || !currentStory.audioMix?.originalSound}
                    className={`h-full w-full object-cover ${filterClass}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                  {currentStory.caption && (
                    <div className={`absolute bottom-20 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center z-20 ${uiOpacityClass}`}>
                      <p className="text-xs font-medium text-white drop-shadow-md">
                        {currentStory.caption}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full w-full relative flex items-center justify-center bg-black">
                  <img
                    src={currentStory.mediaUrl}
                    alt="Story"
                    className={`h-full w-full object-cover ${filterClass}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                  {currentStory.caption && (
                    <div className={`absolute bottom-20 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center z-20 ${uiOpacityClass}`}>
                      <p className="text-xs font-medium text-white drop-shadow-md">
                        {currentStory.caption}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Render Stickers & Drawing Overlays */}
              {currentStory.stickers?.map((stk) => {
                if (stk.type === 'drawing') {
                  return (
                    <img
                      key={stk.id}
                      src={stk.content}
                      alt="Drawing"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
                    />
                  );
                }
                return (
                  <div
                    key={stk.id}
                    className="absolute text-4xl select-none pointer-events-none drop-shadow-xl z-20"
                    style={{
                      left: `${stk.x}%`,
                      top: `${stk.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {stk.content}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Double Tap Floating Heart Pop Effect */}
          <AnimatePresence>
            {showHeartPop && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -15 }}
                animate={{ scale: [0, 1.4, 1.1], opacity: 1, rotate: 0 }}
                exit={{ scale: 1.4, opacity: 0, y: -40 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute z-50 pointer-events-none drop-shadow-2xl"
              >
                <Heart className="w-24 h-24 text-rose-500 fill-rose-500 filter drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flying Emoji Reaction Animation */}
          <AnimatePresence>
            {flyingEmoji && (
              <motion.div
                key={flyingEmoji.id}
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={{ opacity: 1, scale: 1.6, y: -80 }}
                exit={{ opacity: 0, scale: 2, y: -160 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="absolute z-50 text-5xl pointer-events-none drop-shadow-2xl"
              >
                {flyingEmoji.emoji}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left / Right Tap Hint Indicators on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className={`hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-opacity z-30 backdrop-blur-sm ${
              currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 hover:opacity-100'
            }`}
            title="Previous Story (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-opacity z-30 backdrop-blur-sm opacity-0 hover:opacity-100"
            title="Next Story (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Interactive Area (WhatsApp & Instagram style) */}
        <div
          className={`p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] bg-black/85 backdrop-blur-md border-t border-white/10 z-30 flex flex-col gap-2 ${uiOpacityClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isOwnStory ? (
            /* Story Author View: View count & Viewers sheet opener */
            <div
              onClick={() => setIsViewersSheetOpen(true)}
              className="flex items-center justify-between py-2 px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 cursor-pointer transition-colors active:scale-98"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">
                  {currentStory.viewCount || currentStory.views?.length || 0} Views
                </span>
              </div>
              <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                Viewers List →
              </span>
            </div>
          ) : (
            /* Contact Viewer: Quick Reactions & Message Reply */
            <>
              {/* Quick Reactions Bar with Pop Physics */}
              <div className="flex items-center justify-between px-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.35 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(emoji)}
                    className="text-xl p-1 transition-transform"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Story Reply Input */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  placeholder={`Reply to ${currentStory.userDisplayName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white/10 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-transform active:scale-95 shadow-md shadow-indigo-600/30"
                  title="Send Reply"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              {replySentSuccess && (
                <p className="text-[10px] text-emerald-400 text-center font-medium">
                  Reply sent directly to chat!
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Viewers Sheet Sub-Modal (For Story Author) */}
      <AnimatePresence>
        {isViewersSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
            onClick={() => setIsViewersSheetOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md h-[65vh] max-h-[80dvh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    Story Viewers ({currentStory.viewersList?.length || currentStory.views?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => setIsViewersSheetOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {!currentStory.viewersList || currentStory.viewersList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No views recorded yet. When connections view your story, they'll appear here.
                  </div>
                ) : (
                  currentStory.viewersList.map((viewer, idx) => {
                    const userReaction = currentStory.reactionsMap?.[viewer.userId];

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                            {viewer.photoURL ? (
                              <img
                                src={viewer.photoURL}
                                alt={viewer.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              viewer.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{viewer.displayName}</p>
                            <p className="text-[10px] text-slate-400">@{viewer.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {userReaction && <span className="text-base">{userReaction}</span>}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(viewer.viewedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Highlights Sub-Modal */}
      <AnimatePresence>
        {isHighlightModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setIsHighlightModalOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Add to Story Highlights</h3>
                <button
                  onClick={() => setIsHighlightModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveHighlight} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Highlight Album Title
                  </label>
                  <input
                    type="text"
                    value={highlightTitle}
                    onChange={(e) => setHighlightTitle(e.target.value)}
                    placeholder="e.g. Travel, Memories, Beats..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHighlightModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingHighlight || !highlightTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isSavingHighlight ? 'Saving...' : 'Save Highlight'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
