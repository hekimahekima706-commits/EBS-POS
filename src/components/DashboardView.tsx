import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatTZS, formatDateTime } from '../utils/formatters';
import { isProductActive } from '../utils/productUtils';
import { fetchRemoteLiveOverview, isSystemOnline } from '../utils/syncEngine';
import { LiveOverviewResponse, Sale } from '../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowUpRight,
  ShoppingBag,
  Beer,
  Sparkles,
  Video,
  Receipt,
  Eye,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Box,
  Layers,
  FileText
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onSelectSale?: (sale: Sale) => void;
  onOpenQuickSale?: () => void;
  onViewCameraEvent?: (eventId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectSale,
  onOpenQuickSale,
  onViewCameraEvent,
}) => {
  const { profile, todayStats, sales, products, debts, expenses, currentUser } = useApp();

  // Remote Live Overview State (STEP 2A, 2C, 2H)
  const [liveData, setLiveData] = useState<LiveOverviewResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<'today' | 'yesterday' | 'month'>('today');

  // Privileges & RBAC (STEP 2D)
  const isOwnerOrBoss =
    currentUser?.role === 'owner' ||
    currentUser?.role === 'boss' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin';
  const isRestrictedRole =
    currentUser?.role === 'cashier' ||
    currentUser?.role === 'waiter' ||
    currentUser?.role === 'storekeeper';
  const canSeeProfit = isOwnerOrBoss ? true : isRestrictedRole ? false : Boolean(currentUser?.canViewProfit);

  // Fetch Live Remote Overview from Server (/api/live/overview)
  const loadRemoteOverview = useCallback(async (isManual: boolean = false) => {
    const bizId =
      currentUser?.businessId ||
      (profile as any)?.businessId ||
      (profile as any)?.id ||
      (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

    // Business Isolation Guard (STEP 2B): Do not fetch if businessId is missing or default
    if (!bizId || bizId.trim() === '' || bizId === 'biz_default' || bizId === 'Local') {
      setSyncNotice('Business haijapatikana. Tafadhali thibitisha biashara halali.');
      return;
    }

    if (isManual) setIsRefreshing(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined;
      const data = await fetchRemoteLiveOverview(bizId, token, currentUser?.role, currentUser?.id);

      if (data) {
        if (data.businessNotFound || data.error) {
          setLiveData(data);
          setSyncNotice(data.error || 'Business haijapatikana kwenye seva.');
        } else {
          setLiveData(data);
          setLastRefreshedAt(
            new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          setSyncNotice(null);
        }
      } else {
        // Safe offline notice (STEP 2H): keep existing data, no crash
        setSyncNotice('Haijaweza kupata taarifa mpya za moja kwa moja — inaonyesha taarifa zilizopo');
      }
    } catch {
      setSyncNotice('Haijaweza kupata taarifa mpya');
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [currentUser?.businessId, (profile as any)?.businessId, (profile as any)?.id]);

  // Periodic Background Refresh every 25 seconds with cleanup (STEP 2C)
  useEffect(() => {
    loadRemoteOverview(false);

    const refreshInterval = setInterval(() => {
      loadRemoteOverview(false);
    }, 25000);

    return () => clearInterval(refreshInterval);
  }, [loadRemoteOverview]);

  // Local fallback calculations if remote data has not yet arrived
  const completedSales = sales.filter((s) => s.status === 'completed');
  const localLowStockProducts = products.filter((p) => isProductActive(p) && p.stockQty <= p.minStock);
  const localOutOfStockProducts = products.filter((p) => isProductActive(p) && p.stockQty <= 0);
  const localDebtBalance = debts
    .filter((d) => d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  // Active Metrics (prioritize remote live overview when available)
  const isLiveConnected = Boolean(liveData && !liveData.businessNotFound);
  const metrics = liveData?.metrics;

  const displaySalesRevenue =
    timeWindow === 'yesterday'
      ? (metrics?.yesterdayRevenue ?? 0)
      : timeWindow === 'month'
      ? (metrics?.monthRevenue ?? todayStats.salesRevenue)
      : (metrics?.salesRevenue ?? todayStats.salesRevenue);

  const displayTransactionsCount =
    timeWindow === 'yesterday'
      ? (metrics?.yesterdayTransactionsCount ?? 0)
      : timeWindow === 'month'
      ? (metrics?.monthTransactionsCount ?? todayStats.transactionsCount)
      : (metrics?.transactionsCount ?? todayStats.transactionsCount);

  const displayGrossProfit =
    timeWindow === 'yesterday'
      ? (metrics?.yesterdayGrossProfit ?? (metrics?.grossProfit ?? todayStats.grossProfit))
      : timeWindow === 'month'
      ? (metrics?.monthGrossProfit ?? (metrics?.grossProfit ?? todayStats.grossProfit))
      : (metrics?.grossProfit ?? todayStats.grossProfit);
  const displayExpensesTotal = metrics?.expensesTotal ?? todayStats.expensesTotal;
  const displayNetProfit = metrics?.netProfit ?? todayStats.netProfit;

  const displayCashTotal = metrics?.cashTotal ?? todayStats.cashTotal;
  const displayMobileMoneyTotal = metrics?.mobileMoneyTotal ?? todayStats.mobileMoneyTotal;
  const displayCardBankTotal = metrics?.cardBankTotal ?? todayStats.cardBankTotal;
  const displayDebtTotal = metrics?.debtTotal ?? todayStats.debtTotal;

  const displayTotalProducts = metrics?.totalProducts ?? products.length;
  const displayLowStockCount = metrics?.lowStockCount ?? localLowStockProducts.length;
  const displayOutOfStockCount = metrics?.outOfStockCount ?? localOutOfStockProducts.length;

  const displayTotalCustomers = metrics?.totalCustomers ?? 0;
  const displayTotalDebtsCount = metrics?.totalDebtsCount ?? debts.filter((d) => d.status !== 'paid').length;
  const displayTotalDebtBalance = metrics?.totalDebtBalance ?? localDebtBalance;

  // Devices & Recent Sales
  const displayDevices = liveData?.devices || [];
  const displayRecentSales = liveData?.recentSales && liveData.recentSales.length > 0
    ? liveData.recentSales
    : completedSales.slice(0, 8).map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        timestamp: s.timestamp,
        cashierName: s.cashierName,
        total: s.total,
        profit: canSeeProfit ? s.profit : undefined,
        paymentMethod: s.paymentMethod,
        status: s.status,
        itemsCount: s.items?.length || 0,
      }));

  // Top Selling Products Calculation
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

  // Business Isolation Fallback Notice (STEP 2B)
  if (liveData?.businessNotFound) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-6 text-center shadow-lg">
          <ShieldAlert className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg md:text-xl font-bold text-amber-900 dark:text-amber-200">
            Biashara Haijapatikana au Kitambulisho Si Sahihi
          </h2>
          <p className="text-xs md:text-sm text-amber-700 dark:text-amber-300 mt-2 max-w-lg mx-auto">
            {liveData.error || 'Mfumo wa Remote Overview unahitaji biashara halali iliyosajiliwa ili kuonyesha takwimu za biashara yako pekee.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => loadRemoteOverview(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Jaribu Tena Kufungua
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Mipangilio ya Biashara
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Banner: Boss Remote Overview Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <TrendingUp className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700/60 flex items-center gap-1.5">
                👑 Dashibodi ya Boss (Remote Live)
              </span>

              {/* Live Connectivity Pill (STEP 2C, 2H) */}
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${
                  isLiveConnected && isSystemOnline()
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                }`}
              >
                {isLiveConnected && isSystemOnline() ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Seva Imeunganishwa</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span>Nje ya Mtandao (Offline)</span>
                  </>
                )}
              </span>

              {lastRefreshedAt && (
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Ilisasishwa: {lastRefreshedAt}</span>
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black mt-2 flex items-center gap-2">
              <span>{liveData?.businessName || profile.name || 'Biashara Yangu'}</span>
              <span className="text-xs font-bold text-emerald-300/80 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-600/30">
                {liveData?.businessId || (profile as any)?.businessId || currentUser?.businessId || 'EBS-1.3'}
              </span>
            </h1>

            <p className="text-xs md:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Fuatilia mauzo, faida halisi, stoo, madeni na vifaa vya biashara yako popote ulipo kwa wakati halisi (Real-time).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-dash-refresh"
              onClick={() => loadRemoteOverview(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Sasisha taarifa kutoka kwa seva"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
              <span>{isRefreshing ? 'Inasasisha...' : 'Sasisha (Refresh)'}</span>
            </button>

            <button
              id="btn-dash-pos"
              onClick={onOpenQuickSale || (() => onNavigate('pos'))}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mauzo (POS)</span>
            </button>

            <button
              id="btn-dash-ai"
              onClick={() => onNavigate('ai')}
              className="px-3 py-2.5 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold text-xs rounded-xl border border-purple-400/40 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span className="hidden sm:inline">Uliza AI</span>
            </button>
          </div>
        </div>

        {/* Sync/Offline Notice Banner (STEP 2H) */}
        {syncNotice && (
          <div className="mt-4 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{syncNotice}</span>
            </div>
            <button
              onClick={() => loadRemoteOverview(true)}
              className="text-amber-200 underline font-bold hover:text-white shrink-0 ml-2"
            >
              Jaribu tena
            </button>
          </div>
        )}
      </div>

      {/* Time Window Tabs: Leo | Jana | Mwezi Huu (STEP 2A) */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setTimeWindow('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              timeWindow === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mauzo ya Leo</span>
          </button>

          <button
            onClick={() => setTimeWindow('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              timeWindow === 'yesterday'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mauzo ya Jana</span>
          </button>

          <button
            onClick={() => setTimeWindow('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              timeWindow === 'month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mwezi Huu</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center text-xs text-slate-500 gap-1.5 pr-2">
          <span>Kipindi kilichochaguliwa:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
            {timeWindow === 'today' ? 'Leo' : timeWindow === 'yesterday' ? 'Jana' : 'Mwezi mzima'}
          </span>
        </div>
      </div>

      {/* Primary KPI Cards Grid (STEP 2A, 2E) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Card 1: Mauzo (Revenue) */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>
              {timeWindow === 'yesterday' ? 'Mauzo ya Jana' : timeWindow === 'month' ? 'Mauzo ya Mwezi' : 'Mauzo ya Leo'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatTZS(displaySalesRevenue)}
          </div>
          <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>{displayTransactionsCount} miamala iliyofanyika</span>
          </div>
        </div>

        {/* Card 2: Faida ya Mauzo (Gross Profit - Owner View - STEP 2D) */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Faida ya Mauzo (Gross Profit)</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
            {canSeeProfit ? formatTZS(displayGrossProfit) : '••••••••'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{canSeeProfit ? 'Kabla ya gharama' : '🔒 Fiche (Owner only)'}</span>
            {canSeeProfit && displaySalesRevenue > 0 && (
              <span className="font-bold text-teal-600">
                {Math.round((displayGrossProfit / displaySalesRevenue) * 100)}% Margin
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Gharama & Faida Halisi (Expenses & Net Result - STEP 2A) */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Gharama za Leo</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-red-600 dark:text-red-400 mt-2">
            {formatTZS(displayExpensesTotal)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Faida Halisi: <span className="font-bold text-slate-800 dark:text-slate-200">{canSeeProfit ? formatTZS(displayNetProfit) : '••••'}</span>
          </div>
        </div>

        {/* Card 4: Madeni ya Wateja (Customers / Debts - STEP 2A) */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Madeni Yaliyobaki</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatTZS(displayTotalDebtBalance)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{displayTotalDebtsCount} mikopo ({displayTotalCustomers} wateja)</span>
            <button
              onClick={() => onNavigate('debts')}
              className="text-emerald-600 font-bold hover:underline"
            >
              Fuatilia
            </button>
          </div>
        </div>
      </div>

      {/* Stock Health Grid (STEP 2A) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Jumla ya Bidhaa Stoo</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {displayTotalProducts} Aina za Bidhaa
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Kwenye orodha ya stoo</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Bidhaa Chini ya Kiwango (Low Stock)</div>
            <div className={`text-xl font-black mt-1 ${displayLowStockCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
              {displayLowStockCount} Bidhaa
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zinahitaji kuagizwa upya</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Zilizokwisha Kabisa (Out of Stock)</div>
            <div className={`text-xl font-black mt-1 ${displayOutOfStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {displayOutOfStockCount} Bidhaa
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zisizoweza kuuzwa kwa sasa</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
            <Box className="w-5 h-5" />
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
                Makusanyo kwa Njia za Malipo ({timeWindow === 'yesterday' ? 'Jana' : timeWindow === 'month' ? 'Mwezi Huu' : 'Leo'})
              </h2>
              <p className="text-xs text-slate-500">Mlinganisho wa pesa mkononi (Cash) dhidi ya mitandao ya simu na benki</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
              Jumla: {formatTZS(displaySalesRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Cash */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                💵 Pesa Taslimu (Cash)
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(displayCashTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Droo ya Pesa Kaunta</div>
            </div>

            {/* Mobile Money */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold">
                📱 Mitandao ya Simu
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(displayMobileMoneyTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">M-Pesa, Airtel, Tigo, Halo</div>
            </div>

            {/* Card & Bank */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <div className="text-[11px] text-purple-800 dark:text-purple-300 font-bold">
                💳 Benki & Kadi
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(displayCardBankTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">NMB / CRDB / POS</div>
            </div>

            {/* Debt Sales */}
            <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <div className="text-[11px] text-orange-800 dark:text-orange-300 font-bold">
                📝 Mikopo Iliyotolewa
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                {formatTZS(displayDebtTotal)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Inaingizwa kwenye madeni</div>
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
                <span className="text-slate-600 dark:text-slate-300">Konyagi Original:</span>
                <span className="font-bold text-emerald-600">300ml zimebaki (10 shots)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('barmode')}
            className="w-full mt-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl transition border border-amber-500/30"
          >
            Fungua Bar Mode Kamili
          </button>
        </div>
      </div>

      {/* Connected Devices Grid (STEP 2A - Devices Section) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Vifaa Vilivyounganishwa na Biashara ({displayDevices.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Vifaa vinavyotumika kukata mauzo, kupokea stoo na kusawazisha taarifa</p>
          </div>
          <button
            onClick={() => onNavigate('devices')}
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Simamia Vifaa Vyote
          </button>
        </div>

        {displayDevices.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            Hakuna vifaa vya ziada vilivyosajiliwa kwenye seva kwa sasa. Kifaa hiki ndicho kituo kikuu.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayDevices.map((dev) => (
              <div
                key={dev.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{dev.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{dev.id}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      dev.isOnline
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dev.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{dev.isOnline ? 'Mtandaoni' : 'Nje ya mtandao'}</span>
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <div className="flex justify-between">
                    <span>Mtumiaji:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dev.assignedUserName || 'Keshia Kaunta'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mfumo:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {dev.platform || 'Android'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mara ya Mwisho:</span>
                    <span className="text-slate-500">
                      {dev.lastActive ? formatDateTime(dev.lastActive) : 'Hivi punde'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sales Transactions List (STEP 2A - Recent Sales) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Mauzo ya Hivi Karibuni (Recent Sales)</span>
            </h2>
            <p className="text-xs text-slate-500">Risiti za mwisho zilizokatwa na mawakala au keshia wa biashara</p>
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            Fungua POS & Historia Yote
          </button>
        </div>

        {displayRecentSales.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            Bado hakuna miamala ya mauzo iliyorekodiwa hivi karibuni.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                  <th className="py-2.5 font-semibold">Ankara (Receipt/Invoice)</th>
                  <th className="py-2.5 font-semibold">Muda (Time)</th>
                  <th className="py-2.5 font-semibold">Keshia / Muuzaji</th>
                  <th className="py-2.5 font-semibold">Njia ya Malipo</th>
                  <th className="py-2.5 font-semibold text-right">Kiasi (Amount)</th>
                  {canSeeProfit && <th className="py-2.5 font-semibold text-right">Faida</th>}
                  <th className="py-2.5 font-semibold text-right">Hali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {displayRecentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 font-bold text-slate-900 dark:text-white font-mono">
                      {sale.invoiceNo}
                    </td>
                    <td className="py-3 text-slate-500">{formatDateTime(sale.timestamp)}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                      {sale.cashierName}
                    </td>
                    <td className="py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 font-black text-right text-slate-900 dark:text-white">
                      {formatTZS(sale.total)}
                    </td>
                    {canSeeProfit && (
                      <td className="py-3 font-bold text-right text-teal-600 dark:text-teal-400">
                        {sale.profit !== undefined && sale.profit !== null ? formatTZS(sale.profit) : '—'}
                      </td>
                    )}
                    <td className="py-3 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          sale.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {sale.status === 'completed' ? 'Imekamilika' : 'Refund'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Health Alerts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Bidhaa Zinazokaribia Kuisha Stoo ({localLowStockProducts.length})</span>
            </h2>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Angalia Stoo Yote
            </button>
          </div>

          {localLowStockProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Hakuna bidhaa iliyo chini ya kiwango cha tahadhari kwa sasa. Stoo iko salama!
            </div>
          ) : (
            <div className="space-y-2">
              {localLowStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p?.name || 'Bidhaa'}</div>
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
                      <div className="font-bold text-slate-900 dark:text-white">{p?.name || 'Bidhaa'}</div>
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
    </div>
  );
};
