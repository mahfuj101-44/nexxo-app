import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  PhoneCall,
  User,
  ShieldCheck,
  Monitor,
  MonitorOff,
  Maximize,
  Minimize,
  Signal,
  Volume2,
  VolumeX,
  SwitchCamera,
  RotateCcw,
} from 'lucide-react';
import { CallSession } from '../../types';
import { CallController } from '../../lib/callService';

interface CallOverlayProps {
  controller: CallController;
  session: CallSession;
  localStream?: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  controller,
  session,
  localStream,
  remoteStream,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(controller.isMuted);
  const [isVideoDisabled, setIsVideoDisabled] = useState(controller.isVideoDisabled);
  const [isSharingScreen, setIsSharingScreen] = useState(controller.isScreenSharing);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(controller.facingMode || 'user');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSwitchingType, setIsSwitchingType] = useState(false);
  const [isFlippingCam, setIsFlippingCam] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Determine remote peer display info
  const isCaller = controller.isCaller;
  const partnerName = isCaller
    ? (session.calleeName || 'Peer')
    : (session.callerName || 'Caller');
  const partnerPhoto = isCaller ? session.calleePhoto : session.callerPhoto;
  const isVideoCall = session.type === 'video' || isSharingScreen;

  // Partner status flags synced from Firestore
  const isPartnerMuted = isCaller ? session.calleeMuted : session.callerMuted;
  const isPartnerVideoOff = isCaller ? session.calleeVideoOff : session.callerVideoOff;

  // Attach local media stream
  useEffect(() => {
    const stream = localStream || controller.localStream;
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, controller.localStream, isSharingScreen, isVideoDisabled]);

  // Attach remote audio track so sound ALWAYS plays in both voice and video calls
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((e) => {
        console.warn('Remote audio waiting for user interaction:', e);
      });
    }
  }, [remoteStream]);

  // Attach remote video stream whenever remoteStream or video view mode changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.warn('Remote video playback note:', err);
      });
    }
  }, [remoteStream, isVideoCall]);

  const handleHangup = () => {
    controller.endCall(durationSeconds);
    onEndCall();
  };

  // Ringing timeout (auto-hangup after 45s if unanswered)
  useEffect(() => {
    if (session.status === 'ringing') {
      const ringTimer = setTimeout(() => {
        setStatusMessage('No answer. Ending call...');
        setTimeout(() => {
          controller.endCall(0);
          onEndCall();
        }, 1500);
      }, 45000);
      return () => clearTimeout(ringTimer);
    }
  }, [session.status, onEndCall, controller]);

  // Call duration timer when connected
  useEffect(() => {
    let interval: any = null;
    if (session.status === 'accepted') {
      interval = setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.status]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const muted = controller.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleVideo = () => {
    const disabled = controller.toggleVideo();
    setIsVideoDisabled(disabled);
  };

  const handleToggleScreenShare = async () => {
    try {
      const sharing = await controller.toggleScreenShare();
      setIsSharingScreen(sharing);
      if (sharing) {
        if (controller.isSimulatedScreen) {
          setStatusMessage('Displaying presentation feed (Open in new tab to capture OS desktop)');
          setTimeout(() => setStatusMessage(''), 4500);
        } else {
          setStatusMessage('Screen sharing active');
          setTimeout(() => setStatusMessage(''), 2500);
        }
      } else {
        if (controller.lastScreenShareNotice) {
          setStatusMessage(controller.lastScreenShareNotice);
          setTimeout(() => setStatusMessage(''), 4000);
        } else {
          setStatusMessage('Screen sharing stopped');
          setTimeout(() => setStatusMessage(''), 2000);
        }
      }
    } catch (err: any) {
      console.warn('Screen share interaction notice:', err);
      setStatusMessage('Screen share unavailable');
      setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const handleFlipCamera = async () => {
    if (isFlippingCam || isSharingScreen) return;
    setIsFlippingCam(true);
    try {
      const newMode = await controller.flipCamera();
      setFacingMode(newMode);
      setStatusMessage(newMode === 'environment' ? 'Switched to Back Camera' : 'Switched to Front Camera');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err: any) {
      console.warn('Flip camera notice:', err);
      setStatusMessage('Front/Back switch not available on this device');
      setTimeout(() => setStatusMessage(''), 2500);
    } finally {
      setIsFlippingCam(false);
    }
  };

  const handleSwitchCallType = async () => {
    if (isSwitchingType) return;
    setIsSwitchingType(true);
    try {
      if (session.type === 'voice') {
        setStatusMessage('Switching to Video Call...');
        await controller.switchToVideo();
        setStatusMessage('Switched to Video Mode');
        setTimeout(() => setStatusMessage(''), 2500);
      } else {
        setStatusMessage('Switching to Audio Call...');
        await controller.switchToAudio();
        setStatusMessage('Switched to Voice-Only Mode');
        setTimeout(() => setStatusMessage(''), 2500);
      }
    } catch (err: any) {
      console.error('Switch call type error:', err);
      setStatusMessage('Could not switch call mode');
      setTimeout(() => setStatusMessage(''), 2500);
    } finally {
      setIsSwitchingType(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen not permitted in current frame environment:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      id="nexxo-active-call-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in select-none font-sans"
    >
      {/* Hidden persistent remote audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isVideoCall} className="hidden" />

      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold shadow-md">
            {partnerPhoto ? (
              <img src={partnerPhoto} alt={partnerName} className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
            {isPartnerMuted && (
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-rose-600 text-white border border-slate-900" title="Partner is muted">
                <MicOff className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-white">
                {partnerName}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> P2P WebRTC E2EE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>
                {statusMessage
                  ? statusMessage
                  : session.status === 'ringing'
                  ? 'Ringing...'
                  : session.status === 'accepted'
                  ? `Connected • ${formatTimer(durationSeconds)}`
                  : session.status}
              </span>
              {session.status === 'accepted' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <Signal className="w-3 h-3" /> HD Audio & Video
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 text-slate-300 font-medium">
            {isSharingScreen ? 'Screen Share' : isVideoCall ? 'HD Video' : 'HQ Voice'}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 flex items-center justify-center bg-slate-950 overflow-hidden">
        {/* Banner: Remote partner is muted */}
        {isPartnerMuted && session.status === 'accepted' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in">
            <MicOff className="w-3.5 h-3.5" />
            <span>{partnerName} is muted</span>
          </div>
        )}

        {isVideoCall ? (
          <>
            {/* Remote Video element */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-contain bg-slate-950 ${isPartnerVideoOff ? 'hidden' : ''}`}
            />

            {/* If partner turned camera off in a video call */}
            {isPartnerVideoOff && session.status === 'accepted' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 text-center p-6 animate-in fade-in">
                <div className="h-28 w-28 rounded-full bg-slate-900 border-2 border-indigo-500/40 flex items-center justify-center mb-4 shadow-2xl">
                  {partnerPhoto ? (
                    <img src={partnerPhoto} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-14 w-14 text-indigo-300" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{partnerName}</h3>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Camera turned off</span>
                </div>
              </div>
            )}

            {/* Waiting for remote stream state */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="h-28 w-28 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
                  <User className="h-14 w-14 text-indigo-300" />
                </div>
                <p className="text-base font-medium text-slate-300">
                  {session.status === 'ringing'
                    ? `Calling ${partnerName}...`
                    : 'Connecting media streams...'}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Setting up secure peer-to-peer connection
                </p>
              </div>
            )}

            {/* Local Video PiP (Picture in Picture) */}
            <div className="absolute bottom-6 right-6 h-36 w-48 sm:h-44 sm:w-56 rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-900 shadow-2xl z-20 transition-all">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${isVideoDisabled && !isSharingScreen ? 'hidden' : ''}`}
              />

              {/* Local Camera Disabled View */}
              {isVideoDisabled && !isSharingScreen && (
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-800 text-xs text-slate-400 gap-1.5">
                  <VideoOff className="w-5 h-5 text-slate-400" />
                  <span>Your Camera Off</span>
                </div>
              )}

              {/* Local Mute Indicator on PiP */}
              {isMuted && (
                <div className="absolute top-2 left-2 z-30 p-1.5 rounded-full bg-rose-600 text-white shadow-md" title="You are muted">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}

              {/* PiP Camera Flip Quick Button */}
              {!isSharingScreen && !isVideoDisabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlipCamera();
                  }}
                  disabled={isFlippingCam}
                  className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white shadow-md backdrop-blur-xs transition-all active:scale-90 cursor-pointer"
                  title={`Flip camera (${facingMode === 'user' ? 'Switch to Back' : 'Switch to Front'})`}
                >
                  <SwitchCamera className={`w-3.5 h-3.5 ${isFlippingCam ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Screen Share badge on PiP */}
              {isSharingScreen && (
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-emerald-300 font-semibold border border-emerald-500/30">
                  Sharing Screen
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Mode Screen */
          <div className="flex flex-col items-center justify-center text-center p-6">
            <div className="relative mb-6">
              <div className={`absolute -inset-4 rounded-full ${session.status === 'ringing' ? 'bg-indigo-500/20 animate-ping' : 'bg-indigo-500/10'}`} />
              {partnerPhoto ? (
                <img
                  src={partnerPhoto}
                  alt={partnerName}
                  className="relative h-32 w-32 rounded-full object-cover shadow-2xl border-4 border-indigo-400/40"
                />
              ) : (
                <div className="relative h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-2xl border-4 border-indigo-400/40">
                  <User className="h-16 w-16 text-white" />
                </div>
              )}
              {isPartnerMuted && (
                <div className="absolute bottom-1 right-1 p-2 rounded-full bg-rose-600 text-white border-2 border-slate-950 shadow-lg">
                  <MicOff className="w-4 h-4" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {partnerName}
            </h2>
            <p className="text-indigo-400 font-mono text-sm mb-4">
              {session.status === 'accepted' ? formatTimer(durationSeconds) : 'Calling...'}
            </p>

            {/* Quick Switch to Video Call Button in Voice Mode */}
            {session.status === 'accepted' && (
              <button
                onClick={handleSwitchCallType}
                disabled={isSwitchingType}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer border border-indigo-400/30"
              >
                <Video className="w-4 h-4" />
                <span>{isSwitchingType ? 'Switching...' : 'Switch to Video Call'}</span>
              </button>
            )}

            {/* Audio Wave Visualizer */}
            <div className="flex items-center gap-1.5 h-10 px-4 py-2 rounded-2xl bg-slate-900/60 border border-slate-800">
              {isPartnerMuted ? (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <VolumeX className="w-4 h-4" />
                  <span>Partner is currently muted</span>
                </div>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-indigo-400 mr-2" />
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 bg-indigo-500 rounded-full ${session.status === 'accepted' ? 'animate-pulse' : 'opacity-40'}`}
                      style={{
                        height: session.status === 'accepted' ? `${12 + ((i * 7) % 24)}px` : '8px',
                        animationDelay: `${i * 150}ms`,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-2.5 sm:gap-4 z-20 flex-wrap">
        {/* Mute Mic Toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleToggleMute}
            className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
              isMuted
                ? 'bg-rose-600 text-white shadow-rose-600/40 ring-2 ring-rose-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
            {isMuted ? 'Muted' : 'Mute'}
          </span>
        </div>

        {/* Video Toggle (Camera On/Off) */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleToggleVideo}
            className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
              isVideoDisabled
                ? 'bg-rose-600 text-white shadow-rose-600/40 ring-2 ring-rose-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title={isVideoDisabled ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
            {isVideoDisabled ? 'Cam Off' : 'Camera'}
          </span>
        </div>

        {/* Call Mode Switcher: Voice <-> Video */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleSwitchCallType}
            disabled={isSwitchingType}
            className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
              session.type === 'voice'
                ? 'bg-indigo-600 text-white shadow-indigo-600/40 hover:bg-indigo-500'
                : 'bg-slate-800 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300'
            }`}
            title={session.type === 'voice' ? 'Switch to video call' : 'Switch to voice-only call'}
          >
            {session.type === 'voice' ? (
              <Video className="h-5 w-5" />
            ) : (
              <PhoneCall className="h-5 w-5" />
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
            {session.type === 'voice' ? 'To Video' : 'To Audio'}
          </span>
        </div>

        {/* Flip Camera (Front <-> Back toggle for video calls) */}
        {isVideoCall && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleFlipCamera}
              disabled={isFlippingCam || isSharingScreen}
              className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
                facingMode === 'environment'
                  ? 'bg-amber-600 text-white shadow-amber-600/40 ring-2 ring-amber-400'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              } ${isSharingScreen ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={`Flip camera (${facingMode === 'user' ? 'Front' : 'Back'})`}
            >
              <SwitchCamera className={`h-5 w-5 ${isFlippingCam ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
              {facingMode === 'user' ? 'Front Cam' : 'Back Cam'}
            </span>
          </div>
        )}

        {/* Screen Share Toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleToggleScreenShare}
            className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 ${
              isSharingScreen
                ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title={isSharingScreen ? 'Stop screen share' : 'Share your screen'}
          >
            {isSharingScreen ? (
              <MonitorOff className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
            {isSharingScreen ? 'Sharing' : 'Share'}
          </span>
        </div>

        {/* End Call Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleHangup}
            className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xl shadow-rose-600/40 hover:bg-rose-500 active:scale-95 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
          <span className="text-[10px] sm:text-[11px] font-medium text-rose-400">
            End
          </span>
        </div>
      </div>
    </div>
  );
};
