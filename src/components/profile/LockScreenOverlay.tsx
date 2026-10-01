import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LockScreenOverlayProps {
  correctPasscode: string;
  onUnlocked: () => void;
  userName?: string;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({
  correctPasscode,
  onUnlocked,
  userName,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 4 || isSuccess) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      if (nextPin === correctPasscode) {
        setIsSuccess(true);
        // Allow the success unlock animation to briefly show before triggering onUnlocked
        setTimeout(() => {
          onUnlocked();
        }, 320);
      } else {
        setTimeout(() => {
          setError(true);
          setPin('');
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    if (isSuccess) return;
    setPin('');
    setError(false);
  };

  return (
    <motion.div
      key="lock-screen-overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        filter: 'blur(12px)',
        transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none"
    >
      <motion.div
        key="lock-screen-overlay-content"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{
          opacity: 1,
          scale: isSuccess ? 1.03 : 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.88,
          y: -18,
          transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
        }}
        transition={{
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1], // snappy easing
        }}
        className="w-full max-w-xs flex flex-col items-center text-center p-6 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Lock / Unlock Icon Badge with Animated State Transition */}
        <motion.div
          animate={
            isSuccess
              ? { scale: [1, 1.15, 1], rotate: [0, -6, 0] }
              : error
              ? { x: [-8, 8, -6, 6, -3, 3, 0] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={`w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-xl transition-colors duration-300 ${
            isSuccess
              ? 'bg-emerald-500/10 dark:bg-emerald-950/70 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20'
              : error
              ? 'bg-rose-500/10 dark:bg-rose-950/70 border-rose-500/30 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-rose-500/20'
              : 'bg-indigo-50 dark:bg-indigo-900/60 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/15'
          }`}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="unlocked-icon"
                initial={{ scale: 0.5, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <Unlock className="w-8 h-8" />
              </motion.div>
            ) : (
              <motion.div
                key="locked-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Lock className="w-8 h-8" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          {isSuccess ? 'Passcode Verified' : 'NEXXO Messenger Locked'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 transition-all duration-200">
          {isSuccess
            ? 'Unlocking your workspace...'
            : userName
            ? `Welcome back, ${userName}. Enter your 4-digit PIN to continue.`
            : 'Enter your 4-digit PIN to continue.'}
        </p>

        {/* 4-digit Pin Dots with Motion Micro-interactions */}
        <motion.div
          animate={error ? { x: [-10, 10, -7, 7, -3, 3, 0] } : {}}
          transition={{ duration: 0.38, ease: 'easeInOut' }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <motion.div
                key={idx}
                animate={
                  isSuccess
                    ? {
                        scale: [1, 1.25, 1],
                        backgroundColor: '#10b981',
                      }
                    : isFilled
                    ? { scale: 1.15, backgroundColor: '#6366f1' }
                    : { scale: 1, backgroundColor: '#cbd5e1' }
                }
                transition={{ duration: 0.2 }}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 ring-4 ring-rose-500/30'
                    : isSuccess
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/30'
                    : isFilled
                    ? 'bg-indigo-600 ring-4 ring-indigo-500/30'
                    : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error Feedback Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-6 overflow-hidden"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Incorrect PIN passcode. Try again.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={isSuccess}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-indigo-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:active:bg-indigo-950/80 border border-slate-200 dark:border-slate-700 text-xl font-bold text-slate-800 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={isSuccess || pin.length === 0}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-40"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isSuccess}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-indigo-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:active:bg-indigo-950/80 border border-slate-200 dark:border-slate-700 text-xl font-bold text-slate-800 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isSuccess || pin.length === 0}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

