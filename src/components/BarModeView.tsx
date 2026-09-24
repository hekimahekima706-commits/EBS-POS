import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, BarVarianceRecord } from '../types';
import { formatTZS, formatDateTime } from '../utils/formatters';
import { isProductActive } from '../utils/productUtils';
import {
  Beer,
  Wine,
  Scale,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  RefreshCw,
  Sliders,
  DollarSign,
  ClipboardList,
  Sparkles
} from 'lucide-react';

export const BarModeView: React.FC = () => {
  const { products, updateProduct, barVariances, recordBarVariance, adjustStock, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'open_bottles' | 'audit' | 'calculator'>('open_bottles');

  // Bar specific products (spirits, whiskies, open bottles)
  const barProducts = products.filter(
    (p) => isProductActive(p) && (p.productType === 'bar_bottle' || p.isBarItem || p.category.toLowerCase().includes('spirit') || p.category.toLowerCase().includes('whisky'))
  );

  // Reconciliation / Variance form state
  const [selectedAuditProduct, setSelectedAuditProduct] = useState<Product | null>(barProducts[0] || null);
  const [physicalBottles, setPhysicalBottles] = useState<string>('0');
  const [physicalOpenBottleMl, setPhysicalOpenBottleMl] = useState<string>('0');
  const [auditNotes, setAuditNotes] = useState<string>('');

  // Spillage modal state
  const [showSpillageModal, setShowSpillageModal] = useState(false);
  const [spillProduct, setSpillProduct] = useState<Product | null>(barProducts[0] || null);
  const [spillMl, setSpillMl] = useState<string>('30');
  const [spillReason, setSpillReason] = useState<string>('Kumwagika wakati wa kumiminia mteja (Spillage)');

  // Calculator state
  const [calcBottleSize, setCalcBottleSize] = useState<number>(750);
  const [calcShotSize, setCalcShotSize] = useState<number>(30);
  const [calcBottleBuyPrice, setCalcBottleBuyPrice] = useState<number>(35000);
  const [calcBottleSellPrice, setCalcBottleSellPrice] = useState<number>(55000);
  const [calcShotSellPrice, setCalcShotSellPrice] = useState<number>(3000);

  // Calculator computations
  const totalShotsPossible = Math.floor(calcBottleSize / calcShotSize);
  const totalRevenueFromShots = totalShotsPossible * calcShotSellPrice;
  const profitFromBottleSale = calcBottleSellPrice - calcBottleBuyPrice;
  const profitFromShotSale = totalRevenueFromShots - calcBottleBuyPrice;
  const extraGainFromShots = profitFromShotSale - profitFromBottleSale;

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditProduct) return;

    const countedBottles = parseFloat(physicalBottles) || 0;
    const countedMl = parseFloat(physicalOpenBottleMl) || 0;

    const bottleSize = selectedAuditProduct.bottleSizeMl || 750;
    const expectedBottles = selectedAuditProduct.stockQty;
    const expectedMl = selectedAuditProduct.openBottleRemainingMl || 0;

    const expectedTotalMl = (expectedBottles * bottleSize) + expectedMl;
    const physicalTotalMl = (countedBottles * bottleSize) + countedMl;

    const varianceMl = physicalTotalMl - expectedTotalMl;
    const varianceBottles = varianceMl / bottleSize;

    let status: 'balanced' | 'slight_variance' | 'major_shortage' = 'balanced';
    if (varianceMl < -100) {
      status = 'major_shortage';
    } else if (varianceMl < 0) {
      status = 'slight_variance';
    }

    recordBarVariance({
      productId: selectedAuditProduct.id,
      productName: selectedAuditProduct.name,
      expectedStockBottles: expectedBottles,
      expectedOpenBottleMl: expectedMl,
      physicalStockBottles: countedBottles,
      physicalOpenBottleMl: countedMl,
      varianceMl,
      varianceBottles,
      status,
      notes: auditNotes || 'Ukaguzi wa mwisho wa shift ya bar',
    });

    // Update product to match physical count
    updateProduct(selectedAuditProduct.id, {
      stockQty: countedBottles,
      openBottleRemainingMl: countedMl,
    });

    alert(`Ukaguzi wa ${selectedAuditProduct.name} umehifadhiwa kikamilifu! Tofauti: ${varianceMl} ml.`);
    setAuditNotes('');
  };

  const handleRecordSpillage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spillProduct) return;

    const ml = parseFloat(spillMl) || 0;
    if (ml <= 0) return;

    const currentRemaining = spillProduct.openBottleRemainingMl || spillProduct.bottleSizeMl || 750;
    const newRemaining = Math.max(0, currentRemaining - ml);

    updateProduct(spillProduct.id, {
      openBottleRemainingMl: newRemaining,
    });

    adjustStock(
      spillProduct.id,
      0,
      'spillage',
      `Spillage ya ${ml}ml: ${spillReason}`,
      undefined,
      ml
    );

    setShowSpillageModal(false);
    alert(`Spillage ya ${ml}ml ya ${spillProduct.name} imerekodiwa.`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold uppercase">
              🍸 Specialized Bar Operating System
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Beer className="w-5 h-5 text-amber-500" />
            <span>Dashibodi ya Bar: Chupa, Shots & Ukaguzi wa Milliliters</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kudhibiti vinywaji vikali vinavyouzwa kwa shots, kufuatilia chupa zilizofunguliwa, na kuzuia upotevu
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSpillageModal(true)}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800 flex items-center gap-1.5 transition"
          >
            <Wine className="w-4 h-4" />
            <span>Rekodi Spillage (Kumwagika)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('open_bottles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'open_bottles'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Beer className="w-4 h-4" />
          <span>Chupa Zilizofunguliwa Kaunta</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Ukaguzi wa Shift & Variance (Tofauti)</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'calculator'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Kikokotoo cha Shots vs Chupa</span>
        </button>
      </div>

      {/* TAB 1: Open Bottles Tracking */}
      {activeTab === 'open_bottles' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <Beer className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Mfumo Mahususi wa Shots (30ml / 60ml):</div>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-400">
                Wakati keshia au mhudumu anapouza shot kwenye POS, mfumo haukati chupa nzima. Badala yake, unakata milliliters (ml 30) kwenye chupa iliyofunguliwa. Chupa ikimalizika, inafungua chupa mpya kutoka stoo kiotomatiki.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barProducts.map((p) => {
              const bottleSize = p.bottleSizeMl || 750;
              const remainingMl = p.openBottleRemainingMl ?? bottleSize;
              const percentage = Math.min(100, Math.max(0, Math.round((remainingMl / bottleSize) * 100)));
              const shotsRemaining = Math.floor(remainingMl / (p.servingSizeMl || 30));

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {p.category}
                        </span>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white mt-0.5">
                          {p.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                        Stoo: {p.stockQty} chupa
                      </span>
                    </div>

                    {/* Milliliters Gauge Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600 dark:text-slate-400">Ujazo wa Chupa Iliyopo:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {remainingMl}ml / {bottleSize}ml ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentage > 40
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : percentage > 15
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-red-500 to-rose-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <div className="text-[10px] text-slate-400">Shots Zilizobaki:</div>
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          {shotsRemaining} shots (30ml)
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <div className="text-[10px] text-slate-400">Bei ya Shot:</div>
                        <div className="font-black text-amber-600 text-sm">
                          {formatTZS(p.sellingPricePerServing || 3000)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (confirm(`Je, unataka kufungua chupa mpya ya ${p.name} kutoka stoo?`)) {
                          if (p.stockQty <= 0) {
                            alert('Hakuna chupa iliyobaki stoo!');
                            return;
                          }
                          updateProduct(p.id, {
                            stockQty: p.stockQty - 1,
                            openBottleRemainingMl: bottleSize,
                          });
                        }
                      }}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fungua Chupa Mpya</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAuditProduct(p);
                        setActiveTab('audit');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                    >
                      Kagua Sasa →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Shift Stock Audit & Variance Reconciliation */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Audit Input Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Kurekodi Hesabu ya Mwisho wa Shift</span>
              </h2>
              <p className="text-xs text-slate-500">
                Weka chupa kamili zilizopo + makadirio ya ml kwenye chupa iliyofunguliwa
              </p>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chagua Kinywaji Unachokagua:
                </label>
                <select
                  value={selectedAuditProduct?.id || ''}
                  onChange={(e) => {
                    const p = barProducts.find((item) => item.id === e.target.value);
                    if (p) setSelectedAuditProduct(p);
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  {barProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stoo: {p.stockQty} chupa, {p.openBottleRemainingMl || 0}ml)
                    </option>
                  ))}
                </select>
              </div>

              {selectedAuditProduct && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Stoo ya Mfumo Inayotarajiwa:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedAuditProduct.stockQty} chupa kamili + {selectedAuditProduct.openBottleRemainingMl || 0}ml
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chupa Kamili Uliyohesabu:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={physicalBottles}
                    onChange={(e) => setPhysicalBottles(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ml kwenye Chupa Iliyofunguliwa:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="10"
                    value={physicalOpenBottleMl}
                    onChange={(e) => setPhysicalOpenBottleMl(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maelezo / Sababu ya Tofauti (Kama ipo):
                </label>
                <textarea
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="Mfano: Mteja alirudisha shot / Kulikuwa na spillage ya 2 shots..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition active:scale-98"
              >
                Hifadhi Ukaguzi & Sawazisha Stoo
              </button>
            </form>
          </div>

          {/* Audit History Log */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 dark:text-white mb-3">
              Historia ya Ukaguzi wa Stoo ya Bar (Variance Records)
            </h2>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {barVariances.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {rec.productName}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        rec.status === 'balanced'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : rec.status === 'slight_variance'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {rec.status === 'balanced' ? 'Sawa (0 Tofauti)' : rec.status === 'slight_variance' ? 'Kumwagika Kidogo' : 'Upungufu'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                    <div>
                      Inayotarajiwa: {rec.expectedStockBottles} chupa ({rec.expectedOpenBottleMl}ml)
                    </div>
                    <div>
                      Iliyohesabiwa: {rec.physicalStockBottles} chupa ({rec.physicalOpenBottleMl}ml)
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="text-slate-500">
                      Tofauti (Variance):{' '}
                      <span
                        className={`font-black ${
                          rec.varianceMl < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {rec.varianceMl} ml ({rec.varianceBottles.toFixed(2)} chupa)
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {rec.date} • {rec.recordedBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Profit Comparison Calculator (Shots vs Whole Bottle) */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Kikokotoo cha Faida: Kuuza kwa Shots vs Kuuza Chupa Nzima</span>
              </h2>
              <p className="text-xs text-slate-500">
                Ona ongezeko halisi la faida unapouza kinywaji kikali kwa vipimo vya shot (30ml)
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ujazo wa Chupa (ml):
                  </label>
                  <input
                    type="number"
                    value={calcBottleSize}
                    onChange={(e) => setCalcBottleSize(parseFloat(e.target.value) || 750)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kipimo cha Shot (ml):
                  </label>
                  <input
                    type="number"
                    value={calcShotSize}
                    onChange={(e) => setCalcShotSize(parseFloat(e.target.value) || 30)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bei ya Kununua Chupa Jumla (TZS):
                </label>
                <input
                  type="number"
                  value={calcBottleBuyPrice}
                  onChange={(e) => setCalcBottleBuyPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bei ya Kuuza Chupa Nzima (TZS):
                  </label>
                  <input
                    type="number"
                    value={calcBottleSellPrice}
                    onChange={(e) => setCalcBottleSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bei ya Kuuza Shot Moja (TZS):
                  </label>
                  <input
                    type="number"
                    value={calcShotSellPrice}
                    onChange={(e) => setCalcShotSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Visual Result */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-700/50">
                📊 Matokeo ya Uchambuzi wa Faida
              </span>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Shots Zinazopatikana kwa Chupa 1:</span>
                  <span className="font-black text-lg text-white">{totalShotsPossible} Shots</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Mapato ukiuza Chupa Nzima:</span>
                  <span className="font-bold text-slate-200">{formatTZS(calcBottleSellPrice)}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Mapato ukiuza kwa Shots ({totalShotsPossible} × {formatTZS(calcShotSellPrice)}):</span>
                  <span className="font-black text-emerald-400 text-sm">{formatTZS(totalRevenueFromShots)}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Faida ya Chupa Nzima:</span>
                  <span className="font-bold text-slate-200">{formatTZS(profitFromBottleSale)}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Faida ya Kuuza kwa Shots:</span>
                  <span className="font-black text-emerald-400 text-sm">{formatTZS(profitFromShotSale)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
              <div className="text-xs text-emerald-300 font-semibold">
                Faida ya Ziada kwa Kuuza kwa Shots (Extra Profit):
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                +{formatTZS(extraGainFromShots)} kwa kila chupa
              </div>
              <div className="text-[11px] text-emerald-200/80 mt-1">
                Kuuza kwa shots kunaongeza mapato ya biashara kwa {((extraGainFromShots / Math.max(1, profitFromBottleSale)) * 100).toFixed(0)}%!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spillage Modal */}
      {showSpillageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleRecordSpillage}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Wine className="w-4 h-4 text-red-600" />
              <span>Rekodi Kumwagika / Spillage ya Kinywaji</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chupa Iliyomwagika:
                </label>
                <select
                  value={spillProduct?.id || ''}
                  onChange={(e) => {
                    const p = barProducts.find((i) => i.id === e.target.value);
                    if (p) setSpillProduct(p);
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  {barProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Zimebaki: {p.openBottleRemainingMl || 0}ml)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kiasi Kilichomwagika (Milliliters):
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={spillMl}
                  onChange={(e) => setSpillMl(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sababu / Maelezo:
                </label>
                <input
                  type="text"
                  required
                  value={spillReason}
                  onChange={(e) => setSpillReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSpillageModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Hifadhi Spillage
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
