import React, { useState, useEffect } from 'react';
import {
  BadgeCheck,
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  User,
  DollarSign,
  FileText,
  RotateCw,
  MessageCircle,
} from 'lucide-react';
import { VerificationRequest, NexxoUser } from '../../types';
import {
  subscribeToAllVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  NEXXO_OFFICIAL_UPI_ID,
  NEXXO_SUPPORT_WHATSAPP_NUMBER,
  getWhatsAppSupportUrl,
} from '../../lib/verificationService';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface AdminVerificationManagementProps {
  currentUser: NexxoUser;
}

const QUICK_REJECTION_REASONS = [
  'Payment UTR reference not found in bank records.',
  'Payment amount does not match the selected verification plan.',
  'Name does not match the provided government ID document.',
  'ID document is unreadable or expired.',
  'Duplicate or fraudulent transaction ID submitted.',
];

export const AdminVerificationManagement: React.FC<AdminVerificationManagementProps> = ({
  currentUser,
}) => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionModalReq, setRejectionModalReq] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState(QUICK_REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllVerificationRequests((data) => {
      setRequests(data);
    });
    return () => unsub();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (request: VerificationRequest) => {
    if (!window.confirm(`Are you sure you want to approve verification and grant Blue Tick to @${request.username}?`)) {
      return;
    }

    try {
      setProcessingId(request.id);
      setNotice(null);
      await approveVerificationRequest(currentUser.id, request);
      setNotice({
        type: 'success',
        text: `Successfully approved @${request.username}. Blue Tick badge is now active on their profile!`,
      });
    } catch (err: any) {
      console.error('Approval failed:', err);
      setNotice({
        type: 'error',
        text: err.message || 'Failed to approve request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalReq) return;

    const finalReason = customReason.trim() || rejectionReason;

    try {
      setProcessingId(rejectionModalReq.id);
      setNotice(null);
      await rejectVerificationRequest(currentUser.id, rejectionModalReq, finalReason);
      setNotice({
        type: 'success',
        text: `Application for @${rejectionModalReq.username} has been rejected. Notification sent to user.`,
      });
      setRejectionModalReq(null);
      setCustomReason('');
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setNotice({
        type: 'error',
        text: err.message || 'Failed to reject request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.username.toLowerCase().includes(q) ||
      req.displayName.toLowerCase().includes(q) ||
      req.fullName.toLowerCase().includes(q) ||
      req.paymentTransactionId.toLowerCase().includes(q)
    );
  });

  // Metrics
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-2">{pendingCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Approved Badges</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">{approvedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-2">{rejectedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Total Requests</span>
            <BadgeCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{requests.length}</div>
        </div>
      </div>

      {/* Official Payment & WhatsApp Support Channel Card */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 border border-indigo-900/50 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-300">
              Official Merchant Payment & Support Details
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
            <span>
              Official UPI: <strong className="font-mono text-sky-400 select-all">{NEXXO_OFFICIAL_UPI_ID}</strong>
            </span>
            <span>•</span>
            <span>
              Support WhatsApp: <strong className="font-mono text-emerald-400 select-all">+91 {NEXXO_SUPPORT_WHATSAPP_NUMBER}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getWhatsAppSupportUrl('Hello NEXXO Support, Admin checking in regarding verification applications.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Open WhatsApp Support</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </div>

      {/* Notification Banner */}
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username, name, or UTR..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st} {st === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
            <BadgeCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
              No verification requests found
            </div>
            <p className="text-xs">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter.'
                : 'No users have submitted a Blue Tick verification application yet.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Applicant & User Details */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <img
                  src={req.userPhotoURL}
                  alt={req.displayName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-800 shrink-0 mt-0.5"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {req.displayName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">@{req.username}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        req.plan === 'vip'
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                      }`}
                    >
                      {req.planName} ({req.priceAmount})
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {req.plan === 'vip' ? '5 GB Vault' : '1 GB Vault'}
                    </span>
                    {/* Status badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Legal / ID info */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3 flex-wrap">
                    <span>
                      <strong className="text-slate-400">Legal Name:</strong> {req.fullName}
                    </span>
                    <span>
                      <strong className="text-slate-400">Category:</strong> {req.category}
                    </span>
                    <span>
                      <strong className="text-slate-400">ID:</strong> {req.idDocumentType} ({req.idDocumentNumber || 'N/A'})
                    </span>
                  </div>

                  {/* Payment Details */}
                  <div className="flex items-center gap-2 text-xs pt-1 flex-wrap">
                    <span className="text-slate-400">Payment UTR:</span>
                    <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      {req.paymentTransactionId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(req.paymentTransactionId, req.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Copy UTR ID"
                    >
                      {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[11px] text-slate-400 ml-1">
                      via {req.paymentMethod}
                    </span>
                  </div>

                  {/* Rejection Note if rejected */}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div className="text-[11px] text-rose-500 dark:text-rose-400 pt-1">
                      <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for Admins */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <a
                  href={getWhatsAppSupportUrl(`Hi, NEXXO Admin here regarding verification request for @${req.username} (${req.planName}, UTR: ${req.paymentTransactionId}).`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                  title="Contact Support or applicant on WhatsApp (+91 7352622862)"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>

                {req.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => {
                        setRejectionModalReq(req);
                        setCustomReason('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleApprove(req)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {processingId === req.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <BadgeCheck className="w-4 h-4" />
                      )}
                      <span>Approve & Verify</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Reviewed by Admin
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectionModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Reject Blue Tick Application</span>
              </h4>
              <button
                type="button"
                onClick={() => setRejectionModalReq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select or type the reason for rejecting <strong>@{rejectionModalReq.username}</strong>. This reason will be sent to the user so they can correct their payment or ID details.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Common Reasons:
                </label>
                <div className="space-y-1.5">
                  {QUICK_REJECTION_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        checked={rejectionReason === r && !customReason}
                        onChange={() => {
                          setRejectionReason(r);
                          setCustomReason('');
                        }}
                        className="mt-0.5 accent-rose-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Custom Reason (Optional):
                </label>
                <textarea
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Type a custom explanation..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalReq(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectionModalReq.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {processingId === rejectionModalReq.id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
