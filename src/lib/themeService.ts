import { AppThemeMode } from '../types';

export interface ThemeOptionInfo {
  id: AppThemeMode;
  title: string;
  shortLabel: string;
  description: string;
  iconName: 'Sun' | 'Moon' | 'Contrast' | 'Monitor';
  badge?: string;
}

export const THEME_OPTIONS: ThemeOptionInfo[] = [
  {
    id: 'light',
    title: 'Light Mode',
    shortLabel: 'Light',
    description: 'Clean daylight aesthetic with soft borders, high legibility, and airy workspace layout.',
    iconName: 'Sun',
  },
  {
    id: 'dark',
    title: 'Dark Mode',
    shortLabel: 'Dark',
    description: 'Refined twilight slate canvas designed for low-light comfort and reduced eye fatigue.',
    iconName: 'Moon',
  },
  {
    id: 'high-contrast',
    title: 'High Contrast',
    shortLabel: 'Contrast',
    description: 'Ultra-stark monochrome with pure OLED black, solid bright borders, and WCAG AAA compliance.',
    iconName: 'Contrast',
    badge: 'Accessible',
  },
  {
    id: 'system',
    title: 'System Default',
    shortLabel: 'System',
    description: 'Automatically synchronizes with your device operating system theme in real-time.',
    iconName: 'Monitor',
    badge: 'Auto',
  },
];

/**
 * Checks whether the user's operating system prefers dark mode.
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false; // Default fallback to light
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolves an AppThemeMode to its active visual rendering theme: 'light', 'dark', or 'high-contrast'.
 */
export function resolveEffectiveTheme(mode: AppThemeMode): 'light' | 'dark' | 'high-contrast' {
  if (mode === 'system') {
    return getSystemPrefersDark() ? 'dark' : 'light';
  }
  return mode;
}

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Applies the given theme mode to the HTML document element, optionally triggering
 * a smooth transition animation across all element colors, borders, and backgrounds.
 */
export function applyThemeToDocument(mode: AppThemeMode, animateTransition = true): 'light' | 'dark' | 'high-contrast' {
  if (typeof document === 'undefined') return 'light';

  const root = document.documentElement;
  const effective = resolveEffectiveTheme(mode);

  if (animateTransition) {
    // Trigger smooth transition class
    root.classList.add('theme-transitioning');
    if (transitionTimeout) {
      clearTimeout(transitionTimeout);
    }
    transitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      transitionTimeout = null;
    }, 450);
  }

  // Update DOM classes and data attributes
  const isDark = effective === 'dark' || effective === 'high-contrast';
  const isHighContrast = effective === 'high-contrast';

  root.classList.toggle('dark', isDark);
  root.classList.toggle('high-contrast', isHighContrast);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.setAttribute('data-theme-mode', mode);
  root.setAttribute('data-effective-theme', effective);

  return effective;
}

/**
 * Persists theme mode to local storage and legacy storage key.
 */
export function persistThemeMode(mode: AppThemeMode): void {
  try {
    localStorage.setItem('nexxo_theme_mode', mode);
    localStorage.setItem('nexxo_theme_default_v2', 'true');
    // Maintain legacy key for backward compatibility
    const effective = resolveEffectiveTheme(mode);
    localStorage.setItem('nexxo_theme', effective === 'light' ? 'light' : 'dark');
  } catch (e) {
    console.warn('Could not persist theme mode to localStorage', e);
  }
}

/**
 * Reads initial theme mode from storage or defaults strictly to 'light'.
 */
export function loadInitialThemeMode(): AppThemeMode {
  try {
    // Migration: ensure every user transitions seamlessly to default Light mode
    const hasDefaultedV2 = localStorage.getItem('nexxo_theme_default_v2');
    if (!hasDefaultedV2) {
      localStorage.setItem('nexxo_theme_default_v2', 'true');
      localStorage.setItem('nexxo_theme_mode', 'light');
      localStorage.setItem('nexxo_theme', 'light');
      return 'light';
    }

    const savedMode = localStorage.getItem('nexxo_theme_mode') as AppThemeMode | null;
    if (savedMode && ['light', 'dark', 'high-contrast', 'system'].includes(savedMode)) {
      return savedMode;
    }
    const legacy = localStorage.getItem('nexxo_theme');
    if (legacy === 'light') return 'light';
    if (legacy === 'dark') return 'dark';
  } catch (e) {
    console.warn('Could not read theme mode from localStorage', e);
  }
  return 'light';
}

/**
 * Toggles directly between Light and Dark mode just like in every standard app.
 * If currently in system or high-contrast, toggles to the opposite of active visual state.
 */
export function getNextThemeMode(current: AppThemeMode): AppThemeMode {
  const effective = resolveEffectiveTheme(current);
  return effective === 'dark' || effective === 'high-contrast' ? 'light' : 'dark';
}
