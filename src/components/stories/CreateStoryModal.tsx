import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Type,
  Image as ImageIcon,
  Video,
  Music,
  Send,
  Sparkles,
  Shield,
  Palette,
  Camera,
  RotateCw,
  Sliders,
  Smile,
  PenTool,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  Save,
  Trash2,
  Plus,
  Play,
  Pause,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  NexxoUser,
  StoryPrivacy,
  StoryMusicAttachment,
  StoryFilterSettings,
  StoryStickerOverlay,
  StoryAudioMix,
  StoryDraft,
} from '../../types';
import {
  createStory,
  saveStoryDraft,
  getUserStoryDrafts,
  deleteStoryDraft,
} from '../../lib/storyService';
import {
  uploadStoryMedia,
  createVideoThumbnail,
  compressImageFile,
  UploadController,
} from '../../lib/storageService';
import { StoryMusicPickerModal } from './StoryMusicPickerModal';
import { StoryCameraModal } from './StoryCameraModal';

interface CreateStoryModalProps {
  currentUser: NexxoUser;
  onClose: () => void;
  onCreated: () => void;
  initialMedia?: { file: File; type: 'image' | 'video'; previewUrl?: string };
}

const BG_GRADIENTS = [
  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
  'linear-gradient(135deg, #831843 0%, #312E81 100%)',
  'linear-gradient(135deg, #022C22 0%, #111827 100%)',
];

const FILTER_CLASSES: Record<StoryFilterSettings['filter'], string> = {
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

const STICKER_PRESETS = ['🔥', '✨', '💖', '🎉', '💯', '👑', '⚡', '🌟', '🚀', '🙌', '🎵', '💫'];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  currentUser,
  onClose,
  onCreated,
  initialMedia,
}) => {
  const [tab, setTab] = useState<'text' | 'image' | 'video'>('text');

  // Text Story state
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(initialMedia?.file || null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(initialMedia?.previewUrl || null);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);
  const [videoThumbnailBlob, setVideoThumbnailBlob] = useState<Blob | null>(null);

  // Caption & Overlays
  const [caption, setCaption] = useState('');
  const [stickers, setStickers] = useState<StoryStickerOverlay[]>([]);

  // Music & Audio Mixing
  const [attachedMusic, setAttachedMusic] = useState<StoryMusicAttachment | undefined>(undefined);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [audioMix, setAudioMix] = useState<StoryAudioMix>({
    originalSound: true,
    originalVolume: 1,
    musicSound: true,
    musicVolume: 0.85,
  });

  // Filters & Transforms
  const [filter, setFilter] = useState<StoryFilterSettings['filter']>('none');
  const [rotation, setRotation] = useState<number>(0);

  // Drawing Canvas
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#FFFFFF');
  const [penSize, setPenSize] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Privacy & Expiration
  const [privacy, setPrivacy] = useState<StoryPrivacy>('everyone');
  const [expirationHours, setExpirationHours] = useState(24);

  // Upload progress & State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadController, setUploadController] = useState<UploadController | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sub-Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [draftsList, setDraftsList] = useState<StoryDraft[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle initial media passed from chat or camera
  useEffect(() => {
    if (initialMedia) {
      setTab(initialMedia.type);
      setMediaFile(initialMedia.file);
      if (initialMedia.previewUrl) {
        setMediaPreview(initialMedia.previewUrl);
      } else {
        const url = URL.createObjectURL(initialMedia.file);
        setMediaPreview(url);
      }
      if (initialMedia.type === 'video') {
        processVideoFile(initialMedia.file);
      }
    }
  }, [initialMedia]);

  // Process Video: Extract thumbnail and duration
  const processVideoFile = async (file: File) => {
    try {
      const res = await createVideoThumbnail(file);
      setVideoThumbnailBlob(res.thumbnailBlob);
      setVideoThumbnailUrl(res.thumbnailUrl);
      setVideoDuration(Math.round(res.duration) || 15);
    } catch (e) {
      console.warn('Could not extract video metadata automatically:', e);
    }
  };

  // Handle Media File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      setErrorMessage('Please select a valid image (JPEG, PNG, WEBP) or video (MP4, WEBM).');
      return;
    }

    setErrorMessage(null);
    setMediaFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);

    if (isVid) {
      setTab('video');
      processVideoFile(file);
    } else {
      setTab('image');
      setVideoThumbnailUrl(null);
      setVideoThumbnailBlob(null);
    }
  };

  // Add Sticker / Emoji
  const handleAddSticker = (emoji: string) => {
    const newSticker: StoryStickerOverlay = {
      id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'emoji',
      content: emoji,
      x: 50 + (Math.random() * 20 - 10),
      y: 50 + (Math.random() * 20 - 10),
      scale: 1,
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearDrawing = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Rotate media
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      await saveStoryDraft({
        userId: currentUser.id,
        name: `Draft ${new Date().toLocaleDateString()}`,
        type: tab,
        caption,
        backgroundColor: selectedBg,
        textColor,
        fontFamily,
        privacy,
        musicTrack: attachedMusic,
        mediaFilters: { filter, rotation },
        stickers,
        audioMix,
      });
      // Saved draft smoothly
    } catch (err: any) {
      setErrorMessage('Failed to save draft.');
    }
  };

  // Load Drafts
  const handleOpenDrafts = async () => {
    try {
      const list = await getUserStoryDrafts(currentUser.id);
      setDraftsList(list);
      setIsDraftsOpen(true);
    } catch (e) {
      console.warn('Could not load drafts:', e);
    }
  };

  const applyDraft = (draft: StoryDraft) => {
    setTab(draft.type);
    if (draft.caption) setCaption(draft.caption);
    if (draft.backgroundColor) setSelectedBg(draft.backgroundColor);
    if (draft.textColor) setTextColor(draft.textColor);
    if (draft.fontFamily) setFontFamily(draft.fontFamily);
    if (draft.privacy) setPrivacy(draft.privacy);
    if (draft.musicTrack) setAttachedMusic(draft.musicTrack);
    if (draft.mediaFilters?.filter) setFilter(draft.mediaFilters.filter);
    if (draft.stickers) setStickers(draft.stickers);
    if (draft.audioMix) setAudioMix(draft.audioMix);
    setIsDraftsOpen(false);
  };

  // Final Publish Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'text' && !textContent.trim()) {
      setErrorMessage('Please type some text for your status story.');
      return;
    }
    if ((tab === 'image' || tab === 'video') && !mediaFile && !mediaPreview) {
      setErrorMessage('Please select a photo or video to publish.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      let finalMediaUrl = '';
      let finalThumbnailUrl = '';

      // Upload media if present
      if (tab === 'image' && mediaFile) {
        // Compress image before uploading
        const compressedBlob = await compressImageFile(mediaFile);
        const uploadRes = await uploadStoryMedia(
          compressedBlob,
          currentUser.id,
          'image',
          (pct) => setUploadProgress(pct),
          (ctrl) => setUploadController(ctrl)
        );
        finalMediaUrl = uploadRes.url;
      } else if (tab === 'video' && mediaFile) {
        // Upload video file
        const uploadRes = await uploadStoryMedia(
          mediaFile,
          currentUser.id,
          'video',
          (pct) => setUploadProgress(pct),
          (ctrl) => setUploadController(ctrl)
        );
        finalMediaUrl = uploadRes.url;

        // Upload generated thumbnail if available
        if (videoThumbnailBlob) {
          try {
            const thumbRes = await uploadStoryMedia(
              videoThumbnailBlob,
              currentUser.id,
              'image'
            );
            finalThumbnailUrl = thumbRes.url;
          } catch (te) {
            console.warn('Could not upload video thumbnail, will use video frame:', te);
          }
        }
      }

      // Export drawing layer if drawn on canvas
      const finalStickers = [...stickers];
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 1000) {
          finalStickers.push({
            id: `draw_${Date.now()}`,
            type: 'drawing',
            content: dataUrl,
            x: 50,
            y: 50,
          });
        }
      }

      await createStory({
        user: currentUser,
        type: tab,
        caption: tab === 'text' ? textContent.trim() : caption.trim(),
        mediaUrl: finalMediaUrl,
        thumbnailUrl: finalThumbnailUrl,
        duration: tab === 'video' ? videoDuration : 6,
        backgroundColor: selectedBg,
        textColor,
        fontFamily,
        privacy,
        musicTrack: attachedMusic,
        mediaFilters: { filter, rotation },
        stickers: finalStickers,
        audioMix: tab === 'video' && attachedMusic ? audioMix : undefined,
        expirationHours,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Publish story error:', err);
      setErrorMessage(err.message || 'Failed to publish story. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadController(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-4xl h-full sm:h-[92vh] sm:max-h-[850px] sm:rounded-3xl bg-white dark:bg-slate-900 sm:border sm:border-slate-200 sm:dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Story Viewport / Canvas (Phone aspect ratio) */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-h-[260px] md:min-h-0">
          <div
            className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all max-h-[45vh] md:max-h-none"
            style={
              tab === 'text' && selectedBg.includes('gradient')
                ? { backgroundImage: selectedBg }
                : { backgroundColor: tab === 'text' ? selectedBg : '#000000' }
            }
          >
            {/* Story Visual Content */}
            {tab === 'text' ? (
              <div className="h-full w-full flex items-center justify-center p-8 text-center">
                <p
                  className="text-2xl font-bold leading-relaxed break-words max-w-xs drop-shadow-md"
                  style={{ color: textColor, fontFamily }}
                >
                  {textContent || 'Tap on the right to type your story...'}
                </p>
              </div>
            ) : mediaPreview ? (
              <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
                {tab === 'video' ? (
                  <video
                    src={mediaPreview}
                    autoPlay
                    loop
                    muted={!audioMix.originalSound}
                    playsInline
                    className={`h-full w-full object-cover transition-all ${
                      FILTER_CLASSES[filter]
                    }`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Story preview"
                    className={`h-full w-full object-cover transition-all ${
                      FILTER_CLASSES[filter]
                    }`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                )}

                {/* Caption banner overlay */}
                {caption && (
                  <div className="absolute bottom-6 inset-x-3 p-3 rounded-xl bg-black/60 backdrop-blur-md text-center text-xs text-white drop-shadow">
                    {caption}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-3">
                <ImageIcon className="h-12 w-12 text-slate-700" />
                <p className="text-xs">No media chosen yet</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Select File
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Camera className="h-3.5 w-3.5" /> Camera
                  </button>
                </div>
              </div>
            )}

            {/* Render Stickers & Emojis */}
            {stickers.map((stk) => (
              <div
                key={stk.id}
                className="absolute text-4xl select-none pointer-events-none drop-shadow-lg"
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {stk.content}
              </div>
            ))}

            {/* Music Card sticker on story if music is selected */}
            {attachedMusic && (
              <div className="absolute top-12 left-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 text-white shadow-xl">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-indigo-600 flex-shrink-0 animate-spin-slow">
                  {attachedMusic.artworkUrl ? (
                    <img
                      src={attachedMusic.artworkUrl}
                      alt={attachedMusic.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Music className="h-4 w-4 m-auto text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold truncate">{attachedMusic.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-300 truncate block">
                    {attachedMusic.artist}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedMusic(undefined)}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Remove music"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Drawing Canvas Overlay */}
            <canvas
              ref={canvasRef}
              width={340}
              height={604}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 z-30 ${
                isDrawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
              }`}
            />
          </div>

          {/* Quick Toolbar on the left inside canvas */}
          <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`p-2.5 rounded-2xl backdrop-blur-md transition-all shadow-lg ${
                isDrawingMode
                  ? 'bg-indigo-600 text-white shadow-indigo-600/40'
                  : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
              }`}
              title="Pen / Drawing tool"
            >
              <PenTool className="h-4 w-4" />
            </button>

            {isDrawingMode && (
              <button
                type="button"
                onClick={clearDrawing}
                className="p-2.5 rounded-2xl bg-black/60 text-slate-300 hover:text-rose-400 backdrop-blur-md"
                title="Clear drawing"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}

            {tab !== 'text' && (
              <button
                type="button"
                onClick={handleRotate}
                className="p-2.5 rounded-2xl bg-black/60 text-slate-300 hover:text-white backdrop-blur-md"
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Configuration & Controls */}
        <div className="w-full md:w-[420px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create NEXXO Story</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenDrafts}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Open Saved Drafts"
              >
                <FileText className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTab('text')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                tab === 'text'
                  ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Type className="h-4 w-4" /> Text
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('image');
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                tab === 'image'
                  ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="h-4 w-4" /> Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('video');
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                tab === 'video'
                  ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="h-4 w-4" /> Video
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-5">
            {/* Hidden real file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />

            {/* Text Tab Controls */}
            {tab === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Status Message
                  </label>
                  <textarea
                    rows={3}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Share what's happening..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Background Colors */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {BG_GRADIENTS.map((bg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedBg(bg)}
                        className={`h-8 w-8 rounded-full flex-shrink-0 transition-transform cursor-pointer ${
                          selectedBg === bg ? 'scale-110 ring-2 ring-indigo-500 dark:ring-white' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={
                          bg.includes('gradient')
                            ? { backgroundImage: bg }
                            : { backgroundColor: bg }
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Font Selector */}
                <div className="flex gap-2">
                  {['Inter, sans-serif', 'serif', 'monospace', 'cursive'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFontFamily(f)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        fontFamily === f
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      style={{ fontFamily: f }}
                    >
                      {f.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Media Tab Controls */}
            {tab !== 'text' && (
              <div className="space-y-4">
                {/* Media Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-white flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <ImageIcon className="h-4 w-4" /> Change Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-white flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Camera className="h-4 w-4" /> Camera / Record
                  </button>
                </div>

                {/* Caption input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Caption
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Filters */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Filters
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {(['none', 'vintage', 'vivid', 'mono', 'warm', 'cool', 'sepia', 'cyberpunk', 'noir'] as const).map(
                      (f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilter(f)}
                          className={`text-xs px-3 py-1 rounded-full capitalize whitespace-nowrap transition-colors cursor-pointer ${
                            filter === f
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {f}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Music Selector Button */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Music className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {attachedMusic ? attachedMusic.title : 'Story Soundtrack'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {attachedMusic ? attachedMusic.artist : 'Attach licensed or personal music'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMusicPickerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 hover:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {attachedMusic ? 'Change' : 'Add Music'}
              </button>
            </div>

            {/* Video Audio Mixing Controls */}
            {tab === 'video' && attachedMusic && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Audio Mixing</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Original Video Sound</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioMix.originalSound ? audioMix.originalVolume : 0}
                      onChange={(e) =>
                        setAudioMix((prev) => ({
                          ...prev,
                          originalVolume: parseFloat(e.target.value),
                          originalSound: parseFloat(e.target.value) > 0,
                        }))
                      }
                      className="w-28 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Music Sound</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioMix.musicVolume}
                      onChange={(e) =>
                        setAudioMix((prev) => ({
                          ...prev,
                          musicVolume: parseFloat(e.target.value),
                        }))
                      }
                      className="w-28 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stickers / Emojis Bar */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Stickers & Emojis
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {STICKER_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddSticker(emoji)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy & Duration */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Privacy
                </label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as StoryPrivacy)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">Connections Only</option>
                  <option value="close_friends">Close Friends</option>
                  <option value="selected">Selected People</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Expires In
                </label>
                <select
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(parseInt(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours</option>
                </select>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-300 font-semibold">
                  <span>Uploading to Cloud Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadController && (
                  <button
                    type="button"
                    onClick={() => uploadController.cancel()}
                    className="text-[11px] text-rose-500 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Cancel Upload
                  </button>
                )}
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bottom Actions: Save Draft & Publish */}
            <div className="flex items-center gap-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Save Draft"
              >
                <Save className="h-4 w-4" /> Draft
              </button>

              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{isUploading ? 'Publishing Story...' : 'Publish Story'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-Modal: Music Picker */}
      {isMusicPickerOpen && (
        <StoryMusicPickerModal
          currentUser={currentUser}
          currentMusic={attachedMusic}
          onSelectMusic={(music) => setAttachedMusic(music)}
          onRemoveMusic={() => setAttachedMusic(undefined)}
          onClose={() => setIsMusicPickerOpen(false)}
        />
      )}

      {/* Sub-Modal: Camera / Video Recording */}
      {isCameraOpen && (
        <StoryCameraModal
          onCapture={(captured) => {
            setTab(captured.type);
            setMediaFile(captured.file);
            setMediaPreview(captured.previewUrl);
            if (captured.type === 'video') {
              processVideoFile(captured.file);
            }
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Sub-Modal: Saved Drafts */}
      {isDraftsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Story Drafts</h3>
              <button
                onClick={() => setIsDraftsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {draftsList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">No saved drafts.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {draftsList.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{d.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{d.type} story</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyDraft(d)}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteStoryDraft(d.id);
                          setDraftsList((prev) => prev.filter((item) => item.id !== d.id));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
