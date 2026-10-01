import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  Trash2,
  Send,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
} from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
}

const MAX_RECORDING_SECONDS = 180; // 3 minutes maximum for short audio notes

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  // State: 'recording' | 'preview'
  const [mode, setMode] = useState<'recording' | 'preview'>('recording');
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(15));

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeMimeTypeRef = useRef<string>('audio/webm');
  const durationRef = useRef<number>(0);

  // Format seconds to mm:ss
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Stop media stream tracks and AudioContext safely
  const cleanupStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      cleanupStream();
      setPermissionError(null);
      setMode('recording');
      setSeconds(0);
      durationRef.current = 0;
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPlayingPreview(false);
      setPreviewCurrentTime(0);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      // High-quality voice audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Real-time audio frequency analyzer for visual waveform
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVisualizer = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Compute 16 discrete levels from the frequency data
            const step = Math.floor(dataArray.length / 16);
            const levels: number[] = [];
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] || 0;
              // Normalize to percentage (15% min height to 100% max)
              const percent = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
              levels.push(percent);
            }
            setAudioLevels(levels);
            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          };

          animFrameRef.current = requestAnimationFrame(updateVisualizer);
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext analyzer not available, falling back to basic wave:', audioCtxErr);
      }

      // Determine supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      activeMimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: activeMimeTypeRef.current });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);
        setMode('preview');
        cleanupStream();
      };

      recorder.start(100); // 100ms chunking for smooth capture

      // Recording elapsed timer
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          if (next >= MAX_RECORDING_SECONDS) {
            // Auto stop when max duration reached
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      cleanupStream();
      setPermissionError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to record voice messages.'
          : err.message || 'Unable to access your microphone.'
      );
    }
  }, [cleanupStream]);

  // Initial mount: start recording immediately
  useEffect(() => {
    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupStream();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Stop recording and enter preview mode
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupStream();
    }
  };

  // Toggle preview playback
  const togglePreviewPlay = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setPreviewCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlayingPreview(false);
        setPreviewCurrentTime(0);
      });
    }

    const audio = previewAudioRef.current;
    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => {
        console.warn('Playback error:', e);
        setIsPlayingPreview(false);
      });
    }
  };

  // Seek preview playback
  const handleSeekPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setPreviewCurrentTime(newTime);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = newTime;
    }
  };

  // Re-record: reset everything and start recording again
  const handleReRecord = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    startRecording();
  };

  // Send message
  const handleSend = async () => {
    if (sending) return;

    // If still in recording mode, stop recorder and send the resulting blob
    if (mode === 'recording') {
      if (timerRef.current) clearInterval(timerRef.current);
      const finalDuration = Math.max(1, durationRef.current || seconds);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        setSending(true);
        mediaRecorderRef.current.onstop = async () => {
          const finalBlob = new Blob(audioChunksRef.current, { type: activeMimeTypeRef.current });
          cleanupStream();
          try {
            await onSend(finalBlob, finalDuration);
          } finally {
            setSending(false);
          }
        };
        mediaRecorderRef.current.stop();
        return;
      }
    }

    // In preview mode with ready blob
    if (!audioBlob) return;

    const finalDuration = Math.max(1, durationRef.current || seconds);
    setSending(true);
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      await onSend(audioBlob, finalDuration);
    } catch (e) {
      console.error('Failed to send recorded audio note:', e);
    } finally {
      setSending(false);
    }
  };

  // Discard and exit
  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cleanupStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    onCancel();
  };

  // Render Permission Error
  if (permissionError) {
    return (
      <div
        id="voice-recorder-error-banner"
        className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-xs shadow-xs animate-in fade-in"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="leading-snug">{permissionError}</span>
        </div>
        <button
          type="button"
          onClick={handleDiscard}
          className="px-3 py-1.5 rounded-xl bg-rose-200 dark:bg-rose-900/80 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 font-semibold shrink-0 transition-colors cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Active Recording View
  if (mode === 'recording') {
    return (
      <div
        id="voice-recorder-active-bar"
        className="bg-slate-50 dark:bg-slate-900/95 border border-indigo-200 dark:border-indigo-900/70 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-xs animate-in fade-in select-none"
      >
        {/* Recording Status & Pulse Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
            </span>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              REC {formatTimer(seconds)}
            </span>
          </div>

          {/* Real-time Dynamic Waveform Bars */}
          <div className="flex items-center gap-1 h-6 px-2 py-0.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
            {audioLevels.map((lvl, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-indigo-500 transition-all duration-75"
                style={{ height: `${lvl}%` }}
              />
            ))}
          </div>

          <span className="hidden md:inline text-[11px] text-slate-400 font-medium truncate">
            Speaking into microphone...
          </span>
        </div>

        {/* Recording Control Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Discard */}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={sending}
            className="p-2 sm:px-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Discard recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Stop & Preview */}
          <button
            type="button"
            onClick={stopRecording}
            disabled={sending}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Stop recording and preview"
          >
            <Square className="w-3 h-3 fill-current text-indigo-600 dark:text-indigo-400" />
            <span className="hidden xs:inline">Preview</span>
          </button>

          {/* Quick Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            title="Send voice message directly"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Preview Mode View: User has finished recording and is reviewing the audio
  const recordedDuration = Math.max(1, durationRef.current || seconds);

  return (
    <div
      id="voice-recorder-preview-bar"
      className="bg-slate-50 dark:bg-slate-900/95 border border-indigo-300 dark:border-indigo-800/80 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm animate-in fade-in select-none"
    >
      {/* Player and Scrubber Area */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePreviewPlay}
          className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
          title={isPlayingPreview ? 'Pause preview' : 'Play preview'}
        >
          {isPlayingPreview ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 ml-0.5 fill-current" />
          )}
        </button>

        {/* Audio Track Scrubber & Time */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <input
            type="range"
            min="0"
            max={recordedDuration}
            step="0.05"
            value={previewCurrentTime}
            onChange={handleSeekPreview}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600 dark:accent-indigo-500"
            title="Scrub preview audio"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>{formatTimer(previewCurrentTime)}</span>
            <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <Volume2 className="w-3 h-3" />
              <span>Voice Note</span>
            </div>
            <span>{formatTimer(recordedDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Discard, Re-record, Send */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
        {/* Discard / Delete */}
        <button
          type="button"
          onClick={handleDiscard}
          disabled={sending}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Discard audio message"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Re-record */}
        <button
          type="button"
          onClick={handleReRecord}
          disabled={sending}
          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
          title="Discard and record again"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Retake</span>
        </button>

        {/* Send Audio Message */}
        <button
          type="button"
          id="send-voice-note-btn"
          onClick={handleSend}
          disabled={sending}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          title="Send voice note"
        >
          {sending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{sending ? 'Sending...' : `Send (${formatTimer(recordedDuration)})`}</span>
        </button>
      </div>
    </div>
  );
};
