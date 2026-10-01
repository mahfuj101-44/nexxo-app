import React, { useState } from 'react';
import {
  EyeOff,
  Eye,
  Key,
  Shield,
  Search,
  Lock,
  Compass,
  X,
  Check,
  Smartphone,
  Hash,
} from 'lucide-react';
import { NexxoUser } from '../../types';
import { PatternLockView } from './PatternLockView';

export type LockType = 'pin' | 'password' | 'pattern';

export interface ChatSecurityConfig {
  lockType: LockType;
  pin?: string;
  password?: string;
  pattern?: number[];
  isHidden: boolean;
  secretSearchWord?: string;
}

interface ChatHideSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: NexxoUser;
  isCurrentlyHidden: boolean;
  isCurrentlyLocked: boolean;
  currentConfig?: ChatSecurityConfig | null;
  onSaveSecurity: (config: ChatSecurityConfig) => void;
  onRemoveSecurity: () => void;
  appPasscode?: string | null;
}

export const ChatHideSecurityModal: React.FC<ChatHideSecurityModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  isCurrentlyHidden,
  isCurrentlyLocked,
  currentConfig,
  onSaveSecurity,
  onRemoveSecurity,
  appPasscode,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'setup_lock' | 'unlock_confirm'>('settings');
  const [lockType, setLockType] = useState<LockType>(currentConfig?.lockType || 'pin');
  const [isHidden, setIsHidden] = useState<boolean>(isCurrentlyHidden);
  const [secretSearchWord, setSecretSearchWord] = useState<string>(
    currentConfig?.secretSearchWord || ''
  );

  // PIN inputs
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Password inputs
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // Pattern inputs
  const [patternInput, setPatternInput] = useState<number[]>([]);
  const [patternStep, setPatternStep] = useState<'draw' | 'confirm'>('draw');
  const [firstPattern, setFirstPattern] = useState<number[]>([]);

  // Verification to unlock
  const [verifyPin, setVerifyPin] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePatternComplete = (pattern: number[]) => {
    if (pattern.length < 3) {
      setError('Please connect at least 3 dots for the pattern.');
      return;
    }
    setError(null);

    if (patternStep === 'draw') {
      setFirstPattern(pattern);
      setPatternStep('confirm');
    } else {
      // Check match
      if (pattern.join('-') === firstPattern.join('-')) {
        setPatternInput(firstPattern);
        setError(null);
      } else {
        setError('Patterns do not match. Please draw again.');
        setPatternStep('draw');
        setFirstPattern([]);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let config: ChatSecurityConfig = {
      lockType,
      isHidden,
      secretSearchWord: secretSearchWord.trim().toLowerCase(),
    };

    if (lockType === 'pin') {
      const pinToUse = pinInput || currentConfig?.pin || appPasscode || '';
      if (!pinToUse || pinToUse.length !== 4) {
        setError('Please enter a valid 4-digit PIN.');
        return;
      }
      if (pinInput && pinInput !== confirmPinInput) {
        setError('PIN numbers do not match.');
        return;
      }
      config.pin = pinToUse;
    } else if (lockType === 'password') {
      const pwd = passwordInput || currentConfig?.password || '';
      if (!pwd || pwd.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
      if (passwordInput && passwordInput !== confirmPasswordInput) {
        setError('Passwords do not match.');
        return;
      }
      config.password = pwd;
    } else if (lockType === 'pattern') {
      const pat = patternInput.length > 0 ? patternInput : currentConfig?.pattern;
      if (!pat || pat.length < 3) {
        setError('Please draw and confirm a pattern (at least 3 dots).');
        return;
      }
      config.pattern = pat;
    }

    if (isHidden && !config.secretSearchWord) {
      setError('Please enter a Secret Search Word to unlock/unhide this chat later.');
      return;
    }

    onSaveSecurity(config);
    onClose();
  };

  const handleConfirmRemove = () => {
    onRemoveSecurity();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Chat Hide & Privacy Security
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
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <Shield className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1">
          {/* 1. Hide Chat Feature Toggle */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Hide Chat from List
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chat will disappear from main conversation list completely
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {/* Secret Unhide Search Word */}
            {isHidden && (
              <div className="mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Secret Search Word (Unhide Trigger)</span>
                </label>
                <p className="text-[10px] text-indigo-900/70 dark:text-indigo-300/70 leading-relaxed">
                  Type this secret word in the search box to instantly reveal your hidden chats!
                </p>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={secretSearchWord}
                    onChange={(e) => setSecretSearchWord(e.target.value)}
                    placeholder="e.g. secret123, openhidden, #nexxo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Security Passcode Type Selection (PIN, Password, Pattern) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Protection Security Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLockType('pin');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  lockType === 'pin'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hash className="w-5 h-5 mb-1" />
                <span>4-Digit PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLockType('password');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  lockType === 'password'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Key className="w-5 h-5 mb-1" />
                <span>Secret Pass</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLockType('pattern');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  lockType === 'pattern'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span>Pattern Lock</span>
              </button>
            </div>
          </div>

          {/* 3. Credential Setup depending on Lock Type */}
          {lockType === 'pin' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Enter 4-Digit PIN Passcode
                </span>
                {appPasscode && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput(appPasscode);
                      setConfirmPinInput(appPasscode);
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Use App PIN ({appPasscode})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="New PIN (4 digits)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirm PIN"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {lockType === 'password' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Secret Word / Password
              </span>
              <div className="space-y-2">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter secret password"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Confirm secret password"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {lockType === 'pattern' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center">
              <div className="text-center mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {patternStep === 'draw'
                    ? '1. Draw your unlock pattern'
                    : '2. Draw again to confirm pattern'}
                </span>
                <p className="text-[10px] text-slate-500">
                  Connect at least 3 dots across the 3x3 grid
                </p>
              </div>

              <PatternLockView
                key={patternStep}
                onPatternComplete={handlePatternComplete}
                error={Boolean(error)}
              />

              {patternStep === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    setPatternStep('draw');
                    setFirstPattern([]);
                    setPatternInput([]);
                    setError(null);
                  }}
                  className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  Reset & Draw Again
                </button>
              )}

              {patternInput.length > 0 && (
                <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Pattern successfully verified!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shrink-0 mt-4">
          {(isCurrentlyLocked || isCurrentlyHidden) && (
            <button
              type="button"
              onClick={handleConfirmRemove}
              className="py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Remove Lock & Hide
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Save Security
          </button>
        </div>
      </div>
    </div>
  );
};
