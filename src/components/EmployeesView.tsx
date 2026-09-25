import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { ROLE_INFO, formatDateTime } from '../utils/formatters';
import {
  UserCog,
  Plus,
  ShieldCheck,
  History,
  CheckCircle,
  XCircle,
  X,
  Lock,
  Eye,
  KeyRound
} from 'lucide-react';

export const EmployeesView: React.FC = () => {
  const { users, addUser, updateUser, auditLogs, currentUser, resetUserPassword } = useApp();

  const [activeTab, setActiveTab] = useState<'employees' | 'audit'>('employees');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('1234');
  const [canRefund, setCanRefund] = useState(false);
  const [canDiscount, setCanDiscount] = useState(true);
  const [canAdjustStock, setCanAdjustStock] = useState(false);
  const [canViewProfit, setCanViewProfit] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);

  // Boss Emergency Reset State
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isBoss = currentUser?.role === 'owner' || currentUser?.role === 'boss' || currentUser?.role === 'manager';

  const handleBossResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForReset) return;

    setIsResetting(true);
    setResetMessage(null);

    try {
      if (resetNewPassword.trim()) {
        const res = await resetUserPassword(selectedEmployeeForReset.id, resetNewPassword.trim());
        if (!res.success) {
          throw new Error(res.message || 'Kushindwa kuweka password mpya.');
        }
      }

      if (resetNewPin.trim()) {
        updateUser(selectedEmployeeForReset.id, { pin: resetNewPin.trim() });
      }

      // Sync with backend API
      try {
        await fetch('/api/auth/boss-reset-employee', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('ebs_session_token') || ''}`
          },
          body: JSON.stringify({
            employeeId: selectedEmployeeForReset.id,
            newPassword: resetNewPassword.trim() || undefined,
            newPin: resetNewPin.trim() || undefined
          })
        });
      } catch {
        // Handled through offline sync queue
      }

      setResetMessage({
        type: 'success',
        text: `Taarifa za mtumishi "${selectedEmployeeForReset.name}" zimesasishwa kwa ufanisi!`
      });

      setTimeout(() => {
        setSelectedEmployeeForReset(null);
        setResetNewPassword('');
        setResetNewPin('');
        setResetMessage(null);
      }, 1500);
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err.message || 'Hitilafu ya kuweka upya.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Tafadhali weka jina na namba ya simu.');
      return;
    }

    addUser({
      name: name.trim(),
      phone: phone.trim(),
      role,
      pin: pin.trim() || '1234',
      active: true,
      canRefund,
      canDiscount,
      canAdjustStock,
      canViewProfit,
      canManageUsers,
    });

    setShowAddModal(false);
    setName('');
    setPhone('');
    setPin('1234');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" />
            <span>Wafanyakazi & Kumbukumbu za Ukaguzi (Audit Logs)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dhibiti nafasi (Roles), mipaka ya uwezo (Permissions), na kufuatilia kila hatua inayofanyika kwenye mfumo
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'employees'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              👨‍💼 Wafanyakazi ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              🔒 Audit Log ({auditLogs.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Mfanyakazi</span>
          </button>
        </div>
      </div>

      {activeTab === 'employees' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const roleInfo = ROLE_INFO[u?.role] || { label: u?.role || 'Staff', badgeColor: 'bg-slate-800 text-slate-300', description: '' };
              const isCurrentUser = u?.id && currentUser?.id ? u.id === currentUser.id : false;

              return (
                <div
                  key={u?.id || Math.random()}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                Wewe
                              </span>
                            )}
                          </h3>
                          <div className="text-[11px] text-slate-400">{u.phone}</div>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {roleInfo?.label || u.role}
                      </span>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">
                        Ruhusa Zilizopo:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          {u.canViewProfit ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>Kuona Faida</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {u.canRefund ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>Kufanya Refund</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {u.canAdjustStock ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>Kurekebisha Stoo</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {u.canDiscount ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>Kutoa Punguzo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 mt-1">
                    <span>PIN ya Kuingilia: {u.pin ? '••••' : 'Ipo'}</span>
                    <span className="text-emerald-600 font-semibold">Active</span>
                  </div>

                  {isBoss && u.role !== 'owner' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeForReset(u);
                          setResetNewPassword('');
                          setResetNewPin('');
                          setResetMessage(null);
                        }}
                        className="w-full py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Badili Password / PIN (Dharura)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Immutable Audit Log Table */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Daftari la Ukaguzi Lisilofutika (Immutable Audit Ledger)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Kila muamala, ongezeko la stoo, punguzo, kufuta risiti na kubadili bei kunarekodiwa hapa
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                  <th className="py-2.5 font-semibold">Tarehe na Saa</th>
                  <th className="py-2.5 font-semibold">Mfanyakazi & Role</th>
                  <th className="py-2.5 font-semibold">Kitendo (Action)</th>
                  <th className="py-2.5 font-semibold">Aina</th>
                  <th className="py-2.5 font-semibold">Maelezo ya Kina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 text-slate-500">{formatDateTime(log.timestamp)}</td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{log.userName}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold uppercase">{log.userRole}</div>
                    </td>
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveEmployee}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Sajili Mfanyakazi Mpya
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jina Kamili la Mfanyakazi:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mfano: Neema John"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Namba ya Simu:
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0754 000 000"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIN ya Kuingilia:
                  </label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    placeholder="1234"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nafasi (Role):
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setRole(r);
                    if (r === 'owner' || r === 'manager') {
                      setCanViewProfit(true);
                      setCanRefund(true);
                      setCanAdjustStock(true);
                      setCanManageUsers(true);
                    } else {
                      setCanViewProfit(false);
                      setCanRefund(false);
                      setCanAdjustStock(r === 'storekeeper');
                      setCanManageUsers(false);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="cashier">Keshia (Cashier / POS)</option>
                  <option value="waiter">Mhudumu wa Vinywaji / Meza (Waiter / Bartender)</option>
                  <option value="manager">Meneja wa Tawi (Manager)</option>
                  <option value="storekeeper">Mweka Hazina / Stoo (Storekeeper)</option>
                  <option value="accountant">Mhasibu (Accountant)</option>
                  <option value="owner">Mmiliki (Owner / Super Admin)</option>
                </select>
              </div>

              {/* Permissions Checkboxes */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300">Ruhusa Maalumu:</div>
                <div className="space-y-1.5 text-[11px]">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={canViewProfit}
                      onChange={(e) => setCanViewProfit(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anaweza kuona ripoti za faida (Profit Margin)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={canRefund}
                      onChange={(e) => setCanRefund(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anaweza kufanya Refund / Kufuta risiti</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={canAdjustStock}
                      onChange={(e) => setCanAdjustStock(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anaweza kurekebisha hesabu za stoo</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={canDiscount}
                      onChange={(e) => setCanDiscount(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Anaweza kutoa punguzo la bei (Discount)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Hifadhi Mfanyakazi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Boss Emergency Employee Password & PIN Reset Modal */}
      {selectedEmployeeForReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Weka Upya Password / PIN ya Mfanyakazi
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mtumishi: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEmployeeForReset.name}</span> ({selectedEmployeeForReset.role.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeForReset(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {resetMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {resetMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{resetMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleBossResetSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Neno Jipya la Siri (Password ya Kuingilia)
                </label>
                <input
                  type="text"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Weka neno jipya (mfano: Amani2026!)"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Akiingia mara ya kwanza, mfumo utamtaka kubadilisha neno hili kwa usalama wake.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIN ya Haraka (Tarakimu 4-6)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetNewPin}
                  onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="mfano: 1234"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 tracking-widest font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Hutumika kwenye POS terminal kwa kufungua au idhini za haraka.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForReset(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={isResetting || (!resetNewPassword.trim() && !resetNewPin.trim())}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Inasasisha...' : 'Hifadhi Mabadiliko'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
