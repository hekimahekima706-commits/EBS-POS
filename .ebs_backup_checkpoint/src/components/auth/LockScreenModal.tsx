import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, KeyRound, ArrowRight, UserCheck, LogOut, ShieldAlert } from 'lucide-react';
import { getColorScheme } from '../../utils/themeHelper';

export const LockScreenModal: React.FC = () => {
  const { currentUser, unlockSession, logoutUser, primaryColor, profile } = useApp();
  const [pinOrPass, setPinOrPass] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scheme = getColorScheme(primaryColor);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinOrPass.trim()) {
      setErrorMsg('Tafadhali ingiza PIN au Password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await unlockSession(pinOrPass);
      if (!res.success) {
        setErrorMsg(res.message || 'PIN au Password si sahihi.');
      } else {
        setPinOrPass('');
      }
    } catch (err: any) {
      setErrorMsg('Hitilafu ya kufungua mfumo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadClick = (num: string) => {
    if (pinOrPass.length < 12) {
      setPinOrPass((prev) => prev + num);
      setErrorMsg(null);
    }
  };

  const handleKeypadBackspace = () => {
    setPinOrPass((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative z-10 text-center">
        {/* Lock Icon & User Info */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-950/50 mb-4 border border-emerald-400/30">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
          {profile.name || 'EBS SMART BIZ'}
        </h2>
        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentUser.name} ({currentUser.role.toUpperCase()})</span>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Mfumo umefungwa. Ingiza PIN au Password kuendelea.
        </p>

        {errorMsg && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="mt-4 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={pinOrPass}
              onChange={(e) => setPinOrPass(e.target.value)}
              placeholder="Ingiza PIN au Password..."
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-center text-slate-100 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Quick PIN Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeypadClick(n)}
                className="py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-100 font-bold text-lg border border-slate-700/60 transition-all"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60"
            >
              Futa ⌫
            </button>
            <button
              type="button"
              onClick={() => handleKeypadClick('0')}
              className="py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-bold text-lg border border-slate-700/60"
            >
              0
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm border border-emerald-500 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1"
            >
              {loading ? '...' : <ArrowRight className="w-5 h-5" />}
            </button>
          </div>

          {/* User Switch & Logout Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Badilisha Mtumiaji / Toka</span>
            </button>
            <span className="text-[10px] text-slate-500">EBS Security Lock</span>
          </div>
        </form>
      </div>
    </div>
  );
};
