import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { NexxoUser, ReportReason, ReportTargetType } from '../../types';
import { submitReport } from '../../lib/safetyService';

interface ReportModalProps {
  currentUser: NexxoUser;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or unwanted advertising' },
  { value: 'harassment', label: 'Harassment or intimidation' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'inappropriate', label: 'Inappropriate or explicit content' },
  { value: 'other', label: 'Other violation' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  currentUser,
  targetType,
  targetId,
  targetName,
  onClose,
}) => {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await submitReport({
        reporter: currentUser,
        targetType,
        targetId,
        reason,
        description,
      });
      setIsDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-base text-white">
              Report {targetName ? `"${targetName}"` : targetType}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isDone ? (
          <div className="py-8 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Report Submitted</h3>
            <p className="text-xs text-slate-400">
              Thank you for keeping NEXXO safe. Our moderation team will review this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Select a reason
              </label>
              <div className="space-y-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{r.label}</span>
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-rose-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any relevant context for the moderation team..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-lg shadow-rose-600/20"
            >
              {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
