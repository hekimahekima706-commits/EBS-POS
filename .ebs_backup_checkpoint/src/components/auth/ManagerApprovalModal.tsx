import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';

interface ManagerApprovalModalProps {
  actionTitle: string;
  actionDescription: string;
  onApproved: (approver: User) => void;
  onCancel: () => void;
}

export const ManagerApprovalModal: React.FC<ManagerApprovalModalProps> = ({
  actionTitle,
  actionDescription,
  onApproved,
  onCancel,
}) => {
  const { verifyManagerApproval, users } = useApp();
  const [approverIdentifier, setApproverIdentifier] = useState('');
  const [pinOrPass, setPinOrPass] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter supervisor accounts for fast selector
  const supervisors = users.filter(
    (u) => (u.role === 'owner' || u.role === 'manager' || u.role === 'admin') && u.active
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverIdentifier.trim()) {
      setErrorMsg('Tafadhali chagua au andika username/simu ya msimamizi.');
      return;
    }
    if (!pinOrPass.trim()) {
      setErrorMsg('Tafadhali ingiza PIN au Password ya Msimamizi.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await verifyManagerApproval(approverIdentifier, pinOrPass, `${actionTitle}: ${actionDescription}`);
      if (res.success && res.approver) {
        onApproved(res.approver);
      } else {
        setErrorMsg(res.message || 'PIN au Password ya Msimamizi si sahihi.');
      }
    } catch (err: any) {
      setErrorMsg('Hitilafu wakati wa kuhakiki idhini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-100">
          Idhini ya Msimamizi / Mmiliki Inahitajika
        </h3>

        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <strong>Kitendo:</strong> {actionTitle}
          <div className="text-slate-400 mt-0.5">{actionDescription}</div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Msimamizi Anayeidhinisha (Owner / Manager)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {supervisors.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setApproverIdentifier(s.username);
                    setErrorMsg(null);
                  }}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    approverIdentifier === s.username
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{s.role}</div>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={approverIdentifier}
              onChange={(e) => setApproverIdentifier(e.target.value)}
              placeholder="au andika Username / Namba ya Simu..."
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              PIN au Password ya Msimamizi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={pinOrPass}
                onChange={(e) => setPinOrPass(e.target.value)}
                placeholder="Ingiza PIN au Password..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/30 flex items-center gap-2"
            >
              {loading ? 'Inahakiki...' : 'Idhinisha Kitendo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
