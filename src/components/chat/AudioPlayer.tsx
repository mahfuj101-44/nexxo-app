import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Mic, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isMe?: boolean;
  title?: string;
  fileSize?: number;
  isMusic?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration = 0,
  isMe = false,
  title,
  fileSize,
  isMusic = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.error('Audio playback error:', e);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const rates: (1 | 1.25 | 1.5 | 2)[] = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-2xl select-none w-full max-w-[320px] sm:max-w-[360px] shadow-xs ${
        isMe
          ? 'bg-indigo-700 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
      }`}
    >
      {/* Title / Track Header if available */}
      {(title || isMusic) && (
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/10 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 font-medium truncate">
            {isMusic ? (
              <Music className="w-3.5 h-3.5 shrink-0 opacity-80" />
            ) : (
              <Mic className="w-3.5 h-3.5 shrink-0 opacity-80" />
            )}
            <span className="truncate">{title || 'Audio Track'}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {fileSize && (
              <span className="text-[10px] font-mono opacity-70">
                {formatFileSize(fileSize)}
              </span>
            )}
            <a
              href={src}
              download={title || 'audio.mp3'}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
              title="Download Audio"
            >
              <Download className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
            isMe
              ? 'bg-white text-indigo-700 hover:bg-slate-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play audio'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 ml-0.5 fill-current" />
          )}
        </button>

        {/* Progress bar & dynamic waveform bars */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/15 dark:bg-white/20 accent-indigo-500 dark:accent-indigo-400"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono opacity-80 px-0.5">
            <span>{formatTime(currentTime)}</span>

            {/* Waveform indicator bars */}
            <div className="flex items-center gap-0.5 h-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-current animate-pulse' : 'bg-current opacity-40'
                  }`}
                  style={{
                    height: isPlaying
                      ? `${6 + ((i * 5) % 12)}px`
                      : '4px',
                  }}
                />
              ))}
            </div>

            <span>{formatTime(duration || initialDuration)}</span>
          </div>
        </div>

        {/* Controls: Mute & Speed */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>

          <button
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
              isMe
                ? 'bg-indigo-800 text-white hover:bg-indigo-900'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
            }`}
            title="Cycle Playback Speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
