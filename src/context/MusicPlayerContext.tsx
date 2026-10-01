import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { MusicTrack, UserUploadedAudio, StoryMusicAttachment } from '../types';

export type PlayableTrack = MusicTrack | UserUploadedAudio | StoryMusicAttachment;

interface MusicPlayerContextType {
  currentTrack: PlayableTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  isFullPlayerOpen: boolean;
  isBuffering: boolean;
  playTrack: (track: PlayableTrack, startTime?: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMute: () => void;
  setIsFullPlayerOpen: (open: boolean) => void;
  closePlayer: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
      console.warn('Audio playback error on track');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };
  }, []);

  const playTrack = (track: PlayableTrack, startTime = 0) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const audioUrl = 'audioUrl' in track ? track.audioUrl : '';
    if (!audioUrl) return;

    audio.src = audioUrl;
    audio.currentTime = startTime;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    setIsBuffering(true);
    setCurrentTrack(track);

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Playback autoplay was blocked by browser:', err);
        setIsPlaying(false);
        setIsBuffering(false);
      });
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const closePlayer = () => {
    pause();
    setCurrentTrack(null);
    setIsFullPlayerOpen(false);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        isMuted,
        isFullPlayerOpen,
        isBuffering,
        playTrack,
        pause,
        resume,
        togglePlay,
        seek,
        setVolume,
        setPlaybackRate,
        toggleMute,
        setIsFullPlayerOpen,
        closePlayer,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
