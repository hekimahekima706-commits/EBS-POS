import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { formatTZS } from '../utils/formatters';
import {
  Building,
  Plus,
  Search,
  Phone,
  DollarSign,
  User,
  X,
  CreditCard
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, recordSupplierPayment } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Add Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [tin, setTin] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Pay Supplier Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const totalOwedToSuppliers = suppliers.reduce((sum, s) => sum + s.amountOwed, 0);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Tafadhali weka jina na namba ya simu.');
      return;
    }

    addSupplier({
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim(),
      tin: tin.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setShowAddModal(false);
    setName('');
    setContactPerson('');
    setPhone('');
    setTin('');
    setAddress('');
    setNotes('');
  };

  const handleConfirmPaySupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;

    recordSupplierPayment(selectedSupplier.id, amount, payNote || undefined);
    setShowPayModal(false);
    alert(`Malipo ya TZS ${amount.toLocaleString()} kwa msambazaji ${selectedSupplier.name} yamehifadhiwa!`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <span>Wasambazaji wa Bidhaa (Suppliers)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dhibiti mawasiliano ya wasambazaji, madeni tunayodaiwa na historia ya ununuzi
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Sajili Msambazaji Mpya</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Jumla ya Madeni Tunayodaiwa (Payables)</div>
          <div className="text-xl font-black text-red-600 mt-1">
            {formatTZS(totalOwedToSuppliers)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kwa wasambazaji wa vinywaji na bidhaa</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Wasambazaji Waliosajiliwa</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {suppliers.length} Kampuni
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">TBL, Serengeti, Bakhresa, n.k.</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tafuta msambazaji kwa jina au simu..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Kampuni / Jina</th>
                <th className="py-3 px-4 font-semibold">Mtu wa Mawasiliano</th>
                <th className="py-3 px-4 font-semibold">Simu & Anwani</th>
                <th className="py-3 px-4 font-semibold">TIN</th>
                <th className="py-3 px-4 font-semibold">Deni Tunalodaiwa</th>
                <th className="py-3 px-4 font-semibold text-right">Hatua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {s.contactPerson || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{s.phone}</div>
                    <div className="text-[11px] text-slate-400">{s.address || '-'}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{s.tin || '-'}</td>
                  <td className="py-3 px-4 font-black text-red-600">
                    {formatTZS(s.amountOwed)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {s.amountOwed > 0 && (
                      <button
                        onClick={() => {
                          setSelectedSupplier(s);
                          setPayAmount(s.amountOwed.toString());
                          setShowPayModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition active:scale-95"
                      >
                        Lipa Msambazaji
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Sajili Msambazaji Mpya
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
                  Jina la Kampuni / Msambazaji:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mfano: Serengeti Breweries Ltd"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mtu wa Mawasiliano:
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Meneja Mauzo"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Simu:
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    TIN ya Msambazaji:
                  </label>
                  <input
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="100-234-567"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Anwani / Eneo:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Chang'ombe, Dar es Salaam"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
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
                Hifadhi Msambazaji
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleConfirmPaySupplier}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Kumlipa Msambazaji: {selectedSupplier.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl flex justify-between text-xs font-bold text-red-900 dark:text-red-300">
              <span>Deni Linalodaiwa:</span>
              <span className="text-sm">{formatTZS(selectedSupplier.amountOwed)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kiasi cha Kulipa (TZS):
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  max={selectedSupplier.amountOwed}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maelezo / Namba ya Risiti ya Msambazaji:
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Malipo ya ankara ya crate 20..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Thibitisha Malipo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
