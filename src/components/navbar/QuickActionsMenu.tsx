import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellOff,
  Moon,
  Sun,
  Check,
  Zap,
  Clock,
  VolumeX,
  Volume2,
  Copy,
  Lock,
  Sparkles,
  X,
  Smile,
  Circle,
  AlertCircle,
  Shield,
  EyeOff
} from 'lucide-react';
import { NexxoUser, PresenceStatus } from '../../types';
import {
  isDndActive,
  getDndState,
  setDndMode,
  subscribeToDnd,
  formatDndLabel,
  DndState,
} from '../../lib/dndService';
import { setUserPresence, setUserCustomStatus } from '../../lib/userService';

interface QuickActionsMenuProps {
  currentUser: NexxoUser | null;
  isOpen: boolean;
  onClose: () => void;
  onLockApp?: () => void;
  onOpenVault?: () => void;
  onOpenAi?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

const PRESENCE_OPTIONS: {
  id: PresenceStatus;
  label: string;
  sublabel: string;
  dotColor: string;
  badgeBg: string;
  borderColor: string;
}[] = [
  {
    id: 'online',
    label: 'Online',
    sublabel: 'Available to chat and connect',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'away',
    label: 'Away',
    sublabel: 'Stepped away temporarily',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'busy',
    label: 'Busy',
    sublabel: 'Focused on work or in a call',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'dnd',
    label: 'Do Not Disturb',
    sublabel: 'Mute sounds & suppress interruptions',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'offline',
    label: 'Invisible',
    sublabel: 'Appear offline to connections',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-500/30',
  },
];

const DND_PRESETS = [
  { label: 'Until turned off', minutes: null },
  { label: '30 mins', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '8 hours', minutes: 480 },
];

const QUICK_STATUS_PRESETS = [
  { emoji: '💻', text: 'Deep Work' },
  { emoji: '📞', text: 'In a Call' },
  { emoji: '☕', text: 'Coffee Break' },
  { emoji: '🎧', text: 'In the Zone' },
  { emoji: '🚀', text: 'Launching' },
];

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  currentUser,
  isOpen,
  onClose,
  onLockApp,
  onOpenVault,
  onOpenAi,
  onShowToast,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [dndState, setDndState] = useState<DndState>(getDndState());
  const [isUpdatingPresence, setIsUpdatingPresence] = useState(false);
  const [isUpdatingDnd, setIsUpdatingDnd] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState(
    currentUser?.settings?.customStatusText || ''
  );
  const [showStatusInput, setShowStatusInput] = useState(false);

  // Subscribe to real-time DND state
  useEffect(() => {
    const unsub = subscribeToDnd((state) => {
      setDndState(state);
    });
    return () => unsub();
  }, []);

  // Sync custom status input when user settings change
  useEffect(() => {
    if (currentUser?.settings?.customStatusText) {
      setCustomStatusInput(currentUser.settings.customStatusText);
    }
  }, [currentUser?.settings?.customStatusText]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPresence: PresenceStatus = currentUser?.presence || 'online';

  // Toggle Do Not Disturb
  const handleToggleDnd = async (enable: boolean, durationMinutes?: number | null) => {
    if (!currentUser) return;
    setIsUpdatingDnd(true);
    try {
      const updated = await setDndMode(enable, durationMinutes, currentUser.id);
      setDndState(updated);

      // If user enabled DND, optionally reflect status as 'dnd' or 'busy'
      if (enable && currentPresence === 'online') {
        await setUserPresence(currentUser.id, 'dnd');
      } else if (!enable && currentPresence === 'dnd') {
        await setUserPresence(currentUser.id, 'online');
      }

      const msg = enable
        ? `Do Not Disturb enabled ${durationMinutes ? `for ${durationMinutes}m` : 'indefinitely'}`
        : 'Do Not Disturb turned off';
      onShowToast?.(msg, 'info');
    } catch (err) {
      console.error('Failed to toggle DND:', err);
    } finally {
      setIsUpdatingDnd(false);
    }
  };

  // Change presence status
  const handleSelectPresence = async (status: PresenceStatus) => {
    if (!currentUser || isUpdatingPresence) return;
    setIsUpdatingPresence(true);
    try {
      await setUserPresence(currentUser.id, status);

      // If choosing DND, sync DND mode too
      if (status === 'dnd' && !dndState.isActive) {
        await setDndMode(true, null, currentUser.id);
      } else if (status === 'online' && dndState.isActive) {
        // Turning online automatically relaxes DND
        await setDndMode(false, null, currentUser.id);
      }

      onShowToast?.(`Presence set to ${status.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Failed to set presence:', err);
      onShowToast?.('Failed to update status presence', 'error');
    } finally {
      setIsUpdatingPresence(false);
    }
  };

  // Set custom status preset
  const handleApplyPreset = async (preset: { emoji: string; text: string }) => {
    if (!currentUser) return;
    setCustomStatusInput(preset.text);
    try {
      await setUserCustomStatus(currentUser.id, preset.text, preset.emoji);
      onShowToast?.(`Status updated: ${preset.emoji} ${preset.text}`, 'info');
    } catch (err) {
      console.error('Failed to set status preset:', err);
    }
  };

  // Save custom status
  const handleSaveCustomStatus = async () => {
    if (!currentUser) return;
    try {
      await setUserCustomStatus(currentUser.id, customStatusInput.trim());
      setShowStatusInput(false);
      onShowToast?.('Custom status saved', 'success');
    } catch (err) {
      console.error('Failed to save status:', err);
    }
  };

  // Clear custom status
  const handleClearCustomStatus = async () => {
    if (!currentUser) return;
    setCustomStatusInput('');
    try {
      await setUserCustomStatus(currentUser.id, '', '');
      setShowStatusInput(false);
      onShowToast?.('Custom status cleared', 'info');
    } catch (err) {
      console.error('Failed to clear status:', err);
    }
  };

  // Copy permanent NEXXO ID
  const handleCopyNexxoId = () => {
    if (!currentUser?.nexxoId) return;
    navigator.clipboard.writeText(currentUser.nexxoId);
    setCopiedId(true);
    onShowToast?.(`NEXXO ID copied: ${currentUser.nexxoId}`, 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      ref={menuRef}
      id="quick-actions-dropdown"
      className="absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">Quick Actions</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Immediate presence & focus controls
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5 max-h-[calc(85vh-80px)] overflow-y-auto scrollbar-thin">
        {/* DO NOT DISTURB TOGGLE HERO CARD */}
        <div
          id="dnd-toggle-card"
          className={`relative p-3.5 rounded-xl border transition-all ${
            dndState.isActive
              ? 'bg-purple-500/10 border-purple-500/30 dark:bg-purple-950/40 dark:border-purple-800/60'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  dndState.isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {dndState.isActive ? (
                  <BellOff className="w-5 h-5 animate-pulse" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Do Not Disturb</span>
                  {dndState.isActive && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-600 text-white uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {dndState.isActive
                    ? `Alert sounds & chimes muted (${formatDndLabel(dndState.until)})`
                    : 'Mute sounds, chimes, and interruptions'}
                </p>
              </div>
            </div>

            {/* Immediate On/Off Switch */}
            <button
              id="dnd-toggle-switch"
              type="button"
              disabled={isUpdatingDnd}
              onClick={() => handleToggleDnd(!dndState.isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                dndState.isActive ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={dndState.isActive}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  dndState.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* DND Duration Presets */}
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </span>
              {dndState.isActive && dndState.until && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  {formatDndLabel(dndState.until)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 text-center">
              {DND_PRESETS.map((preset) => {
                const isSelected =
                  dndState.isActive &&
                  (preset.minutes === null
                    ? !dndState.until
                    : dndState.until !== null &&
                      Math.abs(Math.round((dndState.until - Date.now()) / (60 * 1000)) - preset.minutes) < 5);

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleToggleDnd(true, preset.minutes)}
                    className={`px-1.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STATUS PRESENCE SECTION */}
        <div id="status-presence-section" className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Presence
            </span>
            <span className="text-[10px] text-slate-400">Instant Sync</span>
          </div>

          <div className="space-y-1.5">
            {PRESENCE_OPTIONS.map((opt) => {
              const isSelected = currentPresence === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`presence-btn-${opt.id}`}
                  type="button"
                  disabled={isUpdatingPresence}
                  onClick={() => handleSelectPresence(opt.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500/40 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      {isSelected && opt.id === 'online' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${opt.dotColor}`} />
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        {opt.id === 'dnd' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                            Muted
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {opt.sublabel}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUICK STATUS NOTE OR PRESETS */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Status Note
            </span>
            <button
              onClick={() => setShowStatusInput(!showStatusInput)}
              className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showStatusInput ? 'Done' : 'Edit note'}
            </button>
          </div>

          {/* Preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STATUS_PRESETS.map((preset) => (
              <button
                key={preset.text}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <span>{preset.emoji}</span>
                <span>{preset.text}</span>
              </button>
            ))}
          </div>

          {/* Status Note Input */}
          {(showStatusInput || currentUser?.settings?.customStatusText) && (
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customStatusInput}
                  onChange={(e) => setCustomStatusInput(e.target.value)}
                  placeholder="What are you up to? (e.g. In a design sprint)"
                  maxLength={60}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomStatus}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Save
                </button>
                {customStatusInput && (
                  <button
                    type="button"
                    onClick={handleClearCustomStatus}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Clear status note"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QUICK SHORTCUTS ROW */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          {/* Copy NEXXO ID */}
          <button
            id="quick-copy-id-btn"
            type="button"
            onClick={handleCopyNexxoId}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium text-[11px]"
            title="Copy your Permanent NEXXO ID"
          >
            {copiedId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{currentUser?.nexxoId || 'Copy ID'}</span>
              </>
            )}
          </button>

          {/* Quick Lock App */}
          {onLockApp && (
            <button
              id="quick-lock-btn"
              type="button"
              onClick={() => {
                onClose();
                onLockApp();
              }}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium text-[11px]"
              title="Lock NEXXO App"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Lock</span>
            </button>
          )}

          {/* Quick AI shortcut */}
          {onOpenAi && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAi();
              }}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer font-semibold text-[11px]"
              title="Open AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
