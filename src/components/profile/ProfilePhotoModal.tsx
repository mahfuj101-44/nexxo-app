import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Camera,
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { uploadProfilePhoto } from '../../lib/storageService';
import { updateUserProfile } from '../../lib/userService';

interface ProfilePhotoModalProps {
  userId: string;
  currentPhotoUrl?: string;
  onClose: () => void;
  onPhotoUpdated: (newUrl: string) => void;
}

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  userId,
  currentPhotoUrl,
  onClose,
  onPhotoUpdated,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10 MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // Load selected image into an HTMLImageElement for canvas rendering
  useEffect(() => {
    if (!selectedImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedImage;
    img.onload = () => {
      imgElementRef.current = img;
      renderCanvas();
    };
  }, [selectedImage]);

  // Re-render canvas on transform changes
  useEffect(() => {
    if (imgElementRef.current) {
      renderCanvas();
    }
  }, [zoom, rotation, offset]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgElementRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width; // 400x400 display
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Center origin
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate dimensions to cover square
    const aspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (aspect > 1) {
      drawHeight = size;
      drawWidth = size * aspect;
    } else {
      drawWidth = size;
      drawHeight = size / aspect;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2 + offset.x / zoom,
      -drawHeight / 2 + offset.y / zoom,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Generate cropped output blob and save
  const handleSaveCroppedImage = async () => {
    const img = imgElementRef.current;
    if (!img) return;

    try {
      setSaving(true);
      setError(null);

      // Create crisp, lightweight 320x320 canvas for final export
      const size = 320;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = size;
      exportCanvas.height = size;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      const scaleFactor = size / 400; // ratio to preview canvas

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const aspect = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;

      if (aspect > 1) {
        drawHeight = size;
        drawWidth = size * aspect;
      } else {
        drawWidth = size;
        drawHeight = size / aspect;
      }

      ctx.drawImage(
        img,
        -drawWidth / 2 + (offset.x * scaleFactor) / zoom,
        -drawHeight / 2 + (offset.y * scaleFactor) / zoom,
        drawWidth,
        drawHeight
      );
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to encode cropped image.'));
          },
          'image/jpeg',
          0.82
        );
      });

      // Upload to Firebase Storage
      const downloadUrl = await uploadProfilePhoto(userId, blob);

      // Update Firestore user document
      await updateUserProfile(userId, { photoURL: downloadUrl });

      onPhotoUpdated(downloadUrl);
      onClose();
    } catch (err: any) {
      console.error('Save photo error:', err);
      setError(err.message || 'Failed to save profile picture.');
    } finally {
      setSaving(false);
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateUserProfile(userId, { photoURL: '' });
      onPhotoUpdated('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to remove photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Profile Picture (DP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crop, rotate, and optimize your avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedImage ? (
          /* Empty Selection State */
          <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt="Current DP"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Upload a new photo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PNG, JPG, or WebP up to 10 MB
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Photo</span>
              </button>

              {currentPhotoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Current</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Interactive Crop Canvas Area */
          <div className="space-y-4">
            <div
              className="relative w-full aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-inner select-none cursor-move flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Circular Avatar Mask Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] h-[85%] rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              </div>

              <span className="absolute bottom-2 text-[10px] text-white/60 bg-black/50 px-2 py-0.5 rounded-full pointer-events-none">
                Drag to center
              </span>
            </div>

            {/* Transform Controls */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {/* Zoom Slider */}
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono text-[11px] w-9 text-right font-medium">
                  {zoom.toFixed(1)}x
                </span>
              </div>

              {/* Rotate & Reset Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Different Image</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveCroppedImage}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving DP...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Set Profile Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
