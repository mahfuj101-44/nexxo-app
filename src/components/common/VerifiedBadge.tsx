import React from 'react';
import { BadgeCheck, Sparkles, Crown } from 'lucide-react';

interface VerifiedBadgeProps {
  isVerified?: boolean;
  isPremium?: boolean;
  premiumTier?: 'free' | 'basic' | 'pro' | 'vip' | 'elite';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  isVerified,
  isPremium,
  premiumTier,
  size = 'sm',
  className = '',
  showText = false,
}) => {
  if (!isVerified && !isPremium) return null;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const isElite = premiumTier === 'elite';
  const isVip = premiumTier === 'vip';

  // Elite Badge
  if (isElite) {
    return (
      <span
        className={`inline-flex items-center gap-1 shrink-0 select-none ${className}`}
        title="NEXXO Elite Founder / VIP"
      >
        <span className="relative flex items-center justify-center">
          <Crown className={`${sizeClasses[size]} text-rose-400 fill-rose-400/30 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]`} />
        </span>
        {showText && (
          <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ELITE
          </span>
        )}
      </span>
    );
  }

  // VIP Gold / Amber Badge
  if (isVip) {
    return (
      <span
        className={`inline-flex items-center gap-1 shrink-0 select-none ${className}`}
        title="NEXXO VIP Verified Member"
      >
        <span className="relative flex items-center justify-center">
          <Crown className={`${sizeClasses[size]} text-amber-400 fill-amber-400/30 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]`} />
        </span>
        {showText && (
          <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            VIP
          </span>
        )}
      </span>
    );
  }

  // Official Verified Blue Tick Badge
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 select-none ${className}`}
      title={isPremium ? 'NEXXO Premium Verified' : 'NEXXO Verified Member'}
    >
      <span className="relative flex items-center justify-center">
        <BadgeCheck
          className={`${sizeClasses[size]} text-sky-500 dark:text-sky-400 fill-sky-500/20 dark:fill-sky-400/20 filter drop-shadow-[0_0_5px_rgba(14,165,233,0.4)]`}
        />
      </span>
      {showText && isPremium && (
        <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          <span>PRO</span>
        </span>
      )}
    </span>
  );
};
