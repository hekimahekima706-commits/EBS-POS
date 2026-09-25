import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatTZS, formatDateTime } from '../utils/formatters';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Package,
  Award
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sales, expenses, products, currentUser, debts, users } = useApp();

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');

  // Filter sales and expenses by dateRange
  const { filteredSales, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const fSales = sales.filter((s) => {
      if (s.status !== 'completed') return false;
      const saleDate = new Date(s.timestamp);

      if (dateRange === 'today') return s.timestamp.startsWith(todayStr);
      if (dateRange === 'yesterday') return s.timestamp.startsWith(yesterdayStr);
      if (dateRange === 'week') return saleDate >= sevenDaysAgo;
      if (dateRange === 'month') return saleDate >= firstDayOfMonth;
      return true;
    });

    const fExpenses = expenses.filter((e) => {
      const expDate = new Date(e.date);
      if (dateRange === 'today') return e.date === todayStr;
      if (dateRange === 'yesterday') return e.date === yesterdayStr;
      if (dateRange === 'week') return expDate >= sevenDaysAgo;
      if (dateRange === 'month') return expDate >= firstDayOfMonth;
      return true;
    });

    return { filteredSales: fSales, filteredExpenses: fExpenses };
  }, [sales, expenses, dateRange]);

  // Aggregate Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalGrossProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
  const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossProfit - totalExpensesAmt;
  const avgBasket = filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0;

  // Breakdown by Cashier / Staff
  const staffSalesMap: Record<string, { name: string; count: number; total: number; profit: number }> = {};
  filteredSales.forEach((s) => {
    if (!staffSalesMap[s.cashierId]) {
      staffSalesMap[s.cashierId] = {
        name: s.cashierName,
        count: 0,
        total: 0,
        profit: 0,
      };
    }
    staffSalesMap[s.cashierId].count += 1;
    staffSalesMap[s.cashierId].total += s.total;
    staffSalesMap[s.cashierId].profit += s.profit;
  });

  const staffPerformance = Object.values(staffSalesMap).sort((a, b) => b.total - a.total);

  // Breakdown by Category
  const categorySalesMap: Record<string, { count: number; total: number }> = {};
  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      const cat = item.category || 'Mengineyo';
      if (!categorySalesMap[cat]) {
        categorySalesMap[cat] = { count: 0, total: 0 };
      }
      categorySalesMap[cat].count += item.quantity;
      categorySalesMap[cat].total += item.total;
    });
  });

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Ankara', 'Tarehe', 'Keshia', 'Mteja', 'Njia ya Malipo', 'Jumla (TZS)', 'Faida (TZS)'];
    const rows = filteredSales.map((s) => [
      s.invoiceNo,
      `"${s.timestamp}"`,
      `"${s.cashierName}"`,
      `"${s.customerName || '-'}"`,
      `"${s.paymentMethod}"`,
      s.total,
      s.profit,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EBS_Ripoti_Mauzo_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Ripoti & Takwimu za Kina (Financial Reports)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Uchambuzi wa mapato, faida halisi, ufanisi wa wafanyakazi na upakuaji wa CSV
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'today'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Leo
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'yesterday'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Jana
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'week'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Siku 7
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === 'month'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Mwezi Huu
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Pakua CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Jumla ya Mauzo (Gross Sales)</div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatTZS(totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{filteredSales.length} risiti zilizokatwa</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Faida ya Mauzo (Gross Margin)</div>
          <div className="text-xl md:text-2xl font-black text-teal-600 mt-1">
            {currentUser?.canViewProfit ? formatTZS(totalGrossProfit) : '••••••'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalRevenue > 0 && currentUser?.canViewProfit
              ? `${((totalGrossProfit / totalRevenue) * 100).toFixed(1)}% ya mauzo yote`
              : 'Margin ratio'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Gharama Zilizotumika</div>
          <div className="text-xl md:text-2xl font-black text-red-600 mt-1">
            {formatTZS(totalExpensesAmt)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{filteredExpenses.length} rekodi za matumizi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Faida Halisi (Net Profit)</div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 mt-1">
            {currentUser?.canViewProfit ? formatTZS(netProfit) : '••••••'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Baada ya kutoa gharama zote</div>
        </div>
      </div>

      {/* Staff Performance & Category Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Staff Sales Performance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Ufanisi wa Wafanyakazi / Makatibu Mauzo</span>
          </h2>

          <div className="space-y-2">
            {staffPerformance.map((st, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                    <div className="text-[11px] text-slate-400">{st.count} risiti zilizokatwa</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-slate-900 dark:text-white">{formatTZS(st.total)}</div>
                  {currentUser?.canViewProfit && (
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Faida: +{formatTZS(st.profit)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Contribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-teal-500" />
            <span>Mauzo kwa Makundi ya Bidhaa (Categories)</span>
          </h2>

          <div className="space-y-2">
            {Object.entries(categorySalesMap).map(([cat, data], idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{cat}</div>
                  <div className="text-[11px] text-slate-400">{data.count} vipande viliuzwa</div>
                </div>

                <div className="font-black text-slate-900 dark:text-white">
                  {formatTZS(data.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
