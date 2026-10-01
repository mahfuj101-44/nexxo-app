import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Check,
  X,
  RotateCcw,
  Upload,
  Link,
  Zap,
  Eye,
  CheckCheck,
  Layers,
  Moon,
  Sun,
  Shield
} from 'lucide-react';
import {
  ChatThemeConfig,
  WallpaperPresetId,
  WALLPAPER_PRESETS,
  DEFAULT_THEME_CONFIG,
  getChatTheme,
  saveChatTheme,
  resetChatTheme,
  ACCENT_COLOR_CLASSES,
  AccentColor,
  MessageAnimationType,
  BubbleStyle,
  DarkTone,
} from '../../lib/wallpaperService';

interface ChatThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
  chatTitle?: string;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'animations' | 'accents'>('wallpapers');
  const [themeConfig, setThemeConfig] = useState<ChatThemeConfig>(() => getChatTheme(chatId));
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [previewAnimationKey, setPreviewAnimationKey] = useState(0);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getChatTheme(chatId);
      setThemeConfig(current);
      if (current.customUrl) {
        setCustomInputUrl(current.customUrl);
      }
    }
  }, [isOpen, chatId]);

  if (!isOpen) return null;

  const handleSelectWallpaper = (id: WallpaperPresetId) => {
    const preset = WALLPAPER_PRESETS.find((p) => p.id === id);
    setThemeConfig((prev) => ({
      ...prev,
      wallpaperId: id,
      dimming: preset ? preset.recommendedDimming : prev.dimming,
    }));
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setThemeConfig((prev) => ({
          ...prev,
          wallpaperId: 'custom',
          customUrl: dataUrl,
        }));
        setCustomInputUrl('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customInputUrl.trim()) return;
    setThemeConfig((prev) => ({
      ...prev,
      wallpaperId: 'custom',
      customUrl: customInputUrl.trim(),
    }));
  };

  const handleSave = (setAsDefault: boolean) => {
    saveChatTheme(themeConfig, chatId, setAsDefault);
    setSaveSuccessNotice(
      setAsDefault
        ? 'Applied theme & wallpaper as global default for all chats!'
        : `Theme saved for ${chatTitle || 'this conversation'}!`
    );
    setTimeout(() => {
      setSaveSuccessNotice(null);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    resetChatTheme(chatId);
    setThemeConfig(DEFAULT_THEME_CONFIG);
    setSaveSuccessNotice('Reset back to clean default theme.');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 1200);
  };

  const activePreset =
    WALLPAPER_PRESETS.find((p) => p.id === themeConfig.wallpaperId) || WALLPAPER_PRESETS[0];

  const currentAccent = ACCENT_COLOR_CLASSES[themeConfig.accentColor];

  // Helper for rendering preview background
  const getPreviewBackgroundStyle = (): React.CSSProperties => {
    if (themeConfig.wallpaperId === 'custom' && themeConfig.customUrl) {
      return {
        backgroundImage: `url(${themeConfig.customUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: themeConfig.blur > 0 ? `blur(${themeConfig.blur}px)` : undefined,
      };
    }
    if (activePreset.id === 'default') {
      return {
        backgroundColor:
          themeConfig.darkTone === 'oled'
            ? '#000000'
            : themeConfig.darkTone === 'obsidian'
            ? '#18181b'
            : '#090d16',
      };
    }
    if (activePreset.patternOverlay) {
      return {
        backgroundImage: `${activePreset.patternOverlay}, ${activePreset.backgroundStyle}`,
        backgroundSize:
          activePreset.id === 'midnight-cosmos'
            ? '140px 140px, 100% 100%'
            : '20px 20px, 100% 100%',
        filter: themeConfig.blur > 0 ? `blur(${themeConfig.blur}px)` : undefined,
      };
    }
    if (activePreset.backgroundStyle.includes('gradient')) {
      return {
        backgroundImage: activePreset.backgroundStyle,
        filter: themeConfig.blur > 0 ? `blur(${themeConfig.blur}px)` : undefined,
      };
    }
    return {
      backgroundColor: activePreset.backgroundStyle,
      filter: themeConfig.blur > 0 ? `blur(${themeConfig.blur}px)` : undefined,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Chat Wallpaper & Theme Tweaks
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {chatTitle ? `Customizing: ${chatTitle}` : 'Customize chat visual styling & ambiance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800/80 flex gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('wallpapers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'wallpapers'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Wallpapers & Canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('animations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'animations'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Animations & FX</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'accents'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Accent Colors & Dark Tones</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          {/* Live Mini Chat Preview Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Live Interactive Chat Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAnimationKey((k) => k + 1)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Zap className="w-3 h-3" /> Replay Animation
              </button>
            </div>

            {/* Simulated Chat Stage */}
            <div className="relative h-44 overflow-hidden p-4 flex flex-col justify-end">
              {/* Background Wallpaper Layer */}
              <div
                className={`absolute inset-0 transition-all duration-300 ${
                  themeConfig.animateWallpaper ? 'animate-pulse' : ''
                }`}
                style={getPreviewBackgroundStyle()}
              />
              {/* Dimming overlay */}
              <div
                className="absolute inset-0 bg-black transition-opacity duration-200 pointer-events-none"
                style={{ opacity: themeConfig.dimming / 100 }}
              />

              {/* Simulated Messages */}
              <div className="relative z-10 space-y-2.5 max-w-md w-full">
                {/* Incoming Message */}
                <motion.div
                  key={`in-${previewAnimationKey}`}
                  initial={
                    themeConfig.messageAnimation === 'bounce'
                      ? { scale: 0.8, y: 15, opacity: 0 }
                      : themeConfig.messageAnimation === 'instant'
                      ? { opacity: 1 }
                      : { y: 10, opacity: 0 }
                  }
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{
                    type: themeConfig.messageAnimation === 'bounce' ? 'spring' : 'tween',
                    damping: 14,
                    duration: 0.25,
                  }}
                  className={`self-start max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow-md ${
                    themeConfig.bubbleStyle === 'minimal'
                      ? 'rounded-none border border-slate-700'
                      : themeConfig.bubbleStyle === 'modern'
                      ? 'rounded-2xl rounded-bl-none border border-white/10'
                      : 'rounded-2xl rounded-bl-none'
                  } bg-slate-900/90 text-slate-100 backdrop-blur-xs`}
                >
                  <p className="leading-snug">Hey! How does this new wallpaper & styling look?</p>
                  <span className="text-[9px] text-slate-400 mt-0.5 block text-right">10:42 AM</span>
                </motion.div>

                {/* Outgoing Message (Me) */}
                <motion.div
                  key={`out-${previewAnimationKey}`}
                  initial={
                    themeConfig.messageAnimation === 'bounce'
                      ? { scale: 0.8, y: 15, opacity: 0 }
                      : themeConfig.messageAnimation === 'instant'
                      ? { opacity: 1 }
                      : { y: 10, opacity: 0 }
                  }
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{
                    type: themeConfig.messageAnimation === 'bounce' ? 'spring' : 'tween',
                    damping: 14,
                    duration: 0.25,
                    delay: 0.08,
                  }}
                  className={`ml-auto max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium shadow-md ${
                    themeConfig.bubbleStyle === 'minimal'
                      ? 'rounded-none'
                      : 'rounded-2xl rounded-br-none'
                  } ${currentAccent.bubbleSent}`}
                >
                  <p className="leading-snug">Looks crystal-clear and very smooth! ✨</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] opacity-80 mt-0.5">
                    <span>10:42 AM</span>
                    <CheckCheck className="w-3 h-3 text-emerald-300" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* TAB 1: WALLPAPERS */}
          {activeTab === 'wallpapers' && (
            <div className="space-y-5">
              {/* Presets Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Wallpaper Presets
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Active: <strong className="text-indigo-600 dark:text-indigo-400">{activePreset.title}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {WALLPAPER_PRESETS.map((preset) => {
                    const isSelected = themeConfig.wallpaperId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectWallpaper(preset.id)}
                        className={`group relative h-20 rounded-2xl overflow-hidden border text-left p-2.5 flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 border-indigo-500 scale-[1.02] shadow-md'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                        style={
                          (preset.backgroundStyle !== 'transparent' ? preset.backgroundStyle : preset.previewGradient).includes('gradient')
                            ? { backgroundImage: preset.backgroundStyle !== 'transparent' ? preset.backgroundStyle : preset.previewGradient }
                            : { backgroundColor: preset.backgroundStyle !== 'transparent' ? preset.backgroundStyle : preset.previewGradient }
                        }
                      >
                        {/* Dark overlay for readability of preset title */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors" />

                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">
                            {preset.category}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <span className="relative z-10 text-xs font-bold text-white drop-shadow-xs leading-tight">
                          {preset.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image Upload / URL */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <span>Upload Custom Wallpaper or Photo</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer shadow-2xs shrink-0">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Choose Image File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImageUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="url"
                      value={customInputUrl}
                      onChange={(e) => setCustomInputUrl(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      disabled={!customInputUrl.trim()}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>

              {/* Sliders: Dimming & Blur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dimming Slider */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Wallpaper Dimming
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {themeConfig.dimming}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={5}
                    value={themeConfig.dimming}
                    onChange={(e) =>
                      setThemeConfig((prev) => ({ ...prev, dimming: Number(e.target.value) }))
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Darkens background image to preserve WCAG contrast for text.
                  </p>
                </div>

                {/* Blur Slider */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Lens Softness (Blur)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {themeConfig.blur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={themeConfig.blur}
                    onChange={(e) =>
                      setThemeConfig((prev) => ({ ...prev, blur: Number(e.target.value) }))
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Adds subtle soft-focus lens effect to background texture.
                  </p>
                </div>
              </div>

              {/* Wallpaper Ambient Animation Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Subtle Ambient Motion
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gently animates background particles, gradients, and cosmic stars.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setThemeConfig((prev) => ({
                      ...prev,
                      animateWallpaper: !prev.animateWallpaper,
                    }))
                  }
                  className={`w-12 h-6.5 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    themeConfig.animateWallpaper ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ANIMATIONS & FX */}
          {activeTab === 'animations' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                  Message Bubble Entrance Animation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'smooth' as MessageAnimationType,
                      title: 'Silky Slide & Fade',
                      desc: 'Smooth vertical drift with refined easing curve (Recommended)',
                    },
                    {
                      id: 'bounce' as MessageAnimationType,
                      title: 'Playful Spring Pop',
                      desc: 'Energetic bounce effect when incoming & outgoing messages land',
                    },
                    {
                      id: 'subtle' as MessageAnimationType,
                      title: 'Minimal Drift',
                      desc: 'Quiet 4px micro-slide for a restrained, professional workspace',
                    },
                    {
                      id: 'instant' as MessageAnimationType,
                      title: 'Crisp Instant',
                      desc: 'Zero animation delay. Instantaneous rendering for fast reading',
                    },
                  ].map((anim) => {
                    const isSelected = themeConfig.messageAnimation === anim.id;
                    return (
                      <button
                        key={anim.id}
                        type="button"
                        onClick={() => {
                          setThemeConfig((prev) => ({ ...prev, messageAnimation: anim.id }));
                          setPreviewAnimationKey((k) => k + 1);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {anim.title}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {anim.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Shape Aesthetics */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                  Message Bubble Geometry
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'rounded' as BubbleStyle, title: 'Modern Pill', desc: 'Curved 16px corners' },
                    { id: 'modern' as BubbleStyle, title: 'Subtle Border', desc: 'Outlined hairline edges' },
                    { id: 'minimal' as BubbleStyle, title: 'Compact Box', desc: 'Zero corner radius' },
                  ].map((style) => {
                    const isSelected = themeConfig.bubbleStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setThemeConfig((prev) => ({ ...prev, bubbleStyle: style.id }))}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {style.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {style.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCENTS & DARK TONES */}
          {activeTab === 'accents' && (
            <div className="space-y-6">
              {/* Accent Colors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                  Primary Accent Tint (Sent Messages & Badges)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(ACCENT_COLOR_CLASSES) as AccentColor[]).map((colKey) => {
                    const col = ACCENT_COLOR_CLASSES[colKey];
                    const isSelected = themeConfig.accentColor === colKey;
                    return (
                      <button
                        key={colKey}
                        type="button"
                        onClick={() => setThemeConfig((prev) => ({ ...prev, accentColor: colKey }))}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-800 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-xl shadow-xs flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: col.preview }}
                        >
                          {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200 block">
                            {colKey}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {colKey === 'indigo' ? 'NEXXO Signature' : `${colKey} Glow`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dark Canvas Tone */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                  Dark Canvas Baseline Tone
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'slate' as DarkTone,
                      title: 'Twilight Slate',
                      colorBox: 'bg-slate-950',
                      desc: 'Deep modern navy (#0f172a)',
                    },
                    {
                      id: 'oled' as DarkTone,
                      title: 'Pure OLED Black',
                      colorBox: 'bg-black',
                      desc: 'Zero battery drain (#000000)',
                    },
                    {
                      id: 'obsidian' as DarkTone,
                      title: 'Matte Obsidian',
                      colorBox: 'bg-zinc-900',
                      desc: 'Warm dark charcoal (#18181b)',
                    },
                  ].map((tone) => {
                    const isSelected = themeConfig.darkTone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setThemeConfig((prev) => ({ ...prev, darkTone: tone.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-800 border-indigo-600 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div
                            className={`w-4 h-4 rounded-md border border-white/20 shadow-xs ${tone.colorBox}`}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {tone.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{tone.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Notice Banner */}
        <AnimatePresence>
          {saveSuccessNotice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-5 py-2 bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{saveSuccessNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold cursor-pointer py-1 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Clean Default</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              Set for All Chats
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs shadow-indigo-600/20"
            >
              {chatId ? 'Apply to This Chat' : 'Save Theme'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
