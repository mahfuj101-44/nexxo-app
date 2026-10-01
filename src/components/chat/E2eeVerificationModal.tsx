import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Copy, X, KeyRound, Sparkles } from 'lucide-react';
import { NexxoUser } from '../../types';
import { generateSafetyVerificationCode } from '../../lib/e2eeService';

interface E2eeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  partnerUser?: NexxoUser | null;
}

export const E2eeVerificationModal: React.FC<E2eeVerificationModalProps> = ({
  isOpen,
  onClose,
  chatId,
  partnerUser,
}) => {
  const [safetyCode, setSafetyCode] = useState<string>('Loading...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && chatId) {
      generateSafetyVerificationCode(chatId).then(setSafetyCode);
    }
  }, [isOpen, chatId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-center p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto shadow-inner">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            End-to-End Encrypted
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              AES-256-GCM
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
            Messages and calls with {partnerUser?.displayName || partnerUser?.username || 'this user'} are secured with cryptographic keys derived exclusively on your devices.
          </p>
        </div>

        {/* Safety Number Display */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
              Safety Verification Number
            </span>
            <button
              onClick={handleCopy}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="py-2 text-2xl font-mono font-bold tracking-widest text-slate-900 dark:text-white">
            {safetyCode}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Compare this number with {partnerUser?.displayName || 'the recipient'} in person or over an external channel to verify cryptographic authenticity.
          </p>
        </div>

        {/* Guarantee Points */}
        <div className="grid grid-cols-1 gap-2 text-left text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Encrypted before leaving your device</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>NEXXO servers cannot read your messages</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Unique IV (Initialization Vector) per message</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
