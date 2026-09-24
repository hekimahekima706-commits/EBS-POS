import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  KeyRound,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { COLOR_SCHEMES, getColorScheme } from '../../utils/themeHelper';

interface LoginViewProps {
  onLoginSuccess?: () => void;
  onOpenSuperAdmin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenSuperAdmin }) => {
  const { users, loginUser, changePassword, profile, primaryColor, language, t } = useApp();

  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // First Login mandatory change state
  const [mustChangeUser, setMustChangeUser] = useState<any | null>(null);
  const [oldPasswordForMandatory, setOldPasswordForMandatory] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const scheme = getColorScheme(primaryColor);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!usernameOrPhone.trim()) {
      setErrorMsg('Tafadhali ingiza Username au Namba ya Simu.');
      return;
    }
    if (!password) {
      setErrorMsg('Tafadhali ingiza Neno la Siri (Password).');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(usernameOrPhone, password);
      if (res.success && res.user) {
        if (res.mustChangePassword) {
          setMustChangeUser(res.user);
          setOldPasswordForMandatory(password);
          setShowChangePassword(true);
        } else {
          setSuccessMsg('Umeingia kikamilifu!');
          if (onLoginSuccess) onLoginSuccess();
        }
      } else {
        setErrorMsg(res.message || 'Hitilafu ya kuingia kwenye mfumo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu ya mtandao au mfumo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRoleClick = (role: UserRole) => {
    const demoUser = users.find((u) => u.role === role && u.active);
    if (demoUser) {
      setUsernameOrPhone(demoUser.username);
      setPassword('');
      setErrorMsg(null);
      setSuccessMsg(`Imechaguliwa akaunti ya ${demoUser.name} (${demoUser.role}). Ingiza neno la siri.`);
      const passInput = document.getElementById('login-password-input');
      if (passInput) passInput.focus();
    }
  };

  const handleSaveMandatoryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    if (newPassword.length < 8) {
      setChangeError('Neno jipya la siri lazima liwe na angalau herufi 8 (mchanganyiko wa herufi na namba).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Maneno ya siri mapya hayafanani.');
      return;
    }
    if (newPin && newPin.length < 4) {
      setChangeError('PIN lazima iwe na angalau tarakimu 4 (mfano: 1234).');
      return;
    }
    if (newPin && newPin !== confirmPin) {
      setChangeError('PIN na uthibitisho wa PIN havifanani.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(oldPasswordForMandatory, newPassword, newPin || '1234');
      if (res.success) {
        setShowChangePassword(false);
        setMustChangeUser(null);
        setSuccessMsg('Neno jipya la siri na PIN vimewekwa! Karibu kwenye mfumo.');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setChangeError(res.message || 'Hitilafu ya kubadilisha password.');
      }
    } catch (err: any) {
      setChangeError(err.message || 'Hitilafu ya mfumo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow & accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/ebs-logo-chaguo2-icon-dark.png"
              onError={(e) => {
                e.currentTarget.src = '/ebs-logo-chaguo2-icon.png';
              }}
              alt="EBS Enterprise POS Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl shadow-2xl shadow-emerald-950/60 border border-emerald-500/30 bg-slate-900/60 p-1"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            {profile.name || 'EBS SMART BIZ'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {profile.tagline || 'Mfumo Mahiri wa Mauzo, Stoo & Usimamizi wa Biashara'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>EBS V1.3.1 • BIASHARA KIDIGITAL</span>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <span>KARIBU EBS</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingiza namba ya simu au username na neno la siri ili kuendelea.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username au Namba ya Simu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameOrPhone}
                  onChange={(e) => setUsernameOrPhone(e.target.value)}
                  placeholder="mfano: 0712345678 au amani"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Neno la Siri (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                >
                  Umesahau password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inahakiki...</span>
                </>
              ) : (
                <>
                  <span>Ingia Kwenye Mfumo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Akaunti za Majaribio (Demo Roles):
              </span>
              <span className="text-[10px] text-slate-500">Bofya kuingia haraka</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoRoleClick('owner')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200">👑 Owner</div>
                <div className="text-[10px] text-slate-400 truncate">owner01 (Selemani)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRoleClick('manager')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-blue-300 group-hover:text-blue-200">👔 Manager</div>
                <div className="text-[10px] text-slate-400 truncate">manager01 (Temu)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRoleClick('cashier')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">💳 Cashier</div>
                <div className="text-[10px] text-slate-400 truncate">cashier01 (Neema)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRoleClick('waiter')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-purple-300 group-hover:text-purple-200">🍽️ Waiter</div>
                <div className="text-[10px] text-slate-400 truncate">waiter01 (Kelvin)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRoleClick('storekeeper')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-orange-300 group-hover:text-orange-200">📦 Stoo</div>
                <div className="text-[10px] text-slate-400 truncate">store01 (Fatuma)</div>
              </button>

              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-teal-300 group-hover:text-teal-200">🔑 Password</div>
                <div className="text-[10px] text-slate-400 truncate">Badilisha Neno</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <span>&copy; {new Date().getFullYear()} {profile.name || 'EBS SMART BIZ'}</span>
            <span>•</span>
            <span>Ulinzi wa Data & Usalama wa Biashara</span>
          </div>
          {onOpenSuperAdmin && (
            <button
              type="button"
              onClick={onOpenSuperAdmin}
              className="text-[11px] text-slate-500 hover:text-indigo-400 underline transition font-medium cursor-pointer"
            >
              🛡️ EBS Head Office Portal (Super Admin)
            </button>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Umesahau Neno la Siri?</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Kwa usalama wa biashara na miamala, maneno ya siri huwekwa upya na <strong>Mwenye Biashara (Owner)</strong> au <strong>Meneja Mkuu</strong> kupitia sehemu ya <span className="text-emerald-400 font-semibold">Wafanyakazi & Ruhusa</span>.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1.5">
              <div>💡 <strong>Mawasiliano ya Msaada:</strong> {profile.phone || '0676674705'}</div>
              <div>💡 <strong>Akaunti ya Awali ya Mmiliki:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">owner01</code></div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Nimeelewa (Funga)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory / First Login Change Password & PIN Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              {mustChangeUser ? 'Uwekaji wa Neno Jipya la Siri na PIN' : 'Badilisha Neno la Siri'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {mustChangeUser
                ? `Habari ${mustChangeUser.name}, kwa usalama wa biashara unahitajika kuweka neno lako jipya la siri na PIN ya kufungulia kabla ya kuingia kwenye mfumo.`
                : 'Ingiza neno la siri la sasa na neno jipya la siri unalotaka.'}
            </p>

            {changeError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <div>{changeError}</div>
              </div>
            )}

            <form onSubmit={handleSaveMandatoryPassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Neno la Siri la Sasa / la Muda
                </label>
                <input
                  type="password"
                  value={oldPasswordForMandatory}
                  onChange={(e) => setOldPasswordForMandatory(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Neno Jipya la Siri (Angalau herufi 8)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Angalau herufi 8 (mfano: Mbeya2026!)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Thibitisha Neno Jipya la Siri
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Rudia neno jipya la siri"
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {mustChangeUser && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      PIN ya Haraka ya Kufungulia (Tarakimu 4-6)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="mfano: 1234"
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Hutumika kufungua skrini ya lock au idhini za haraka kwenye POS.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Thibitisha PIN ya Haraka
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Rudia PIN ya tarakimu 4"
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                {!mustChangeUser && (
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Ghairi
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                >
                  {loading ? 'Inahifadhi...' : 'Hifadhi & Ingia Kwenye Mfumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
