import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Video,
  Music,
  Upload,
  Search,
  Download,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Play,
  Pause,
  Clock,
  HardDrive,
  FileText,
  Folder,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  ExternalLink,
  Layers,
  CheckCircle2,
  Send,
  Filter,
  BadgeCheck,
  Crown,
} from 'lucide-react';
import { UserMediaItem, UserMediaType, NexxoUser } from '../../types';
import {
  subscribeToUserMedia,
  saveUserMediaItem,
  deleteUserMediaItem,
  getUserVaultQuotaMB,
  getUserVaultQuotaBytes,
  formatStorageSize,
} from '../../lib/mediaLibraryService';
import {
  uploadStoryMedia,
  uploadUserAudioFile,
  uploadChatAttachment,
  compressImageFile,
  createVideoThumbnail,
  extractAudioDuration,
} from '../../lib/storageService';

export type MediaFolderType = 'folders' | 'images' | 'videos' | 'documents' | 'audio' | 'all';

interface UserMediaLibraryModalProps {
  currentUser: NexxoUser;
  onClose: () => void;
  onUseInStory?: (media: { url: string; type: 'image' | 'video' }) => void;
  onSelectMedia?: (item: UserMediaItem) => void;
  initialFolder?: MediaFolderType;
  title?: string;
}

/**
 * Automatically determines which folder a media item belongs to based on type, mimeType, and extension.
 */
export function getMediaFolder(item: UserMediaItem): 'images' | 'videos' | 'documents' | 'audio' {
  const mime = (item.mimeType || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const type = item.type;

  if (
    type === 'image' ||
    type === 'story_export' ||
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/i.test(name)
  ) {
    return 'images';
  }

  if (
    type === 'video' ||
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|mkv|avi|wmv|flv|3gp|m4v)$/i.test(name)
  ) {
    return 'videos';
  }

  if (
    type === 'audio' ||
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(name)
  ) {
    return 'audio';
  }

  // Documents: PDF, Word, Excel, Slides, Archives, Text, Code, etc.
  return 'documents';
}

/**
 * Returns document styling and badge info based on filename and mimeType
 */
function getDocStyle(name: string, mimeType?: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return {
      label: 'PDF',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
      icon: FileText,
      iconColor: 'text-rose-400',
    };
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mimeType?.includes('word')) {
    return {
      label: 'WORD',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
      icon: FileText,
      iconColor: 'text-blue-400',
    };
  }
  if (
    ['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext) ||
    mimeType?.includes('sheet') ||
    mimeType?.includes('excel') ||
    mimeType?.includes('csv')
  ) {
    return {
      label: 'SHEET',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-400',
    };
  }
  if (
    ['ppt', 'pptx', 'odp'].includes(ext) ||
    mimeType?.includes('presentation') ||
    mimeType?.includes('powerpoint')
  ) {
    return {
      label: 'SLIDES',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
      icon: FileText,
      iconColor: 'text-amber-400',
    };
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) ||
    mimeType?.includes('zip') ||
    mimeType?.includes('compressed')
  ) {
    return {
      label: 'ARCHIVE',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      bgGradient: 'from-yellow-950/40 via-slate-900 to-slate-950',
      icon: FileArchive,
      iconColor: 'text-yellow-400',
    };
  }
  if (['txt', 'md', 'markdown'].includes(ext) || mimeType?.includes('text/plain')) {
    return {
      label: 'TEXT',
      badgeClass: 'bg-slate-600/30 text-slate-200 border-slate-500/30',
      bgGradient: 'from-slate-800/40 via-slate-900 to-slate-950',
      icon: FileText,
      iconColor: 'text-slate-300',
    };
  }
  if (
    ['json', 'xml', 'js', 'ts', 'html', 'css', 'py', 'sql'].includes(ext) ||
    mimeType?.includes('json') ||
    mimeType?.includes('xml')
  ) {
    return {
      label: ext.toUpperCase(),
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      bgGradient: 'from-purple-950/40 via-slate-900 to-slate-950',
      icon: FileCode,
      iconColor: 'text-purple-400',
    };
  }

  return {
    label: ext ? ext.toUpperCase() : 'DOC',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    bgGradient: 'from-indigo-950/40 via-slate-900 to-slate-950',
    icon: File,
    iconColor: 'text-indigo-400',
  };
}

export const UserMediaLibraryModal: React.FC<UserMediaLibraryModalProps> = ({
  currentUser,
  onClose,
  onUseInStory,
  onSelectMedia,
  initialFolder = 'folders',
  title,
}) => {
  const [mediaItems, setMediaItems] = useState<UserMediaItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<MediaFolderType>(initialFolder);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'chat' | 'story'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Copied link toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Preview state for audio
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPreviewingAudioId(null);
    onClose();
  };

  useEffect(() => {
    const unsub = subscribeToUserMedia(currentUser.id, (items) => {
      setMediaItems(items);
    });
    return () => {
      unsub();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentUser.id]);

  const togglePlayAudio = (item: UserMediaItem) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPreviewingAudioId(null);
      audioRef.current.onerror = () => setPreviewingAudioId(null);
    }

    if (previewingAudioId === item.id) {
      audioRef.current.pause();
      setPreviewingAudioId(null);
    } else {
      audioRef.current.src = item.url;
      audioRef.current
        .play()
        .then(() => setPreviewingAudioId(item.id))
        .catch(console.warn);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccessMessage(null);

    // Vault Storage Quota Enforcement (1 GB for Pro, 5 GB for VIP, 250 MB for Free)
    const currentTotalBytes = mediaItems.reduce((acc, i) => acc + (i.size || 0), 0);
    const quotaBytes = getUserVaultQuotaBytes(currentUser);
    if (currentTotalBytes + file.size > quotaBytes) {
      const isVip = currentUser.premiumTier === 'vip';
      const isPro = currentUser.isVerified || currentUser.isPremium;
      const upgradeMessage = isVip
        ? 'Your 5 GB VIP Vault is full. Please delete old files to free up space.'
        : isPro
        ? 'Your 1 GB Pro Blue Tick Vault is full. Upgrade to VIP Gold Badge for 5 GB capacity!'
        : 'Your 250 MB Standard Vault is full. Upgrade to Blue Tick (1 GB) or VIP Gold (5 GB) for expanded storage!';

      setUploadError(
        `Vault quota exceeded (${formatStorageSize(currentTotalBytes)} / ${formatStorageSize(quotaBytes)}). ${upgradeMessage}`
      );
      setIsUploading(false);
      return;
    }

    try {
      let type: UserMediaType = 'image';
      let url = '';
      let storagePath = '';
      let thumbnailUrl: string | undefined;
      let duration: number | undefined;

      if (file.type.startsWith('image/')) {
        type = 'image';
        const compressed = await compressImageFile(file);
        const res = await uploadStoryMedia(
          compressed,
          currentUser.id,
          'image',
          (pct) => setUploadProgress(pct)
        );
        url = res.url;
        storagePath = res.storagePath;
      } else if (file.type.startsWith('video/')) {
        type = 'video';
        const thumb = await createVideoThumbnail(file).catch(() => null);
        if (thumb) {
          duration = Math.round(thumb.duration);
        }
        const res = await uploadStoryMedia(
          file,
          currentUser.id,
          'video',
          (pct) => setUploadProgress(pct)
        );
        url = res.url;
        storagePath = res.storagePath;
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
        duration = Math.round(await extractAudioDuration(file).catch(() => 0));
        const res = await uploadUserAudioFile(file, currentUser.id, file.name);
        url = res.url;
        storagePath = res.storagePath;
      } else {
        // Automatic categorization: Document file
        type = 'document';
        const res = await uploadChatAttachment(
          file,
          `library_${currentUser.id}`,
          file.name,
          undefined,
          (pct) => setUploadProgress(pct)
        );
        url = res.url;
        storagePath = res.storagePath || '';
      }

      await saveUserMediaItem({
        ownerId: currentUser.id,
        name: file.name,
        type,
        url,
        thumbnailUrl,
        storagePath,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        duration,
        source: 'upload',
      });

      const folderName =
        type === 'image'
          ? 'Images'
          : type === 'video'
          ? 'Videos'
          : type === 'document'
          ? 'Documents'
          : 'Audio';

      setUploadSuccessMessage(
        `"${file.name}" was uploaded and automatically organized into the "${folderName}" folder.`
      );
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload media file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleCopyLink = (item: UserMediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (item: UserMediaItem) => {
    try {
      await deleteUserMediaItem(item.id, item.storagePath);
    } catch (err) {
      console.error('Delete media item error:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    return formatStorageSize(bytes);
  };

  // Automatic categorization mapping
  const imageItems = mediaItems.filter((i) => getMediaFolder(i) === 'images');
  const videoItems = mediaItems.filter((i) => getMediaFolder(i) === 'videos');
  const docItems = mediaItems.filter((i) => getMediaFolder(i) === 'documents');
  const audioItems = mediaItems.filter((i) => getMediaFolder(i) === 'audio');

  const imageTotalSize = imageItems.reduce((acc, i) => acc + (i.size || 0), 0);
  const videoTotalSize = videoItems.reduce((acc, i) => acc + (i.size || 0), 0);
  const docTotalSize = docItems.reduce((acc, i) => acc + (i.size || 0), 0);
  const audioTotalSize = audioItems.reduce((acc, i) => acc + (i.size || 0), 0);
  const allTotalSize = mediaItems.reduce((acc, i) => acc + (i.size || 0), 0);

  // Filter items based on active folder
  const currentCategoryItems =
    activeFolder === 'images'
      ? imageItems
      : activeFolder === 'videos'
      ? videoItems
      : activeFolder === 'documents'
      ? docItems
      : activeFolder === 'audio'
      ? audioItems
      : mediaItems;

  // Filter by source, search query and sort
  const filtered = currentCategoryItems
    .filter((item) => {
      if (sourceFilter !== 'all') {
        const itemSrc = item.source || 'upload';
        if (sourceFilter === 'upload' && itemSrc !== 'upload') return false;
        if (sourceFilter === 'chat' && itemSrc !== 'chat') return false;
        if (sourceFilter === 'story' && itemSrc !== 'story' && itemSrc !== 'story_export') return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || (item.mimeType && item.mimeType.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA;
    });

  // Current folder display label
  const getFolderMeta = () => {
    switch (activeFolder) {
      case 'images':
        return {
          title: 'Images',
          icon: ImageIcon,
          count: imageItems.length,
          size: imageTotalSize,
          desc: 'Photos, snapshots, illustrations, and graphic assets',
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'videos':
        return {
          title: 'Videos',
          icon: Video,
          count: videoItems.length,
          size: videoTotalSize,
          desc: 'Video clips, recordings, and camera videos',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'documents':
        return {
          title: 'Documents',
          icon: FileText,
          count: docItems.length,
          size: docTotalSize,
          desc: 'PDFs, Word documents, spreadsheets, text files, and archives',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'audio':
        return {
          title: 'Audio & Music',
          icon: Music,
          count: audioItems.length,
          size: audioTotalSize,
          desc: 'Voice notes, music tracks, and sound recordings',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      case 'all':
        return {
          title: 'All Media Files',
          icon: Layers,
          count: mediaItems.length,
          size: allTotalSize,
          desc: 'All categorized files combined in a single view',
          color: 'text-slate-300 bg-slate-800/80 border-slate-700',
        };
      default:
        return {
          title: 'All Folders',
          icon: Folder,
          count: mediaItems.length,
          size: allTotalSize,
          desc: 'Organized into automatic Images, Videos, and Documents folders',
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
    }
  };

  const folderMeta = getFolderMeta();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-4 animate-in fade-in select-none"
    >
      <div className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Drag Overlay Feedback */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-indigo-950/90 border-2 border-dashed border-indigo-400 rounded-3xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm pointer-events-none animate-in fade-in">
            <div className="p-4 rounded-3xl bg-indigo-600/30 text-indigo-300 animate-bounce">
              <FolderOpen className="h-12 w-12" />
            </div>
            <h4 className="text-xl font-bold text-white">Drop File to Auto-Categorize</h4>
            <p className="text-sm text-indigo-200">
              Files are automatically routed into Images, Videos, or Documents folders
            </p>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{title || 'NEXXO Media Library'}</h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-500/20">
                  <Sparkles className="h-3 w-3" /> Auto-Categorized
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mediaItems.length} total files ({formatFileSize(allTotalSize)}) organized into smart folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              className="hidden"
              id="library-media-upload"
            />
            <label
              htmlFor="library-media-upload"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer ${
                isUploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{isUploading ? `Uploading ${uploadProgress}%` : 'Upload Any File'}</span>
            </label>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close library"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Vault Storage Quota Progress Meter */}
        {(() => {
          const quotaBytes = getUserVaultQuotaBytes(currentUser);
          const usedBytes = allTotalSize;
          const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
          const isVip = currentUser?.premiumTier === 'vip';
          const isPro = currentUser?.isVerified || currentUser?.isPremium;

          return (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Encrypted Vault Storage:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 font-mono font-medium">
                    {formatStorageSize(usedBytes)} of {formatStorageSize(quotaBytes)} used ({pct}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isVip ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold">
                      <Crown className="w-3 h-3" />
                      <span>5 GB VIP Cloud Vault</span>
                    </span>
                  ) : isPro ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-500 text-[11px] font-bold">
                      <BadgeCheck className="w-3 h-3" />
                      <span>1 GB Blue Tick Vault</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                      <span>250 MB Free Vault</span>
                      <span className="text-indigo-500 dark:text-indigo-400 font-bold ml-1">
                        (Upgrade: 1 GB / 5 GB)
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Storage Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    pct >= 90
                      ? 'bg-rose-500'
                      : pct >= 70
                      ? 'bg-amber-500'
                      : isVip
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : isPro
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                  }`}
                  style={{ width: `${Math.max(1, pct)}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Upload Success Banner */}
        {uploadSuccessMessage && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
            <button
              onClick={() => setUploadSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Folder Navigation Tabs & Breadcrumbs Bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Breadcrumbs / Quick Folder Switchers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFolder('folders')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFolder === 'folders'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>All Folders</span>
            </button>

            <span className="text-slate-600">/</span>

            {/* Images Folder Tab */}
            <button
              onClick={() => setActiveFolder('images')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFolder === 'images'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span>Images</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-700/60 text-[10px] text-slate-300 font-mono">
                {imageItems.length}
              </span>
            </button>

            {/* Videos Folder Tab */}
            <button
              onClick={() => setActiveFolder('videos')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFolder === 'videos'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-cyan-400" />
              <span>Videos</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-700/60 text-[10px] text-slate-300 font-mono">
                {videoItems.length}
              </span>
            </button>

            {/* Documents Folder Tab */}
            <button
              onClick={() => setActiveFolder('documents')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFolder === 'documents'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Documents</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-700/60 text-[10px] text-slate-300 font-mono">
                {docItems.length}
              </span>
            </button>

            {/* Audio Folder Tab */}
            {audioItems.length > 0 && (
              <button
                onClick={() => setActiveFolder('audio')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFolder === 'audio'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Music className="h-3.5 w-3.5 text-purple-400" />
                <span>Audio</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-700/60 text-[10px] text-slate-300 font-mono">
                  {audioItems.length}
                </span>
              </button>
            )}

            {/* All Files Tab */}
            <button
              onClick={() => setActiveFolder('all')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFolder === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>All Files</span>
            </button>
          </div>

          {/* Search, Filter and Sort (Active when inside a folder or all files) */}
          {activeFolder !== 'folders' && (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search in ${folderMeta.title}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                title="Filter by source"
              >
                <option value="all">All Sources</option>
                <option value="upload">Uploads</option>
                <option value="chat">Chat Media</option>
                <option value="story">Stories</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="size">Largest</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          )}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* VIEW 1: FOLDERS OVERVIEW DIRECTORY */}
          {activeFolder === 'folders' && (
            <div className="space-y-6">
              {/* Folder Summary Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white">Smart Category Folders</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Uploaded media files are automatically categorized into <strong>Images</strong>, <strong>Videos</strong>, and <strong>Documents</strong> for effortless navigation.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="font-semibold text-white">{mediaItems.length}</span> files &bull;
                  <span className="font-semibold text-white">{formatFileSize(allTotalSize)}</span> total
                </div>
              </div>

              {/* Automatic Folders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Images Folder Card */}
                <div
                  onClick={() => setActiveFolder('images')}
                  className="group relative rounded-3xl p-5 bg-gradient-to-b from-slate-800/50 to-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                        {imageItems.length} {imageItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <span>Images</span>
                        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Photos, camera rolls, graphics, story snapshots
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(imageTotalSize)} used</span>
                    </div>
                  </div>

                  {/* Visual Thumbnails Strip */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    {imageItems.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-hidden">
                        {imageItems.slice(0, 4).map((img) => (
                          <div
                            key={img.id}
                            className="h-12 w-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 shrink-0"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ))}
                        {imageItems.length > 4 && (
                          <div className="h-12 w-12 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            +{imageItems.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No images uploaded yet</p>
                    )}
                  </div>
                </div>

                {/* 2. Videos Folder Card */}
                <div
                  onClick={() => setActiveFolder('videos')}
                  className="group relative rounded-3xl p-5 bg-gradient-to-b from-slate-800/50 to-slate-950/80 border border-slate-800 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                        <Video className="h-6 w-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                        {videoItems.length} {videoItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                        <span>Videos</span>
                        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Clips, story videos, camera captures & recordings
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(videoTotalSize)} used</span>
                    </div>
                  </div>

                  {/* Video Preview Strip */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    {videoItems.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-hidden">
                        {videoItems.slice(0, 3).map((vid) => (
                          <div
                            key={vid.id}
                            className="h-12 w-16 rounded-xl overflow-hidden bg-black border border-slate-700/60 relative shrink-0"
                          >
                            <video src={vid.url} className="h-full w-full object-cover" muted />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Video className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                        ))}
                        {videoItems.length > 3 && (
                          <div className="h-12 w-12 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            +{videoItems.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No videos uploaded yet</p>
                    )}
                  </div>
                </div>

                {/* 3. Documents Folder Card */}
                <div
                  onClick={() => setActiveFolder('documents')}
                  className="group relative rounded-3xl p-5 bg-gradient-to-b from-slate-800/50 to-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                        {docItems.length} {docItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        <span>Documents</span>
                        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        PDFs, Word documents, spreadsheets, slides & archives
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(docTotalSize)} used</span>
                    </div>
                  </div>

                  {/* Documents Format Badges Strip */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    {docItems.length > 0 ? (
                      <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
                        {docItems.slice(0, 4).map((d) => {
                          const docStyle = getDocStyle(d.name, d.mimeType);
                          return (
                            <span
                              key={d.id}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${docStyle.badgeClass} flex items-center gap-1 truncate max-w-[120px]`}
                              title={d.name}
                            >
                              <docStyle.icon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{d.name}</span>
                            </span>
                          );
                        })}
                        {docItems.length > 4 && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400">
                            +{docItems.length - 4} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No documents uploaded yet</p>
                    )}
                  </div>
                </div>

                {/* 4. Audio Folder Card (if present or available) */}
                {audioItems.length > 0 && (
                  <div
                    onClick={() => setActiveFolder('audio')}
                    className="group relative rounded-3xl p-5 bg-gradient-to-b from-slate-800/50 to-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                          <Music className="h-6 w-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                          {audioItems.length} {audioItems.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                          <span>Audio & Music</span>
                          <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Voice notes, music tracks, audio recordings
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatFileSize(audioTotalSize)} used</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Drag & Drop Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-indigo-950/10 transition-all text-center cursor-pointer group flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 rounded-2xl bg-slate-800 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-slate-400 transition-all">
                  <Upload className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Upload Media or Drag & Drop Files Here
                </h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Supports photos, videos, audio notes, PDFs, Word documents, spreadsheets, and archives. All files are automatically sorted into their dedicated folders.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: INSIDE A SPECIFIC FOLDER OR ALL FILES */}
          {activeFolder !== 'folders' && (
            <div className="space-y-4">
              {/* Folder Breadcrumb Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveFolder('folders')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Folders</span>
                  </button>

                  <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${folderMeta.color}`}>
                      <folderMeta.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{folderMeta.title} Folder</span>
                        <span className="text-xs font-normal text-slate-400">
                          ({filtered.length} {filtered.length === 1 ? 'file' : 'files'} &bull; {formatFileSize(folderMeta.size)})
                        </span>
                      </h4>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all border border-indigo-500/30 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload to {folderMeta.title}</span>
                </button>
              </div>

              {/* Items Grid */}
              {filtered.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-3">
                  <folderMeta.icon className="h-12 w-12 mx-auto text-slate-700" />
                  <p className="text-sm font-semibold text-white">No items found in {folderMeta.title}</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `No files matching "${searchQuery}" in this folder.`
                      : `You haven't added any ${folderMeta.title.toLowerCase()} yet. Upload files anytime to automatically store them here.`}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload {folderMeta.title}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map((item) => {
                    const folder = getMediaFolder(item);
                    const isPlayingAudio = previewingAudioId === item.id;
                    const docStyle = getDocStyle(item.name, item.mimeType);

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-slate-700 group flex flex-col justify-between transition-all"
                      >
                        {/* ITEM VIEWPORT */}
                        {/* A. Document Viewport */}
                        {folder === 'documents' ? (
                          <div
                            className={`relative aspect-video sm:aspect-square w-full bg-gradient-to-b ${docStyle.bgGradient} flex flex-col items-center justify-center p-4 text-center border-b border-slate-800/80`}
                          >
                            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner group-hover:scale-110 transition-transform duration-300">
                              <docStyle.icon className={`h-8 w-8 ${docStyle.iconColor}`} />
                            </div>

                            <span
                              className={`mt-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${docStyle.badgeClass}`}
                            >
                              {docStyle.label}
                            </span>

                            <span className="text-[10px] text-slate-400 font-mono mt-1">
                              {formatFileSize(item.size)}
                            </span>

                            {/* Folder Category Tag */}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-bold text-emerald-300">
                              Document
                            </span>
                          </div>
                        ) : folder === 'images' ? (
                          /* B. Image Viewport */
                          <div className="relative aspect-video sm:aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                              Image
                            </span>
                          </div>
                        ) : folder === 'videos' ? (
                          /* C. Video Viewport */
                          <div className="relative aspect-video sm:aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                            <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Video className="h-6 w-6 text-white drop-shadow" />
                            </div>
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                              Video {item.duration ? `• ${item.duration}s` : ''}
                            </span>
                          </div>
                        ) : (
                          /* D. Audio Viewport */
                          <div className="relative aspect-video sm:aspect-square w-full bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <button
                              onClick={() => togglePlayAudio(item)}
                              className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                              title={isPlayingAudio ? 'Pause preview' : 'Play preview'}
                            >
                              {isPlayingAudio ? (
                                <Pause className="h-5 w-5 fill-current" />
                              ) : (
                                <Play className="h-5 w-5 fill-current ml-0.5" />
                              )}
                            </button>
                            <span className="text-[10px] text-purple-300 font-mono">
                              {item.duration ? `${item.duration}s` : 'Audio Track'}
                            </span>
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-[9px] font-bold text-purple-300">
                              Audio
                            </span>
                          </div>
                        )}

                        {/* Metadata & Actions */}
                        <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                              {item.name}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>{formatFileSize(item.size)}</span>
                              <span>
                                {item.createdAt?.toDate
                                  ? item.createdAt.toDate().toLocaleDateString()
                                  : 'Saved'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 gap-1.5">
                            {onSelectMedia ? (
                              <button
                                onClick={() => {
                                  onSelectMedia(item);
                                  handleClose();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/30 cursor-pointer"
                                title="Send this file to chat"
                              >
                                <Send className="h-3 w-3" />
                                <span>Send</span>
                              </button>
                            ) : onUseInStory && (folder === 'images' || folder === 'videos') ? (
                              <button
                                onClick={() => {
                                  onUseInStory({
                                    url: item.url,
                                    type: folder === 'images' ? 'image' : 'video',
                                  });
                                  handleClose();
                                }}
                                className="flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                                title="Use in Story"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>Story</span>
                              </button>
                            ) : null}

                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                onClick={() => handleCopyLink(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Copy link"
                              >
                                {copiedId === item.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <a
                                href={item.url}
                                download={item.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Download or open file"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete from library"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
