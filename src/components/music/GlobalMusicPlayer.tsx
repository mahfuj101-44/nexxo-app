import React from 'react';
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  ChevronDown,
  Sparkles,
  Music,
  ShieldCheck,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface GlobalMusicPlayerProps {
  onUseInStory?: () => void;
}

export const GlobalMusicPlayer: React.FC<GlobalMusicPlayerProps> = ({ onUseInStory }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    isFullPlayerOpen,
    isBuffering,
    togglePlay,
    seek,
    setVolume,
    setPlaybackRate,
    toggleMute,
    setIsFullPlayerOpen,
    closePlayer,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const title = 'title' in currentTrack ? currentTrack.title : 'Audio Track';
  const artist = 'artist' in currentTrack ? currentTrack.artist : 'NEXXO User';
  const artworkUrl =
    'artworkUrl' in currentTrack && currentTrack.artworkUrl
      ? currentTrack.artworkUrl
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
  const licenseNotes = 'licenseNotes' in currentTrack ? currentTrack.licenseNotes : undefined;
  const genre = 'genre' in currentTrack ? currentTrack.genre : undefined;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* 1. Bottom Mini-Player Bar */}
      {!isFullPlayerOpen && (
        <div
          onClick={() => setIsFullPlayerOpen(true)}
          className="fixed bottom-20 md:bottom-4 inset-x-4 md:right-4 md:left-auto md:w-96 z-40 bg-slate-900/95 border border-indigo-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-3 flex flex-col cursor-pointer transition-all hover:border-indigo-500/60 select-none group animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center gap-3">
            {/* Artwork thumbnail */}
            <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-indigo-950 flex-shrink-0 border border-slate-800">
              <img
                src={artworkUrl}
                alt={title}
                className={`h-full w-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-4">
                    <div className="w-1 bg-indigo-400 animate-[bounce_0.8s_infinite] h-3 rounded-full" />
                    <div className="w-1 bg-indigo-300 animate-[bounce_0.6s_infinite] h-4 rounded-full" />
                    <div className="w-1 bg-indigo-400 animate-[bounce_1s_infinite] h-2 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                {title}
              </h4>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                <span>{artist}</span>
                {genre && <span className="text-[10px] text-indigo-400 font-medium">#{genre}</span>}
              </p>
            </div>

            {/* Controls */}
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={togglePlay}
                disabled={isBuffering}
                className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-indigo-600/30"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={closePlayer}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close Player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mini progress line */}
          <div className="mt-2.5 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Full Player Expanded Modal */}
      {isFullPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 relative">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsFullPlayerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Collapse"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold tracking-wider uppercase">
                <Music className="h-4 w-4" />
                <span>NEXXO Audio Player</span>
              </div>
              <button
                onClick={closePlayer}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Artwork */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-indigo-950 flex items-center justify-center">
              <img
                src={artworkUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
              {genre && (
                <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-indigo-300 border border-white/10">
                  {genre}
                </span>
              )}
            </div>

            {/* Track Info */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white truncate">{title}</h3>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-0.5">{artist}</p>
              {licenseNotes && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{licenseNotes}</span>
                </div>
              )}
            </div>

            {/* Timeline & Slider */}
            <div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs font-mono text-slate-400 mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="p-3 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Rewind 10s"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isBuffering}
                className="h-16 w-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xl shadow-indigo-600/30"
              >
                {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
              </button>

              <button
                onClick={() => seek(Math.min(duration, currentTime + 10))}
                className="p-3 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Forward 10s"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </div>

            {/* Bottom Actions: Volume, Speed, and Use in Story */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Speed */}
              <div className="flex items-center gap-1">
                {[0.75, 1, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`text-[11px] px-2 py-0.5 rounded font-mono transition-colors ${
                      playbackRate === rate
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Use in Story Button */}
              {onUseInStory && (
                <button
                  onClick={() => {
                    setIsFullPlayerOpen(false);
                    onUseInStory();
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Use in Story</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
