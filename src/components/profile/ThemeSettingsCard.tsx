import React, { useState } from 'react';
import { Palette, Sun, Moon, Contrast, Monitor, Check, Sparkles } from 'lucide-react';
import { AppThemeMode } from '../../types';
import { THEME_OPTIONS, resolveEffectiveTheme, getSystemPrefersDark } from '../../lib/themeService';
import { ChatThemeModal } from '../theme/ChatThemeModal';

interface ThemeSettingsCardProps {
  currentThemeMode: AppThemeMode;
  onThemeModeChange: (newMode: AppThemeMode) => void;
}

export const ThemeSettingsCard: React.FC<ThemeSettingsCardProps> = ({
  currentThemeMode,
  onThemeModeChange,
}) => {
  const [showChatThemeModal, setShowChatThemeModal] = useState(false);
  const effectiveTheme = resolveEffectiveTheme(currentThemeMode);
  const isSystemDark = getSystemPrefersDark();

  const renderIcon = (iconName: string, active: boolean) => {
    const iconClass = `w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`;
    switch (iconName) {
      case 'Sun':
        return <Sun className={`w-5 h-5 ${active ? 'text-amber-500' : 'text-slate-400'}`} />;
      case 'Moon':
        return <Moon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />;
      case 'Contrast':
        return <Contrast className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />;
      case 'Monitor':
        return <Monitor className={iconClass} />;
      default:
        return <Sun className={iconClass} />;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Appearance & Theme</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose how NEXXO looks on your screen. Supports daylight light mode, low-light dark mode, high-contrast accessibility, and system sync.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 self-start sm:self-auto font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Active:{' '}
            <strong className="text-slate-900 dark:text-white capitalize">
              {effectiveTheme === 'high-contrast' ? 'High Contrast' : effectiveTheme}
            </strong>
          </span>
        </div>
      </div>

      {/* Grid of Theme Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {THEME_OPTIONS.map((option) => {
          const isSelected = currentThemeMode === option.id;
          return (
            <button
              key={option.id}
              id={`profile-theme-select-${option.id}`}
              type="button"
              onClick={() => onThemeModeChange(option.id)}
              className={`relative p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Header with Icon and Badge */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 shadow-2xs border border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {renderIcon(option.iconName, isSelected)}
                </div>

                <div className="flex items-center gap-1.5">
                  {option.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {option.badge}
                    </span>
                  )}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {option.title}
                  </h4>
                  {isSelected && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                      (Selected)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {option.id === 'system'
                    ? `Detects OS setting. Your system currently prefers ${isSystemDark ? 'Dark Mode' : 'Light Mode'}.`
                    : option.description}
                </p>
              </div>

              {/* Visual Swatch Preview Strip */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                {option.id === 'light' && (
                  <>
                    <div className="w-6 h-3 rounded bg-[#F8FAFC] border border-slate-300" title="Canvas" />
                    <div className="w-6 h-3 rounded bg-white border border-slate-200" title="Card" />
                    <div className="w-6 h-3 rounded bg-indigo-600" title="Accent" />
                    <span className="text-[10px] text-slate-400 ml-1">Daylight palette</span>
                  </>
                )}
                {option.id === 'dark' && (
                  <>
                    <div className="w-6 h-3 rounded bg-slate-950 border border-slate-800" title="Canvas" />
                    <div className="w-6 h-3 rounded bg-slate-900 border border-slate-700" title="Card" />
                    <div className="w-6 h-3 rounded bg-indigo-500" title="Accent" />
                    <span className="text-[10px] text-slate-400 ml-1">Twilight slate</span>
                  </>
                )}
                {option.id === 'high-contrast' && (
                  <>
                    <div className="w-6 h-3 rounded bg-black border border-white" title="Pure Black" />
                    <div className="w-6 h-3 rounded bg-white border border-black" title="Stark White" />
                    <div className="w-6 h-3 rounded bg-cyan-400" title="High-vis Cyan" />
                    <span className="text-[10px] text-slate-400 ml-1">AAA OLED stark</span>
                  </>
                )}
                {option.id === 'system' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Real-time OS theme tracking</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat Customization & Wallpapers Action */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Chat Wallpapers & Message Animations</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Customize conversation backgrounds, bubble shapes, dark tones (OLED / Obsidian), and entrance animations.
          </p>
        </div>

        <button
          type="button"
          id="profile-open-chat-theme-btn"
          onClick={() => setShowChatThemeModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors shrink-0"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Customize Chat Wallpaper</span>
        </button>
      </div>

      {showChatThemeModal && (
        <ChatThemeModal
          isOpen={showChatThemeModal}
          onClose={() => setShowChatThemeModal(false)}
        />
      )}
    </div>
  );
};
