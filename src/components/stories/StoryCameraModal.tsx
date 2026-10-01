import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Video,
  SwitchCamera,
  RotateCcw,
  Check,
  AlertCircle,
  Upload,
  Circle,
  Square,
  Sparkles,
} from 'lucide-react';

interface StoryCameraModalProps {
  onCapture: (captured: { file: File; type: 'image' | 'video'; previewUrl: string }) => void;
  onClose: () => void;
}

export const StoryCameraModal: React.FC<StoryCameraModalProps> = ({ onCapture, onClose }) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Captured preview state
  const [capturedMedia, setCapturedMedia] = useState<{
    file: File;
    type: 'image' | 'video';
    previewUrl: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Initialize camera stream
  const startCamera = async () => {
    stopCamera();
    setPermissionError(null);
    setIsCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: mode === 'video', // Only request microphone in video mode
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera permission/access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(
          'Camera and microphone permissions were denied. Please enable them in your browser settings or select a file from your device.'
        );
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No camera found on your device.');
      } else {
        setPermissionError(err.message || 'Unable to access camera.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!capturedMedia) {
      startCamera();
    }
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode, mode, capturedMedia]);

  // Flip camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture Photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror photo to match viewfinder
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `story_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        stopCamera();
        setCapturedMedia({ file, type: 'image', previewUrl });
      }
    }, 'image/jpeg', 0.9);
  };

  // Start Video Recording
  const startVideoRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `story_video_${Date.now()}.${ext}`, { type: mimeType });
        const previewUrl = URL.createObjectURL(blob);
        stopCamera();
        setCapturedMedia({ file, type: 'video', previewUrl });
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 30) {
            // Cap at 30 seconds
            stopVideoRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('MediaRecorder error:', err);
    }
  };

  // Stop Video Recording
  const stopVideoRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Retake
  const handleRetake = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.previewUrl);
      setCapturedMedia(null);
    }
  };

  // Confirm capture
  const handleConfirm = () => {
    if (capturedMedia) {
      onCapture(capturedMedia);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none">
      {/* Top Header */}
      <div className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] inset-x-4 z-20 flex items-center justify-between text-white drop-shadow-md">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/90 text-white font-mono text-xs font-bold animate-pulse">
            <Circle className="h-3 w-3 fill-current" />
            <span>00:{recordDuration < 10 ? '0' : ''}{recordDuration} / 00:30</span>
          </div>
        )}

        {!capturedMedia && isCameraReady && (
          <button
            onClick={toggleFacingMode}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors"
            title="Switch Camera"
          >
            <SwitchCamera className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Main Viewfinder / Media Preview */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {permissionError ? (
          <div className="p-8 max-w-sm text-center text-slate-300 space-y-4">
            <div className="p-4 rounded-full bg-rose-500/20 text-rose-400 w-16 h-16 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Camera Access Blocked</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{permissionError}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
            >
              Upload from Device Instead
            </button>
          </div>
        ) : capturedMedia ? (
          /* Preview captured Photo or Video */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {capturedMedia.type === 'image' ? (
              <img
                src={capturedMedia.previewUrl}
                alt="Captured story"
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                src={capturedMedia.previewUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </div>
        ) : (
          /* Live Camera Feed */
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] inset-x-0 z-20 flex flex-col items-center gap-4">
        {capturedMedia ? (
          /* Action buttons after capture */
          <div className="flex items-center gap-6">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm backdrop-blur-md transition-transform active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/40 transition-transform active:scale-95"
            >
              <Check className="h-4 w-4" /> Use in Story
            </button>
          </div>
        ) : (
          !permissionError && (
            <>
              {/* Photo / Video Switcher */}
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setMode('photo')}
                  disabled={isRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    mode === 'photo'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setMode('video')}
                  disabled={isRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    mode === 'video'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Video
                </button>
              </div>

              {/* Shutter Button */}
              <div className="flex items-center justify-center">
                {mode === 'photo' ? (
                  <button
                    onClick={takePhoto}
                    className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 bg-white/20 backdrop-blur-sm shadow-2xl"
                    aria-label="Take Photo"
                  >
                    <div className="h-16 w-16 rounded-full bg-white" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopVideoRecording : startVideoRecording}
                    className="h-20 w-20 rounded-full border-4 border-rose-500 flex items-center justify-center transition-transform active:scale-90 bg-rose-500/20 backdrop-blur-sm shadow-2xl"
                    aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isRecording ? (
                      <div className="h-8 w-8 rounded-lg bg-rose-500" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};
