import React from 'react';
import { BarChart2, Check, Lock } from 'lucide-react';
import { PollData } from '../../types';

interface PollCardProps {
  poll: PollData;
  currentUserId: string;
  onVote: (optionId: string) => void;
  onClosePoll?: () => void;
  canClose?: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  currentUserId,
  onVote,
  onClosePoll,
  canClose = false,
}) => {
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);
  const isClosed = Boolean(poll.isClosed);

  return (
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-md text-white my-1">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-100 leading-snug">
              {poll.question}
            </h4>
            <span className="text-[11px] text-slate-400">
              {poll.multipleAnswers ? 'Select one or more' : 'Select one option'} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        </div>

        {isClosed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
            <Lock className="w-2.5 h-2.5" />
            Closed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            Active
          </span>
        )}
      </div>

      {/* Poll Options */}
      <div className="space-y-2 mt-3">
        {poll.options.map((opt) => {
          const votesCount = opt.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = Boolean(opt.votes?.includes(currentUserId));

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isClosed}
              onClick={() => onVote(opt.id)}
              className={`relative w-full text-left p-3 rounded-xl border transition-all duration-200 overflow-hidden group ${
                hasVoted
                  ? 'border-sky-500/80 bg-sky-950/40 shadow-sm shadow-sky-500/10'
                  : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800/80'
              } ${isClosed ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
            >
              {/* Vote Percentage Progress Bar Fill */}
              <div
                className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-xl ${
                  hasVoted ? 'bg-sky-500/25' : 'bg-slate-700/30'
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      hasVoted
                        ? 'border-sky-400 bg-sky-500 text-white'
                        : 'border-slate-600 group-hover:border-slate-500'
                    }`}
                  >
                    {hasVoted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-xs font-medium truncate ${hasVoted ? 'text-sky-200 font-semibold' : 'text-slate-200'}`}>
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-xs font-semibold text-slate-300">
                    {percentage}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({votesCount})
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>{totalVotes} total votes</span>

        {canClose && !isClosed && onClosePoll && (
          <button
            type="button"
            onClick={onClosePoll}
            className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors hover:underline"
          >
            End poll
          </button>
        )}
      </div>
    </div>
  );
};
