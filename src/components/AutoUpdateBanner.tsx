import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpCircle, CheckCircle, X } from 'lucide-react';
import { pushSyncQueueToServer } from '../utils/syncEngine';

const CURRENT_CLIENT_VERSION = '1.3.0';

export const AutoUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = async () => {
    try {
      const res = await fetch('/api/system/version');
      if (res.ok) {
        const data = await res.json();
        if (data.appVersion && data.appVersion !== CURRENT_CLIENT_VERSION) {
          setNewVersion(data.appVersion);
          setReleaseNotes(data.releaseNotes || 'Maboresho ya mfumo na utendaji.');
          setUpdateAvailable(true);
        }
      }
    } catch {
      // Offline or local dev
    }
  };

  useEffect(() => {
    checkForUpdate();
    const onOnline = () => checkForUpdate();
    window.addEventListener('online', onOnline);

    // Periodically check every 5 minutes
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Safely flush any pending offline queue transactions before reload
      await pushSyncQueueToServer();
    } catch (err) {
      console.warn('[EBS AutoUpdate] Pending sync queue flushed with warning:', err);
    }

    // 2. Perform smooth reload to acquire the updated application assets
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <aside
      aria-label="Taarifa ya toleo jipya"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 text-white rounded-2xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
          <ArrowUpCircle className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wide uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
              Update Mpya
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">v{newVersion}</span>
          </div>
          <p className="text-sm font-bold text-white mt-1">
            Toleo jipya la EBS lipo tayari!
          </p>
          <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
            {releaseNotes}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 transition"
          title="Funga"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Data zako zote zipo salama
        </span>
        <button
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-emerald-500/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Inasasisha...' : 'Bofya Kusasisha'}</span>
        </button>
      </div>
    </aside>
  );
};
