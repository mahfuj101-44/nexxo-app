import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Crop,
  Send,
  Sliders,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

export interface ImageCropModalProps {
  file: File;
  onApply: (croppedFile: File, previewUrl: string, autoSend?: boolean) => void;
  onSkipCrop?: (originalFile: File) => void;
  onClose: () => void;
}

type AspectRatioType = 'original' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

interface AspectRatioOption {
  id: AspectRatioType;
  label: string;
  ratio?: number; // width / height
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  onApply,
  onSkipCrop,
  onClose,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Viewport container
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 400,
    height: 400,
  });

  // Load image from File
  useEffect(() => {
    let active = true;
    const url = URL.createObjectURL(file);
    setImageSrc(url);

    const img = new Image();
    img.onload = () => {
      if (active) {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = url;

    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Update container size on mount & resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.max(rect.width, 240),
          height: Math.max(rect.height, 200),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute active aspect ratio numerical value
  const getAspectRatioValue = useCallback((): number => {
    if (!naturalSize) return 1;
    const isSwapped = rotation === 90 || rotation === 270;
    const origRatio = isSwapped
      ? naturalSize.height / naturalSize.width
      : naturalSize.width / naturalSize.height;

    switch (aspectRatio) {
      case '1:1':
        return 1;
      case '4:3':
        return 4 / 3;
      case '16:9':
        return 16 / 9;
      case '3:4':
        return 3 / 4;
      case '9:16':
        return 9 / 16;
      case 'original':
      default:
        return origRatio;
    }
  }, [aspectRatio, naturalSize, rotation]);

  // Calculate crop box dimensions to fit inside container
  const ratio = getAspectRatioValue();
  const maxCropW = Math.min(containerSize.width - 24, 520);
  const maxCropH = Math.min(containerSize.height - 24, 520);

  let cropW = maxCropW;
  let cropH = maxCropW / ratio;
  if (cropH > maxCropH) {
    cropH = maxCropH;
    cropW = maxCropH * ratio;
  }

  // Base scale required so image covers crop box at zoom = 1
  const isSwapped = rotation === 90 || rotation === 270;
  const effectiveW = naturalSize ? (isSwapped ? naturalSize.height : naturalSize.width) : 100;
  const effectiveH = naturalSize ? (isSwapped ? naturalSize.width : naturalSize.height) : 100;
  const baseScale = Math.max(cropW / effectiveW, cropH / effectiveH);

  // Pan boundary limits to avoid showing empty margins
  const currentScale = baseScale * zoom;
  const maxPanX = Math.max(0, (effectiveW * currentScale - cropW) / 2);
  const maxPanY = Math.max(0, (effectiveH * currentScale - cropH) / 2);

  const clampPan = useCallback(
    (newX: number, newY: number) => {
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      };
    },
    [maxPanX, maxPanY]
  );

  // Re-clamp pan whenever zoom or rotation or ratio changes
  useEffect(() => {
    setPan((prev) => clampPan(prev.x, prev.y));
  }, [clampPan]);

  // Drag to pan image
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setPanStart({ x: pan.x, y: pan.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    setPan(clampPan(panStart.x + deltaX, panStart.y + deltaY));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.max(1, Math.min(3.5, prev + zoomDelta)));
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
    setAspectRatio('original');
  };

  // Rotate 90 deg clockwise
  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPan({ x: 0, y: 0 });
  };

  // Rotate 90 deg counter-clockwise
  const handleRotateCcw = () => {
    setRotation((prev) => (prev + 270) % 360);
    setPan({ x: 0, y: 0 });
  };

  // Toggle flip horizontal
  const handleToggleFlipH = () => {
    setFlipH((prev) => !prev);
  };

  // Crop & Export to File
  const handleExportCropped = async (autoSend = false) => {
    if (!naturalSize || isProcessing) return;
    setIsProcessing(true);

    try {
      // Create offscreen image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = imageSrc;
      });

      // Calculate crisp export resolution
      // We base the output resolution on the crop box aspect ratio and natural image dimensions
      const maxExportDimension = 2048;
      const exportScale = Math.min(
        maxExportDimension / Math.max(cropW, cropH),
        Math.max(1, (isSwapped ? naturalSize.height : naturalSize.width) / cropW)
      );

      const exportW = Math.round(cropW * exportScale);
      const exportH = Math.round(cropH * exportScale);

      const canvas = document.createElement('canvas');
      canvas.width = exportW;
      canvas.height = exportH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Transform context to crop box center
      ctx.translate(exportW / 2, exportH / 2);

      // Apply scaled pan
      ctx.translate(pan.x * exportScale, pan.y * exportScale);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply flip
      ctx.scale(flipH ? -1 : 1, 1);

      // Draw image scaled
      const drawW = naturalSize.width * baseScale * zoom * exportScale;
      const drawH = naturalSize.height * baseScale * zoom * exportScale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Convert to Blob & File
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const ext = mimeType === 'image/png' ? 'png' : 'jpg';
          const croppedFileName = `${baseName}_cropped.${ext}`;
          const croppedFile = new File([blob], croppedFileName, {
            type: mimeType,
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(blob);
          onApply(croppedFile, previewUrl, autoSend);
          setIsProcessing(false);
        },
        mimeType,
        quality
      );
    } catch (err) {
      console.error('Cropping export failed:', err);
      setIsProcessing(false);
      // Fallback: use original file
      if (onSkipCrop) {
        onSkipCrop(file);
      } else {
        onClose();
      }
    }
  };

  const ASPECT_RATIOS: AspectRatioOption[] = [
    { id: 'original', label: 'Original' },
    { id: '1:1', label: '1:1 Square' },
    { id: '4:3', label: '4:3' },
    { id: '16:9', label: '16:9' },
    { id: '3:4', label: '3:4' },
    { id: '9:16', label: '9:16' },
  ];

  return (
    <div
      id="image-crop-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between text-white select-none animate-in fade-in duration-200"
    >
      {/* 1. Header Bar */}
      <div
        id="image-crop-header"
        className="w-full px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Crop & Adjust Photo</span>
              <span className="text-[11px] font-normal text-white/50 hidden sm:inline">
                ({file.name})
              </span>
            </h2>
            <p className="text-[11px] text-white/70">
              Drag to position &bull; Pinch/Scroll to zoom &bull; Choose preset ratios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset All Adjustments"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Close / Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cancel & Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Crop Stage Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 w-full relative flex items-center justify-center overflow-hidden p-4 touch-none cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handlePointerUp}
      >
        {/* Crop Box Frame */}
        <div
          id="crop-box-viewport"
          style={{
            width: `${cropW}px`,
            height: `${cropH}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
          }}
          className="relative rounded-lg overflow-hidden border-2 border-indigo-400/90 shadow-2xl flex items-center justify-center pointer-events-none"
        >
          {/* Render transformed Image */}
          {imageSrc && naturalSize && (
            <img
              src={imageSrc}
              alt="Cropping subject"
              draggable={false}
              style={{
                width: `${naturalSize.width * baseScale}px`,
                height: `${naturalSize.height * baseScale}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
                  flipH ? -1 : 1
                })`,
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                transformOrigin: 'center center',
              }}
              className="select-none pointer-events-none"
            />
          )}

          {/* Rule of Thirds Grid Overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
            <div className="border-r border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-b border-white/60" />
            <div className="border-r border-white/60" />
            <div className="border-r border-white/60" />
            <div />
          </div>

          {/* Decorative Corner Handles */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-sm pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-sm pointer-events-none" />

          {/* Center Hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* 3. Bottom Controls Panel */}
      <div
        id="image-crop-footer"
        className="w-full bg-black/85 backdrop-blur-md border-t border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]"
      >
        {/* Row 1: Aspect Ratio Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mr-1 hidden sm:inline shrink-0">
            Ratio:
          </span>
          {ASPECT_RATIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAspectRatio(item.id);
                setPan({ x: 0, y: 0 });
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                aspectRatio === item.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Row 2: Zoom Slider & Tool Buttons */}
        <div className="max-w-3xl mx-auto w-full flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-white/10">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2 flex-1 min-w-[140px] max-w-xs">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, prev - 0.2))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer shrink-0"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={1}
              max={3.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 min-w-16 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.5, prev + 0.2))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer shrink-0"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-white/70 min-w-9 text-right shrink-0">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Flip Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRotateCcw}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Rotate Left 90°"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Left</span>
            </button>
            <button
              type="button"
              onClick={handleRotateCw}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Rotate Right 90°"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Right</span>
            </button>
            <button
              type="button"
              onClick={handleToggleFlipH}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                flipH ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>

          {/* Action Final Buttons: Use Original, Apply & Send, Done */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onSkipCrop && (
              <button
                type="button"
                onClick={() => onSkipCrop(file)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Send without cropping"
              >
                Use Original
              </button>
            )}

            {/* Done / Apply to Draft */}
            <button
              type="button"
              onClick={() => handleExportCropped(false)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Apply crop and preview in chat"
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Done</span>
            </button>

            {/* Crop & Send Immediately */}
            <button
              type="button"
              onClick={() => handleExportCropped(true)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/40 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Apply crop and immediately send to chat"
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
