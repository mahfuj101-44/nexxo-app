import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound, X, Check, ShieldCheck } from 'lucide-react';
import { NexxoUser } from '../../types';

interface PrivateChatLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: NexxoUser;
  isCurrentlyLocked: boolean;
  onSetLock: (pin: string) => void;
  onRemoveLock: () => void;
  appPasscode?: string | null;
}

export const PrivateChatLockModal: React.FC<PrivateChatLockModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  isCurrentlyLocked,
  onSetLock,
  onRemoveLock,
  appPasscode,
}) => {
  const [mode, setMode] = useState<'options' | 'set_custom' | 'confirm_unlock'>('options');
  const [customPin, setCustomPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseAppPasscode = () => {
    if (!appPasscode) {
      setError('No App Lock PIN found. Please enter a custom 4-digit PIN for this chat.');
      setMode('set_custom');
      return;
    }
    onSetLock(appPasscode);
    onClose();
  };

  const handleSaveCustomPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPin.length !== 4 || !/^\d{4}$/.test(customPin)) {
      setError('Chat PIN must be exactly 4 digits.');
      return;
    }
    if (customPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    onSetLock(customPin);
    setCustomPin('');
    setConfirmPin('');
    setError(null);
    onClose();
  };

  const handleConfirmUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPin) {
      setError('Please enter the PIN.');
      return;
    }

    // Verify stored PIN from localStorage
    try {
      const stored =
        localStorage.getItem(`nexxo_chat_lock_${partnerUser.id}`) ||
        localStorage.getItem('nexxo_app_lock_pin');
      if (stored && stored !== unlockPin) {
        setError('Incorrect PIN for this chat.');
        return;
      }
    } catch {
      // fallback
    }

    onRemoveLock();
    setUnlockPin('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isCurrentlyLocked ? 'Chat Lock Settings' : 'Lock Chat with PIN'}
              </h3>
              <p className="text-[11px] text-slate-500">
                @{partnerUser.username || partnerUser.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Option 1: Currently Locked -> Unlock or Change */}
        {isCurrentlyLocked && mode === 'options' && (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-indigo-950 dark:text-indigo-200">
                  This chat is currently locked
                </p>
                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/70">
                  Messages from @{partnerUser.username} require a PIN to view and open.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('confirm_unlock');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock & Remove PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('set_custom');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Chat PIN</span>
              </button>
            </div>
          </div>
        )}

        {/* Option 2: Not currently locked -> Set PIN */}
        {!isCurrentlyLocked && mode === 'options' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Locking this private chat keeps your conversation with <span className="font-semibold text-slate-800 dark:text-slate-200">{partnerUser.displayName}</span> hidden and protected behind a 4-digit PIN.
            </p>

            <div className="space-y-2.5">
              {appPasscode && (
                <button
                  type="button"
                  onClick={handleUseAppPasscode}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Use App Lock Passcode
                      </p>
                      <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/70">
                        Same 4-digit PIN as your main app lock
                      </p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('set_custom');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Set Custom Chat PIN
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Create a unique 4-digit passcode for this chat
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Custom PIN Form */}
        {mode === 'set_custom' && (
          <form onSubmit={handleSaveCustomPin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={customPin.length !== 4 || confirmPin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Lock Chat
              </button>
            </div>
          </form>
        )}

        {/* Confirm Unlock Form */}
        {mode === 'confirm_unlock' && (
          <form onSubmit={handleConfirmUnlock} className="mt-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Enter the current 4-digit PIN to unlock this conversation.
            </p>
            <div>
              <input
                type="password"
                maxLength={4}
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={unlockPin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Unlock
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
