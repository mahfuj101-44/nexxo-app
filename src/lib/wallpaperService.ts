export type WallpaperPresetId =
  | 'default'
  | 'midnight-cosmos'
  | 'emerald-matrix'
  | 'sunset-dunes'
  | 'cyber-neon'
  | 'botanical-zen'
  | 'blueprint-grid'
  | 'chat-doodles'
  | 'pure-oled'
  | 'charcoal-elegance'
  | 'warm-sand'
  | 'nordic-mist'
  | 'custom';

export type MessageAnimationType = 'smooth' | 'bounce' | 'instant' | 'subtle';
export type AccentColor = 'indigo' | 'emerald' | 'violet' | 'rose' | 'sky' | 'amber';
export type BubbleStyle = 'rounded' | 'modern' | 'minimal';
export type DarkTone = 'slate' | 'oled' | 'obsidian';

export interface ChatThemeConfig {
  wallpaperId: WallpaperPresetId;
  customUrl?: string;
  dimming: number; // 0 to 80 percent dark overlay
  blur: number; // 0 to 12 px blur
  animateWallpaper: boolean;
  messageAnimation: MessageAnimationType;
  accentColor: AccentColor;
  bubbleStyle: BubbleStyle;
  darkTone: DarkTone;
}

export interface WallpaperPreset {
  id: WallpaperPresetId;
  title: string;
  category: 'Modern' | 'Gradients' | 'Patterns' | 'Minimalist' | 'Custom';
  description: string;
  previewGradient: string;
  backgroundStyle: string; // CSS background rule
  patternOverlay?: string; // Optional SVG or pattern
  recommendedDimming: number;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'default',
    title: 'Clean Minimalist',
    category: 'Minimalist',
    description: 'Crisp, distraction-free neutral canvas that matches daylight and dark mode.',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    backgroundStyle: 'transparent',
    recommendedDimming: 0,
  },
  {
    id: 'midnight-cosmos',
    title: 'Midnight Cosmos',
    category: 'Gradients',
    description: 'Deep starlit space nebula with twinkling cosmic particles and rich purple-indigo hues.',
    previewGradient: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
    backgroundStyle:
      'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
    patternOverlay: `radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.7), rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #a855f7, rgba(0,0,0,0))`,
    recommendedDimming: 20,
  },
  {
    id: 'emerald-matrix',
    title: 'Emerald Cyber',
    category: 'Patterns',
    description: 'Subtle neon emerald grid and dark high-tech cipher geometry.',
    previewGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #021a14 100%)',
    backgroundStyle:
      'radial-gradient(circle at 50% 50%, #022c22 0%, #061c17 60%, #010d0a 100%)',
    patternOverlay: `linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)`,
    recommendedDimming: 25,
  },
  {
    id: 'sunset-dunes',
    title: 'Sunset Twilight',
    category: 'Gradients',
    description: 'Warm dusk twilight with soft golden amber blending into deep evening plum.',
    previewGradient: 'linear-gradient(135deg, #4c0519 0%, #7c2d12 50%, #1e1b4b 100%)',
    backgroundStyle:
      'linear-gradient(160deg, #450a0a 0%, #31135e 50%, #09090b 100%)',
    recommendedDimming: 30,
  },
  {
    id: 'cyber-neon',
    title: 'Synthwave Night',
    category: 'Modern',
    description: 'Retro 80s dusk with deep ultraviolet glow and subtle neon horizon lines.',
    previewGradient: 'linear-gradient(135deg, #2e1065 0%, #581c87 50%, #0f172a 100%)',
    backgroundStyle:
      'radial-gradient(circle at 50% 10%, #3b0764 0%, #1e1b4b 45%, #020617 100%)',
    patternOverlay: `linear-gradient(rgba(217, 70, 239, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.07) 1px, transparent 1px)`,
    recommendedDimming: 25,
  },
  {
    id: 'botanical-zen',
    title: 'Botanical Zen',
    category: 'Patterns',
    description: 'Calming sage and forest dusk tones with subtle organic geometry.',
    previewGradient: 'linear-gradient(135deg, #064e3b 0%, #134e4a 50%, #022c22 100%)',
    backgroundStyle:
      'linear-gradient(135deg, #064e3b 0%, #0f2e28 50%, #021a15 100%)',
    patternOverlay: `radial-gradient(circle at 25px 25px, rgba(52, 211, 153, 0.06) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(16, 185, 129, 0.06) 2%, transparent 0%)`,
    recommendedDimming: 20,
  },
  {
    id: 'blueprint-grid',
    title: 'Blueprint Mesh',
    category: 'Patterns',
    description: 'Precision engineering grid with crisp slate accents.',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    backgroundStyle: 'linear-gradient(135deg, #0a192f 0%, #020c1b 100%)',
    patternOverlay: `linear-gradient(rgba(56, 189, 248, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.07) 1px, transparent 1px)`,
    recommendedDimming: 15,
  },
  {
    id: 'chat-doodles',
    title: 'Chat Doodles',
    category: 'Patterns',
    description: 'Subtle social communication doodle motifs for a lively messenger vibe.',
    previewGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    backgroundStyle: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
    patternOverlay: `radial-gradient(circle at 20px 20px, rgba(165, 180, 252, 0.08) 3px, transparent 4px), radial-gradient(circle at 60px 60px, rgba(165, 180, 252, 0.05) 5px, transparent 6px)`,
    recommendedDimming: 15,
  },
  {
    id: 'pure-oled',
    title: 'Pure OLED Black',
    category: 'Minimalist',
    description: 'Absolute 0% pitch black. Maximum battery efficiency and deepest dark contrast.',
    previewGradient: '#000000',
    backgroundStyle: '#000000',
    recommendedDimming: 0,
  },
  {
    id: 'charcoal-elegance',
    title: 'Charcoal Obsidian',
    category: 'Minimalist',
    description: 'Matte dark slate with ultra-smooth low contrast for relaxed reading.',
    previewGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    backgroundStyle: '#18181b',
    recommendedDimming: 0,
  },
  {
    id: 'warm-sand',
    title: 'Warm Parchment',
    category: 'Gradients',
    description: 'Soft daylight warmth with natural cream and sepia tones.',
    previewGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    backgroundStyle: 'linear-gradient(135deg, #fef3c7 0%, #f5f5f4 100%)',
    recommendedDimming: 10,
  },
  {
    id: 'nordic-mist',
    title: 'Nordic Mist',
    category: 'Gradients',
    description: 'Cool glacial blue and misty slate for a calm, airy atmosphere.',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    backgroundStyle: 'linear-gradient(145deg, #111827 0%, #1f2937 60%, #111827 100%)',
    recommendedDimming: 20,
  },
  {
    id: 'custom',
    title: 'Custom Wallpaper',
    category: 'Custom',
    description: 'Use your own custom picture, background graphic, or uploaded photo.',
    previewGradient: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    backgroundStyle: 'transparent',
    recommendedDimming: 35,
  },
];

export const DEFAULT_THEME_CONFIG: ChatThemeConfig = {
  wallpaperId: 'default',
  dimming: 15,
  blur: 0,
  animateWallpaper: false,
  messageAnimation: 'smooth',
  accentColor: 'indigo',
  bubbleStyle: 'rounded',
  darkTone: 'slate',
};

const THEME_LISTENERS = new Set<() => void>();

export function notifyThemeChange() {
  THEME_LISTENERS.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Listener error in wallpaperService', e);
    }
  });
}

export function subscribeToThemeChanges(callback: () => void): () => void {
  THEME_LISTENERS.add(callback);
  return () => {
    THEME_LISTENERS.delete(callback);
  };
}

/**
 * Gets active theme config for a specific chat or the global default.
 */
export function getChatTheme(chatId?: string): ChatThemeConfig {
  try {
    const globalRaw = localStorage.getItem('nexxo_global_chat_theme');
    const globalConfig: ChatThemeConfig = globalRaw
      ? { ...DEFAULT_THEME_CONFIG, ...JSON.parse(globalRaw) }
      : { ...DEFAULT_THEME_CONFIG };

    if (!chatId) {
      return globalConfig;
    }

    const perChatRaw = localStorage.getItem(`nexxo_chat_theme_${chatId}`);
    if (perChatRaw) {
      return { ...globalConfig, ...JSON.parse(perChatRaw) };
    }

    return globalConfig;
  } catch (err) {
    console.warn('Failed reading chat theme configuration:', err);
    return { ...DEFAULT_THEME_CONFIG };
  }
}

/**
 * Saves chat theme configuration either for a specific chat, or as global default.
 */
export function saveChatTheme(
  config: ChatThemeConfig,
  chatId?: string,
  setAsDefault: boolean = false
): void {
  try {
    const serialized = JSON.stringify(config);
    if (setAsDefault || !chatId) {
      localStorage.setItem('nexxo_global_chat_theme', serialized);
    }
    if (chatId) {
      localStorage.setItem(`nexxo_chat_theme_${chatId}`, serialized);
    }
    notifyThemeChange();
  } catch (err) {
    console.warn('Failed saving chat theme configuration:', err);
  }
}

/**
 * Resets a chat theme back to global default or clean minimalist.
 */
export function resetChatTheme(chatId?: string): void {
  try {
    if (chatId) {
      localStorage.removeItem(`nexxo_chat_theme_${chatId}`);
    } else {
      localStorage.removeItem('nexxo_global_chat_theme');
    }
    notifyThemeChange();
  } catch (err) {
    console.warn('Failed resetting chat theme:', err);
  }
}

/**
 * Generates combined inline CSS styles for rendering the wallpaper canvas.
 */
export function getWallpaperCssStyle(config: ChatThemeConfig): React.CSSProperties {
  const preset = WALLPAPER_PRESETS.find((p) => p.id === config.wallpaperId) || WALLPAPER_PRESETS[0];

  if (config.wallpaperId === 'custom' && config.customUrl) {
    return {
      backgroundImage: `url(${config.customUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
    };
  }

  if (preset.id === 'default') {
    return {};
  }

  if (preset.patternOverlay) {
    return {
      backgroundImage: `${preset.patternOverlay}, ${preset.backgroundStyle}`,
      backgroundSize: preset.id === 'midnight-cosmos' ? '200px 200px, 100% 100%' : preset.id === 'blueprint-grid' || preset.id === 'emerald-matrix' || preset.id === 'cyber-neon' ? '24px 24px, 100% 100%' : '100% 100%',
      backgroundRepeat: 'repeat, no-repeat',
      filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
    };
  }

  if (preset.backgroundStyle.includes('gradient')) {
    return {
      backgroundImage: preset.backgroundStyle,
      filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
    };
  }

  return {
    backgroundColor: preset.backgroundStyle,
    filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
  };
}

export const ACCENT_COLOR_CLASSES: Record<
  AccentColor,
  {
    bubbleSent: string;
    text: string;
    border: string;
    bgBadge: string;
    ring: string;
    preview: string;
  }
> = {
  indigo: {
    bubbleSent: 'bg-indigo-600 text-white shadow-indigo-200/50 dark:shadow-none',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500',
    bgBadge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-500',
    preview: '#6366f1',
  },
  emerald: {
    bubbleSent: 'bg-emerald-600 text-white shadow-emerald-200/50 dark:shadow-none',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500',
    bgBadge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500',
    preview: '#10b981',
  },
  violet: {
    bubbleSent: 'bg-violet-600 text-white shadow-violet-200/50 dark:shadow-none',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500',
    bgBadge: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500',
    preview: '#8b5cf6',
  },
  rose: {
    bubbleSent: 'bg-rose-600 text-white shadow-rose-200/50 dark:shadow-none',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500',
    bgBadge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-500',
    preview: '#f43f5e',
  },
  sky: {
    bubbleSent: 'bg-sky-600 text-white shadow-sky-200/50 dark:shadow-none',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500',
    bgBadge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500',
    preview: '#0ea5e9',
  },
  amber: {
    bubbleSent: 'bg-amber-600 text-white shadow-amber-200/50 dark:shadow-none',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500',
    bgBadge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500',
    preview: '#f59e0b',
  },
};
