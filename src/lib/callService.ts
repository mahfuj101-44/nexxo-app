import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { CallSession, CallType, CallStatus, NexxoUser } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Fallback canvas video track if camera is in use by another tab or missing
function createFallbackVideoTrack(displayName: string): MediaStreamTrack {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let angle = 0;

  const renderFrame = () => {
    if (!ctx) return;
    // Dark sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 640, 480);

    // Subtle ambient glow
    const grad = ctx.createRadialGradient(320, 210, 30, 320, 210, 180);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Pulsing circle around avatar
    const pulseRadius = 72 + Math.sin(angle) * 6;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 210, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center avatar circle
    ctx.fillStyle = '#4338ca';
    ctx.beginPath();
    ctx.arc(320, 210, 64, 0, Math.PI * 2);
    ctx.fill();

    // Initial letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((displayName || 'U').charAt(0).toUpperCase(), 320, 212);

    // Name label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(displayName || 'NEXXO User', 320, 315);

    // Audio-connected tag
    ctx.fillStyle = '#34d399';
    ctx.font = '500 13px monospace';
    ctx.fillText('• Audio Connected (Webcam Inactive)', 320, 345);

    angle += 0.06;
  };

  renderFrame();
  const animInterval = window.setInterval(renderFrame, 150);

  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(12) : null;
  const track = stream ? stream.getVideoTracks()[0] : null;

  if (track) {
    const origStop = track.stop.bind(track);
    track.stop = () => {
      window.clearInterval(animInterval);
      origStop();
    };
    return track;
  }

  // Pure blank fallback track
  const blackCanvas = document.createElement('canvas');
  blackCanvas.width = 320;
  blackCanvas.height = 240;
  const blackStream = (blackCanvas as any).captureStream ? (blackCanvas as any).captureStream(1) : null;
  return blackStream?.getVideoTracks()[0] as MediaStreamTrack;
}

export class CallController {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  public screenStream: MediaStream | null = null;
  public callId: string | null = null;
  public isCaller: boolean = false;
  public isMuted: boolean = false;
  public isVideoDisabled: boolean = false;
  public isScreenSharing: boolean = false;
  public isSimulatedScreen: boolean = false;
  public lastScreenShareNotice: string | null = null;
  public facingMode: 'user' | 'environment' = 'user';
  public currentStatus: CallStatus = 'ringing';
  public connectedTimestamp: number | null = null;

  private originalCameraTrack: MediaStreamTrack | null = null;
  private simulatedScreenCleanup: (() => void) | null = null;
  private unsubscribeDoc: (() => void) | null = null;
  private addedCandidateKeys = new Set<string>();
  private candidateQueue: RTCIceCandidateInit[] = [];
  private isDocReady: boolean = false;
  private pendingLocalCandidates: any[] = [];

  constructor(
    private onRemoteStream: (stream: MediaStream) => void,
    private onCallStateChange: (session: CallSession) => void,
    private onEnded: (reason?: string) => void,
    public onLocalStream?: (stream: MediaStream) => void
  ) {}

  private async addCandidateSafe(cand: any) {
    if (!cand) return;
    const candKey = typeof cand === 'string' ? cand : (cand.candidate || JSON.stringify(cand));
    if (this.addedCandidateKeys.has(candKey)) return;

    if (!this.peerConnection || !this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      // Remote description not ready yet; buffer candidate for later draining
      this.candidateQueue.push(cand);
      return;
    }

    this.addedCandidateKeys.add(candKey);
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {
      console.warn('IceCandidate add warning:', e);
    }
  }

  private async drainCandidateQueue() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const queue = [...this.candidateQueue];
    this.candidateQueue = [];
    for (const cand of queue) {
      await this.addCandidateSafe(cand);
    }
  }

  private async acquireMedia(type: CallType, fallbackName: string): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Your browser environment does not support camera or microphone capture.');
    }

    const isVideo = type === 'video';

    if (isVideo) {
      // 1. Try high-definition video + audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        return stream;
      } catch (errHigh: any) {
        console.warn('Ideal HD getUserMedia failed, trying basic constraints:', errHigh);
      }

      // 2. Try standard video + audio without resolution constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        return stream;
      } catch (errBasic: any) {
        console.warn('Basic video getUserMedia failed, trying audio-only with canvas video fallback:', errBasic);
      }

      // 3. Fallback: Acquire audio only, and attach synthetic animated video track
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });

        const fallbackTrack = createFallbackVideoTrack(fallbackName);
        if (fallbackTrack) {
          audioStream.addTrack(fallbackTrack);
        }
        return audioStream;
      } catch (errAudio: any) {
        console.error('Microphone access denied:', errAudio);
        throw new Error('Microphone or Camera access is blocked. Please allow permissions in your browser.');
      }
    } else {
      // Voice call
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      } catch {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } catch {
          throw new Error('Microphone permission denied. Please allow microphone access in your browser to make a call.');
        }
      }
    }
  }

  public async initiateCall(
    caller: NexxoUser,
    callee: NexxoUser,
    type: CallType
  ): Promise<string> {
    this.isCaller = true;
    const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.callId = callId;
    this.addedCandidateKeys.clear();
    this.candidateQueue = [];
    this.pendingLocalCandidates = [];
    this.isDocReady = false;
    this.isMuted = false;
    this.isVideoDisabled = false;

    // 1. Acquire media
    this.localStream = await this.acquireMedia(type, caller.displayName || caller.username);
    if (this.onLocalStream) {
      this.onLocalStream(this.localStream);
    }

    // 2. Setup RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        event.streams[0].onaddtrack = () => {
          if (this.remoteStream) {
            this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
          }
        };
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        const json = event.candidate.toJSON();
        if (!this.isDocReady) {
          this.pendingLocalCandidates.push(json);
        } else {
          updateDoc(doc(db, 'calls', this.callId), {
            callerCandidates: arrayUnion(json),
          }).catch(console.error);
        }
      }
    };

    // 3. Create Offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);

    // 4. Create Call Doc in Firestore
    this.currentStatus = 'ringing';
    this.connectedTimestamp = null;
    const callData: CallSession = {
      id: callId,
      callerId: caller.id,
      callerName: caller.displayName || caller.username,
      callerPhoto: caller.photoURL || '',
      callerNexxoId: caller.nexxoId,
      calleeId: callee.id,
      calleeName: callee.displayName || callee.username,
      calleePhoto: callee.photoURL || '',
      participantIds: [caller.id, callee.id],
      type,
      status: 'ringing',
      offer: { type: offer.type, sdp: offer.sdp },
      callerCandidates: [...this.pendingLocalCandidates],
      calleeCandidates: [],
      callerMuted: false,
      calleeMuted: false,
      callerVideoOff: false,
      calleeVideoOff: false,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'calls', callId), callData);
    this.isDocReady = true;

    // Flush any candidates gathered while setDoc was in flight
    if (this.pendingLocalCandidates.length > 0) {
      for (const c of this.pendingLocalCandidates) {
        updateDoc(doc(db, 'calls', callId), {
          callerCandidates: arrayUnion(c),
        }).catch(() => {});
      }
    }

    // 5. Listen to Call document for answer and callee candidates
    let hasSetRemoteAnswer = false;
    this.unsubscribeDoc = onSnapshot(doc(db, 'calls', callId), async (snap) => {
      if (!snap.exists()) {
        this.cleanup();
        this.onEnded('Call ended');
        return;
      }

      const session = snap.data() as CallSession;
      this.onCallStateChange(session);

      if (session.status === 'rejected') {
        this.cleanup();
        this.onEnded('Call was declined');
        return;
      }

      if (session.status === 'ended') {
        this.cleanup();
        this.onEnded('Call ended');
        return;
      }

      if (session.status === 'accepted' && session.answer && !hasSetRemoteAnswer) {
        hasSetRemoteAnswer = true;
        const answerDesc = new RTCSessionDescription(session.answer);
        await this.peerConnection?.setRemoteDescription(answerDesc);
        await this.drainCandidateQueue();

        if (session.calleeCandidates && session.calleeCandidates.length > 0) {
          for (const cand of session.calleeCandidates) {
            await this.addCandidateSafe(cand);
          }
        }
      } else if (hasSetRemoteAnswer && session.calleeCandidates) {
        for (const cand of session.calleeCandidates) {
          await this.addCandidateSafe(cand);
        }
      }
    });

    return callId;
  }

  public async acceptIncomingCall(callSession: CallSession): Promise<void> {
    this.isCaller = false;
    this.callId = callSession.id;
    this.addedCandidateKeys.clear();
    this.candidateQueue = [];
    this.pendingLocalCandidates = [];
    this.isDocReady = false;
    this.isMuted = false;
    this.isVideoDisabled = false;

    // 1. Acquire media
    this.localStream = await this.acquireMedia(callSession.type, callSession.calleeName || 'User');
    if (this.onLocalStream) {
      this.onLocalStream(this.localStream);
    }

    // 2. Setup RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        event.streams[0].onaddtrack = () => {
          if (this.remoteStream) {
            this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
          }
        };
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        const json = event.candidate.toJSON();
        if (!this.isDocReady) {
          this.pendingLocalCandidates.push(json);
        } else {
          updateDoc(doc(db, 'calls', this.callId), {
            calleeCandidates: arrayUnion(json),
          }).catch(console.error);
        }
      }
    };

    // 3. Set Remote Description from caller's offer
    if (callSession.offer) {
      const offerDesc = new RTCSessionDescription(callSession.offer);
      await this.peerConnection.setRemoteDescription(offerDesc);
      await this.drainCandidateQueue();
    }

    // 4. Create Answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // 5. Update call doc
    await updateDoc(doc(db, 'calls', callSession.id), {
      status: 'accepted',
      answer: { type: answer.type, sdp: answer.sdp },
      connectedAt: serverTimestamp(),
      calleeMuted: false,
      calleeVideoOff: false,
    });
    this.isDocReady = true;

    // Flush any pending callee candidates
    if (this.pendingLocalCandidates.length > 0) {
      for (const c of this.pendingLocalCandidates) {
        updateDoc(doc(db, 'calls', callSession.id), {
          calleeCandidates: arrayUnion(c),
        }).catch(() => {});
      }
    }

    // 6. Process initial caller candidates
    if (callSession.callerCandidates && callSession.callerCandidates.length > 0) {
      for (const cand of callSession.callerCandidates) {
        await this.addCandidateSafe(cand);
      }
    }

    // 7. Listen for incremental caller candidates or call termination
    this.unsubscribeDoc = onSnapshot(doc(db, 'calls', callSession.id), async (snap) => {
      if (!snap.exists()) {
        this.cleanup();
        this.onEnded('Call ended');
        return;
      }
      const session = snap.data() as CallSession;
      this.onCallStateChange(session);

      if (session.status === 'ended') {
        this.cleanup();
        this.onEnded('Call ended');
        return;
      }

      if (session.callerCandidates) {
        for (const cand of session.callerCandidates) {
          await this.addCandidateSafe(cand);
        }
      }
    });
  }

  public async answerCall(callSession: CallSession): Promise<void> {
    return this.acceptIncomingCall(callSession);
  }

  /**
   * Complete Mute / Unmute handler
   */
  public setMute(muted: boolean): boolean {
    this.isMuted = muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      });
    }

    // Sync to Firestore so partner receives visual mute indicator
    if (this.callId) {
      const field = this.isCaller ? 'callerMuted' : 'calleeMuted';
      updateDoc(doc(db, 'calls', this.callId), { [field]: muted }).catch(() => {});
    }

    return this.isMuted;
  }

  public toggleMute(): boolean {
    return this.setMute(!this.isMuted);
  }

  /**
   * Complete Video Enable / Disable handler
   */
  public setVideoDisabled(disabled: boolean): boolean {
    this.isVideoDisabled = disabled;

    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !disabled;
      });
    }

    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = !disabled;
        }
      });
    }

    // Sync to Firestore so partner receives visual camera indicator
    if (this.callId) {
      const field = this.isCaller ? 'callerVideoOff' : 'calleeVideoOff';
      updateDoc(doc(db, 'calls', this.callId), { [field]: disabled }).catch(() => {});
    }

    return this.isVideoDisabled;
  }

  public toggleVideo(): boolean {
    return this.setVideoDisabled(!this.isVideoDisabled);
  }

  /**
   * Screen Share Toggle
   */
  public async toggleScreenShare(): Promise<boolean> {
    this.lastScreenShareNotice = null;

    if (this.isScreenSharing) {
      if (this.simulatedScreenCleanup) {
        this.simulatedScreenCleanup();
        this.simulatedScreenCleanup = null;
      }

      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }

      if (this.peerConnection && this.originalCameraTrack) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(this.originalCameraTrack);
        }
      }

      this.isScreenSharing = false;
      this.isSimulatedScreen = false;
      if (this.onLocalStream && this.localStream) {
        this.onLocalStream(this.localStream);
      }
      return false;
    } else {
      let stream: MediaStream | null = null;
      let isSimulated = false;
      const isIframe = window.self !== window.top;

      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported in this browser.');
        }

        // Attempt display media capture with audio + video, or video only
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch (initialErr: any) {
          const initMsg = String(initialErr?.message || '');
          const isPolicyOrSecurity =
            initialErr?.name === 'SecurityError' ||
            initialErr?.name === 'NotAllowedError' && initMsg.includes('permissions policy') ||
            initMsg.includes('display-capture');

          if (isPolicyOrSecurity) {
            throw initialErr;
          }

          // Fallback to video-only if audio capture caused refusal
          if (initialErr?.name !== 'NotAllowedError') {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          } else {
            throw initialErr;
          }
        }
      } catch (err: any) {
        const errMessage = String(err?.message || '');
        const isPermissionPolicy =
          err?.name === 'SecurityError' ||
          errMessage.includes('permissions policy') ||
          errMessage.includes('display-capture');
        const isCancelled = err?.name === 'NotAllowedError' && !isPermissionPolicy;

        if (isCancelled) {
          // Normal user cancellation from native prompt
          this.lastScreenShareNotice = 'Screen sharing was cancelled.';
          return false;
        }

        // If disallowed by permissions policy in embedded iframe or security error
        if (isPermissionPolicy || isIframe) {
          console.warn(
            'Screen sharing restricted in iframe permissions policy. Activating presentation screen stream:',
            errMessage
          );
          this.lastScreenShareNotice =
            'Real display capture is restricted inside embedded iframe preview. Showing presentation stream (open app in a new tab to share your full desktop).';
        } else {
          console.warn('Screen sharing could not start:', errMessage);
          this.lastScreenShareNotice = err?.message || 'Screen sharing unavailable';
        }

        // Fallback: Create high-fidelity presentation stream so peer connection and call presentation preview works
        const simulated = this.createSimulatedPresentationStream();
        if (simulated?.stream) {
          stream = simulated.stream;
          this.simulatedScreenCleanup = simulated.stop;
          isSimulated = true;
        } else {
          return false;
        }
      }

      if (!stream) {
        return false;
      }

      this.screenStream = stream;
      this.isSimulatedScreen = isSimulated;
      const screenVideoTrack = stream.getVideoTracks()[0];

      if (this.peerConnection && screenVideoTrack) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          this.originalCameraTrack = sender.track;
          await sender.replaceTrack(screenVideoTrack);
        }
      }

      this.isScreenSharing = true;

      if (this.onLocalStream && this.screenStream) {
        this.onLocalStream(this.screenStream);
      }

      if (screenVideoTrack) {
        screenVideoTrack.onended = () => {
          this.toggleScreenShare();
        };
      }

      return true;
    }
  }

  /**
   * Generates a high-quality animated workspace presentation stream when running in restricted environments like iframes
   */
  private createSimulatedPresentationStream(): { stream: MediaStream | null; stop: () => void } {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { stream: null, stop: () => {} };

      let animId: number;
      let frame = 0;

      const draw = () => {
        frame++;
        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#111827');
        bgGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1280, 720);

        // Tech grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1280; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 720);
          ctx.stroke();
        }
        for (let y = 0; y < 720; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1280, y);
          ctx.stroke();
        }

        // Top Navigation Header
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(40, 36, 1200, 56);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('NEXXO Presentation Stream', 64, 72);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '15px system-ui, -apple-system, sans-serif';
        const timeStr = new Date().toLocaleTimeString();
        ctx.fillText(`Encrypted Feed • ${timeStr}`, 1010, 72);

        // Center card
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(80, 120, 1120, 540, 20);
        } else {
          ctx.rect(80, 120, 1120, 540);
        }
        ctx.fill();
        ctx.stroke();

        // Slide title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillText('NEXXO High-Definition Screen Collaboration', 130, 190);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px system-ui, -apple-system, sans-serif';
        ctx.fillText('Live presentation canvas stream active for embedded iframe environments.', 130, 230);
        ctx.fillText('To share your actual OS desktop windows, open the application in a new browser tab.', 130, 260);

        // Dynamic visualizer bars
        const numBars = 24;
        const barWidth = 24;
        const startX = 130;
        const startY = 480;
        for (let i = 0; i < numBars; i++) {
          const barHeight = Math.abs(Math.sin((frame + i * 8) * 0.05)) * 140 + 20;
          const barGrad = ctx.createLinearGradient(0, startY - barHeight, 0, startY);
          barGrad.addColorStop(0, '#38bdf8');
          barGrad.addColorStop(1, '#6366f1');
          ctx.fillStyle = barGrad;
          ctx.fillRect(startX + i * 36, startY - barHeight, barWidth, barHeight);
        }

        // Live badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(135, 540, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText('LIVE STREAMING TO PEER CALL PARTICIPANTS', 152, 545);

        animId = requestAnimationFrame(draw);
      };

      draw();

      const stream: MediaStream | null = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;

      return {
        stream,
        stop: () => {
          if (animId) cancelAnimationFrame(animId);
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        },
      };
    } catch {
      return { stream: null, stop: () => {} };
    }
  }

  /**
   * Flip camera between front (user) and back (environment) mode.
   */
  public async flipCamera(): Promise<'user' | 'environment'> {
    if (this.isScreenSharing) {
      throw new Error('Cannot flip camera while sharing screen.');
    }

    const nextMode: 'user' | 'environment' = this.facingMode === 'user' ? 'environment' : 'user';

    try {
      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: nextMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: false,
        });
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No video track found for camera flip.');
      }

      // Stop previous local video tracks
      if (this.localStream) {
        const oldTracks = this.localStream.getVideoTracks();
        oldTracks.forEach((t) => {
          t.stop();
          this.localStream?.removeTrack(t);
        });
        this.localStream.addTrack(newVideoTrack);
      } else {
        this.localStream = newStream;
      }

      // Replace video track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        } else {
          this.peerConnection.addTrack(newVideoTrack, this.localStream);
        }
      }

      this.facingMode = nextMode;
      this.isVideoDisabled = false;

      if (this.onLocalStream && this.localStream) {
        this.onLocalStream(this.localStream);
      }

      return this.facingMode;
    } catch (err) {
      console.warn('Exact facingMode failed, checking enumerated video devices:', err);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length > 1) {
          const currentId = this.localStream?.getVideoTracks()[0]?.getSettings()?.deviceId;
          const otherDevice = videoDevices.find((d) => d.deviceId !== currentId) || videoDevices[1];
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: otherDevice.deviceId } },
            audio: false,
          });
          const newTrack = stream.getVideoTracks()[0];
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach((t) => {
              t.stop();
              this.localStream?.removeTrack(t);
            });
            this.localStream.addTrack(newTrack);
          }
          if (this.peerConnection) {
            const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            }
          }
          this.facingMode = nextMode;
          this.isVideoDisabled = false;
          if (this.onLocalStream && this.localStream) {
            this.onLocalStream(this.localStream);
          }
          return this.facingMode;
        }
      } catch (e) {
        console.error('Camera fallback enumerate failed:', e);
      }
      throw err;
    }
  }

  /**
   * Switch Audio Call to Video Call
   */
  public async switchToVideo(): Promise<void> {
    if (this.isScreenSharing) return;

    try {
      let videoTrack = this.localStream?.getVideoTracks().find((t) => t.readyState === 'live');
      if (!videoTrack) {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        videoTrack = camStream.getVideoTracks()[0];
        if (this.localStream) {
          this.localStream.addTrack(videoTrack);
        } else {
          this.localStream = camStream;
        }
      }

      videoTrack.enabled = true;
      this.isVideoDisabled = false;

      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          this.peerConnection.addTrack(videoTrack, this.localStream!);
        }
      }

      if (this.callId) {
        const field = this.isCaller ? 'callerVideoOff' : 'calleeVideoOff';
        await updateDoc(doc(db, 'calls', this.callId), {
          type: 'video',
          [field]: false,
        }).catch(console.error);
      }

      if (this.onLocalStream && this.localStream) {
        this.onLocalStream(this.localStream);
      }
    } catch (err) {
      console.error('Failed to switch to video:', err);
      throw err;
    }
  }

  /**
   * Switch Video Call to Audio Call
   */
  public async switchToAudio(): Promise<void> {
    if (this.isScreenSharing) {
      await this.toggleScreenShare();
    }

    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        this.localStream?.removeTrack(track);
      });
    }

    this.isVideoDisabled = true;

    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        try {
          await sender.replaceTrack(null);
        } catch (e) {
          console.warn('Replace track with null warning:', e);
        }
      }
    }

    if (this.callId) {
      const field = this.isCaller ? 'callerVideoOff' : 'calleeVideoOff';
      await updateDoc(doc(db, 'calls', this.callId), {
        type: 'voice',
        [field]: true,
      }).catch(console.error);
    }

    if (this.onLocalStream && this.localStream) {
      this.onLocalStream(this.localStream);
    }
  }

  public async endCall(explicitDuration?: number): Promise<void> {
    if (this.callId) {
      try {
        const computedDuration =
          explicitDuration !== undefined
            ? explicitDuration
            : this.connectedTimestamp
            ? Math.max(0, Math.floor((Date.now() - this.connectedTimestamp) / 1000))
            : 0;

        const isUnanswered = this.currentStatus === 'ringing';
        const finalStatus: CallStatus = isUnanswered
          ? this.isCaller
            ? 'missed'
            : 'rejected'
          : 'ended';

        await updateDoc(doc(db, 'calls', this.callId), {
          status: finalStatus,
          endedAt: serverTimestamp(),
          durationSeconds: computedDuration,
        });
      } catch (e) {
        console.error('Error ending call doc:', e);
      }
    }
    this.cleanup();
    this.onEnded();
  }

  public cleanup(): void {
    if (this.unsubscribeDoc) {
      this.unsubscribeDoc();
      this.unsubscribeDoc = null;
    }

    if (this.simulatedScreenCleanup) {
      this.simulatedScreenCleanup();
      this.simulatedScreenCleanup = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callId = null;
    this.isMuted = false;
    this.isVideoDisabled = false;
    this.isScreenSharing = false;
    this.isSimulatedScreen = false;
    this.lastScreenShareNotice = null;
  }
}

export function subscribeToIncomingCalls(
  currentUserId: string,
  onIncomingCall: (call: CallSession | null) => void
): () => void {
  const q = query(
    collection(db, 'calls'),
    where('calleeId', '==', currentUserId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const ringingCalls = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as CallSession) }))
          .filter((c) => c.status === 'ringing');

        if (ringingCalls.length > 0) {
          ringingCalls.sort((a, b) => {
            const timeA = (a.createdAt as any)?.toMillis?.() || 0;
            const timeB = (b.createdAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
          });
          onIncomingCall(ringingCalls[0]);
          return;
        }
      }
      onIncomingCall(null);
    },
    (err) => {
      console.error('Error listening to incoming calls:', err);
    }
  );
}

export async function rejectCall(callId: string): Promise<void> {
  await updateDoc(doc(db, 'calls', callId), {
    status: 'rejected',
    endedAt: serverTimestamp(),
  });
}

export const declineCall = rejectCall;

export const answerCall = async (callId: string) => {
  await updateDoc(doc(db, 'calls', callId), {
    status: 'accepted',
    connectedAt: serverTimestamp(),
  });
};

/**
 * Real-time subscription to call logs/history for a given user.
 * Listens for all calls where the user was caller or callee.
 */
export function subscribeToCallHistory(
  userId: string,
  onCallsUpdate: (calls: CallSession[]) => void
): () => void {
  const callsMap = new Map<string, CallSession>();

  const emit = () => {
    const list = Array.from(callsMap.values());
    list.sort((a, b) => {
      const timeA =
        (a.createdAt as any)?.toMillis?.() ||
        (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ||
        0;
      const timeB =
        (b.createdAt as any)?.toMillis?.() ||
        (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ||
        0;
      return timeB - timeA;
    });
    onCallsUpdate(list);
  };

  const qCaller = query(collection(db, 'calls'), where('callerId', '==', userId));
  const qCallee = query(collection(db, 'calls'), where('calleeId', '==', userId));

  const unsub1 = onSnapshot(
    qCaller,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          callsMap.delete(change.doc.id);
        } else {
          callsMap.set(change.doc.id, { id: change.doc.id, ...(change.doc.data() as CallSession) });
        }
      });
      emit();
    },
    (err) => console.warn('Caller history snapshot error:', err)
  );

  const unsub2 = onSnapshot(
    qCallee,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          callsMap.delete(change.doc.id);
        } else {
          callsMap.set(change.doc.id, { id: change.doc.id, ...(change.doc.data() as CallSession) });
        }
      });
      emit();
    },
    (err) => console.warn('Callee history snapshot error:', err)
  );

  return () => {
    unsub1();
    unsub2();
  };
}

/**
 * Removes a call log entry from the user's view by recording their user ID in deletedForUsers
 */
export async function deleteCallLog(callId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'calls', callId), {
    deletedForUsers: arrayUnion(userId),
  });
}

/**
 * Clears all call history for the user
 */
export async function clearCallHistory(userId: string, callIds: string[]): Promise<void> {
  const promises = callIds.map((id) =>
    updateDoc(doc(db, 'calls', id), {
      deletedForUsers: arrayUnion(userId),
    }).catch((e) => console.warn(`Failed to mark call ${id} as deleted:`, e))
  );
  await Promise.all(promises);
}



