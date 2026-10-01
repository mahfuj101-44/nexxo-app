import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  QrCode,
  Copy,
  AlertTriangle,
  FileCheck,
  Github,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PlatformSettings } from '../../types';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  platformSettings?: PlatformSettings | null;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  platformSettings,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Default to hosted APK path or configured download URL
  const apkDownloadUrl =
    platformSettings?.androidApkDownloadUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}/nexxo.apk` : '/nexxo.apk');

  useEffect(() => {
    if (isOpen && apkDownloadUrl) {
      QRCode.toDataURL(apkDownloadUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(setQrCodeDataUrl).catch(() => {});
    }
  }, [isOpen, apkDownloadUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(apkDownloadUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Download NEXXO for Android
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  APK v1.0
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Install the native mobile app on any Android device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Direct Download Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {qrCodeDataUrl && (
                <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <img src={qrCodeDataUrl} alt="Scan QR to Download APK" className="w-28 h-28" />
                  <p className="text-[10px] text-center text-slate-600 font-semibold mt-1">Scan from Phone</p>
                </div>
              )}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Direct Android Package (APK)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Optimized native Android package featuring real-time WebRTC calling, camera & microphone access, hardware back navigation, and biometric PIN lock.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <a
                    href={apkDownloadUrl}
                    download="nexxo-enterprise.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download APK File
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Simple Steps to Install */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              How to Install on Android (3 Steps)
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Download the APK</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the <b>Download APK</b> button or scan the QR code above with your phone camera.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Confirm Download</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    If Android displays <i>"File might be harmful"</i> (standard Android prompt for direct downloads outside Google Play), tap <b>Download anyway</b>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Tap Install & Launch</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Open the downloaded file from your notifications or <i>Downloads</i> folder, allow <i>"Install unknown apps"</i> if prompted by Chrome/browser, and tap <b>Install</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Actions Cloud APK Build Option */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  GitHub Actions Cloud Builder
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    CI / CD
                  </span>
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto Build Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Whenever you push commits to GitHub, the automated cloud pipeline builds the latest <code className="text-indigo-400">app-debug.apk</code> and uploads it to <b>Actions &gt; Artifacts</b> for instant 1-click download.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-mono">
              <div className="text-indigo-400 font-sans font-bold text-[10px] uppercase tracking-wider">
                Download via GitHub in 3 Clicks:
              </div>
              <div>1. Open your GitHub Repository &rarr; Click <span className="text-white font-bold">Actions</span></div>
              <div>2. Click latest <span className="text-emerald-400">Build NEXXO Android APK</span> run</div>
              <div>3. Under <span className="text-amber-400 font-bold">Artifacts</span> &rarr; Click <span className="text-white underline">NEXXO-Android-Debug-v1.0</span></div>
            </div>
          </div>

          {/* System Compatibility */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>Target: Android 8.0 to Android 16 (API 26–36)</span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Package: com.nexxo.enterprise</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
