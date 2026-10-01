import React, { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Phone,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Send,
} from 'lucide-react';
import {
  NEXXO_OFFICIAL_UPI_ID,
  NEXXO_SUPPORT_WHATSAPP_NUMBER,
  NEXXO_SUPPORT_WHATSAPP_INTERNATIONAL,
  getWhatsAppSupportUrl,
} from '../../lib/verificationService';

interface WhatsAppHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  context?: 'payment' | 'general' | 'verification';
  transactionId?: string;
  plan?: string;
}

export const WhatsAppHelpModal: React.FC<WhatsAppHelpModalProps> = ({
  isOpen,
  onClose,
  username,
  context = 'payment',
  transactionId,
  plan,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(NEXXO_OFFICIAL_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(NEXXO_SUPPORT_WHATSAPP_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const constructWhatsAppMessage = () => {
    let msg = `Hi NEXXO Support! I need help.`;
    if (username) {
      msg += ` My username is @${username}.`;
    }
    if (plan) {
      msg += ` Plan: ${plan}.`;
    }
    if (transactionId) {
      msg += ` My Payment UTR / Transaction ID is: ${transactionId}.`;
    }
    if (context === 'payment' || context === 'verification') {
      msg += ` Please assist me with my Blue Tick payment verification.`;
    }
    return msg;
  };

  const waUrl = getWhatsAppSupportUrl(constructWhatsAppMessage());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Customer Support & Help
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official WhatsApp & Payment Assistance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-slate-800 dark:text-slate-200">
          {/* WhatsApp Direct Support Card */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-white/20 text-white">
                  <Phone className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                  Official WhatsApp Support
                </span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold tracking-wide font-mono">
                {NEXXO_SUPPORT_WHATSAPP_NUMBER}
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNumber ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-xs text-emerald-100 leading-relaxed">
              Facing any payment issue, want to send a payment screenshot, or need faster Blue Tick verification approval? Contact us directly on WhatsApp!
            </p>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Chat on WhatsApp (+91 {NEXXO_SUPPORT_WHATSAPP_NUMBER})</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>

          {/* Official Payment UPI Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sky-500" />
                Official Payment UPI ID
              </span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
              </button>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-sm font-bold text-sky-600 dark:text-sky-400 text-center select-all">
              {NEXXO_OFFICIAL_UPI_ID}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pay via Google Pay, PhonePe, Paytm, or BHIM UPI to this official ID and keep the 12-digit UTR reference.
            </p>
          </div>

          {/* Quick Guidance */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Safe & Verified Assistance</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Our support team will never ask for your account password or PIN. Only share your payment UTR / receipt screenshot for verification.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
