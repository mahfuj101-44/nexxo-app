import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Plus,
  Search,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Upload,
  Play,
  Pause,
  Filter,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { MusicTrack, MusicGenre } from '../../types';
import {
  subscribeToMusicCatalog,
  addMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  seedInitialLicensedMusicIfEmpty,
} from '../../lib/musicService';
import { uploadUserAudioFile, extractAudioDuration } from '../../lib/storageService';

interface AdminMusicManagementProps {
  currentUserId: string;
}

const ALL_GENRES: MusicGenre[] = [
  'Trending',
  'Chill',
  'Motivation',
  'Party',
  'Travel',
  'Instrumental',
  'Devotional',
];

export const AdminMusicManagement: React.FC<AdminMusicManagementProps> = ({ currentUserId }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [licenseFilter, setLicenseFilter] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState<MusicGenre>('Chill');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [licenseType, setLicenseType] = useState<MusicTrack['licenseType']>('public_domain');
  const [licenseNotes, setLicenseNotes] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [storyAvailable, setStoryAvailable] = useState(true);

  // Audio upload state inside modal
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Audio playback test
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsub = subscribeToMusicCatalog((list) => {
      setTracks(list);
    });
    return () => {
      unsub();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (track: MusicTrack) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingTrackId(null);
      audioRef.current.onerror = () => setPlayingTrackId(null);
    }

    if (playingTrackId === track.id) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.current.src = track.audioUrl;
      audioRef.current
        .play()
        .then(() => setPlayingTrackId(track.id))
        .catch((err) => {
          console.warn('Playback error:', err);
          setPlayingTrackId(null);
        });
    }
  };

  const handleOpenAdd = () => {
    setEditingTrack(null);
    setTitle('');
    setArtist('');
    setAlbum('');
    setGenre('Chill');
    setArtworkUrl('');
    setAudioUrl('');
    setDuration(30);
    setLicenseType('public_domain');
    setLicenseNotes('Certified CC0 / Pixabay Content License - Free for non-commercial & commercial use');
    setIsEnabled(true);
    setStoryAvailable(true);
    setAudioFile(null);
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (track: MusicTrack) => {
    setEditingTrack(track);
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum(track.album || '');
    setGenre(track.genre);
    setArtworkUrl(track.artworkUrl || '');
    setAudioUrl(track.audioUrl);
    setDuration(track.duration);
    setLicenseType(track.licenseType || 'public_domain');
    setLicenseNotes(track.licenseNotes || '');
    setIsEnabled(track.isEnabled !== false);
    setStoryAvailable(track.storyAvailable !== false);
    setAudioFile(null);
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setUploadError('Please choose a valid audio file.');
      return;
    }

    setIsUploadingAudio(true);
    setUploadError(null);

    try {
      const dur = await extractAudioDuration(file);
      setDuration(Math.round(dur));

      const res = await uploadUserAudioFile(file, currentUserId, file.name);
      setAudioUrl(res.url);
      setAudioFile(file);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload audio file');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !audioUrl.trim()) {
      setUploadError('Title, Artist, and Audio URL are required.');
      return;
    }

    try {
      if (editingTrack) {
        await updateMusicTrack(editingTrack.id, {
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          genre,
          artworkUrl: artworkUrl.trim(),
          audioUrl: audioUrl.trim(),
          duration,
          licenseType,
          licenseNotes: licenseNotes.trim(),
          isEnabled,
          storyAvailable,
        });
      } else {
        await addMusicTrack({
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          genre,
          artworkUrl: artworkUrl.trim(),
          audioUrl: audioUrl.trim(),
          duration,
          licenseType,
          licenseNotes: licenseNotes.trim(),
          isEnabled,
          storyAvailable,
          favoritesCount: 0,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save track.');
    }
  };

  const handleToggleEnabled = async (track: MusicTrack) => {
    await updateMusicTrack(track.id, {
      isEnabled: !track.isEnabled,
    });
  };

  const handleDelete = async (track: MusicTrack) => {
    try {
      await deleteMusicTrack(track.id);
    } catch (err) {
      console.error('Delete music track error:', err);
    }
  };

  // Filtered tracks
  const filtered = tracks.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q);

    const matchesGenre = genreFilter === 'all' || t.genre === genreFilter;
    const matchesLicense = licenseFilter === 'all' || t.licenseType === licenseFilter;

    return matchesSearch && matchesGenre && matchesLicense;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Music className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Licensed Music Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage authorized sound catalog, verify license clearances, and control story availability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => seedInitialLicensedMusicIfEmpty()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Seed Initial CC0 Tracks"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync Default Seeds
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Catalog Track
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracks, artists, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none shadow-xs cursor-pointer"
          >
            <option value="all">All Genres</option>
            {ALL_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={licenseFilter}
            onChange={(e) => setLicenseFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none shadow-xs cursor-pointer"
          >
            <option value="all">All Licenses</option>
            <option value="public_domain">Public Domain / CC0</option>
            <option value="cc_by">Creative Commons (CC-BY)</option>
            <option value="nexxo_licensed">NEXXO Licensed</option>
          </select>
        </div>
      </div>

      {/* Tracks Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Genre</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">License Compliance</th>
                <th className="py-3 px-4">Story Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No music tracks found. Click "Add Catalog Track" to populate.
                  </td>
                </tr>
              ) : (
                filtered.map((track) => {
                  const isPlaying = playingTrackId === track.id;

                  return (
                    <tr key={track.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Track info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => togglePlay(track)}
                            className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative group flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            {track.artworkUrl ? (
                              <img
                                src={track.artworkUrl}
                                alt={track.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Music className="h-4 w-4 text-slate-400" />
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              {isPlaying ? (
                                <Pause className="h-4 w-4 fill-current text-indigo-400" />
                              ) : (
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                              )}
                            </div>
                          </button>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{track.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{track.artist}</p>
                          </div>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium border border-indigo-200/60 dark:border-indigo-900/50">
                          {track.genre}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{track.duration}s</td>

                      {/* License */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate max-w-[160px]" title={track.licenseNotes}>
                            {track.licenseType === 'public_domain'
                              ? 'CC0 / Public Domain'
                              : track.licenseType === 'nexxo_licensed'
                              ? 'NEXXO Master License'
                              : 'Certified CC-BY'}
                          </span>
                        </div>
                      </td>

                      {/* Enabled / Story Availability */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleEnabled(track)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                            track.isEnabled !== false
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {track.isEnabled !== false ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Disabled
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(track)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(track)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Track Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingTrack ? 'Edit Music Track' : 'Add Licensed Track to Catalog'}
            </h3>

            <form onSubmit={handleSaveTrack} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Track Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Neon Sunset"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Artist</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. NEXXO Soundworks"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Album (Optional)</label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    placeholder="e.g. Ambient Vol. 1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value as MusicGenre)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    {ALL_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Artwork URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Artwork Image URL</label>
                <input
                  type="url"
                  value={artworkUrl}
                  onChange={(e) => setArtworkUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Audio Source: Upload or URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Audio File or Direct URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://cdn... or upload file"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1 cursor-pointer transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {isUploadingAudio && (
                  <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-1">Uploading audio file...</p>
                )}
              </div>

              {/* License Compliance */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>License Certification & Attribution</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="public_domain">Public Domain (CC0)</option>
                    <option value="cc_by">Creative Commons (CC-BY)</option>
                    <option value="nexxo_licensed">NEXXO Licensed / Owned</option>
                  </select>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    placeholder="Duration (sec)"
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <input
                  type="text"
                  value={licenseNotes}
                  onChange={(e) => setLicenseNotes(e.target.value)}
                  placeholder="License terms / proof of rights clearance notes"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              {uploadError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingAudio}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editingTrack ? 'Save Changes' : 'Publish to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
