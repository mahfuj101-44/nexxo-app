import React, { useState } from 'react';
import { HelpCircle, MessageCircle, Phone } from 'lucide-react';
import { WhatsAppHelpModal } from './WhatsAppHelpModal';
import { NEXXO_SUPPORT_WHATSAPP_NUMBER } from '../../lib/verificationService';

interface FloatingHelpButtonProps {
  currentUsername?: string;
  className?: string;
}

export const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({
  currentUsername,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id="global-help-btn"
        onClick={() => setIsOpen(true)}
        className={`group fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${className}`}
        title={`Customer Support & Payment Help: WhatsApp ${NEXXO_SUPPORT_WHATSAPP_NUMBER}`}
        aria-label="Customer Support Help"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5 fill-white/20" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-emerald-600 animate-pulse" />
        </div>
        <span className="hidden sm:inline-block text-xs font-bold tracking-wide pr-1">
          Help
        </span>
      </button>

      <WhatsAppHelpModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        username={currentUsername}
        context="general"
      />
    </>
  );
};
