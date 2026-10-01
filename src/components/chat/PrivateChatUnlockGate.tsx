import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, ArrowLeft, Key, Smartphone, Hash } from 'lucide-react';
import { NexxoUser } from '../../types';
import { PatternLockView } from './PatternLockView';
import { ChatSecurityConfig } from './ChatHideSecurityModal';

interface PrivateChatUnlockGateProps {
  partnerUser: NexxoUser;
  securityConfig?: ChatSecurityConfig | null;
  onUnlocked: () => void;
  onBackToConversations: () => void;
}

export const PrivateChatUnlockGate: React.FC<PrivateChatUnlockGateProps> = ({
  partnerUser,
  securityConfig,
  onUnlocked,
  onBackToConversations,
}) => {
  // Determine effective lock type
  const lockType = securityConfig?.lockType || 'pin';

  // PIN state
  const [pin, setPin] = useState('');
  // Password state
  const [password, setPassword] = useState('');
  // Pattern state
  const [patternError, setPatternError] = useState(false);
  // General error state
  const [error, setError] = useState(false);

  const correctPin = (() => {
    if (securityConfig?.pin) return securityConfig.pin;
    try {
      return (
        localStorage.getItem(`nexxo_chat_lock_${partnerUser.id}`) ||
        localStorage.getItem('nexxo_app_lock_pin') ||
        ''
      );
    } catch {
      return '';
    }
  })();

  const correctPassword = securityConfig?.password || '';
  const correctPattern = securityConfig?.pattern || [];

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      if (nextPin === correctPin) {
        onUnlocked();
      } else {
        setTimeout(() => {
          setError(true);
          setPin('');
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onUnlocked();
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handlePatternComplete = (drawnPattern: number[]) => {
    if (correctPattern.length > 0 && drawnPattern.join('-') === correctPattern.join('-')) {
      onUnlocked();
    } else {
      setPatternError(true);
      setError(true);
      setTimeout(() => {
        setPatternError(false);
      }, 1000);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none animate-in fade-in">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* Back button */}
        <div className="w-full flex justify-start mb-2">
          <button
            onClick={onBackToConversations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-200 shadow-md">
            {partnerUser.photoURL ? (
              <img
                src={partnerUser.photoURL}
                alt={partnerUser.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{(partnerUser.displayName || partnerUser.username || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-950 shadow-xs">
            {lockType === 'pattern' ? (
              <Smartphone className="w-3 h-3" />
            ) : lockType === 'password' ? (
              <Key className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-0.5">
          {partnerUser.displayName}
        </h3>
        <p className="text-xs text-slate-500 font-mono mb-1">
          @{partnerUser.username}
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-6 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          <span>
            {lockType === 'pattern'
              ? 'Draw Pattern to Unlock'
              : lockType === 'password'
              ? 'Enter Password to Unlock'
              : 'Chat Locked with PIN'}
          </span>
        </p>

        {error && (
          <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-4 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {lockType === 'pattern'
                ? 'Incorrect pattern drawn.'
                : lockType === 'password'
                ? 'Incorrect secret password.'
                : 'Incorrect PIN passcode.'}
            </span>
          </div>
        )}

        {/* 1. PIN Keypad Mode */}
        {lockType === 'pin' && (
          <>
            {/* 4-digit Pin Dots */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      error
                        ? 'bg-rose-500 ring-4 ring-rose-500/30 animate-shake'
                        : isFilled
                        ? 'bg-indigo-600 ring-4 ring-indigo-500/30 scale-110'
                        : 'bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-indigo-50 dark:active:bg-indigo-950 border border-slate-200 dark:border-slate-800 text-lg font-bold text-slate-900 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-indigo-50 dark:active:bg-indigo-950 border border-slate-200 dark:border-slate-800 text-lg font-bold text-slate-900 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {/* 2. Password Mode */}
        {lockType === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter secret password"
              autoFocus
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={!password}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Unlock Conversation
            </button>
          </form>
        )}

        {/* 3. Pattern Mode */}
        {lockType === 'pattern' && (
          <div className="flex flex-col items-center">
            <PatternLockView
              onPatternComplete={handlePatternComplete}
              error={patternError}
            />
          </div>
        )}
      </div>
    </div>
  );
};
