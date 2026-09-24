import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductType, StockMovementType } from '../types';
import { formatTZS, formatDateTime } from '../utils/formatters';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  Sliders,
  History,
  Beer,
  CheckCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    stockMovements,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Add/Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Vinywaji',
    sku: '',
    barcode: '',
    buyingPrice: '',
    sellingPrice: '',
    stockQty: '',
    minStock: '5',
    unit: 'Chupa',
    productType: 'standard' as ProductType,
    bottleSizeMl: '750',
    servingSizeMl: '30',
    sellingPricePerServing: '3000',
    servingsPerBottle: '25',
  });

  // Stock Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustType, setAdjustType] = useState<StockMovementType>('purchase');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Vinywaji',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      buyingPrice: '',
      sellingPrice: '',
      stockQty: '10',
      minStock: '5',
      unit: 'Chupa',
      productType: 'standard',
      bottleSizeMl: '750',
      servingSizeMl: '30',
      sellingPricePerServing: '3000',
      servingsPerBottle: '25',
    });
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      sku: p.sku,
      barcode: p.barcode,
      buyingPrice: p.buyingPrice.toString(),
      sellingPrice: p.sellingPrice.toString(),
      stockQty: p.stockQty.toString(),
      minStock: p.minStock.toString(),
      unit: p.unit,
      productType: p.productType,
      bottleSizeMl: (p.bottleSizeMl || 750).toString(),
      servingSizeMl: (p.servingSizeMl || 30).toString(),
      sellingPricePerServing: (p.sellingPricePerServing || 3000).toString(),
      servingsPerBottle: (p.servingsPerBottle || 25).toString(),
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const buyingPrice = parseFloat(formData.buyingPrice) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const stockQty = parseFloat(formData.stockQty) || 0;
    const minStock = parseFloat(formData.minStock) || 5;

    const isBar = formData.productType === 'bar_bottle';
    const bottleSizeMl = isBar ? parseFloat(formData.bottleSizeMl) || 750 : undefined;
    const servingSizeMl = isBar ? parseFloat(formData.servingSizeMl) || 30 : undefined;
    const sellingPricePerServing = isBar ? parseFloat(formData.sellingPricePerServing) || 3000 : undefined;
    const servingsPerBottle = isBar ? parseFloat(formData.servingsPerBottle) || 25 : undefined;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name,
        category: formData.category,
        sku: formData.sku,
        barcode: formData.barcode,
        buyingPrice,
        sellingPrice,
        minStock,
        unit: formData.unit,
        productType: formData.productType,
        bottleSizeMl,
        servingSizeMl,
        sellingPricePerServing,
        servingsPerBottle,
      });
    } else {
      addProduct({
        name: formData.name,
        category: formData.category,
        sku: formData.sku,
        barcode: formData.barcode,
        buyingPrice,
        sellingPrice,
        stockQty,
        minStock,
        unit: formData.unit,
        productType: formData.productType,
        active: true,
        bottleSizeMl,
        servingSizeMl,
        sellingPricePerServing,
        servingsPerBottle,
        openBottleRemainingMl: isBar ? bottleSizeMl : undefined,
      });
    }

    setShowProductModal(false);
  };

  const handleOpenAdjustModal = (p: Product) => {
    setAdjustTargetProduct(p);
    setAdjustDelta('1');
    setAdjustType('purchase');
    setAdjustReason('Ununuzi mpya wa mzigo kutoka kwa msambazaji');
    setAdjustNote('');
    setShowAdjustModal(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetProduct) return;

    const delta = parseFloat(adjustDelta) || 0;
    if (delta === 0) return;

    // Multiplier based on movement type
    const multiplier = ['purchase', 'return', 'opening_stock'].includes(adjustType) ? 1 : -1;
    const finalDelta = Math.abs(delta) * multiplier;

    adjustStock(
      adjustTargetProduct.id,
      finalDelta,
      adjustType,
      adjustReason || 'Marekebisho ya stoo',
      adjustNote
    );

    setShowAdjustModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Usimamizi wa Bidhaa & Stoo (Inventory)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kusajili bidhaa, viwango vya tahadhari, ununuzi wa mizigo, na marekebisho
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'products'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              📦 Bidhaa Zote ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'movements'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              📜 Kumbukumbu za Stoo
            </button>
          </div>

          <button
            id="btn-add-new-product"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Bidhaa Mpya</span>
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tafuta kwa jina la bidhaa, SKU au barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-emerald-600"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">Makundi Yote (Categories)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-3 px-4 font-semibold">Jina la Bidhaa & Aina</th>
                    <th className="py-3 px-4 font-semibold">Kundi</th>
                    <th className="py-3 px-4 font-semibold">Bei ya Kununua</th>
                    <th className="py-3 px-4 font-semibold">Bei ya Kuuza</th>
                    <th className="py-3 px-4 font-semibold">Stoo Iliyopo</th>
                    <th className="py-3 px-4 font-semibold">Hali ya Stoo</th>
                    <th className="py-3 px-4 font-semibold text-right">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((p) => {
                    const isLow = p.stockQty <= p.minStock;
                    const isOut = p.stockQty <= 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.productType === 'bar_bottle' && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                🥃 {p.bottleSizeMl}ml
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {p.sku} • Barcode: {p.barcode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {p.category}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatTZS(p.buyingPrice)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {formatTZS(p.sellingPrice)}
                          {p.sellingPricePerServing && (
                            <div className="text-[10px] text-amber-600 font-normal">
                              ({formatTZS(p.sellingPricePerServing)} / shot)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-sm">
                          {p.stockQty} {p.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isOut
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {isOut ? 'Imeisha' : isLow ? 'Inakaribia' : 'Ipo ya Kutosha'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenAdjustModal(p)}
                              title="Rekebisha Stoo / Ongeza Mzigo"
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Stoo</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Hariri Taarifa"
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Je, una uhakika unataka kuzima bidhaa ${p.name}?`)) {
                                  deleteProduct(p.id);
                                }
                              }}
                              title="Zima Bidhaa"
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stock Movements Ledger */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Kumbukumbu ya Mabadiliko Yote ya Stoo (Stock Ledger)
              </h2>
              <p className="text-xs text-slate-500">
                Inaonyesha kila mzigo ulioingia, uliouzwa, uliopotea, na marekebisho yaliyofanywa
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                  <th className="py-2.5 font-semibold">Tarehe na Saa</th>
                  <th className="py-2.5 font-semibold">Bidhaa</th>
                  <th className="py-2.5 font-semibold">Aina ya Mabadiliko</th>
                  <th className="py-2.5 font-semibold">Kiasi</th>
                  <th className="py-2.5 font-semibold">Sababu & Maelezo</th>
                  <th className="py-2.5 font-semibold">Mfanyakazi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockMovements.map((sm) => (
                  <tr key={sm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 text-slate-500">{formatDateTime(sm.timestamp)}</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{sm.productName}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          sm.quantity > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {sm.type}
                      </span>
                    </td>
                    <td
                      className={`py-3 font-black text-sm ${
                        sm.quantity > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {sm.quantity > 0 ? `+${sm.quantity}` : sm.quantity} {sm.unit}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      <div>{sm.reason}</div>
                      {sm.note && <div className="text-[10px] text-slate-400">{sm.note}</div>}
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                      {sm.userName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                {editingProduct ? 'Hariri Taarifa za Bidhaa' : 'Sajili Bidhaa Mpya'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Product Type (Standard vs Bar Bottle) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aina ya Bidhaa:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'standard' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.productType === 'standard'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Bidhaa ya Kawaida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'bar_bottle', unit: 'Chupa' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.productType === 'bar_bottle'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Beer className="w-4 h-4" />
                    <span>Chupa ya Bar (Inayokatwa Shots)</span>
                  </button>
                </div>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jina la Bidhaa:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Mfano: Safari Lager / Konyagi 750ml"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kundi (Category):
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Bia & Cider, Spirits, Soda..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code:
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Barcode (Namba ya Scanner):
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bei ya Kununua (Buying Price TZS):
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.buyingPrice}
                    onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                    placeholder="2500"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bei ya Kuuza Chupa/Unit (Selling TZS):
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="3500"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Bar Specific Settings if Bar Bottle */}
              {formData.productType === 'bar_bottle' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-3">
                  <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Beer className="w-4 h-4" />
                    <span>Mipangilio ya Shots za Vinywaji Vikali</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Ujazo wa Chupa (ml):
                      </label>
                      <input
                        type="number"
                        value={formData.bottleSizeMl}
                        onChange={(e) => setFormData({ ...formData, bottleSizeMl: e.target.value })}
                        className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Kipimo cha Shot (ml):
                      </label>
                      <input
                        type="number"
                        value={formData.servingSizeMl}
                        onChange={(e) => setFormData({ ...formData, servingSizeMl: e.target.value })}
                        className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Bei ya Shot Moja (TZS):
                      </label>
                      <input
                        type="number"
                        value={formData.sellingPricePerServing}
                        onChange={(e) => setFormData({ ...formData, sellingPricePerServing: e.target.value })}
                        className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-amber-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Idadi ya Shots/Chupa:
                      </label>
                      <input
                        type="number"
                        value={formData.servingsPerBottle}
                        onChange={(e) => setFormData({ ...formData, servingsPerBottle: e.target.value })}
                        className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Initial Stock & Alert Level */}
              {!editingProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Stoo ya Awali (Initial Quantity):
                    </label>
                    <input
                      type="number"
                      value={formData.stockQty}
                      onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kiwango cha Tahadhari (Min Stock):
                    </label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30"
              >
                {editingProduct ? 'Sasisha Bidhaa' : 'Hifadhi Bidhaa Mpya'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustTargetProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleConfirmAdjust}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Marekebisho ya Stoo
                </h3>
                <div className="text-xs text-emerald-600 font-bold">
                  {adjustTargetProduct.name} (Iliyopo: {adjustTargetProduct.stockQty} {adjustTargetProduct.unit})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Aina ya Muamala:
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="purchase">📥 Ununuzi Mpya wa Mzigo (+)</option>
                  <option value="adjustment">⚖️ Hesabu ya Stoo / Physical Count (±)</option>
                  <option value="damage">💥 Bidhaa Zilizovunjika / Kuharibika (-)</option>
                  <option value="loss">⚠️ Bidhaa Zilizopotea / Wizi (-)</option>
                  <option value="spillage">🍷 Spillage / Kumwagika kwa Vinywaji (-)</option>
                  <option value="wastage">🗑️ Wastage / Kuchacha au Kuexpire (-)</option>
                  <option value="return">↩️ Mteja Kurudisha Bidhaa (+)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kiasi cha Bidhaa ({adjustTargetProduct.unit}):
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="any"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sababu ya Marekebisho (Mandatory Audit Reason):
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Mfano: Mzigo umefika kutoka Serengeti Breweries"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maelezo ya Ziada (Hiari):
                </label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Namba ya gari, risiti ya msambazaji au maelezo..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30"
              >
                Hifadhi Mabadiliko
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
