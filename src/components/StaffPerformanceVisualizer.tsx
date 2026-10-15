import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, Sale } from '../types';
import { formatTZS, formatNumber } from '../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  Award,
  ShoppingBag,
  DollarSign,
  Receipt,
  Users,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'all';
type RoleFilter = 'all' | 'cashier' | 'waiter' | 'manager';
type MetricView = 'dual' | 'revenue' | 'volume' | 'transactions';

interface StaffPerformanceData {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  phone: string;
  revenue: number;
  volume: number;
  transactions: number;
  avgTicket: number;
  sharePercentage: number;
  salesCount: number;
}

const PALETTE = [
  '#10b981', // emerald-500
  '#0ea5e9', // sky-500
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
  '#84cc16', // lime-500
  '#3b82f6', // blue-500
];

export const StaffPerformanceVisualizer: React.FC = () => {
  const { sales, users } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [metricView, setMetricView] = useState<MetricView>('dual');

  // Filter sales by time range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter((s: Sale) => {
      if (s.status !== 'completed') return false;
      const saleDate = new Date(s.timestamp);

      if (timeRange === 'today') return s.timestamp.startsWith(todayStr);
      if (timeRange === 'yesterday') return s.timestamp.startsWith(yesterdayStr);
      if (timeRange === 'week') return saleDate >= sevenDaysAgo;
      if (timeRange === 'month') return saleDate >= firstDayOfMonth;
      return true; // 'all'
    });
  }, [sales, timeRange]);

  // Aggregate staff sales performance
  const staffData = useMemo<StaffPerformanceData[]>(() => {
    // 1. Calculate overall total sales to compute percentages
    const totalCompanyRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

    // 2. Map existing users
    const userPerformanceMap = new Map<string, StaffPerformanceData>();

    users.forEach((user) => {
      userPerformanceMap.set(user.id, {
        id: user.id,
        name: user.name || user.username || 'Mtumishi',
        role: user.role,
        roleLabel: getRoleLabel(user.role),
        phone: user.phone || '-',
        revenue: 0,
        volume: 0,
        transactions: 0,
        avgTicket: 0,
        sharePercentage: 0,
        salesCount: 0,
      });
    });

    // 3. Process sales and credit cashiers / waiters
    filteredSales.forEach((sale) => {
      const itemsCount = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const saleAmount = sale.total || 0;

      // Identify staff responsible
      let matchedUserId: string | null = null;

      // Find user by cashierId
      if (sale.cashierId && userPerformanceMap.has(sale.cashierId)) {
        matchedUserId = sale.cashierId;
      } else if (sale.cashierName) {
        // Fallback by name match
        const found = users.find(
          (u) => u.name?.trim().toLowerCase() === sale.cashierName?.trim().toLowerCase()
        );
        if (found) {
          matchedUserId = found.id;
        }
      }

      // If in waiter context and waiter exists
      if (roleFilter === 'waiter' && sale.waiterId) {
        if (userPerformanceMap.has(sale.waiterId)) {
          matchedUserId = sale.waiterId;
        } else if (sale.waiterName) {
          const found = users.find(
            (u) => u.name?.trim().toLowerCase() === sale.waiterName?.trim().toLowerCase()
          );
          if (found) {
            matchedUserId = found.id;
          }
        }
      }

      if (matchedUserId && userPerformanceMap.has(matchedUserId)) {
        const perf = userPerformanceMap.get(matchedUserId)!;
        perf.revenue += saleAmount;
        perf.volume += itemsCount;
        perf.transactions += 1;
        perf.salesCount += 1;
      } else if (sale.cashierName) {
        // Sales made by cashier not in current users list (e.g. historical staff)
        const pseudoId = `staff-${sale.cashierName.toLowerCase().replace(/\s+/g, '-')}`;
        if (!userPerformanceMap.has(pseudoId)) {
          userPerformanceMap.set(pseudoId, {
            id: pseudoId,
            name: sale.cashierName,
            role: 'cashier',
            roleLabel: 'Keshia (Kumbukumbu)',
            phone: '-',
            revenue: 0,
            volume: 0,
            transactions: 0,
            avgTicket: 0,
            sharePercentage: 0,
            salesCount: 0,
          });
        }
        const perf = userPerformanceMap.get(pseudoId)!;
        perf.revenue += saleAmount;
        perf.volume += itemsCount;
        perf.transactions += 1;
        perf.salesCount += 1;
      }
    });

    // 4. Calculate averages & share percentages
    const result: StaffPerformanceData[] = Array.from(userPerformanceMap.values()).map((p) => {
      const avgTicket = p.transactions > 0 ? Math.round(p.revenue / p.transactions) : 0;
      const sharePercentage =
        totalCompanyRevenue > 0 ? Number(((p.revenue / totalCompanyRevenue) * 100).toFixed(1)) : 0;
      return {
        ...p,
        avgTicket,
        sharePercentage,
      };
    });

    // 5. Filter by selected role
    const roleFiltered = result.filter((p) => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'cashier') return p.role === 'cashier';
      if (roleFilter === 'waiter') return p.role === 'waiter';
      if (roleFilter === 'manager') return p.role === 'manager';
      return true;
    });

    // 6. Sort by revenue descending (leaderboard order)
    return roleFiltered.sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, users, roleFilter]);

  // Overall totals across the filtered staff
  const totalStats = useMemo(() => {
    const totalRev = staffData.reduce((sum, s) => sum + s.revenue, 0);
    const totalVol = staffData.reduce((sum, s) => sum + s.volume, 0);
    const totalTxn = staffData.reduce((sum, s) => sum + s.transactions, 0);
    const avgOverall = totalTxn > 0 ? Math.round(totalRev / totalTxn) : 0;
    const topPerformer = staffData.length > 0 && staffData[0].revenue > 0 ? staffData[0] : null;

    return {
      revenue: totalRev,
      volume: totalVol,
      transactions: totalTxn,
      avgTicket: avgOverall,
      topPerformer,
    };
  }, [staffData]);

  // Prepare chart datasets
  const chartData = useMemo(() => {
    return staffData.map((s, index) => ({
      id: s.id,
      name: s.name.split(' ')[0] + (s.name.split(' ')[1] ? ` ${s.name.split(' ')[1][0]}.` : ''),
      fullName: s.name,
      roleLabel: s.roleLabel,
      phone: s.phone,
      revenue: s.revenue,
      volume: s.volume,
      transactions: s.transactions,
      avgTicket: s.avgTicket,
      sharePercentage: s.sharePercentage,
      fill: PALETTE[index % PALETTE.length],
    }));
  }, [staffData]);

  // Pie chart dataset (only staff with revenue > 0)
  const pieData = useMemo(() => {
    const activeStaff = chartData.filter((d) => d.revenue > 0);
    if (activeStaff.length === 0) return [];
    return activeStaff;
  }, [chartData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Time range selector (Segmented Button Group) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>Kipindi:</span>
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0">
              {(
                [
                  { id: 'today', label: 'Leo' },
                  { id: 'yesterday', label: 'Jana' },
                  { id: 'week', label: 'Siku 7' },
                  { id: 'month', label: 'Mwezi Huu' },
                  { id: 'all', label: 'Muda Wote' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === tab.id
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Controls: Role filter and Metric focus */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Nafasi:</span>
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Wafanyakazi Wote</option>
                <option value="cashier">Makashia Pekee</option>
                <option value="waiter">Wahudumu Pekee</option>
                <option value="manager">Mameneja Pekee</option>
              </select>
            </div>

            {/* Metric Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              <button
                onClick={() => setMetricView('dual')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  metricView === 'dual'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Onyesha Mapato na Kiasi kwa pamoja"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Linganisha Pamoja</span>
              </button>
              <button
                onClick={() => setMetricView('revenue')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metricView === 'revenue'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mapato (TZS)
              </button>
              <button
                onClick={() => setMetricView('volume')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metricView === 'volume'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Kiasi cha Bidhaa (Pcs)
              </button>
              <button
                onClick={() => setMetricView('transactions')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metricView === 'transactions'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Miamala
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff Sales */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mapato ya Wafanyakazi
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatTZS(totalStats.revenue)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Miamala {formatNumber(totalStats.transactions)} iliyokamilika</span>
            </div>
          </div>
        </div>

        {/* Total Volume Sold */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kiasi cha Bidhaa Zilizouzwa
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatNumber(totalStats.volume)}{' '}
              <span className="text-sm font-semibold text-slate-400">vipande</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Jumla ya vitu vilivyoingizwa kwenye risiti</span>
            </div>
          </div>
        </div>

        {/* Average Basket Size */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Wastani kwa Risiti (Basket Size)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatTZS(totalStats.avgTicket)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <span>Kiwango cha mauzo kwa mteja mmoja</span>
            </div>
          </div>
        </div>

        {/* Top Performer Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent dark:from-emerald-950/30 dark:to-transparent rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Kinara wa Mauzo</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">#1 Top Staff</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-slate-900 dark:text-white truncate">
              {totalStats.topPerformer ? totalStats.topPerformer.name : 'Hakuna mauzo'}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              {totalStats.topPerformer ? (
                <>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatTZS(totalStats.topPerformer.revenue)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{totalStats.topPerformer.volume} pcs</span>
                  <span aria-hidden="true">·</span>
                  <span>({totalStats.topPerformer.sharePercentage}%)</span>
                </>
              ) : (
                <span>Rekodi ya mauzo haijapatikana</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Bar Chart of Sales & Volume per Staff member (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Ulinganifu wa Mauzo na Kiasi cha Bidhaa kwa Watumishi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kulinganisha mapato halisi na wingi wa bidhaa zilizouzwa na kila keshia / mhudumu
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                <span>Mauzo (TZS)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
                <span>Kiasi (Pcs)</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  {/* Left Axis: Revenue in TZS */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return String(val);
                    }}
                  />
                  {/* Right Axis: Item Volume Count */}
                  {(metricView === 'dual' || metricView === 'volume') && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val} pcs`}
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />

                  {/* Render based on selected metric */}
                  {(metricView === 'dual' || metricView === 'revenue') && (
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Mapato (TZS)"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  )}

                  {(metricView === 'dual' || metricView === 'volume') && (
                    <Bar
                      yAxisId={metricView === 'dual' ? 'right' : 'left'}
                      dataKey="volume"
                      name="Kiasi cha Bidhaa (Pcs)"
                      fill="#0ea5e9"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  )}

                  {metricView === 'transactions' && (
                    <Bar
                      yAxisId="left"
                      dataKey="transactions"
                      name="Idadi ya Miamala"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <span>Hakuna data ya wafanyakazi kwa kipindi hiki.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Revenue Share Donut / Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Gawio la Mauzo kwa Kila Mtumishi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Asilimia (%) ya mchango kwenye mapato yote ya biashara
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center my-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="revenue"
                    nameKey="fullName"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <PieIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>Hakuna mauzo yaliyofanyika bado.</span>
              </div>
            )}
          </div>

          {/* Quick Staff Legend List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
            {pieData.slice(0, 5).map((staff, idx) => (
              <div key={`staff-pie-${staff?.id || idx}-${idx}`} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                    {staff.fullName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-semibold text-slate-900 dark:text-white">
                  <span>{formatTZS(staff.revenue)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {staff.sharePercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard & Detailed Productivity Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Jedwali la Tija na Nafasi za Wafanyakazi (Productivity Leaderboard)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Orodha iliyopangwa kuanzia mtumishi aliyeingiza mauzo mengi zaidi hadi mdogo zaidi
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Wafanyakazi: <strong className="text-slate-800 dark:text-slate-200">{staffData.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Miamala: <strong className="text-slate-800 dark:text-slate-200">{totalStats.transactions}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                <th className="py-3 px-2 font-semibold">Nafasi</th>
                <th className="py-3 px-3 font-semibold">Mfanyakazi</th>
                <th className="py-3 px-3 font-semibold text-right">Mapato (TZS)</th>
                <th className="py-3 px-3 font-semibold text-center">Gawio la Mauzo</th>
                <th className="py-3 px-3 font-semibold text-right">Kiasi (Volume)</th>
                <th className="py-3 px-3 font-semibold text-right">Miamala</th>
                <th className="py-3 px-3 font-semibold text-right">Wastani kwa Muamala</th>
                <th className="py-3 px-2 font-semibold text-center">Kiwango cha Tija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffData.map((staff, index) => {
                const rank = index + 1;
                const isLeader = rank === 1 && staff.revenue > 0;
                const isTopThree = (rank === 2 || rank === 3) && staff.revenue > 0;

                return (
                  <tr
                    key={`staff-row-${staff?.id || index}-${index}`}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isLeader ? 'bg-emerald-500/5 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black">
                        {isLeader ? (
                          <span className="text-amber-500 text-sm">🥇</span>
                        ) : rank === 2 ? (
                          <span className="text-slate-400 text-sm">🥈</span>
                        ) : rank === 3 ? (
                          <span className="text-amber-700 text-sm">🥉</span>
                        ) : (
                          <span className="text-slate-400">{rank}</span>
                        )}
                      </div>
                    </td>

                    {/* Staff Name & Role */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                        >
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{staff.name}</span>
                            {isLeader && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3" />
                                <span>Kinara</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>{staff.roleLabel}</span>
                            {staff.phone !== '-' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{staff.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-slate-900 dark:text-white">
                        {formatTZS(staff.revenue)}
                      </div>
                    </td>

                    {/* Share Progress Bar */}
                    <td className="py-3 px-3">
                      <div className="w-28 mx-auto space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                          <span>{staff.sharePercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(staff.sharePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Volume (Units Sold) */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {formatNumber(staff.volume)}{' '}
                        <span className="text-[11px] font-normal text-slate-400">pcs</span>
                      </div>
                    </td>

                    {/* Transactions */}
                    <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                      {formatNumber(staff.transactions)}
                    </td>

                    {/* Average Ticket Size */}
                    <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {staff.transactions > 0 ? formatTZS(staff.avgTicket) : '-'}
                    </td>

                    {/* Productivity Badge / Rating */}
                    <td className="py-3 px-2 text-center">
                      {isLeader ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          <Award className="w-3.5 h-3.5" />
                          <span>Bora Zaidi</span>
                        </span>
                      ) : isTopThree ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tija Nzuri</span>
                        </span>
                      ) : staff.revenue > 0 ? (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Wastani
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Hakuna Mauzo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper for friendly Swahili role titles
function getRoleLabel(role: UserRole | string): string {
  switch (role) {
    case 'owner':
    case 'boss':
      return 'Mmiliki (Boss)';
    case 'super_admin':
    case 'admin':
      return 'Msimamizi Mkuu';
    case 'manager':
      return 'Meneja (Manager)';
    case 'cashier':
      return 'Keshia (Kaunta)';
    case 'waiter':
      return 'Mhudumu (Waiter)';
    case 'storekeeper':
      return 'Mtunza Stoo';
    case 'accountant':
      return 'Mhasibu';
    default:
      return String(role);
  }
}

// Custom Tooltip for the primary Bar / Composed chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs backdrop-blur-sm min-w-[210px] space-y-2">
        <div>
          <div className="font-black text-sm text-emerald-400">{data.fullName}</div>
          <div className="text-slate-400 text-[11px]">
            {data.roleLabel}
            {data.phone && data.phone !== '-' && ` · ${data.phone}`}
          </div>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-slate-700/60">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Mauzo Halisi:</span>
            <span className="font-black text-emerald-400">{formatTZS(data.revenue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Kiasi cha Vitu:</span>
            <span className="font-bold text-sky-400">{formatNumber(data.volume)} pcs</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Idadi ya Risiti:</span>
            <span className="font-bold text-indigo-400">{formatNumber(data.transactions)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Wastani kwa Risiti:</span>
            <span className="font-bold text-amber-400">{formatTZS(data.avgTicket)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-[11px]">
            <span className="text-slate-400">Gawio la Biashara:</span>
            <span className="font-bold text-white">{data.sharePercentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie / Donut chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-2.5 rounded-xl border border-slate-700 shadow-xl text-xs backdrop-blur-sm">
        <div className="font-bold text-emerald-400">{data.fullName}</div>
        <div className="text-slate-400 text-[11px] mb-1">{data.roleLabel}</div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Mapato:</span>
          <span className="font-bold">{formatTZS(data.revenue)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Mchango:</span>
          <span className="font-bold text-emerald-400">{data.sharePercentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default StaffPerformanceVisualizer;
