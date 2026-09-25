import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, DebtRecord, PaymentMethod, CustomerCategory } from '../types';
import { formatTZS, formatDateTime, PAYMENT_METHOD_INFO, CUSTOMER_CATEGORY_INFO, TANZANIA_REGIONS } from '../utils/formatters';
import { validateTanzanianPhone } from '../utils/security';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Phone,
  Calendar,
  CreditCard,
  X,
  FileText,
  Clock,
  ShieldAlert,
  UserCheck,
  Building,
  Award,
  AlertTriangle,
  History,
  CheckCircle2,
  Printer
} from 'lucide-react';

export const CustomersDebtView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, debts, payDebt, sales } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'debts'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Repayment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');

  // Add Customer Modal
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCategory, setNewCustCategory] = useState<CustomerCategory>('regular');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('150000');
  const [newCustMkoa, setNewCustMkoa] = useState('Dar es Salaam');
  const [newCustWilaya, setNewCustWilaya] = useState('Ubungo');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<Customer | null>(null);

  // Customer Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Metrics
  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const totalOutstanding = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const overdueDebts = activeDebts.filter((d) => new Date(d.dueDate) < new Date());
  const totalOverdueAmount = overdueDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  const filteredDebts = debts.filter((d) => {
    const matchesSearch =
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customerPhone.includes(searchQuery);
    return matchesSearch;
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || c.category === categoryFilter || c.customerType === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenPayModal = (debt: DebtRecord) => {
    setSelectedDebt(debt);
    setPayAmount(debt.remainingAmount.toString());
    setPayMethod('cash');
    setPayRef('');
    setPayNote('');
    setShowPayModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      alert('Tafadhali weka kiasi sahihi cha malipo.');
      return;
    }

    if (amount > selectedDebt.remainingAmount) {
      alert('Kiasi hakiwezi kuzidi deni lililobaki.');
      return;
    }

    payDebt(selectedDebt.id, amount, payMethod, payRef || undefined, payNote || undefined);
    setShowPayModal(false);
    alert(`Malipo ya TZS ${amount.toLocaleString()} yamepokelewa na deni kusasishwa!`);
  };

  const handlePhoneChange = (val: string) => {
    setNewCustPhone(val);
    setValidationError('');
    const clean = val.replace(/[\s\-\(\)]/g, '');
    if (clean.length >= 9) {
      const match = customers.find((c) => c.phone.replace(/[\s\-\(\)]/g, '') === clean);
      setDuplicateWarning(match || null);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!newCustName.trim()) {
      setValidationError('Jina kamili la mteja linahitajika.');
      return;
    }

    const phoneVal = validateTanzanianPhone(newCustPhone);
    if (!phoneVal.isValid) {
      setValidationError(phoneVal.error || 'Namba ya simu ya Tanzania si sahihi.');
      return;
    }

    const res = addCustomer({
      name: newCustName.trim(),
      phone: phoneVal.formatted || newCustPhone.trim(),
      customerType: (newCustCategory === 'wholesale' || newCustCategory === 'vip' || newCustCategory === 'regular' ? newCustCategory : 'individual') as 'individual' | 'wholesale' | 'vip' | 'regular',
      category: newCustCategory,
      creditLimit: parseFloat(newCustCreditLimit) || 100000,
      mkoa: newCustMkoa,
      wilaya: newCustWilaya,
      address: newCustAddress.trim() || undefined,
      notes: newCustNotes.trim() || undefined,
    });

    if (res.isDuplicate) {
      setValidationError(`Mteja mwenye namba hii tayari yupo kwenye mfumo: ${res.existingCustomer?.name}`);
      return;
    }

    setShowAddCustModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustNotes('');
    setDuplicateWarning(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" />
            <span>Usimamizi wa Wateja & Daftari la Madeni</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Wateja & Madeni (Credit Ledger)</h1>
          <p className="text-sm text-slate-400 mt-1">
            Fuatilia wateja wa kawaida, VIP, madeni yanayodaiwa na historia ya ununuzi na malipo.
          </p>
        </div>

        <button
          id="btn-add-customer"
          onClick={() => {
            setValidationError('');
            setDuplicateWarning(null);
            setShowAddCustModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Sajili Mteja Mpya</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jumla ya Wateja</div>
            <div className="text-2xl font-black text-white mt-1">{customers.length}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">Wateja Waliosajiliwa</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Madeni Yasiyolipwa</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{formatTZS(totalOutstanding)}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{activeDebts.length} Madai ya Wateja</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-950 text-amber-400 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Madeni Yaliyochelewa</div>
            <div className="text-2xl font-black text-red-400 mt-1">{formatTZS(totalOverdueAmount)}</div>
            <div className="text-[11px] text-red-400 font-semibold mt-0.5">{overdueDebts.length} Yamevuka Siku ya Malipo</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-950 text-red-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Orodha ya Wateja ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === 'debts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Daftari la Madeni ({debts.length})</span>
          </button>
        </div>

        {/* Search & Category filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tafuta jina, namba ya simu, ankara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {activeTab === 'customers' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none"
            >
              <option value="all">Kategoria Zote</option>
              <option value="regular">Kawaida (Regular)</option>
              <option value="vip">VIP</option>
              <option value="wholesale">Jumla (Wholesale)</option>
              <option value="retail">Rejareja (Retail)</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mteja</th>
                  <th className="p-3.5">Simu & Eneo</th>
                  <th className="p-3.5">Kategoria</th>
                  <th className="p-3.5">Ukomo wa Deni</th>
                  <th className="p-3.5">Deni la Sasa</th>
                  <th className="p-3.5">Jumla ya Manunuzi</th>
                  <th className="p-3.5 text-right">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Hakuna mteja aliyepatikana kwa utafutaji huo.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const catInfo = CUSTOMER_CATEGORY_INFO[cust.category || cust.customerType || 'regular'] || {
                      name: 'Kawaida',
                      color: 'bg-slate-800 text-slate-300',
                    };
                    const isOverLimit = cust.currentDebt > cust.creditLimit;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white text-sm">{cust.name}</div>
                          {cust.notes && <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{cust.notes}</div>}
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-slate-300 font-bold flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{cust.phone}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{cust.address || `${cust.mkoa || 'Dar es Salaam'}`}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${catInfo.color}`}>
                            {catInfo.name}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-400">
                          {formatTZS(cust.creditLimit)}
                        </td>
                        <td className="p-3.5">
                          {cust.currentDebt > 0 ? (
                            <div>
                              <span className={`font-mono font-black text-sm ${isOverLimit ? 'text-red-400' : 'text-amber-400'}`}>
                                {formatTZS(cust.currentDebt)}
                              </span>
                              {isOverLimit && (
                                <span className="block text-[10px] text-red-400 font-bold">LIMEZIDI UKOMO</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-emerald-400 text-[11px] font-bold">Hana Deni (0)</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white">
                          {formatTZS(cust.totalSpent)}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => setStatementCustomer(cust)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ripoti (Statement)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEBT LEDGER */}
      {activeTab === 'debts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mteja & Simu</th>
                  <th className="p-3.5">Ankara (Invoice)</th>
                  <th className="p-3.5">Tarehe ya Deni</th>
                  <th className="p-3.5">Mwisho wa Kulipa</th>
                  <th className="p-3.5">Deni Kamili</th>
                  <th className="p-3.5">Lililobaki</th>
                  <th className="p-3.5">Hali</th>
                  <th className="p-3.5 text-right">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDebts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Hakuna rekodi ya deni iliyopatikana.
                    </td>
                  </tr>
                ) : (
                  filteredDebts.map((debt) => {
                    const isOverdue = debt.status !== 'paid' && new Date(debt.dueDate) < new Date();
                    return (
                      <tr key={debt.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{debt.customerName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{debt.customerPhone}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">{debt.invoiceNo}</td>
                        <td className="p-3.5 text-slate-400">{new Date(debt.createdAt).toLocaleDateString('sw-TZ')}</td>
                        <td className="p-3.5">
                          <span className={`font-semibold ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                            {debt.dueDate} {isOverdue && '⚠️'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{formatTZS(debt.originalAmount)}</td>
                        <td className="p-3.5 font-mono font-black text-amber-400 text-sm">
                          {formatTZS(debt.remainingAmount)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                              debt.status === 'paid'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : debt.status === 'partial'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : isOverdue
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {debt.status === 'paid' ? 'LILILIPWA' : debt.status === 'partial' ? 'MALIPO NUSU' : isOverdue ? 'LIMECHELEWA' : 'HALIJALIPWA'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {debt.status !== 'paid' && (
                            <button
                              onClick={() => handleOpenPayModal(debt)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm shadow-emerald-600/20 active:scale-95"
                            >
                              Pokea Malipo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Sajili Mteja Mpya</span>
              </h3>
              <button onClick={() => setShowAddCustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Mteja mwenye simu hii tayari yupo: <strong>{duplicateWarning.name}</strong></span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jina Kamili la Mteja *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Mfano: Juma Ally Mwenda"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Namba ya Simu (Tanzania) *</label>
                  <input
                    type="text"
                    required
                    value={newCustPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0754 123 456 au +255..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Kategoria ya Mteja</label>
                  <select
                    value={newCustCategory}
                    onChange={(e) => setNewCustCategory(e.target.value as CustomerCategory)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="regular">Kawaida (Regular)</option>
                    <option value="vip">VIP</option>
                    <option value="wholesale">Mteja wa Jumla (Wholesale)</option>
                    <option value="retail">Mteja wa Rejareja (Retail)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Ukomo wa Deni (Credit Limit TZS)</label>
                  <input
                    type="number"
                    value={newCustCreditLimit}
                    onChange={(e) => setNewCustCreditLimit(e.target.value)}
                    placeholder="150000"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mkoa</label>
                  <select
                    value={newCustMkoa}
                    onChange={(e) => setNewCustMkoa(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    {TANZANIA_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Wilaya / Eneo</label>
                  <input
                    type="text"
                    value={newCustWilaya}
                    onChange={(e) => setNewCustWilaya(e.target.value)}
                    placeholder="Ubungo / Kinondoni"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Mtaa & Anwani Halisi</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Sinza Mori, Mtaa wa Makaburi..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Maelezo ya Ziada (Notes)</label>
                <textarea
                  rows={2}
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="Mfano: Mteja anayeaminika, hulipa mwisho wa juma..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Hifadhi Mteja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY DEBT */}
      {showPayModal && selectedDebt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Pokea Malipo ya Deni</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">Mteja: <strong className="text-white">{selectedDebt.customerName}</strong></div>
              <div className="text-slate-400">Ankara: <strong className="text-emerald-400">{selectedDebt.invoiceNo}</strong></div>
              <div className="text-slate-400">Deni Lililobaki: <strong className="text-amber-400">{formatTZS(selectedDebt.remainingAmount)}</strong></div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Kiasi Kinacholipwa (TZS) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedDebt.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-black text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Njia ya Malipo *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="cash">Pesa Taslimu (Cash)</option>
                  <option value="mpesa">M-Pesa (Vodacom)</option>
                  <option value="tigopesa">Tigo Pesa</option>
                  <option value="airtel">Airtel Money</option>
                  <option value="halopesa">HaloPesa</option>
                  <option value="bank">Benki / NMB / CRDB</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Namba ya Kumbukumbu (Reference / Receipt No)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Mfano: MP982019..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Ufafanuzi (Note)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Mfano: Malipo kupitia namba ya simu ya mdogo wake"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Thibitisha Malipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER STATEMENT */}
      {statementCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">{statementCustomer.name}</h3>
                <div className="text-xs text-slate-400 font-mono">{statementCustomer.phone} • {statementCustomer.address || 'Dar es Salaam'}</div>
              </div>
              <button onClick={() => setStatementCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Deni la Sasa</div>
                <div className="text-base font-black text-amber-400">{formatTZS(statementCustomer.currentDebt)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Ukomo wa Deni</div>
                <div className="text-base font-black text-slate-300">{formatTZS(statementCustomer.creditLimit)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Jumla ya Manunuzi</div>
                <div className="text-base font-black text-emerald-400">{formatTZS(statementCustomer.totalSpent)}</div>
              </div>
            </div>

            {/* Customer Debts List */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-white">Historia ya Madeni & Malipo:</div>
              {debts.filter((d) => statementCustomer?.id && d.customerId === statementCustomer.id).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 text-slate-500 text-center">
                  Mteja huyu hajawahi kuwa na deni.
                </div>
              ) : (
                debts
                  .filter((d) => statementCustomer?.id && d.customerId === statementCustomer.id)
                  .map((d) => (
                    <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-emerald-400">{d.invoiceNo}</span>
                        <span className={d.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                          Deni: {formatTZS(d.originalAmount)} | Baki: {formatTZS(d.remainingAmount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{d.notes || 'Manunuzi ya dukani / bar'}</div>
                      {d.payments.length > 0 && (
                        <div className="pt-2 border-t border-slate-900 text-[11px] space-y-1">
                          <div className="font-semibold text-slate-300">Malipo Yaliyofanyika:</div>
                          {d.payments.map((p) => (
                            <div key={p.id} className="flex justify-between text-slate-400">
                              <span>✓ {new Date(p.date).toLocaleDateString('sw-TZ')} ({p.method.toUpperCase()})</span>
                              <span className="font-bold text-emerald-400">+{formatTZS(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
