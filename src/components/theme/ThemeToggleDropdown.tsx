import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Contrast, Monitor, Check, ChevronDown } from 'lucide-react';
import { AppThemeMode } from '../../types';
import { THEME_OPTIONS, resolveEffectiveTheme, getSystemPrefersDark } from '../../lib/themeService';

interface ThemeToggleDropdownProps {
  themeMode: AppThemeMode;
  onSelectThemeMode: (mode: AppThemeMode) => void;
  onCycleTheme?: () => void;
}

export const ThemeToggleDropdown: React.FC<ThemeToggleDropdownProps> = ({
  themeMode,
  onSelectThemeMode,
  onCycleTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveTheme = resolveEffectiveTheme(themeMode);
  const isSystemDark = getSystemPrefersDark();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'Moon':
        return <Moon className={`${className} text-indigo-400`} />;
      case 'Contrast':
        return <Contrast className={`${className} text-cyan-400`} />;
      case 'Monitor':
        return <Monitor className={`${className} text-emerald-400`} />;
      default:
        return <Sun className={className} />;
    }
  };

  const getActiveIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'dark':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'high-contrast':
        return <Contrast className="w-4 h-4 text-cyan-400" />;
      case 'system':
        return isSystemDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />;
    }
  };

  const currentOption = THEME_OPTIONS.find((t) => t.id === themeMode) || THEME_OPTIONS[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Theme Trigger Button */}
      <div className="flex items-center rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all shadow-xs">
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={() => {
            if (onCycleTheme) {
              onCycleTheme();
            } else {
              setIsOpen((prev) => !prev);
            }
          }}
          className="p-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          title={`Active: ${currentOption.title} (Click to toggle Light/Dark)`}
          aria-label={`Theme: ${currentOption.title}`}
        >
          <motion.div
            key={themeMode}
            initial={{ scale: 0.7, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.7, rotate: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            {getActiveIcon()}
          </motion.div>
        </button>

        <button
          id="theme-menu-trigger-btn"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="pr-2 pl-0.5 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Open Theme Selection Menu"
          aria-expanded={isOpen}
        >
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Theme Selection Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-100 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">Theme & Display</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Select your preferred color scheme
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                {currentOption.shortLabel}
              </span>
            </div>

            <div className="space-y-1">
              {THEME_OPTIONS.map((option) => {
                const isSelected = themeMode === option.id;
                return (
                  <button
                    key={option.id}
                    id={`theme-option-${option.id}`}
                    type="button"
                    onClick={() => {
                      onSelectThemeMode(option.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-100'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {renderIcon(option.iconName, 'w-4 h-4')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{option.title}</span>
                        {option.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {option.id === 'system'
                          ? `Follows device theme (Currently ${isSystemDark ? 'Dark' : 'Light'})`
                          : option.description}
                      </p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 self-center" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Active: {effectiveTheme === 'high-contrast' ? 'High Contrast' : effectiveTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <button
                type="button"
                onClick={() => {
                  if (onCycleTheme) onCycleTheme();
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
              >
                Cycle Next →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
