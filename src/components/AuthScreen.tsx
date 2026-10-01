import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { NexxoLogo } from './NexxoLogo';
import { Shield, Zap, Globe, Sparkles, AlertCircle, ArrowRight, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { DownloadApkModal } from './common/DownloadApkModal';

import { PlatformSettings } from '../types';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
  platformSettings?: PlatformSettings | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, platformSettings }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadApkModal, setShowDownloadApkModal] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Authentication error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Click below to try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Authentication request was cancelled.');
      } else if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment' ||
        err.message?.includes('popup')
      ) {
        try {
          const { signInWithRedirect } = await import('firebase/auth');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr: any) {
          setError(redirErr.message || 'Popup was blocked and redirect failed. Please check browser/WebView settings.');
        }
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please check your connection.');
      }
    } finally {
      setLoading(false);
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
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl shadow-slate-200/60 dark:shadow-indigo-950/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Global Communication
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Welcome to NEXXO
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              A modern real-time messaging platform. Connect securely with your unique Permanent NEXXO ID.
            </p>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-600 dark:text-rose-300 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Authentication Notice</p>
                <p className="text-xs text-rose-600/90 dark:text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Registration Paused Warning if applicable */}
          {isRegistrationPaused && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>
                New registrations are temporarily paused. Existing account holders can sign in below.
              </span>
            </div>
          )}

          {/* Real Google Authentication Action */}
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full relative group flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
                <span>Authenticating with Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Download Android APK Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDownloadApkModal(true)}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all duration-200 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Download NEXXO Android App (APK)</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-md">v1.0</span>
            </button>
          </div>

          {/* Highlights & Guarantees */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span>Unique Permanent NEXXO ID automatically provisioned</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span>Real-time database synchronisation & online presence</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span>Zero passwords stored, protected by Google Identity</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-900">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-500" />
          <span>Production-grade attribute-based security model</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Global Real-Time Architecture</span>
          <span>&bull;</span>
          <span>NEXXO v1.0</span>
        </div>
      </footer>

      {/* Download Android APK Modal */}
      {showDownloadApkModal && (
        <DownloadApkModal
          isOpen={showDownloadApkModal}
          onClose={() => setShowDownloadApkModal(false)}
          platformSettings={platformSettings}
        />
      )}
    </div>
  );
};
