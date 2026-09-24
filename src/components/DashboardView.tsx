import React from 'react';
import { useApp } from '../context/AppContext';
import { formatTZS, formatDateTime, PAYMENT_METHOD_INFO } from '../utils/formatters';
import { isProductActive } from '../utils/productUtils';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Beer,
  Sparkles,
  Video,
  Receipt,
  Eye,
  Plus
} from 'lucide-react';
import { Sale } from '../types';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onSelectSale: (sale: Sale) => void;
  onOpenQuickSale: () => void;
  onViewCameraEvent: (eventId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectSale,
  onOpenQuickSale,
  onViewCameraEvent,
}) => {
  const { profile, todayStats, sales, products, debts, expenses, currentUser } = useApp();

  const lowStockProducts = products.filter((p) => isProductActive(p) && p.stockQty <= p.minStock);
  const totalDebtBalance = debts
    .filter((d) => d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const completedSales = sales.filter((s) => s.status === 'completed');
  const recentSales = completedSales.slice(0, 6);

  // Calculate best selling items
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number; isServing: boolean }> = {};
  completedSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          qty: 0,
          revenue: 0,
          isServing: !!item.isServing,
        };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    });
  });

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Banner: Biashara yako inaendeleaje? */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <TrendingUp className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-700/50">
                👑 Dashibodi ya Mmiliki (Owner View)
              </span>
              <span className="text-xs text-slate-300">
                {new Date().toLocaleDateString('sw-TZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-2">
              «Biashara yako inaendeleaje leo?»
            </h1>
            <p className="text-xs md:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Hapa kuna muhtasari wa mauzo, makusanyo ya fedha (Cash & Simu), faida halisi, na usimamizi wa stoo kwa sekunde 10.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              id="btn-dash-pos"
              onClick={onOpenQuickSale}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mauzo Mapya (POS)</span>
            </button>

            <button
              id="btn-dash-ai"
              onClick={() => onNavigate('ai')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span>Uliza AI Msaidizi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Mauzo ya Leo */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Mauzo ya Leo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatTZS(todayStats.salesRevenue)}
          </div>
          <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>{todayStats.transactionsCount} miamala leo</span>
          </div>
        </div>

        {/* Faida ya Mauzo (Gross Profit) */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Faida ya Mauzo</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
            {currentUser.canViewProfit ? formatTZS(todayStats.grossProfit) : '••••••'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Kabla ya kukata gharama za uendeshaji
          </div>
        </div>

        {/* Gharama za Leo */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Gharama za Leo</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-red-600 dark:text-red-400 mt-2">
            {formatTZS(todayStats.expensesTotal)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Faida Halisi: <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser.canViewProfit ? formatTZS(todayStats.netProfit) : '••••'}</span>
          </div>
        </div>

        {/* Madeni ya Wateja */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Madeni ya Wateja</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatTZS(totalDebtBalance)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Bado hayajalipwa</span>
            <button
              onClick={() => onNavigate('customers')}
              className="text-emerald-600 font-bold hover:underline"
            >
              Fuatilia
            </button>
          </div>
        </div>
      </div>

      {/* Payment Channel Breakdown & Bar Mode Quick Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Breakdown Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Makusanyo kwa Njia za Malipo (Leo)
              </h2>
              <p className="text-xs text-slate-500">Mlinganisho wa pesa mkononi (Cash) dhidi ya mitandao</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
              Jumla: {formatTZS(todayStats.salesRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Cash */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                💵 Pesa Taslimu (Cash)
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(todayStats.cashTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Droo ya Pesa Kaunta</div>
            </div>

            {/* Mobile Money */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold">
                📱 Mitandao ya Simu
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(todayStats.mobileMoneyTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">M-Pesa, Airtel, Tigo, Halo</div>
            </div>

            {/* Card & Bank */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <div className="text-[11px] text-purple-800 dark:text-purple-300 font-bold">
                💳 Benki & Kadi
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(todayStats.cardBankTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">NMB / CRDB / POS</div>
            </div>

            {/* Debt Sales Today */}
            <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <div className="text-[11px] text-orange-800 dark:text-orange-300 font-bold">
                📝 Mikopo ya Leo
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(todayStats.debtTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Itaingizwa kwenye madeni</div>
            </div>
          </div>
        </div>

        {/* Bar Mode Quick Audit / Snapshot */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Beer className="w-4 h-4 text-amber-500" />
                <span>Usimamizi wa Bar & Shots</span>
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                Vipimo vya 30ml
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Chupa zilizofunguliwa zinakatwa kwa shots badala ya chupa nzima.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Johnnie Walker (Black):</span>
                <span className="font-bold text-emerald-600">450ml zimebaki (15 shots)</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Hennessy VS Cognac:</span>
                <span className="font-bold text-emerald-600">210ml zimebaki (7 shots)</span>
              </div>
            </div>
          </div>

          <button
            id="btn-dash-open-bar"
            onClick={() => onNavigate('barmode')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <span>Fungua Dashibodi ya Bar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two-Column Section: Low Stock Warnings & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Bidhaa Zinazokaribia Kuisha Stoo ({lowStockProducts.length})</span>
            </h2>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Angalia Stoo Yote
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Hakuna bidhaa iliyo chini ya kiwango cha tahadhari kwa sasa. Stoo iko salama!
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Kiwango cha chini: {p.minStock} {p.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold text-xs">
                      Zimebaki: {p.stockQty} {p.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Bidhaa Zinazoongoza kwa Mauzo</span>
            </h2>
            <span className="text-xs text-slate-400">Kwa idadi iliyouzwa</span>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Bado hakuna takwimu za kutosha za mauzo leo.
            </div>
          ) : (
            <div className="space-y-2">
              {topSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.isServing ? '★ Shots za Vinywaji' : 'Bidhaa ya kawaida'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 dark:text-white">
                      {p.qty} {p.isServing ? 'Shots' : 'Pcs'}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold">
                      {formatTZS(p.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions List with Quick Action & CCTV Event */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Miamala ya Hivi Karibuni (Recent Sales)
            </h2>
            <p className="text-xs text-slate-500">Bofya muamala kuona risiti au tukio la kamera</p>
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Fungua POS & Historia Yote
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                <th className="py-2.5 font-semibold">Ankara (Invoice)</th>
                <th className="py-2.5 font-semibold">Muda</th>
                <th className="py-2.5 font-semibold">Keshia / Muuzaji</th>
                <th className="py-2.5 font-semibold">Bidhaa</th>
                <th className="py-2.5 font-semibold">Njia ya Malipo</th>
                <th className="py-2.5 font-semibold text-right">Jumla</th>
                <th className="py-2.5 font-semibold text-right">Hatua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  onClick={() => onSelectSale(sale)}
                >
                  <td className="py-3 font-bold text-slate-900 dark:text-white">
                    {sale.invoiceNo}
                  </td>
                  <td className="py-3 text-slate-500">{formatDateTime(sale.timestamp)}</td>
                  <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                    {sale.cashierName}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">
                    {sale.items.length} bidhaa
                  </td>
                  <td className="py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 font-black text-right text-slate-900 dark:text-white">
                    {formatTZS(sale.total)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                      {sale.cameraEventId && (
                        <button
                          onClick={() => onViewCameraEvent(sale.cameraEventId!)}
                          title="Tazama Kamera CCTV ya Muamala Huu"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectSale(sale)}
                        title="Tazama Risiti"
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
