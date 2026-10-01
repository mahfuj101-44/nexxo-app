import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { NexxoLogo } from './NexxoLogo';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone,
  Mail,
  UserCheck,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { DownloadApkModal } from './common/DownloadApkModal';
import { PlatformSettings } from '../types';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
  platformSettings?: PlatformSettings | null;
}

interface KnownAccount {
  email: string;
  name: string;
  badge?: string;
  isOwner?: boolean;
}

const DEFAULT_ACCOUNTS: KnownAccount[] = [
  {
    email: 'mahfuj101.mtw@gmail.com',
    name: 'Mahfuj (Admin)',
    badge: 'Owner & Admin',
    isOwner: true,
  },
  {
    email: 'silentkillerrider101@gmail.com',
    name: 'Platform Admin',
    badge: 'System Admin',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, platformSettings }) => {
  const [loading, setLoading] = useState(false);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadApkModal, setShowDownloadApkModal] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<KnownAccount[]>(DEFAULT_ACCOUNTS);

  // Load any previously used accounts on this device
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexxo_saved_accounts');
      if (saved) {
        const parsed: KnownAccount[] = JSON.parse(saved);
        const map = new Map<string, KnownAccount>();
        DEFAULT_ACCOUNTS.forEach((acc) => map.set(acc.email.toLowerCase(), acc));
        parsed.forEach((acc) => {
          if (!map.has(acc.email.toLowerCase())) {
            map.set(acc.email.toLowerCase(), acc);
          }
        });
        setRecentAccounts(Array.from(map.values()));
      }
    } catch {
      // fallback to defaults
    }
  }, []);

  const saveAccountToRecent = (email: string) => {
    try {
      const lower = email.trim().toLowerCase();
      const exists = recentAccounts.some((a) => a.email.toLowerCase() === lower);
      if (!exists) {
        const updated = [
          ...recentAccounts,
          { email: lower, name: lower.split('@')[0], badge: 'User' },
        ];
        setRecentAccounts(updated);
        localStorage.setItem('nexxo_saved_accounts', JSON.stringify(updated));
      }
    } catch {
      // storage quota or private browsing
    }
  };

  const handleSelectAccountAndSignIn = async (targetEmail?: string) => {
    try {
      setLoading(true);
      setError(null);
      const emailToUse = targetEmail || customEmail.trim();

      if (emailToUse) {
        setActiveEmail(emailToUse);
        saveAccountToRecent(emailToUse);
      }

      // Configure Google Auth Provider with In-App Account Selection
      const provider = new GoogleAuthProvider();
      const customParams: Record<string, string> = {
        prompt: 'select_account',
      };

      if (emailToUse) {
        customParams.login_hint = emailToUse;
      }

      provider.setCustomParameters(customParams);

      // 1. Try popup first (for web browsers & modern WebViews)
      try {
        await signInWithPopup(auth, provider);
        if (onAuthSuccess) onAuthSuccess();
        return;
      } catch (popupErr: any) {
        // If popup closed intentionally by user
        if (popupErr.code === 'auth/popup-closed-by-user') {
          setError('Sign-in was cancelled. Tap your account below to try again.');
          return;
        }

        // If popup is blocked or running in Android WebView, use in-app redirect
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment' ||
          popupErr.message?.includes('popup')
        ) {
          const { signInWithRedirect } = await import('firebase/auth');
          // With capacitor.config.ts allowNavigation, this stays 100% inside the app!
          await signInWithRedirect(auth, provider);
          return;
        }

        throw popupErr;
      }
    } catch (err: any) {
      console.error('In-app Google Authentication error:', err);
      if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid Google credentials. Please select your account again.');
      } else {
        setError(err.message || 'Failed to authenticate with Google inside the app.');
      }
    } finally {
      setLoading(false);
      setActiveEmail(null);
    }
  };

  const isRegistrationPaused = platformSettings && platformSettings.registrationEnabled === false;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Background Decorative Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <NexxoLogo size="md" />
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Engine Online</span>
        </div>
      </header>

      {/* Main Hero & Auth Gateway */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl shadow-slate-200/60 dark:shadow-indigo-950/20">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              In-App Google Authentication
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
              Welcome to NEXXO
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select your Gmail account right inside the app to sign in securely.
            </p>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-600 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Authentication Notice</p>
                <p className="text-rose-600/90 dark:text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Registration Paused Warning if applicable */}
          {isRegistrationPaused && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>
                New registrations are paused. Existing account holders can sign in below.
              </span>
            </div>
          )}

          {/* In-App Gmail Account Selection Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Choose Gmail Account:
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> In-App Only (No Browser)
              </span>
            </div>

            {/* List of Known / Saved Accounts */}
            <div className="space-y-2">
              {recentAccounts.map((account) => {
                const isSelected = activeEmail === account.email && loading;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleSelectAccountAndSignIn(account.email)}
                    disabled={loading}
                    className={`w-full group text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-sm text-indigo-600 dark:text-indigo-300 shrink-0 shadow-2xs">
                        {account.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {account.name}
                          </p>
                          {account.badge && (
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                account.isOwner
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {account.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {account.email}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Enter Custom / Other Gmail Account */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Use another Google / Gmail account</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-indigo-500" /> Enter Gmail Address:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectAccountAndSignIn(customEmail)}
                    disabled={!customEmail.trim() || loading}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Standard One-Tap Google Sign-In Button */}
          <button
            id="google-signin-btn"
            onClick={() => handleSelectAccountAndSignIn()}
            disabled={loading}
            className="w-full relative group flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-200 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading && !activeEmail ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Authenticating inside NEXXO...</span>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google In-App Account Chooser</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Download Android APK Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDownloadApkModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl font-semibold text-xs transition-all duration-200 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Download NEXXO Android App (APK v1.0)</span>
            </button>
          </div>

          {/* Highlights & Guarantees */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>In-App login — Never redirects to external browser</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Automatic permanent NEXXO ID provisioning</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>End-to-end encrypted messaging &amp; WebRTC calls</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} NEXXO Enterprise Network. All rights reserved.</p>
      </footer>

      {/* Download APK Modal */}
      <DownloadApkModal
        isOpen={showDownloadApkModal}
        onClose={() => setShowDownloadApkModal(false)}
        platformSettings={platformSettings}
      />
    </div>
  );
};
