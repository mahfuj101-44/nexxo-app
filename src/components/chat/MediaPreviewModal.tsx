import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Check,
  ArrowLeft,
  FileText,
  Clock,
} from 'lucide-react';
import { downloadAttachmentFile, formatFileSize } from '../../lib/storageService';

export interface MediaPreviewItem {
  url: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
  duration?: number;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: string;
}

interface MediaPreviewModalProps {
  media: MediaPreviewItem | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ media, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & video states when media changes
  useEffect(() => {
    setZoomLevel(1);
    setIsDownloading(false);
    setDownloadSuccess(false);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [media?.url]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && media?.type === 'video') {
        e.preventDefault();
        togglePlayPause();
      } else if ((e.key === '+' || e.key === '=') && media?.type === 'image') {
        handleZoomIn();
      } else if (e.key === '-' && media?.type === 'image') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose, isPlaying]);

  if (!media) return null;

  const isVideo = media.type === 'video';

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.35, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.35, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleDoubleClick = () => {
    if (!isVideo) {
      setZoomLevel((prev) => (prev === 1 ? 2 : 1));
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.warn);
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.warn);
      } else {
        containerRef.current.requestFullscreen().catch(console.warn);
      }
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      const filename = media.name || (isVideo ? 'video.mp4' : 'image.jpg');
      await downloadAttachmentFile(media.url, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      id="media-preview-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 1. Header Toolbar */}
      <div
        id="media-preview-header"
        className="w-full px-4 py-3 bg-linear-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Back button + Sender Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
            title="Back / Close (Esc)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {media.senderAvatar ? (
            <img
              src={media.senderAvatar}
              alt={media.senderName || 'Sender'}
              className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
              {(media.senderName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">{media.senderName || 'Contact'}</p>
            <p className="text-[11px] text-white/70 flex items-center gap-1.5 truncate">
              {media.timestamp && (
                <>
                  <Clock className="w-3 h-3 opacity-70" />
                  <span>{media.timestamp}</span>
                  <span>&bull;</span>
                </>
              )}
              <span>{isVideo ? 'Video' : 'Photo'}</span>
              {media.size && (
                <>
                  <span>&bull;</span>
                  <span>{formatFileSize(media.size)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls for image */}
          {!isVideo && (
            <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 gap-1 mr-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-semibold hover:bg-white/20 rounded-lg text-white cursor-pointer"
                title="Reset Zoom (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.5}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Reset Size"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer hidden sm:block"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Fast Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
            }`}
            title="Ultra-fast Direct Download"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : isDownloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Fast Download</span>
              </>
            )}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer ml-1"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Main Media Viewport */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative cursor-default"
        onClick={(e) => {
          // If clicking on background area, close
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {isVideo ? (
          <div
            className="relative max-w-5xl max-h-[75vh] sm:max-h-[82vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={media.url}
              playsInline
              preload="auto"
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setTotalDuration(videoRef.current.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
              className="max-w-full max-h-[75vh] sm:max-h-[82vh] rounded-2xl object-contain shadow-2xl bg-black cursor-pointer"
              onClick={togglePlayPause}
            />

            {/* Play Overlay Button if paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlayPause}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center shadow-xl backdrop-blur-xs transition-transform cursor-pointer"
                title="Play Video (Space)"
              >
                <Play className="w-8 h-8 ml-1 fill-white" />
              </button>
            )}
          </div>
        ) : (
          <div
            className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={media.url}
              alt={media.name || 'Enlarged photo'}
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-[78vh] sm:max-h-[84vh] rounded-xl sm:rounded-2xl object-contain shadow-2xl transition-transform select-none cursor-zoom-in"
              title="Double click to zoom"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* 3. Bottom Bar: Video Controls or Image Details */}
      <div
        id="media-preview-footer"
        className="w-full px-4 py-3 bg-linear-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 text-white shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo && (
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-2 bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            {/* Scrubber track */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-white/80 min-w-10 text-right">
                {formatSeconds(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={totalDuration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[11px] font-mono text-white/80 min-w-10">
                {formatSeconds(totalDuration)}
              </span>
            </div>

            {/* Video Controls buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-xs text-white/70 truncate max-w-xs font-medium">
                {media.name || 'Video attachment'}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download video file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {!isVideo && (
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between text-xs text-white/80 px-2">
            <span className="truncate max-w-sm">{media.name || 'Photo attachment'}</span>
            <span className="text-white/60 text-[11px]">Click anywhere outside or press Esc to close</span>
          </div>
        )}
      </div>
    </div>
  );
};
