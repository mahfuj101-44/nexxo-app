import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Music,
  Play,
  Pause,
  Upload,
  Sparkles,
  Sliders,
  Check,
  ShieldCheck,
  Disc,
  Folder,
  Volume2,
} from 'lucide-react';
import {
  MusicTrack,
  UserUploadedAudio,
  StoryMusicAttachment,
  NexxoUser,
  MusicGenre,
} from '../../types';
import {
  subscribeToMusicCatalog,
  subscribeToUserAudio,
  saveUserAudio,
  seedInitialLicensedMusicIfEmpty,
} from '../../lib/musicService';
import { uploadUserAudioFile, extractAudioDuration } from '../../lib/storageService';

interface StoryMusicPickerModalProps {
  currentUser: NexxoUser;
  currentMusic?: StoryMusicAttachment;
  onSelectMusic: (music: StoryMusicAttachment) => void;
  onRemoveMusic?: () => void;
  onClose: () => void;
}

const GENRES: ('All' | MusicGenre)[] = [
  'All',
  'Trending',
  'Chill',
  'Motivation',
  'Party',
  'Travel',
  'Instrumental',
  'Devotional',
];

export const StoryMusicPickerModal: React.FC<StoryMusicPickerModalProps> = ({
  currentUser,
  currentMusic,
  onSelectMusic,
  onRemoveMusic,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'search' | 'my_audio'>('discover');
  const [catalogTracks, setCatalogTracks] = useState<MusicTrack[]>([]);
  const [userAudios, setUserAudios] = useState<UserUploadedAudio[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<'All' | MusicGenre>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected track for timeline trimming/configuring
  const [selectedTrack, setSelectedTrack] = useState<{
    id: string;
    title: string;
    artist: string;
    artworkUrl?: string;
    audioUrl: string;
    duration: number;
    source: 'catalog' | 'user_upload' | 'licensed';
    licenseType?: string;
  } | null>(
    currentMusic
      ? {
          id: currentMusic.trackId,
          title: currentMusic.title,
          artist: currentMusic.artist,
          artworkUrl: currentMusic.artworkUrl,
          audioUrl: currentMusic.audioUrl,
          duration: currentMusic.duration,
          source: currentMusic.source,
          licenseType: currentMusic.licenseType,
        }
      : null
  );

  // Timeline segment state
  const [startTime, setStartTime] = useState<number>(currentMusic?.startTime || 0);
  const [segmentDuration, setSegmentDuration] = useState<number>(
    currentMusic?.segmentDuration || 15
  );
  const [musicVolume, setMusicVolume] = useState<number>(currentMusic?.volume ?? 0.85);

  // Audio preview playback
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    seedInitialLicensedMusicIfEmpty().catch(console.warn);

    const unsubCatalog = subscribeToMusicCatalog((tracks) => {
      setCatalogTracks(tracks);
    });

    const unsubUserAudio = subscribeToUserAudio(currentUser.id, (audios) => {
      setUserAudios(audios);
    });

    return () => {
      unsubCatalog();
      unsubUserAudio();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
    };
  }, [currentUser.id]);

  // Handle preview playback
  const togglePreview = (id: string, audioUrl: string, startFrom = 0) => {
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.ontimeupdate = () => {
        if (previewAudioRef.current) {
          setPreviewProgress(previewAudioRef.current.currentTime);
        }
      };
      previewAudioRef.current.onended = () => {
        setPreviewingId(null);
        setPreviewProgress(0);
      };
      previewAudioRef.current.onerror = () => {
        setPreviewingId(null);
        setPreviewProgress(0);
      };
    }

    const audio = previewAudioRef.current;

    if (previewingId === id) {
      audio.pause();
      setPreviewingId(null);
    } else {
      audio.src = audioUrl;
      audio.currentTime = startFrom;
      audio.volume = musicVolume;
      audio
        .play()
        .then(() => {
          setPreviewingId(id);
        })
        .catch((err) => {
          console.warn('Audio preview blocked by browser policy:', err);
          setPreviewingId(null);
        });
    }
  };

  // Upload user audio
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select a valid audio file (MP3, WAV, AAC, WEBM, M4A).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const duration = await extractAudioDuration(file);
      const res = await uploadUserAudioFile(file, currentUser.id, file.name);

      const audioTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      await saveUserAudio({
        ownerId: currentUser.id,
        ownerName: currentUser.displayName,
        title: audioTitle,
        artist: currentUser.displayName,
        audioUrl: res.url,
        storagePath: res.storagePath,
        duration,
        size: res.size,
        mimeType: res.mimeType,
      });

      // Switch to my audio tab
      setActiveTab('my_audio');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload audio');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedTrack) return;

    const attachment: StoryMusicAttachment = {
      trackId: selectedTrack.id,
      title: selectedTrack.title,
      artist: selectedTrack.artist,
      artworkUrl: selectedTrack.artworkUrl,
      audioUrl: selectedTrack.audioUrl,
      duration: selectedTrack.duration,
      startTime,
      segmentDuration,
      volume: musicVolume,
      source: selectedTrack.source,
      licenseType: selectedTrack.licenseType,
    };

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    onSelectMusic(attachment);
    onClose();
  };

  // Filter tracks
  const filteredCatalog = catalogTracks.filter((track) => {
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q) ||
      (track.album && track.album.toLowerCase().includes(q));
    return matchesGenre && matchesSearch;
  });

  const filteredUserAudios = userAudios.filter((audio) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || audio.title.toLowerCase().includes(q) || audio.artist.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-xl h-[90vh] sm:h-[80vh] max-h-[92dvh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] sm:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Music to Story</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Certified legal music catalog & personal audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-2">
          <button
            onClick={() => setActiveTab('discover')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discover'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my_audio')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'my_audio'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            My Audio ({userAudios.length})
          </button>
        </div>

        {/* Search & Genres Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search song, artist, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeTab === 'discover' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                    selectedGenre === g
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === 'discover' && (
            <>
              {filteredCatalog.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Disc className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-600 mb-2 animate-spin-slow" />
                  <p className="text-sm">No tracks found matching "{searchQuery}"</p>
                </div>
              ) : (
                filteredCatalog.map((track) => {
                  const isSelected = selectedTrack?.id === track.id;
                  const isPlaying = previewingId === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        setSelectedTrack({
                          id: track.id,
                          title: track.title,
                          artist: track.artist,
                          artworkUrl: track.artworkUrl,
                          audioUrl: track.audioUrl,
                          duration: track.duration,
                          source: 'catalog',
                          licenseType: track.licenseType,
                        });
                        setStartTime(0);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/60 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Artwork & Play overlay */}
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 flex-shrink-0 border border-slate-300 dark:border-slate-700">
                        <img
                          src={track.artworkUrl}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(track.id, track.audioUrl);
                          }}
                          className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors cursor-pointer"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5 fill-current text-indigo-400" />
                          ) : (
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{track.title}</h4>
                          {track.licenseType === 'public_domain' && (
                            <span
                              title="Public Domain / Certified CC0"
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center"
                            >
                              <ShieldCheck className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{track.artist}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono">
                            {track.duration}s
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{track.genre}</span>
                        </div>
                      </div>

                      {/* Select indicator */}
                      <div className="flex items-center">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-400 dark:border-slate-600 text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'my_audio' && (
            <div className="space-y-4">
              {/* Audio upload button */}
              <div className="p-4 border border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-950/60 text-center flex flex-col items-center justify-center gap-2">
                <input
                  type="file"
                  accept="audio/*"
                  ref={fileInputRef}
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="user-audio-upload-input"
                />
                <label
                  htmlFor="user-audio-upload-input"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer ${
                    isUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading Audio...' : 'Upload Own Audio Track'}
                </label>
                <p className="text-[11px] text-slate-400">
                  Upload MP3, WAV, AAC or voice notes that you have the right to use.
                </p>
                {uploadError && <p className="text-xs text-rose-400 font-medium">{uploadError}</p>}
              </div>

              {/* User tracks */}
              {filteredUserAudios.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-sm">No audio uploaded yet. Upload your first audio track!</p>
                </div>
              ) : (
                filteredUserAudios.map((audio) => {
                  const isSelected = selectedTrack?.id === audio.id;
                  const isPlaying = previewingId === audio.id;

                  return (
                    <div
                      key={audio.id}
                      onClick={() => {
                        setSelectedTrack({
                          id: audio.id,
                          title: audio.title,
                          artist: audio.artist || currentUser.displayName,
                          audioUrl: audio.audioUrl,
                          duration: audio.duration,
                          source: 'user_upload',
                        });
                        setStartTime(0);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/60 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePreview(audio.id, audio.audioUrl);
                        }}
                        className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 fill-current" />
                        ) : (
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{audio.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {audio.artist} • {audio.duration}s
                        </p>
                      </div>

                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-400 dark:border-slate-600 text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Selected Track Audio Segment / Timeline Configuration */}
        {selectedTrack && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Timeline Segment: {selectedTrack.title}
                </span>
              </div>
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                {startTime}s - {Math.min(selectedTrack.duration, startTime + segmentDuration)}s
              </span>
            </div>

            {/* Segment Slider */}
            <div>
              <input
                type="range"
                min="0"
                max={Math.max(0, selectedTrack.duration - segmentDuration)}
                step="1"
                value={startTime}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setStartTime(val);
                  if (previewAudioRef.current && previewingId === selectedTrack.id) {
                    previewAudioRef.current.currentTime = val;
                  }
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                <span>Start: 0s</span>
                <span>Max: {selectedTrack.duration}s</span>
              </div>
            </div>

            {/* Options: Duration buttons & Volume */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Clip Length:</span>
                {[15, 30].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSegmentDuration(dur)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                      segmentDuration === dur
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Buttons: Preview clip & Attach */}
            <div className="flex items-center gap-2 pt-2">
              {onRemoveMusic && currentMusic && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveMusic();
                    onClose();
                  }}
                  className="px-3 py-2.5 rounded-xl border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                >
                  Remove Music
                </button>
              )}
              <button
                type="button"
                onClick={() => togglePreview(selectedTrack.id, selectedTrack.audioUrl, startTime)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-xs font-bold text-slate-700 dark:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {previewingId === selectedTrack.id ? (
                  <>
                    <Pause className="h-4 w-4" /> Stop Preview
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Preview Clip
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleConfirmSelection}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Add to Story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
