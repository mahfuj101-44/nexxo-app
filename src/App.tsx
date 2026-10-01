import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { syncOrRegisterUser, updateUserProfile } from './lib/userService';
import {
  subscribeToConnections,
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
} from './lib/connectionService';
import { subscribeToUserChats } from './lib/chatService';
import { subscribeToPlatformSettings, isUserAuthorizedAdmin } from './lib/adminService';
import { subscribeToIncomingCalls, CallController, declineCall, subscribeToCallHistory } from './lib/callService';
import { subscribeToNotifications, playNotificationChime } from './lib/notificationService';
import { syncDndWithUserSettings } from './lib/dndService';
import { isUserBlocked } from './lib/safetyService';
import { canMakeCallTo } from './lib/privacyService';
import { usePresence } from './hooks/usePresence';
import {
  loadInitialThemeMode,
  persistThemeMode,
  applyThemeToDocument,
  getNextThemeMode,
  resolveEffectiveTheme,
  THEME_OPTIONS,
} from './lib/themeService';
import {
  ActiveTab,
  NexxoUser,
  Connection,
  ConnectionRequest,
  Chat,
  PlatformSettings,
  CallSession,
  AppNotification,
  ReportTargetType,
  AutoLockTimeout,
  AppThemeMode,
} from './types';

// Core Components
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatsView } from './components/ChatsView';
import { SearchView } from './components/SearchView';
import { ConnectionsView } from './components/ConnectionsView';
import { RequestsView } from './components/RequestsView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { NexxoLogo } from './components/NexxoLogo';

// Stage 3 Advanced Components
import { GroupsView } from './components/groups/GroupsView';
import { StoriesView } from './components/stories/StoriesView';
import { StoryBar } from './components/stories/StoryBar';
import { ChannelsView } from './components/channels/ChannelsView';
import { CommunitiesView } from './components/communities/CommunitiesView';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { CallOverlay } from './components/call/CallOverlay';
import { CallsView } from './components/call/CallsView';
import { QrModal } from './components/qr/QrModal';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';
import { ReportModal } from './components/safety/ReportModal';
import { GlobalMusicPlayer } from './components/music/GlobalMusicPlayer';
import { UserMediaLibraryModal } from './components/media/UserMediaLibraryModal';
import { LockScreenOverlay } from './components/profile/LockScreenOverlay';
import { FloatingHelpButton } from './components/common/FloatingHelpButton';
import { ErrorBoundary } from './components/ErrorBoundary';

import { ShieldAlert, Wrench, WifiOff } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { initAndroidBridge, updateNativeStatusBar } from './lib/androidBridge';

export default function App() {
  // Global Auth & Profile State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<NexxoUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Platform & Settings
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [themeMode, setThemeMode] = useState<AppThemeMode>(() => loadInitialThemeMode());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark' | 'high-contrast'>(() =>
    resolveEffectiveTheme(loadInitialThemeMode())
  );

  // Apply theme to document with smooth transitions and track system preference
  useEffect(() => {
    const active = applyThemeToDocument(themeMode, true);
    setEffectiveTheme(active);
    persistThemeMode(themeMode);

    // If system theme is selected, listen for OS dark/light mode changes in real-time
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        const resolved = applyThemeToDocument('system', true);
        setEffectiveTheme(resolved);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.addListener(handleSystemThemeChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        } else {
          mediaQuery.removeListener(handleSystemThemeChange);
        }
      };
    }
  }, [themeMode]);

  // Sync theme preference from authenticated user profile if saved
  useEffect(() => {
    if (currentUser?.settings?.themeMode && currentUser.settings.themeMode !== themeMode) {
      setThemeMode(currentUser.settings.themeMode);
    }
  }, [currentUser?.id, currentUser?.settings?.themeMode]);

  // Navigation & Active Selections
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');
  const [activeChatUser, setActiveChatUser] = useState<NexxoUser | null>(null);
  const [activeGroupChat, setActiveGroupChat] = useState<Chat | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const tabHistoryRef = useRef<ActiveTab[]>(['chats']);

  // Online / Offline Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true;
  });

  const handleNavigateToTab = (newTab: ActiveTab) => {
    setActiveTab((prevTab) => {
      if (prevTab !== newTab) {
        tabHistoryRef.current.push(prevTab);
        if (tabHistoryRef.current.length > 20) {
          tabHistoryRef.current.shift();
        }
      }
      return newTab;
    });
    if (newTab !== 'chats') {
      setActiveChatUser(null);
      setActiveGroupChat(null);
    }
  };

  const isConversationActiveOnMobile = activeTab === 'chats' && Boolean(activeChatUser || activeGroupChat);

  // Real-Time Datasets
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<NexxoUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const connectionUserIdsRef = useRef<string[]>([]);

  // Stage 3: Real-Time WebRTC Calling State
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callController, setCallController] = useState<CallController | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [missedCallsCount, setMissedCallsCount] = useState<number>(0);

  // Stage 3: Feature Modals State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [reportModal, setReportModal] = useState<{
    targetType: ReportTargetType;
    targetId: string;
    targetName?: string;
  } | null>(null);
  const [appToast, setAppToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  // App Lock Passcode State
  const [appPasscode, setAppPasscode] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexxo_app_lock_pin');
    } catch {
      return null;
    }
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('nexxo_app_lock_pin'));
    } catch {
      return false;
    }
  });

  // Auto-Lock Timeout Configuration State
  const [autoLockTimeout, setAutoLockTimeout] = useState<AutoLockTimeout>(() => {
    try {
      const saved = localStorage.getItem('nexxo_auto_lock_timeout');
      if (saved && ['backgrounded', '1m', '5m', '15m', '30m', 'never'].includes(saved)) {
        return saved as AutoLockTimeout;
      }
    } catch {
      // fallback
    }
    return 'backgrounded';
  });

  const lastActivityRef = useRef<number>(Date.now());
  const backgroundedAtRef = useRef<number | null>(null);

  // Keep real-time back button state reference for Android hardware back button
  const backStateRef = useRef({
    isMobileNavOpen,
    isQrModalOpen,
    isAiAssistantOpen,
    isMediaLibraryOpen,
    reportModal,
    activeChatUser,
    activeGroupChat,
    activeGroupId,
    activeTab
  });

  useEffect(() => {
    backStateRef.current = {
      isMobileNavOpen,
      isQrModalOpen,
      isAiAssistantOpen,
      isMediaLibraryOpen,
      reportModal,
      activeChatUser,
      activeGroupChat,
      activeGroupId,
      activeTab
    };
  }, [
    isMobileNavOpen,
    isQrModalOpen,
    isAiAssistantOpen,
    isMediaLibraryOpen,
    reportModal,
    activeChatUser,
    activeGroupChat,
    activeGroupId,
    activeTab
  ]);

  // Synchronize Android native status bar with active theme
  useEffect(() => {
    updateNativeStatusBar(effectiveTheme === 'dark');
  }, [effectiveTheme]);

  // Initialize Android Bridge, Hardware Back Button, and Network listeners
  useEffect(() => {
    // 1. Hardware Back Button & System Links
    initAndroidBridge({
      onExitWarning: (msg) => showToast(msg, 'info'),
      onDefaultBack: () => {
        const s = backStateRef.current;
        // Priority 1: Modals & Drawers
        if (s.isMobileNavOpen) {
          setIsMobileNavOpen(false);
          return true;
        }
        if (s.isQrModalOpen) {
          setIsQrModalOpen(false);
          return true;
        }
        if (s.isAiAssistantOpen) {
          setIsAiAssistantOpen(false);
          return true;
        }
        if (s.isMediaLibraryOpen) {
          setIsMediaLibraryOpen(false);
          return true;
        }
        if (s.reportModal) {
          setReportModal(null);
          return true;
        }

        // Priority 2: In-conversation view
        if (s.activeChatUser || s.activeGroupChat) {
          setActiveChatUser(null);
          setActiveGroupChat(null);
          return true;
        }

        // Priority 3: Subgroup detail
        if (s.activeGroupId) {
          setActiveGroupId(null);
          return true;
        }

        // Priority 4: Tab history
        if (tabHistoryRef.current.length > 0) {
          const prev = tabHistoryRef.current.pop();
          if (prev && prev !== s.activeTab) {
            setActiveTab(prev);
            return true;
          }
        }

        // Priority 5: Return to chats tab if on secondary screen
        if (s.activeTab !== 'chats') {
          setActiveTab('chats');
          return true;
        }

        // At root screen
        return false;
      }
    });

    // 2. Online / Offline Network Monitoring
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Internet connection restored.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Live features will sync once connected.', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Complete any pending redirect sign-in from WebView
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch((err) => {
        console.debug('Firebase redirect auth check:', err);
      });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync autoLockTimeout from user profile settings when loaded
  useEffect(() => {
    if (currentUser?.settings?.autoLockTimeout) {
      setAutoLockTimeout(currentUser.settings.autoLockTimeout);
      try {
        localStorage.setItem('nexxo_auto_lock_timeout', currentUser.settings.autoLockTimeout);
      } catch {}
    }
  }, [currentUser?.settings?.autoLockTimeout]);

  const handleAutoLockTimeoutChange = (newTimeout: AutoLockTimeout) => {
    setAutoLockTimeout(newTimeout);
    try {
      localStorage.setItem('nexxo_auto_lock_timeout', newTimeout);
    } catch (e) {
      console.error('Failed to update auto lock timeout storage', e);
    }
  };

  const handlePasscodeChange = (newPin: string | null) => {
    setAppPasscode(newPin);
    try {
      if (newPin) {
        localStorage.setItem('nexxo_app_lock_pin', newPin);
        setIsAppLocked(false); // keep unlocked right after setting
        lastActivityRef.current = Date.now();
      } else {
        localStorage.removeItem('nexxo_app_lock_pin');
        setIsAppLocked(false);
      }
    } catch (e) {
      console.error('Failed to update app lock passcode storage', e);
    }
  };

  // Helper to calculate auto-lock duration in milliseconds
  const getAutoLockDurationMs = (timeout: AutoLockTimeout): number | null => {
    switch (timeout) {
      case '1m':
        return 1 * 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '15m':
        return 15 * 60 * 1000;
      case '30m':
        return 30 * 60 * 1000;
      default:
        return null;
    }
  };

  // Activity tracking for user interaction (mouse, touch, keydown, scroll)
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    let lastMoveTime = 0;
    const onThrottledMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveTime > 1500) {
        lastMoveTime = now;
        lastActivityRef.current = now;
      }
    };

    window.addEventListener('mousedown', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    window.addEventListener('scroll', markActive, { passive: true });
    window.addEventListener('mousemove', onThrottledMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousedown', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('touchstart', markActive);
      window.removeEventListener('scroll', markActive);
      window.removeEventListener('mousemove', onThrottledMouseMove);
    };
  }, []);

  // Backgrounded / Tab switch tracking
  useEffect(() => {
    if (!appPasscode) return;

    const handleVisibilityChange = () => {
      if (!appPasscode) return;

      if (document.hidden) {
        backgroundedAtRef.current = Date.now();
        if (autoLockTimeout === 'backgrounded') {
          setIsAppLocked(true);
        }
      } else {
        // App returned to foreground
        if (autoLockTimeout === 'backgrounded') {
          setIsAppLocked(true);
        } else if (autoLockTimeout !== 'never') {
          const duration = getAutoLockDurationMs(autoLockTimeout);
          if (duration !== null) {
            const now = Date.now();
            const inactiveForeground = now - lastActivityRef.current;
            const inactiveBackground = backgroundedAtRef.current ? now - backgroundedAtRef.current : 0;
            if (inactiveForeground >= duration || inactiveBackground >= duration) {
              setIsAppLocked(true);
            }
          }
        }
        backgroundedAtRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appPasscode, autoLockTimeout]);

  // Periodic Idle Checker for timed auto-lock (1m, 5m, 15m, 30m)
  useEffect(() => {
    if (!appPasscode || isAppLocked || autoLockTimeout === 'never' || autoLockTimeout === 'backgrounded') {
      return;
    }

    const duration = getAutoLockDurationMs(autoLockTimeout);
    if (!duration) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= duration) {
        setIsAppLocked(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [appPasscode, isAppLocked, autoLockTimeout]);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAppToast({ message, type });
    setTimeout(() => {
      setAppToast(null);
    }, 4000);
  };

  // Track live user presence (online/away/offline)
  usePresence(currentUser?.id);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUser(null);
        setAuthLoading(false);
      } else {
        try {
          const profile = await syncOrRegisterUser(user);
          setCurrentUser(profile);
        } catch (err: any) {
          console.error('User initialization failed:', err);
          setInitError(err.message || 'Failed to initialize your NEXXO account.');
        } finally {
          setAuthLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization of current user profile
  useEffect(() => {
    if (!firebaseUser) return;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data() as NexxoUser;
        setCurrentUser(userData);
        syncDndWithUserSettings(userData.settings);
      }
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // Real-time Platform Settings
  useEffect(() => {
    const unsub = subscribeToPlatformSettings((settings) => {
      setPlatformSettings(settings);
    });
    return () => unsub();
  }, []);

  // Real-time Subscriptions when logged in
  useEffect(() => {
    if (!currentUser) {
      setConnections([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setChats([]);
      setNotifications([]);
      return;
    }

    const unsubConns = subscribeToConnections(currentUser.id, setConnections);
    const unsubInReqs = subscribeToIncomingRequests(currentUser.id, setIncomingRequests);
    const unsubOutReqs = subscribeToOutgoingRequests(currentUser.id, setOutgoingRequests);
    const unsubChats = subscribeToUserChats(currentUser.id, setChats);
    const unsubNotifs = subscribeToNotifications(currentUser.id, (list) => {
      setNotifications(list);
    });

    // WebRTC Calls listener
    const unsubCalls = subscribeToIncomingCalls(currentUser.id, async (call) => {
      if (call) {
        try {
          const isBlocked = await isUserBlocked(currentUser.id, call.callerId);
          const isConnected = connectionUserIdsRef.current.includes(call.callerId);
          const allowCalls = currentUser.settings?.allowCallsFrom || 'everyone';

          if (isBlocked || allowCalls === 'nobody' || (allowCalls === 'connections' && !isConnected)) {
            // Auto-decline call due to privacy settings or block status
            declineCall(call.id).catch(() => {});
            return;
          }
        } catch {
          // Fall through to alert call if check fails
        }

        playNotificationChime();
        setIncomingCall(call);
      } else {
        setIncomingCall(null);
      }
    });

    // Real-time call history to track missed calls count badge
    const unsubCallHistory = subscribeToCallHistory(currentUser.id, (callList) => {
      const missed = callList.filter((c) => {
        if (c.deletedForUsers?.includes(currentUser.id)) return false;
        const isCaller = c.callerId === currentUser.id;
        return c.status === 'missed' || (!isCaller && c.status === 'rejected');
      });
      setMissedCallsCount(missed.length);
    });

    return () => {
      unsubConns();
      unsubInReqs();
      unsubOutReqs();
      unsubChats();
      unsubNotifs();
      unsubCalls();
      unsubCallHistory();
    };
  }, [currentUser?.id]);

  // Derive connection user IDs & hydrate full profiles (filtering out blocked users)
  const connectionUserIds = useMemo(() => {
    if (!currentUser) return [];
    const ids = new Set<string>();
    for (const c of connections) {
      if (c?.status !== 'connected') continue;
      const otherId = (Array.isArray(c.users) ? c.users.find((u) => u && u !== currentUser.id) : null)
        || (c.user1Id && c.user1Id !== currentUser.id ? c.user1Id : null)
        || (c.user2Id && c.user2Id !== currentUser.id ? c.user2Id : null);
      if (otherId) ids.add(otherId);
    }
    const arr = Array.from(ids);
    connectionUserIdsRef.current = arr;
    return arr;
  }, [connections, currentUser?.id]);

  useEffect(() => {
    if (connectionUserIds.length === 0) {
      setConnectedUsers([]);
      return;
    }

    let isMounted = true;
    async function loadConnectedProfiles() {
      const list: NexxoUser[] = [];
      for (const uid of connectionUserIds) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            list.push(snap.data() as NexxoUser);
          }
        } catch (e) {
          console.error('Error fetching connection profile:', e);
        }
      }
      if (isMounted) {
        setConnectedUsers(list);
      }
    }

    loadConnectedProfiles();
    return () => {
      isMounted = false;
    };
  }, [connections.length, currentUser?.id]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = getNextThemeMode(prev);
      const opt = THEME_OPTIONS.find((t) => t.id === next);
      if (opt) {
        showToast(`Theme: ${opt.title}`, 'info');
      }
      return next;
    });
  };

  const handleSelectThemeMode = (newMode: AppThemeMode) => {
    setThemeMode(newMode);
    const opt = THEME_OPTIONS.find((t) => t.id === newMode);
    if (opt) {
      showToast(`Theme switched to ${opt.title}`, 'info');
    }
    if (currentUser?.id) {
      updateUserProfile(currentUser.id, {
        settings: {
          ...currentUser.settings,
          themeMode: newMode,
        },
      }).catch((err) => console.warn('Could not save theme preference to profile', err));
    }
  };

  // Helper to jump directly to chat with a user
  const handleOpenChatWithUser = (targetUser: NexxoUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('chats');
  };

  // WebRTC Call actions
  const handleStartCall = async (type: 'voice' | 'video', targetUser: NexxoUser) => {
    if (!currentUser) return;
    try {
      const blocked = await isUserBlocked(currentUser.id, targetUser.id);
      if (blocked) {
        showToast('Cannot initiate a call with a blocked user. Please unblock them first.', 'error');
        return;
      }

      const isConnected = connectionUserIds.includes(targetUser.id);
      if (!canMakeCallTo(currentUser, targetUser, isConnected)) {
        showToast(
          targetUser.settings?.allowCallsFrom === 'nobody'
            ? `${targetUser.displayName} does not accept incoming calls.`
            : `${targetUser.displayName}'s privacy settings only allow calls from connections.`,
          'info'
        );
        return;
      }
      const controller = new CallController(
        (stream) => setRemoteStream(stream),
        (session) => setActiveCall(session),
        (reason?: string) => {
          setActiveCall(null);
          setCallController(null);
          setRemoteStream(null);
          setLocalStream(null);
          if (reason) {
            showToast(reason, 'info');
          }
        },
        (lStream) => setLocalStream(lStream)
      );
      setCallController(controller);
      const callId = await controller.initiateCall(currentUser, targetUser, type);
      const initialSession: CallSession = {
        id: callId,
        callerId: currentUser.id,
        callerName: currentUser.displayName || currentUser.username,
        callerPhoto: currentUser.photoURL || '',
        callerNexxoId: currentUser.nexxoId,
        calleeId: targetUser.id,
        calleeName: targetUser.displayName || targetUser.username,
        calleePhoto: targetUser.photoURL || '',
        type,
        status: 'ringing',
        callerCandidates: [],
        calleeCandidates: [],
        callerMuted: false,
        calleeMuted: false,
        callerVideoOff: false,
        calleeVideoOff: false,
        createdAt: null,
      };
      setActiveCall(initialSession);
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate call.', 'error');
      setCallController(null);
      setActiveCall(null);
      setLocalStream(null);
      setRemoteStream(null);
    }
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      const sessionToAnswer = incomingCall;
      setIncomingCall(null);
      const controller = new CallController(
        (stream) => setRemoteStream(stream),
        (session) => setActiveCall(session),
        (reason?: string) => {
          setActiveCall(null);
          setCallController(null);
          setRemoteStream(null);
          setLocalStream(null);
          if (reason) {
            showToast(reason, 'info');
          }
        },
        (lStream) => setLocalStream(lStream)
      );
      setCallController(controller);
      setActiveCall(sessionToAnswer);
      await controller.answerCall(sessionToAnswer);
    } catch (err: any) {
      console.error('Error answering call:', err);
      showToast('Unable to connect call: ' + (err.message || ''), 'error');
      setActiveCall(null);
      setCallController(null);
      setLocalStream(null);
      setRemoteStream(null);
    }
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    await declineCall(incomingCall.id);
    setIncomingCall(null);
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors">
        <NexxoLogo size="lg" />
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
            Connecting to Real-Time Communication Network...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!firebaseUser || !currentUser) {
    return <AuthScreen onAuthSuccess={() => setAuthLoading(true)} platformSettings={platformSettings} />;
  }

  // Account Suspended
  if (currentUser.status === 'suspended') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 text-center space-y-4 shadow-xl dark:shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Suspended</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your NEXXO account (@{currentUser.username} &bull; {currentUser.nexxoId}) has been suspended by an administrator. Please contact system support for assistance.
          </p>
          <button
            onClick={() => auth.signOut()}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Check Maintenance Mode
  const isAdmin = isUserAuthorizedAdmin(currentUser);
  if (platformSettings?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 text-center space-y-4 shadow-xl dark:shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scheduled Maintenance</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {platformSettings.systemNotice || 'The NEXXO platform is undergoing scheduled maintenance. Please check back shortly.'}
          </p>
        </div>
      </div>
    );
  }

  // Compute total unread messages count
  const totalUnreadMessages = currentUser
    ? chats.reduce((acc, c) => acc + (c.unreadCounts?.[currentUser.id] || 0), 0)
    : 0;

  return (
    <div
      className={`h-screen h-[100dvh] flex flex-col font-sans transition-colors duration-300 overflow-hidden w-full ${
        effectiveTheme === 'high-contrast'
          ? 'dark bg-black text-white'
          : effectiveTheme === 'dark'
          ? 'dark bg-slate-950 text-slate-100'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="bg-amber-600 dark:bg-amber-700 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 z-50 sticky top-0 shadow-xs">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>You are offline. Real-time changes will automatically sync when connection returns.</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleNavigateToTab}
        pendingRequestsCount={incomingRequests.length}
        notifications={notifications}
        themeMode={themeMode}
        onSelectThemeMode={handleSelectThemeMode}
        toggleTheme={toggleTheme}
        systemNotice={platformSettings?.systemNotice}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        platformSettings={platformSettings}
        appPasscode={appPasscode}
        onLockApp={() => setIsAppLocked(true)}
        onShowToast={showToast}
        onOpenMobileMenu={() => setIsMobileNavOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateToTab}
          currentUser={currentUser}
          pendingRequestsCount={incomingRequests.length}
          connectionsCount={connections.length}
          chatsCount={chats.length}
          unreadChatsCount={totalUnreadMessages}
          missedCallsCount={missedCallsCount}
          platformSettings={platformSettings}
          isMobileDrawerOpen={isMobileNavOpen}
          onCloseMobileDrawer={() => setIsMobileNavOpen(false)}
          isChatActiveOnMobile={isConversationActiveOnMobile}
        />

        {/* Viewport Content */}
        <main
          className={`flex-1 flex flex-col overflow-hidden min-h-0 ${
            isConversationActiveOnMobile ? 'pb-0' : 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0'
          }`}
        >
          <ErrorBoundary key={activeTab} fallbackTitle={`Unable to load ${activeTab} view`} onReset={() => setActiveTab('chats')}>
            {activeTab === 'chats' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Ephemeral Status & Stories Bar - hidden on mobile when a chat is open so the conversation is never clipped */}
              {!isConversationActiveOnMobile && (
                <StoryBar
                  currentUser={currentUser}
                  connectionUserIds={connectionUserIds}
                  onOpenStoriesView={() => setActiveTab('stories')}
                />
              )}
              <div className="flex-1 overflow-hidden">
                <ChatsView
                  currentUser={currentUser}
                  chats={chats}
                  activeChatUser={activeChatUser}
                  setActiveChatUser={setActiveChatUser}
                  activeGroupChat={activeGroupChat}
                  setActiveGroupChat={setActiveGroupChat}
                  onNavigateToSearch={() => setActiveTab('search')}
                  onStartCall={(type, user) => handleStartCall(type, user)}
                  onOpenReport={(type, id, name) =>
                    setReportModal({ targetType: type, targetId: id, targetName: name })
                  }
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  appPasscode={appPasscode}
                  connectionUserIds={connectionUserIds}
                />
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <CallsView
              currentUser={currentUser}
              connections={connectedUsers}
              onStartCall={(type, user) => handleStartCall(type, user)}
              onOpenChatWithUser={handleOpenChatWithUser}
              onNavigateToSearch={() => setActiveTab('search')}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              currentUser={currentUser}
              connections={connectedUsers}
              selectedGroupId={activeGroupId}
              onSelectGroup={setActiveGroupId}
              onStartCall={(type) => {
                if (connectedUsers.length > 0) {
                  handleStartCall(type, connectedUsers[0]);
                }
              }}
              onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            />
          )}

          {activeTab === 'stories' && (
            <StoriesView
              currentUser={currentUser}
              connectionUserIds={connectionUserIds}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsView currentUser={currentUser} />
          )}

          {activeTab === 'communities' && (
            <CommunitiesView currentUser={currentUser} />
          )}

          {activeTab === 'search' && (
            <SearchView
              currentUser={currentUser}
              connections={connections}
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              onOpenChatWithUser={handleOpenChatWithUser}
            />
          )}

          {activeTab === 'connections' && (
            <ConnectionsView
              currentUser={currentUser}
              connections={connections}
              onOpenChatWithUser={handleOpenChatWithUser}
              onNavigateToSearch={() => setActiveTab('search')}
            />
          )}

          {activeTab === 'requests' && (
            <RequestsView
              currentUser={currentUser}
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              onOpenChatWithUser={handleOpenChatWithUser}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              connectionsCount={connections.length}
              onOpenQrModal={() => setIsQrModalOpen(true)}
              appPasscode={appPasscode}
              onPasscodeChange={handlePasscodeChange}
              autoLockTimeout={autoLockTimeout}
              onAutoLockTimeoutChange={handleAutoLockTimeoutChange}
              onLockNow={() => setIsAppLocked(true)}
              themeMode={themeMode}
              onThemeModeChange={handleSelectThemeMode}
            />
          )}

          {activeTab === 'admin' && <AdminView currentUser={currentUser} />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Call Modals & Overlays */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          callSession={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {activeCall && callController && (
        <CallOverlay
          controller={callController}
          session={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={() => {
            callController.endCall();
            setActiveCall(null);
            setCallController(null);
            setRemoteStream(null);
            setLocalStream(null);
          }}
        />
      )}

      {/* Global QR Code Connection Modal */}
      {isQrModalOpen && (
        <QrModal
          currentUser={currentUser}
          onClose={() => setIsQrModalOpen(false)}
          onUserConnected={(newUser) => {
            setIsQrModalOpen(false);
            handleOpenChatWithUser(newUser);
          }}
        />
      )}

      {/* Global AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />

      {/* Global Safety & Content Reporting Modal */}
      {reportModal && (
        <ReportModal
          currentUser={currentUser}
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
          targetName={reportModal.targetName}
          onClose={() => setReportModal(null)}
        />
      )}

      {/* Global User Media Library Vault */}
      {isMediaLibraryOpen && currentUser && (
        <UserMediaLibraryModal
          currentUser={currentUser}
          onClose={() => setIsMediaLibraryOpen(false)}
        />
      )}

      {/* Global Persistent Music Player */}
      <GlobalMusicPlayer />

      {/* Global Customer Support & WhatsApp Help Button */}
      {currentUser && (
        <FloatingHelpButton currentUsername={currentUser.username} />
      )}

      {/* Global In-App Toast Notification */}
      {appToast && (
        <div
          id="app-global-toast"
          className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            appToast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/80 backdrop-blur-md'
              : appToast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80 backdrop-blur-md'
              : 'bg-slate-900/90 text-slate-100 border-slate-700/80 backdrop-blur-md'
          }`}
        >
          <span>{appToast.message}</span>
          <button
            onClick={() => setAppToast(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* App Lock PIN Screen Overlay */}
      <AnimatePresence>
        {isAppLocked && appPasscode && (
          <LockScreenOverlay
            correctPasscode={appPasscode}
            userName={currentUser?.displayName}
            onUnlocked={() => {
              setIsAppLocked(false);
              lastActivityRef.current = Date.now();
              backgroundedAtRef.current = null;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
