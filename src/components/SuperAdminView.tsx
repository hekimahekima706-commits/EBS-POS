import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  Search,
  KeyRound,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Power,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { formatTZS, formatDateTime } from '../utils/formatters';

interface BusinessSummary {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  mkoa: string;
  wilaya: string;
  businessType: string;
  status: 'active' | 'suspended';
  createdDate: string;
  productsCount: number;
  salesCount: number;
  totalRevenue: number;
  usersCount: number;
  bossUsername: string;
}

interface SuperAdminActionLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetBusinessId?: string;
  targetBusinessName?: string;
  details: string;
  timestamp: string;
}

interface SuperAdminViewProps {
  onBackToApp: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onBackToApp }) => {
  const [adminToken, setAdminToken] = useState<string>(() => {
    return localStorage.getItem('ebs_superadmin_token') || '';
  });
  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ebs_superadmin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'businesses' | 'actions'>('businesses');
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [actionLogs, setActionLogs] = useState<SuperAdminActionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset Boss Password Modal state
  const [selectedBiz, setSelectedBiz] = useState<BusinessSummary | null>(null);
  const [confirmedShopName, setConfirmedShopName] = useState('');
  const [confirmedPhone, setConfirmedPhone] = useState('');
  const [newBossPassword, setNewBossPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Fetch businesses and action logs
  const fetchAdminData = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const [bizRes, logsRes] = await Promise.all([
        fetch('/api/admin/businesses', {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        fetch('/api/admin/actions', {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      ]);

      if (bizRes.status === 401 || bizRes.status === 403) {
        handleLogout();
        return;
      }

      if (bizRes.ok) {
        const bizData = await bizRes.json();
        setBusinesses(bizData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setActionLogs(logsData);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Hitilafu ya mtandao wakati wa kupakua taarifa za Super Admin.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Uthibitisho umeshindwa.');
        return;
      }

      setAdminToken(data.token);
      setAdminUser(data.admin);
      localStorage.setItem('ebs_superadmin_token', data.token);
      localStorage.setItem('ebs_superadmin_user', JSON.stringify(data.admin));
    } catch {
      setLoginError('Hitilafu ya mtandao. Jaribu tena.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    setAdminUser(null);
    localStorage.removeItem('ebs_superadmin_token');
    localStorage.removeItem('ebs_superadmin_user');
  };

  const handleResetBossPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;

    setIsSubmittingReset(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/reset-boss-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          businessId: selectedBiz.id,
          confirmedBusinessName: confirmedShopName,
          confirmedPhone: confirmedPhone,
          newPassword: newBossPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Imeshindikana kuweka upya password ya Boss.' });
        return;
      }

      setFeedback({ type: 'success', message: data.message });
      setSelectedBiz(null);
      setConfirmedShopName('');
      setConfirmedPhone('');
      setNewBossPassword('');
      fetchAdminData();
    } catch {
      setFeedback({ type: 'error', message: 'Hitilafu ya mtandao wakati wa kuwasiliana na server.' });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleToggleStatus = async (biz: BusinessSummary) => {
    const nextStatus = biz.status === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      nextStatus === 'suspended'
        ? `Je, una uhakika unataka KUZIMA biashara nzima ya "${biz?.name || 'Biashara'}"? Vifaa vyote vya duka hili vitazuiwa mara moja.`
        : `Je, una uhakika unataka KUFUNGUA tena biashara ya "${biz?.name || 'Biashara'}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/toggle-business-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          businessId: biz.id,
          status: nextStatus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        fetchAdminData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Imeshindwa kubadilisha hali.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Hitilafu ya mtandao.' });
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      (b?.name || '').toLowerCase().includes(term) ||
      b.ownerName.toLowerCase().includes(term) ||
      b.phone.includes(term) ||
      b.id.toLowerCase().includes(term)
    );
  });

  // If not logged in as super_admin, show login portal
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Rudi kwenye POS App</span>
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="flex justify-center mb-2">
              <img
                src="/ebs-logo-chaguo2-icon-dark.png"
                onError={(e) => {
                  e.currentTarget.src = '/ebs-logo-chaguo2-icon.png';
                }}
                alt="EBS Super Admin"
                className="w-20 h-20 object-contain rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-950/40 bg-slate-900/80 p-1"
              />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              EBS Head Office / Super Admin
            </h1>
            <p className="text-xs text-slate-400">
              Mlango wa kipekee wa usimamizi mkuu wa maduka na biashara zote za EBS
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Jina la Super Admin (Username)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mf. ebs_admin"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Neno la Siri (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Weka password ya Super Admin"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoggingIn ? 'Inathibitisha...' : 'Ingia Kama Super Admin'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
            Akaunti rasmi ya makao makuu: <code className="text-amber-400">ebs_admin</code> / <code className="text-amber-400">SuperAdmin2026!#</code>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Super Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src="/ebs-app-icon-pure.png"
            alt="EBS"
            className="w-9 h-9 rounded-xl object-cover border border-amber-500/40 shrink-0 shadow"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-white text-base tracking-tight">
                EBS Head Office Super Admin
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500 text-slate-950 rounded-md">
                Master Platform
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Karibu, {adminUser?.name || 'Msimamizi Mkuu'} ({adminUser?.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition"
            title="Sasisha Orodha"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={onBackToApp}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Rudi kwenye POS</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Toka Admin</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border transition ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Funga
            </button>
          </div>
        )}

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Maduka Yote (Businesses)</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{businesses.length}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Biashara Hai (Active)</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {businesses.filter((b) => b.status === 'active').length}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Zilizozuiwa (Suspended)</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">
              {businesses.filter((b) => b.status === 'suspended').length}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Jumla ya Mauzo Yaliyopita</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg md:text-xl font-black text-white truncate">
              {formatTZS(businesses.reduce((sum, b) => sum + b.totalRevenue, 0))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'businesses'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏪 Maduka na Biashara ({businesses.length})
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'actions'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛡️ Kumbukumbu za Vitendo ({actionLogs.length})
            </button>
          </div>

          {activeTab === 'businesses' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tafuta duka, mmiliki, simu..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Businesses List */}
        {activeTab === 'businesses' && (
          <div className="space-y-4">
            {filteredBusinesses.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                Hakuna biashara iliyopatikana kwa utafutaji huo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusinesses.map((b) => {
                  const isSuspended = b.status === 'suspended';

                  return (
                    <div
                      key={b.id}
                      className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition ${
                        isSuspended ? 'border-rose-500/40 opacity-75' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">
                              ID: {b.id}
                            </span>
                            <h3 className="font-black text-white text-base leading-tight mt-0.5">
                              {b?.name || 'Biashara'}
                            </h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isSuspended ? 'Imezuiwa' : 'Hai (Active)'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500">Mmiliki:</span>
                            <span className="font-bold text-white">{b.ownerName}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500">Simu:</span>
                            <span className="font-mono text-amber-400">{b.phone}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500">Eneo:</span>
                            <span>{b.mkoa}, {b.wilaya || b.address || 'Tanzania'}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500">Kujiunga:</span>
                            <span>{formatDateTime(b.createdDate)}</span>
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-950/60 rounded-xl">
                            <span className="block text-[10px] text-slate-500">Bidhaa</span>
                            <span className="font-black text-white">{b.productsCount}</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-xl">
                            <span className="block text-[10px] text-slate-500">Wafanyakazi</span>
                            <span className="font-black text-white">{b.usersCount}</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-xl">
                            <span className="block text-[10px] text-slate-500">Mauzo</span>
                            <span className="font-black text-emerald-400">{b.salesCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBiz(b);
                            setConfirmedShopName('');
                            setConfirmedPhone('');
                            setNewBossPassword('');
                          }}
                          className="flex-1 py-2 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Weka Upya Password ya Boss</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(b)}
                          className={`p-2 rounded-xl border text-xs transition active:scale-95 ${
                            isSuspended
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                          title={isSuspended ? 'Fungua Biashara' : 'Zima Biashara'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Super Admin Action Logs */}
        {activeTab === 'actions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Kumbukumbu za Vitendo vya Super Admin (Audit Trail)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kila marekebisho au kuweka upya password ya biashara yoyote yanarekodiwa kwa uwazi
                </p>
              </div>
            </div>

            {actionLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Hakuna kumbukumbu za vitendo zilizorekodiwa bado.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                {actionLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-800/40 transition space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 uppercase tracking-wide">
                          {log.action}
                        </span>
                        {log.targetBusinessName && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md font-medium">
                            Duka: {log.targetBusinessName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">{log.details}</p>
                    <p className="text-[11px] text-slate-500">
                      Imefanywa na:{' '}
                      <span className="text-slate-300 font-bold">{log.adminName}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Reset Boss Password with Double Confirmation */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-black tracking-wide">
                  Uthibitisho wa Usalama wa EBS
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  Weka Upya Password ya Boss
                </h3>
                <p className="text-xs text-slate-400">
                  Duka: <span className="text-white font-bold">{selectedBiz?.name || 'Biashara'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedBiz(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Hatua ya Usalama wa Hali ya Juu</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Ili kuzuia mabadiliko bila ridhaa, lazima uthibitishe jina kamili la duka na namba ya simu iliyosajiliwa ({selectedBiz.phone}).
              </p>
            </div>

            <form onSubmit={handleResetBossPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. Thibitisha Jina la Duka
                </label>
                <input
                  type="text"
                  required
                  value={confirmedShopName}
                  onChange={(e) => setConfirmedShopName(e.target.value)}
                  placeholder={`Andika: ${selectedBiz?.name || ''}`}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. Thibitisha Namba ya Simu Iliyosajiliwa
                </label>
                <input
                  type="text"
                  required
                  value={confirmedPhone}
                  onChange={(e) => setConfirmedPhone(e.target.value)}
                  placeholder={`Weka: ${selectedBiz.phone}`}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. Weka Neno Jipya la Siri kwa Boss
                </label>
                <input
                  type="text"
                  required
                  value={newBossPassword}
                  onChange={(e) => setNewBossPassword(e.target.value)}
                  placeholder="mf. Boss2026!#"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Angalau herufi 8 na namba 1. Boss atalazimika kubadilisha neno hili anapoingia mara ya kwanza.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBiz(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/30 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isSubmittingReset ? 'Inathibitisha...' : 'Weka Upya Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
