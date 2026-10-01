import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, X, Check, ShieldAlert, Timer } from 'lucide-react';
import { AutoLockTimeout } from '../../types';

interface AppLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasscodeSet: (passcode: string | null) => void;
  currentPasscode: string | null;
  autoLockTimeout?: AutoLockTimeout;
  onAutoLockTimeoutChange?: (timeout: AutoLockTimeout) => void;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({
  isOpen,
  onClose,
  onPasscodeSet,
  currentPasscode,
  autoLockTimeout = 'backgrounded',
  onAutoLockTimeoutChange,
}) => {
  const [step, setStep] = useState<'manage' | 'set_new' | 'remove'>('manage');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode.length !== 4 || !/^\d{4}$/.test(newCode)) {
      setError('Passcode must be exactly 4 digits.');
      return;
    }
    if (newCode !== confirmCode) {
      setError('Passcodes do not match.');
      return;
    }

    onPasscodeSet(newCode);
    setNewCode('');
    setConfirmCode('');
    setError(null);
    onClose();
  };

  const handleRemovePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode !== currentPasscode) {
      setError('Incorrect current passcode.');
      return;
    }
    onPasscodeSet(null);
    setVerifyCode('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              App Lock & Passcode
            </h3>
          </div>
          <button
            onClick={() => {
              setError(null);
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {step === 'manage' && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-2.5 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                {currentPasscode ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentPasscode ? 'App Lock is Active' : 'App Lock is Off'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {currentPasscode
                  ? 'Your messenger requires a 4-digit PIN code when returning to the tab or app.'
                  : 'Protect your direct conversations, media, and private chats from anyone viewing your device.'}
              </p>
            </div>

            {currentPasscode ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Auto-Lock Timeout
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      {autoLockTimeout === 'backgrounded'
                        ? 'Backgrounded'
                        : autoLockTimeout === '1m'
                        ? '1 min'
                        : autoLockTimeout === '5m'
                        ? '5 min'
                        : autoLockTimeout === '15m'
                        ? '15 min'
                        : autoLockTimeout === '30m'
                        ? '30 min'
                        : 'Never'}
                    </span>
                  </div>
                  <select
                    id="modal-auto-lock-timeout-select"
                    value={autoLockTimeout}
                    onChange={(e) => onAutoLockTimeoutChange?.(e.target.value as AutoLockTimeout)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="backgrounded">Immediately when backgrounded / tab hidden</option>
                    <option value="1m">After 1 minute of inactivity</option>
                    <option value="5m">After 5 minutes of inactivity (Recommended)</option>
                    <option value="15m">After 15 minutes of inactivity</option>
                    <option value="30m">After 30 minutes of inactivity</option>
                    <option value="never">Never (Manual lock only)</option>
                  </select>
                </div>

                <button
                  type="button"
                  id="modal-change-passcode-btn"
                  onClick={() => {
                    setError(null);
                    setStep('set_new');
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Change Passcode
                </button>
                <button
                  type="button"
                  id="modal-turn-off-app-lock-btn"
                  onClick={() => {
                    setError(null);
                    setStep('remove');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                >
                  Turn Off App Lock
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('set_new');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Set 4-Digit Passcode</span>
              </button>
            )}
          </div>
        )}

        {step === 'set_new' && (
          <form onSubmit={handleSetPasscode} className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New 4-Digit Passcode
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Passcode
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                className="w-full text-center text-2xl tracking-[0.5em] py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('manage');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={newCode.length !== 4 || confirmCode.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Code</span>
              </button>
            </div>
          </form>
        )}

        {step === 'remove' && (
          <form onSubmit={handleRemovePasscode} className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Enter Current Passcode to Disable
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('manage');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyCode.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer"
              >
                Confirm Disable
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
