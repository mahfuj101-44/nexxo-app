import React, { useState } from 'react';
import {
  BadgeCheck,
  Crown,
  Check,
  Shield,
  ShieldCheck,
  AlertCircle,
  Copy,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  FileText,
  User,
  ExternalLink,
  Sparkles,
  HelpCircle,
  MessageCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { NexxoUser } from '../../types';
import {
  submitVerificationRequest,
  NEXXO_OFFICIAL_UPI_ID,
  NEXXO_SUPPORT_WHATSAPP_NUMBER,
  getWhatsAppSupportUrl,
} from '../../lib/verificationService';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { WhatsAppHelpModal } from '../common/WhatsAppHelpModal';

interface ApplyBlueTickModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NexxoUser;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Content Creator / Influencer',
  'Public Figure / Artist',
  'Business / Brand / Organization',
  'Professional / Developer / Founder',
  'Verified Community Member',
];

const ID_DOC_TYPES = [
  'National ID (Aadhaar / Voter ID / SSN)',
  'Passport',
  "Driver's License",
  'Business Registration / Tax ID',
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / QR Code (GPay, PhonePe, Paytm)', icon: QrCode },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking / Bank Transfer', icon: FileText },
];

export const ApplyBlueTickModal: React.FC<ApplyBlueTickModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'vip'>('pro');
  const [fullName, setFullName] = useState(currentUser.displayName || '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [idDocType, setIdDocType] = useState(ID_DOC_TYPES[0]);
  const [idDocNumber, setIdDocNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / QR Code');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [autoPayMethod, setAutoPayMethod] = useState<'upi_autopay' | 'card_recurring' | 'manual'>('upi_autopay');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(NEXXO_OFFICIAL_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTxId = paymentTxId.trim();
    if (!cleanTxId || cleanTxId.length < 4) {
      setErrorMsg('Please enter a valid Payment Transaction ID / UTR Number (min 4 characters).');
      return;
    }

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full legal name as per your ID document.');
      return;
    }

    try {
      setSubmitting(true);
      await submitVerificationRequest({
        currentUser,
        plan: selectedPlan,
        fullName: cleanName,
        idDocumentType: idDocType,
        idDocumentNumber: idDocNumber.trim(),
        category,
        paymentMethod,
        paymentTransactionId: cleanTxId,
        autoRenew,
        autoPayMethod,
      });

      setShowSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to submit verification application:', err);
      setErrorMsg(err.message || 'Failed to submit verification request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] max-h-[94dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Apply for Blue Tick Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official paid identity badge & anti-impersonation protection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
              title={`Customer Support WhatsApp: ${NEXXO_SUPPORT_WHATSAPP_NUMBER}`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp Help</span>
              <span className="sm:hidden">Help</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200">
          {showSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Application Submitted Successfully!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your payment reference has been recorded. Our platform admin team will verify your payment UTR and credentials. Once verified, the Blue Tick badge will automatically appear on your profile.
                </p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800/70 rounded-2xl text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-semibold text-sky-500">{selectedPlan === 'vip' ? 'VIP Gold' : 'Pro Blue Tick'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{paymentTxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-amber-500">Under Review</span>
                </div>
              </div>

              {/* WhatsApp Verification Support CTA */}
              <div className="max-w-sm mx-auto p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-center space-y-2">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Want fast-track verification? Send your payment screenshot to our customer support on WhatsApp:
                </p>
                <a
                  href={getWhatsAppSupportUrl(`Hi NEXXO Support, I just submitted verification for @${currentUser.username} (${selectedPlan === 'vip' ? 'VIP Gold' : 'Pro Blue Tick'}). My Transaction UTR is ${paymentTxId}. Here is my payment receipt screenshot.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Receipt on WhatsApp ({NEXXO_SUPPORT_WHATSAPP_NUMBER})</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Plan Selection Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  1. Select Verification Plan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pro Blue Tick */}
                  <div
                    onClick={() => setSelectedPlan('pro')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === 'pro'
                        ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                        <BadgeCheck className="w-4 h-4 text-sky-500" />
                        <span>Pro Blue Tick</span>
                      </div>
                      <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                        ₹199 <span className="text-[10px] font-normal text-slate-400">/ mo</span>
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-sky-500 shrink-0" />
                        Official Sky-Blue Verified Tick
                      </li>
                      <li className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
                        <Check className="w-3 h-3 text-sky-500 shrink-0" />
                        1 GB Encrypted Vault Storage
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-sky-500 shrink-0" />
                        Anti-impersonation protection
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-sky-500 shrink-0" />
                        Group polls & priority messaging
                      </li>
                    </ul>
                  </div>

                  {/* VIP Gold Crown */}
                  <div
                    onClick={() => setSelectedPlan('vip')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === 'vip'
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span>VIP Gold Badge</span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        ₹499 <span className="text-[10px] font-normal text-slate-400">/ mo</span>
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-amber-500 shrink-0" />
                        Exclusive Gold Crown & Blue Badge
                      </li>
                      <li className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                        <Check className="w-3 h-3 text-amber-500 shrink-0" />
                        5 GB High-Capacity Encrypted Vault
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-amber-500 shrink-0" />
                        VIP Crown in all groups & channels
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-amber-500 shrink-0" />
                        Priority 24/7 WhatsApp concierge
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Profile Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentUser.displayName}
                      </span>
                      <VerifiedBadge
                        isVerified={true}
                        isPremium={selectedPlan === 'vip'}
                        premiumTier={selectedPlan === 'vip' ? 'vip' : 'pro'}
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">@{currentUser.username}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Preview
                </span>
              </div>

              {/* Identity & Legal Details */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Identity & Legal Verification
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Full Legal Name (as on Govt ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Profile Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Government ID Document Type *
                    </label>
                    <select
                      value={idDocType}
                      onChange={(e) => setIdDocType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    >
                      {ID_DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      ID / Document Number (or Last 4 digits)
                    </label>
                    <input
                      type="text"
                      value={idDocNumber}
                      onChange={(e) => setIdDocNumber(e.target.value)}
                      placeholder="e.g. XXXX-1234 or DL-9920"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Official Payment Instructions */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Complete Official Payment
                  </label>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    Amount: {selectedPlan === 'vip' ? '₹499' : '₹199'}
                  </span>
                </div>

                <div className="p-4 bg-linear-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Official Payment UPI ID:</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl font-mono text-sm font-bold text-sky-400 tracking-wide text-center select-all">
                    {NEXXO_OFFICIAL_UPI_ID}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`upi://pay?pa=${NEXXO_OFFICIAL_UPI_ID}&pn=NEXXO%20Verification&am=${selectedPlan === 'vip' ? '499' : '199'}&cu=INR&tn=BlueTickVerification`}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay via UPI App</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      {copiedUpi ? 'Copied ID' : 'Copy UPI ID'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pay using Google Pay, PhonePe, Paytm, or any UPI / Banking app to <strong>{NEXXO_OFFICIAL_UPI_ID}</strong>. Once paid, copy the 12-digit <strong>UTR / Transaction Reference Number</strong> from your payment receipt and paste it below.
                  </p>
                </div>

                {/* WhatsApp Customer Support Help Banner */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                      <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Customer Support & Payment Help</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Payment help or need to send screenshot? WhatsApp: <strong>+91 {NEXXO_SUPPORT_WHATSAPP_NUMBER}</strong>
                    </p>
                  </div>
                  <a
                    href={getWhatsAppSupportUrl(`Hi NEXXO Support, I need help with my Blue Tick payment for @${currentUser.username} (${selectedPlan === 'vip' ? 'VIP Gold ₹499' : 'Pro Blue Tick ₹199'}).`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Help</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                {/* Transaction ID Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Transaction ID / UTR Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentTxId}
                    onChange={(e) => setPaymentTxId(e.target.value)}
                    placeholder="e.g. 423985109283 or UPI/TXN-98421"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Auto-Renewal / Auto-Pay Settings */}
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <RefreshCw className={`w-3.5 h-3.5 ${autoRenew ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Auto-Renew Monthly Subscription
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Keep your badge and VIP perks uninterrupted every 30 days
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRenew}
                        onChange={(e) => setAutoRenew(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {autoRenew && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Preferred Auto-Pay Billing Method:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAutoPayMethod('upi_autopay')}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                            autoPayMethod === 'upi_autopay'
                              ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                            autoPayMethod === 'upi_autopay' ? 'border-sky-600 bg-sky-600' : 'border-slate-400'
                          }`}>
                            {autoPayMethod === 'upi_autopay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-none mb-0.5">UPI AutoPay (e-Mandate)</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">GPay, PhonePe, Paytm mandate</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAutoPayMethod('card_recurring')}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                            autoPayMethod === 'card_recurring'
                              ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                            autoPayMethod === 'card_recurring' ? 'border-sky-600 bg-sky-600' : 'border-slate-400'
                          }`}>
                            {autoPayMethod === 'card_recurring' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-none mb-0.5">Credit / Debit Card Recurring</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Visa, Mastercard, RuPay recurring</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Anti-Cheat Warning */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Anti-Fraud & Audit Policy:</strong> Platform administrators manually audit every UTR number against official merchant statements. Falsified or fake transaction IDs will lead to permanent account suspension.
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-4 h-4" />
                      <span>Submit Verification Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <WhatsAppHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        username={currentUser.username}
        plan={selectedPlan === 'vip' ? 'VIP Gold Crown (₹499)' : 'Pro Blue Tick (₹199)'}
        transactionId={paymentTxId}
        context="payment"
      />
    </div>
  );
};
