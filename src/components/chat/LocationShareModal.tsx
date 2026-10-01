import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Send, X, AlertCircle, RefreshCw, Compass, CheckCircle2 } from 'lucide-react';
import { LocationData } from '../../types';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => void;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  isOpen,
  onClose,
  onSendLocation,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [placeLabel, setPlaceLabel] = useState('Current Location');
  const [addressDetails, setAddressDetails] = useState<string>('');

  const fetchCoordinates = () => {
    setLoading(true);
    setError(null);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ latitude, longitude, accuracy });
        setAddressDetails(`${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E (±${Math.round(accuracy)}m)`);
        setLoading(false);
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or device settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchCoordinates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!coords) return;
    onSendLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      placeName: placeLabel.trim() || 'Shared Location',
      address: addressDetails,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Share Location</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Send your live GPS pin to this conversation</p>
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
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Acquiring high-accuracy GPS coordinates...</p>
              <p className="text-xs text-slate-500">Checking device location sensors</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <p className="font-medium text-xs leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={fetchCoordinates}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Location Request
              </button>
            </div>
          ) : coords ? (
            <>
              {/* Map Preview Card */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 shadow-inner">
                {/* Embed Map Preview using OSM / Google search fallback */}
                <iframe
                  title="Location Map"
                  className="w-full h-44 border-0 pointer-events-none"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.005}%2C${coords.latitude - 0.005}%2C${coords.longitude + 0.005}%2C${coords.latitude + 0.005}&layer=mapnik&marker=${coords.latitude}%2C${coords.longitude}`}
                />
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>GPS Locked (±{Math.round(coords.accuracy || 10)}m)</span>
                </div>
              </div>

              {/* Coordinates & Custom Place Label */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location Label / Note
                  </label>
                  <input
                    type="text"
                    value={placeLabel}
                    onChange={(e) => setPlaceLabel(e.target.value)}
                    placeholder="e.g. Current Location, Home, Office, Coffee Shop"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={60}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    <span>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchCoordinates}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!coords || loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Share Location Pin
          </button>
        </div>
      </div>
    </div>
  );
};
