import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { formatTZS, EXPENSE_CATEGORIES } from '../utils/formatters';
import {
  Receipt,
  Plus,
  Trash2,
  DollarSign,
  TrendingDown,
  Calendar,
  X,
  Tag
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, currentUser, todayStats } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<string>('LUKU / Umeme');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const totalAllExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      alert('Tafadhali weka kiasi sahihi cha fedha.');
      return;
    }

    addExpense({
      category: category as any,
      amount: numAmount,
      description: description.trim() || 'Gharama za uendeshaji',
      date,
      recordedBy: currentUser?.name || 'Mtumiaji',
    });

    setShowAddModal(false);
    setAmount('');
    setDescription('');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>Gharama za Biashara (Expenses)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kurekodi LUKU, DAWASA, pango, mishahara, na kupata faida halisi ya biashara
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Rekodi Gharama Mpya</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Gharama za Leo</div>
          <div className="text-xl font-black text-red-600 mt-1">
            {formatTZS(todayStats.expensesTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Zilizokatwa leo kwenye mapato</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Jumla ya Gharama Zote</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatTZS(totalAllExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{expenses.length} miamala ya matumizi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Faida Halisi ya Leo (Net Profit)</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {currentUser?.canViewProfit ? formatTZS(todayStats.netProfit) : '••••••'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Baada ya kutoa gharama za leo</div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Tarehe</th>
                <th className="py-3 px-4 font-semibold">Kundi la Matumizi</th>
                <th className="py-3 px-4 font-semibold">Maelezo</th>
                <th className="py-3 px-4 font-semibold">Aliyerekodi</th>
                <th className="py-3 px-4 font-semibold text-right">Kiasi</th>
                <th className="py-3 px-4 font-semibold text-right">Hatua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-500">{e.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {e.description}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{e.recordedBy}</td>
                  <td className="py-3 px-4 font-black text-right text-red-600 text-sm">
                    {formatTZS(e.amount)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Je, una uhakika unataka kufuta rekodi hii ya gharama?')) {
                          deleteExpense(e.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveExpense}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Rekodi Gharama ya Biashara
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
                  Kundi la Matumizi (Category):
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kiasi Kilicholipwa (TZS):
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Mfano: 35,000"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm text-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tarehe ya Matumizi:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maelezo ya Matumizi:
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mfano: Tokeni ya LUKU ya wiki hii..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Hifadhi Gharama
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
