import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export type BackButtonHandler = () => boolean | Promise<boolean>;

interface RegisteredHandler {
  id: string;
  handler: BackButtonHandler;
  priority: number; // Higher numbers run first
}

let handlers: RegisteredHandler[] = [];
let isInitialized = false;
let lastBackPressTime = 0;

/**
 * Check if the application is executing inside a native Android Capacitor container.
 */
export function isAndroidNative(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/**
 * Check if the application is running in any Capacitor native environment.
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Register a back button handler with priority.
 * Return true from handler if the action was handled (prevents further handlers).
 * Return an unregister function.
 */
export function registerBackButtonHandler(
  handler: BackButtonHandler,
  priority = 10,
  id?: string
): () => void {
  const handlerId = id || Math.random().toString(36).substring(2, 9);
  handlers.push({ id: handlerId, handler, priority });
  // Sort descending by priority
  handlers.sort((a, b) => b.priority - a.priority);

  return () => {
    handlers = handlers.filter((h) => h.id !== handlerId);
  };
}

/**
 * Initialize native hardware back button handling and link interceptors.
 */
export function initAndroidBridge(options: {
  onExitWarning: (message: string) => void;
  onDefaultBack: () => boolean; // Return true if handled, false if at root
}) {
  if (isInitialized) return;
  isInitialized = true;

  if (isNativePlatform()) {
    CapApp.addListener('backButton', async () => {
      // 1. Run through registered custom handlers (modals, subviews, viewers)
      for (const item of [...handlers]) {
        try {
          const handled = await Promise.resolve(item.handler());
          if (handled) {
            return;
          }
        } catch (err) {
          console.error('Error executing back button handler:', err);
        }
      }

      // 2. Default app-level navigation
      const handledByDefault = options.onDefaultBack();
      if (handledByDefault) {
        return;
      }

      // 3. User is at the root with no modals or active conversations
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        // Double press within 2 seconds: exit application gracefully
        CapApp.exitApp();
      } else {
        lastBackPressTime = now;
        options.onExitWarning('Press back again to exit NEXXO');
      }
    });
  }

  // Intercept external links so they open in the native browser or external intent (WhatsApp, tel, mailto)
  setupExternalLinkInterceptor();
}

/**
 * Safely open external URLs, WhatsApp, Phone, or Email using system intents.
 */
export function openExternalUrl(url: string) {
  try {
    if (isNativePlatform()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (e) {
    console.warn('Failed to open external url:', e);
    window.location.href = url;
  }
}

/**
 * Global link interceptor for links targeting external hosts, whatsapp, tel, mailto.
 */
function setupExternalLinkInterceptor() {
  if (typeof window === 'undefined') return;

  document.addEventListener('click', (event: MouseEvent) => {
    const target = (event.target as HTMLElement)?.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href) return;

    // Handle special schemes
    if (
      href.startsWith('whatsapp:') ||
      href.startsWith('tel:') ||
      href.startsWith('mailto:') ||
      href.includes('wa.me')
    ) {
      event.preventDefault();
      event.stopPropagation();
      openExternalUrl(href);
      return;
    }

    // External http/https links
    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        const parsed = new URL(href);
        if (parsed.origin !== window.location.origin) {
          if (isNativePlatform() || target.getAttribute('target') === '_blank') {
            event.preventDefault();
            event.stopPropagation();
            openExternalUrl(href);
          }
        }
      } catch {
        // Ignore invalid URL
      }
    }
  }, { capture: true });
}

/**
 * Configure Android status bar styling to match NEXXO light / dark theme.
 */
export async function updateNativeStatusBar(isDark: boolean) {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });

    await StatusBar.setBackgroundColor({
      color: isDark ? '#0F172A' : '#FFFFFF'
    });
  } catch (err) {
    // Graceful fallback if status bar plugin is unsupported
    console.debug('StatusBar style update skipped:', err);
  }
}
