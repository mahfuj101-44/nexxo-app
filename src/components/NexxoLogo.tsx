import React from 'react';

interface NexxoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const NexxoLogo: React.FC<NexxoLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7 text-sm rounded-lg',
    md: 'w-9 h-9 text-base rounded-xl',
    lg: 'w-10 h-10 text-xl rounded-xl',
    xl: 'w-14 h-14 text-2xl rounded-2xl',
  }[size];

  const textDimensions = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-extrabold tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Professional Polish NEXXO Emblem */}
      <div className={`relative ${iconDimensions} bg-indigo-600 flex items-center justify-center text-white font-black tracking-tighter shadow-md shadow-indigo-500/20 flex-shrink-0 transition-transform hover:scale-105`}>
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Stylized geometric N with nexus core */}
          <span className="font-black">N</span>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-200 rounded-full" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight text-slate-800 dark:text-white ${textDimensions}`}>
            NEXXO
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
            Enterprise Network
          </span>
        </div>
      )}
    </div>
  );
};
