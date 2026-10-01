import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, Download, Search, UserPlus, X } from 'lucide-react';
import { NexxoUser } from '../../types';
import { generateUserQrDataUrl, parseQrPayload } from '../../lib/qrService';
import { findUserByNexxoId, findUserByUsername } from '../../lib/userService';

interface QrModalProps {
  currentUser: NexxoUser;
  onClose: () => void;
  onConnectFoundUser?: (user: NexxoUser) => void;
  onUserConnected?: (user: NexxoUser) => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  currentUser,
  onClose,
  onConnectFoundUser,
  onUserConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'my_qr' | 'scan'>('my_qr');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<NexxoUser | null>(null);

  useEffect(() => {
    generateUserQrDataUrl(currentUser)
      .then(setQrDataUrl)
      .catch(console.error);
  }, [currentUser]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`nexxo://connect?id=${currentUser.nexxoId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `NEXXO_QR_${currentUser.username}.png`;
    link.click();
  };

  const handleScanOrSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setSearching(true);
    setSearchError(null);
    setFoundUser(null);

    try {
      const parsed = parseQrPayload(scanInput.trim());
      let user: NexxoUser | null = null;

      if (parsed?.nexxoId) {
        user = await findUserByNexxoId(parsed.nexxoId);
      } else if (parsed?.username) {
        user = await findUserByUsername(parsed.username);
      } else {
        // Try direct lookup
        user = await findUserByNexxoId(scanInput.trim());
        if (!user) {
          user = await findUserByUsername(scanInput.trim().replace(/^@/, ''));
        }
      }

      if (!user) {
        setSearchError('No NEXXO user found with this ID or QR code.');
      } else if (user.id === currentUser.id) {
        setSearchError('This is your own NEXXO account.');
      } else {
        setFoundUser(user);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Lookup failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">QR Connection</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('my_qr')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'my_qr'
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My NEXXO QR
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'scan'
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Scan & Connect
          </button>
        </div>

        {/* Tab 1: My QR */}
        {activeTab === 'my_qr' && (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="NEXXO QR"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 animate-pulse">
                  Generating QR...
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{currentUser.displayName}</h3>
              <p className="text-xs font-mono text-indigo-400 mt-0.5">{currentUser.nexxoId}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Scan with any camera or NEXXO reader to connect instantly
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy ID Link'}
              </button>

              <button
                onClick={handleDownloadQr}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                <Download className="h-4 w-4" /> Download QR
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Scan / Connect */}
        {activeTab === 'scan' && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleScanOrSearch} className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 block">
                Enter NEXXO ID, @username, or QR Payload
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="NX-XXXX-XXXX or @username"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={searching || !scanInput.trim()}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {searchError}
              </div>
            )}

            {foundUser && (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-white">
                    {foundUser.photoURL ? (
                      <img src={foundUser.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      foundUser.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{foundUser.displayName}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{foundUser.nexxoId}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onConnectFoundUser) onConnectFoundUser(foundUser);
                    if (onUserConnected) onUserConnected(foundUser);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Start Conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
