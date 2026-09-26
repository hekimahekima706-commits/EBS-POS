import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductType, StockMovementType, MedicineClassification, PackagingUnit } from '../types';
import { formatTZS, formatDateTime } from '../utils/formatters';
import { isProductActive, isDemoProduct, getMedicineExpiryStatus, PHARMACY_DOSAGE_FORMS } from '../utils/productUtils';
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
  FileSpreadsheet,
  RotateCcw,
  Archive,
  Sparkles,
  Check,
  Info,
  Pill,
  ShieldAlert,
  HeartPulse,
  Clock,
  Calendar,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    hardDeleteProduct,
    clearDemoData,
    adjustStock,
    stockMovements,
    currentUser,
    profile,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'archived' | 'movements'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'critical_30' | 'warning_90' | 'pom' | 'otc'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add/Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete / Archive Modal State
  const [archiveTargetProduct, setArchiveTargetProduct] = useState<Product | null>(null);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);

  // Demo clear confirmation modal
  const [showClearDemoModal, setShowClearDemoModal] = useState(false);

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
    // Pharmacy fields
    brandName: '',
    genericName: '',
    batchNumber: '',
    expiryDate: '',
    dosageForm: 'Vidonge (Tablets)',
    strength: '',
    medicineType: 'OTC' as MedicineClassification,
  });

  // Packaging Units State (Crate/Boksi/Katoni)
  const [packagingUnits, setPackagingUnits] = useState<PackagingUnit[]>([]);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgUnits, setNewPkgUnits] = useState('');
  const [newPkgBuying, setNewPkgBuying] = useState('');
  const [newPkgSelling, setNewPkgSelling] = useState('');
  const [newPkgBarcode, setNewPkgBarcode] = useState('');
  const [showAddPkgRow, setShowAddPkgRow] = useState(false);

  const handleAddPackagingUnit = () => {
    if (!newPkgName.trim()) {
      alert('Tafadhali weka jina la kifungashio (mfano: Crate ya 24 au Boksi la 12)');
      return;
    }
    const units = parseInt(newPkgUnits, 10);
    if (isNaN(units) || units <= 1) {
      alert('Idadi ya vitengo kwenye kifungashio lazima iwe namba kubwa kuliko 1.');
      return;
    }
    const buying = parseFloat(newPkgBuying) || 0;
    const selling = parseFloat(newPkgSelling) || 0;
    if (selling <= 0) {
      alert('Tafadhali weka bei sahihi ya kuuzia kifungashio.');
      return;
    }

    const newUnit: PackagingUnit = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newPkgName.trim(),
      unitsPerPackage: units,
      buyingPrice: buying,
      sellingPrice: selling,
      barcode: newPkgBarcode.trim() || undefined,
    };

    setPackagingUnits((prev) => [...prev, newUnit]);
    setNewPkgName('');
    setNewPkgUnits('');
    setNewPkgBuying('');
    setNewPkgSelling('');
    setNewPkgBarcode('');
    setShowAddPkgRow(false);
  };

  const handleRemovePackagingUnit = (id: string) => {
    setPackagingUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // Stock Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustType, setAdjustType] = useState<StockMovementType>('purchase');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const activeProducts = useMemo(() => products.filter(isProductActive), [products]);
  const archivedProducts = useMemo(() => products.filter((p) => !isProductActive(p)), [products]);

  const categories = useMemo(() => {
    const list = activeTab === 'archived' ? archivedProducts : activeProducts;
    return Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
  }, [activeProducts, archivedProducts, activeTab]);

  const displayedProducts = useMemo(() => {
    const targetList = activeTab === 'archived' ? archivedProducts : activeProducts;
    return targetList.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (p?.name || '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchQuery) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q));
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;

      if (!matchesSearch || !matchesCat) return false;

      if (expiryFilter === 'all') return true;
      const expStatus = getMedicineExpiryStatus(p.expiryDate);
      if (expiryFilter === 'expired') return expStatus.status === 'expired';
      if (expiryFilter === 'critical_30') return expStatus.status === 'critical_30';
      if (expiryFilter === 'warning_90') return expStatus.status === 'warning_90';
      if (expiryFilter === 'pom') return p.medicineType === 'POM';
      if (expiryFilter === 'otc') return p.medicineType === 'OTC';

      return true;
    });
  }, [activeTab, activeProducts, archivedProducts, searchQuery, categoryFilter, expiryFilter]);

  const pharmacyProducts = useMemo(() => {
    return products.filter((p) => isProductActive(p) && (p.isPharmacyItem || p.productType === 'medicine' || profile.mode === 'pharmacy'));
  }, [products, profile.mode]);

  const pharmacyExpiryStats = useMemo(() => {
    let expiredCount = 0;
    let critical30Count = 0;
    let warning90Count = 0;
    let pomCount = 0;
    let otcCount = 0;

    pharmacyProducts.forEach((p) => {
      const status = getMedicineExpiryStatus(p.expiryDate);
      if (status.status === 'expired') expiredCount++;
      else if (status.status === 'critical_30') critical30Count++;
      else if (status.status === 'warning_90') warning90Count++;

      if (p.medicineType === 'POM') pomCount++;
      else if (p.medicineType === 'OTC') otcCount++;
    });

    return {
      total: pharmacyProducts.length,
      expiredCount,
      critical30Count,
      warning90Count,
      pomCount,
      otcCount,
    };
  }, [pharmacyProducts]);

  const hasDemoProducts = useMemo(() => {
    return products.some((p) => isProductActive(p) && (isDemoProduct(p) || p.id.startsWith('prod-demo-') || p.id === 'prod-1' || p.id === 'prod-2' || p.id === 'prod-3'));
  }, [products]);

  const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const handleOpenAddModal = () => {
    const isPh = profile.mode === 'pharmacy';
    setEditingProduct(null);
    setFormData({
      name: '',
      category: isPh ? 'Dawa za Kawaida' : 'Vinywaji',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      buyingPrice: '',
      sellingPrice: '',
      stockQty: '10',
      minStock: '5',
      unit: isPh ? 'Pakiti' : 'Chupa',
      productType: isPh ? 'medicine' : 'standard',
      bottleSizeMl: '750',
      servingSizeMl: '30',
      sellingPricePerServing: '3000',
      servingsPerBottle: '25',
      brandName: '',
      genericName: '',
      batchNumber: isPh ? `BTH-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 89)}` : '',
      expiryDate: '',
      dosageForm: 'Vidonge (Tablets)',
      strength: '',
      medicineType: 'OTC',
    });
    setPackagingUnits([]);
    setShowAddPkgRow(false);
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p?.name || '',
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
      brandName: p.brandName || '',
      genericName: p.genericName || '',
      batchNumber: p.batchNumber || '',
      expiryDate: p.expiryDate || '',
      dosageForm: p.dosageForm || 'Vidonge (Tablets)',
      strength: p.strength || '',
      medicineType: p.medicineType || 'OTC',
    });
    setPackagingUnits(p.packagingUnits ? [...p.packagingUnits] : []);
    setShowAddPkgRow(false);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const buyingPrice = parseFloat(formData.buyingPrice) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const stockQty = parseFloat(formData.stockQty) || 0;
    const minStock = parseFloat(formData.minStock) || 5;

    const isBar = formData.productType === 'bar_bottle';
    const isMedicine = formData.productType === 'medicine' || profile.mode === 'pharmacy';
    const bottleSizeMl = isBar ? parseFloat(formData.bottleSizeMl) || 750 : undefined;
    const servingSizeMl = isBar ? parseFloat(formData.servingSizeMl) || 30 : undefined;
    const sellingPricePerServing = isBar ? parseFloat(formData.sellingPricePerServing) || 3000 : undefined;
    const servingsPerBottle = isBar ? parseFloat(formData.servingsPerBottle) || 25 : undefined;

    const computedName = isMedicine
      ? (formData.brandName ? `${formData.brandName}${formData.strength ? ` ${formData.strength}` : ''}` : formData.name)
      : formData.name;

    const medicineFields = isMedicine
      ? {
          isPharmacyItem: true,
          brandName: formData.brandName || formData.name,
          genericName: formData.genericName || undefined,
          batchNumber: formData.batchNumber || undefined,
          expiryDate: formData.expiryDate || undefined,
          dosageForm: formData.dosageForm || undefined,
          strength: formData.strength || undefined,
          medicineType: formData.medicineType,
        }
      : {};

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: computedName,
        category: formData.category,
        sku: formData.sku,
        barcode: formData.barcode,
        buyingPrice,
        sellingPrice,
        minStock,
        unit: formData.unit,
        baseUnit: formData.unit,
        packagingUnits: packagingUnits.length > 0 ? packagingUnits : undefined,
        productType: formData.productType,
        bottleSizeMl,
        servingSizeMl,
        sellingPricePerServing,
        servingsPerBottle,
        ...medicineFields,
      });
      showToast(`Taarifa za "${computedName}" zimehifadhiwa kikamilifu.`);
    } else {
      addProduct({
        name: computedName,
        category: formData.category,
        sku: formData.sku,
        barcode: formData.barcode,
        buyingPrice,
        sellingPrice,
        stockQty,
        minStock,
        unit: formData.unit,
        baseUnit: formData.unit,
        packagingUnits: packagingUnits.length > 0 ? packagingUnits : undefined,
        productType: formData.productType,
        active: true,
        bottleSizeMl,
        servingSizeMl,
        sellingPricePerServing,
        servingsPerBottle,
        openBottleRemainingMl: isBar ? bottleSizeMl : undefined,
        ...medicineFields,
      });
      showToast(`Bidhaa mpya ya "${computedName}" imesajiliwa stoo.`);
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

  const handleConfirmArchive = () => {
    if (!archiveTargetProduct) return;
    deleteProduct(archiveTargetProduct.id);
    showToast(`Bidhaa ya "${archiveTargetProduct?.name || 'Bidhaa'}" imeondolewa kwenye orodha ya mauzo na kuhifadhiwa.`);
    setArchiveTargetProduct(null);
  };

  const handleRestoreProduct = (p: Product) => {
    restoreProduct(p.id);
    showToast(`Bidhaa ya "${p?.name || 'Bidhaa'}" imerejeshwa kutumika kwenye mauzo na stoo.`);
  };

  const handleConfirmHardDelete = () => {
    if (!deleteTargetProduct) return;
    const result = hardDeleteProduct(deleteTargetProduct.id);
    showToast(result.message);
    setDeleteTargetProduct(null);
  };

  const handleClearDemoConfirm = () => {
    const result = clearDemoData();
    if (result.success) {
      showToast('Data za majaribio zimeondolewa kikamilifu. Mfumo upo tayari kwa biashara yako halisi.');
      setShowClearDemoModal(false);
    }
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Demo Products Clearance Banner */}
      {hasDemoProducts && isOwnerOrAdmin && (
        <div className="p-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <span>Data za Majaribio (Demo Products) Zinapatikana</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase">
                  Majaribio
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Unaweza kuondoa data zote za majaribio (mauzo, bidhaa za mfano, madeni ya demo) kwa kubofya kitufe hiki ili kuanza biashara yako halisi. Mfumo utatengeneza backup kiotomatiki kwanza.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowClearDemoModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ondoa Data za Majaribio</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Usimamizi wa Bidhaa & Stoo (Inventory)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kusajili bidhaa, viwango vya tahadhari, ununuzi wa mizigo, kufuta/kurejesha na kumbukumbu
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Bidhaa Zinazotumika ({activeProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'archived'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Zilizofutwa / Zilizohifadhiwa ({archivedProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'movements'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Kumbukumbu za Stoo</span>
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

      {/* TAB 1: ACTIVE PRODUCTS OR TAB 2: ARCHIVED PRODUCTS */}
      {activeTab === 'products' || activeTab === 'archived' ? (
        <div className="space-y-4">
          {/* Active Tab Explanatory Note */}
          {activeTab === 'archived' && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Bidhaa Zilizofutwa / Zilizohifadhiwa (Archived Products):</span>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  Bidhaa hizi zimeondolewa kwenye mfumo wa mauzo (POS & Bar Mode) ili zisichanganye wahudumu, lakini historia ya mauzo yaliyopita inalindwa kwenye ripoti za fedha. Unaweza kuibofya "Rejesha" wakati wowote kuirudisha hewani.
                </p>
              </div>
            </div>
          )}

          {/* Pharmacy Expiry & FEFO Dashboard Banner (Shown if pharmacy mode or medicines exist) */}
          {(profile.mode === 'pharmacy' || pharmacyExpiryStats.total > 0) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/30 text-white space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <span>Ufuatiliaji wa Dawa & Tarehe za Kuisha (FEFO & Expiry Tracking)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase">
                        Famasi
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Usimamizi wa dawa kwa kanuni ya First-Expiry First-Out (FEFO), udhibiti wa dawa za cheti (POM), na uzuiaji wa kuuza dawa zilizopitwa na wakati.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Jumla ya Dawa: <strong>{pharmacyExpiryStats.total}</strong></span>
                </div>
              </div>

              {/* Status Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    expiryFilter === 'expired'
                      ? 'border-red-500 bg-red-950/60 ring-2 ring-red-500/50'
                      : 'border-red-900/50 bg-red-950/20 hover:bg-red-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-300">🔴 Imeisha Muda</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-black text-red-400">{pharmacyExpiryStats.expiredCount}</span>
                    <span className="text-[9px] text-red-300/80 block">Zuio la Kuuza (Block)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter(expiryFilter === 'critical_30' ? 'all' : 'critical_30')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    expiryFilter === 'critical_30'
                      ? 'border-amber-500 bg-amber-950/60 ring-2 ring-amber-500/50'
                      : 'border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300">🟡 Chini ya Siku 30</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-black text-amber-400">{pharmacyExpiryStats.critical30Count}</span>
                    <span className="text-[9px] text-amber-300/80 block">Toa Haraka (FEFO)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter(expiryFilter === 'warning_90' ? 'all' : 'warning_90')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    expiryFilter === 'warning_90'
                      ? 'border-yellow-500 bg-yellow-950/60 ring-2 ring-yellow-500/50'
                      : 'border-yellow-900/50 bg-yellow-950/20 hover:bg-yellow-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-yellow-300">🟡 Siku 31 - 90</span>
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-black text-yellow-400">{pharmacyExpiryStats.warning90Count}</span>
                    <span className="text-[9px] text-yellow-300/80 block">Kipindi cha Tahadhari</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter(expiryFilter === 'pom' ? 'all' : 'pom')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    expiryFilter === 'pom'
                      ? 'border-blue-500 bg-blue-950/60 ring-2 ring-blue-500/50'
                      : 'border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-300">💊 POM (Dawa za Cheti)</span>
                    <Pill className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-black text-blue-400">{pharmacyExpiryStats.pomCount}</span>
                    <span className="text-[9px] text-blue-300/80 block">Inahitaji Cheti cha Dkt</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpiryFilter(expiryFilter === 'otc' ? 'all' : 'otc')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    expiryFilter === 'otc'
                      ? 'border-emerald-500 bg-emerald-950/60 ring-2 ring-emerald-500/50'
                      : 'border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-300">🟢 OTC (Bila Cheti)</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-black text-emerald-400">{pharmacyExpiryStats.otcCount}</span>
                    <span className="text-[9px] text-emerald-300/80 block">Dawa Huria za Kaunta</span>
                  </div>
                </button>
              </div>

              {expiryFilter !== 'all' && (
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-300">
                    Kichujio kimewekwa: <strong>{expiryFilter.toUpperCase()}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpiryFilter('all')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold underline"
                  >
                    Onyesha Dawa Zote (Weka Kawaida)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'archived'
                    ? 'Tafuta bidhaa zilizofutwa au kuhifadhiwa...'
                    : profile.mode === 'pharmacy'
                    ? 'Tafuta dawa kwa jina la biashara, jina la kemikali, namba ya baachi au barcode...'
                    : 'Tafuta kwa jina la bidhaa, SKU au barcode...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-emerald-600"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">Makundi Yote ({categories.length})</option>
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
                    <th className="py-3 px-4 font-semibold">Jina la Bidhaa / Dawa</th>
                    <th className="py-3 px-4 font-semibold">Kundi</th>
                    <th className="py-3 px-4 font-semibold">Bei ya Kununua</th>
                    <th className="py-3 px-4 font-semibold">Bei ya Kuuza</th>
                    <th className="py-3 px-4 font-semibold">Stoo Iliyopo</th>
                    <th className="py-3 px-4 font-semibold">Hali / Tarehe ya Kuisha</th>
                    <th className="py-3 px-4 font-semibold text-right">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {activeTab === 'archived'
                          ? 'Hakuna bidhaa zilizofutwa au kuhifadhiwa.'
                          : 'Hakuna bidhaa inayolingana na vigezo ulivyoweka. Bofya "Ongeza Bidhaa Mpya" kusajili.'}
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((p) => {
                      const isLow = p.stockQty <= p.minStock;
                      const isOut = p.stockQty <= 0;
                      const isMed = p.isPharmacyItem || p.productType === 'medicine' || profile.mode === 'pharmacy';
                      const expStatus = getMedicineExpiryStatus(p.expiryDate);

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            isMed && expStatus.isExpired ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center flex-wrap gap-1.5">
                              <span>{p?.name || 'Bidhaa'}</span>
                              {p.productType === 'bar_bottle' && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                  🥃 {p.bottleSizeMl}ml
                                </span>
                              )}
                              {isMed && p.medicineType && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    p.medicineType === 'POM'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {p.medicineType === 'POM' ? '💊 POM (Cheti Pekee)' : '🟢 OTC (Bila Cheti)'}
                                </span>
                              )}
                              {p.packagingUnits && p.packagingUnits.length > 0 && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  📦 Vifungashio: {p.packagingUnits.length}
                                </span>
                              )}
                              {!isProductActive(p) && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                                  Imehifadhiwa
                                </span>
                              )}
                            </div>

                            {/* Medicine generic name and dosage form details */}
                            {isMed && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 space-y-0.5">
                                {p.genericName && (
                                  <div className="font-medium text-slate-600 dark:text-slate-300">
                                    Kemikali: <em>{p.genericName}</em>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                                  {p.batchNumber && (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                      Baachi: <strong>{p.batchNumber}</strong>
                                    </span>
                                  )}
                                  {p.dosageForm && (
                                    <span className="text-slate-500">
                                      {p.dosageForm} {p.strength ? `• ${p.strength}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
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
                            {activeTab === 'archived' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-slate-300">
                                Imezimwa (Inactive)
                              </span>
                            ) : isMed && p.expiryDate ? (
                              <div className="space-y-1">
                                {expStatus.status === 'expired' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 w-fit">
                                    <ShieldAlert className="w-3 h-3 text-red-500" />
                                    <span>🔴 Imeisha Muda ({p.expiryDate})</span>
                                  </span>
                                )}
                                {expStatus.status === 'critical_30' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    <span>🟡 Inaisha Siku {expStatus.daysRemaining} ({p.expiryDate})</span>
                                  </span>
                                )}
                                {expStatus.status === 'warning_90' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800 flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-yellow-600" />
                                    <span>🟡 Inaisha Siku {expStatus.daysRemaining} ({p.expiryDate})</span>
                                  </span>
                                )}
                                {expStatus.status === 'good' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span>🟢 Bado Nzuri ({p.expiryDate})</span>
                                  </span>
                                )}
                                <div>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                      isOut
                                        ? 'text-red-600'
                                        : isLow
                                        ? 'text-amber-600'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Stoo: {isOut ? 'Imeisha' : isLow ? 'Inakaribia Kwisha' : 'Inatosha'}
                                  </span>
                                </div>
                              </div>
                            ) : (
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
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {activeTab === 'archived' ? (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreProduct(p)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-lg flex items-center gap-1.5 transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Rejesha</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetProduct(p)}
                                  className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition"
                                  title="Futa Kabisa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
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
                                  onClick={() => setArchiveTargetProduct(p)}
                                  title="Ondoa / Zima Bidhaa"
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
              {/* Product Type (Standard vs Medicine vs Bar Bottle) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aina ya Bidhaa:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'standard' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.productType === 'standard'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Kawaida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'medicine', unit: 'Pakiti', category: 'Dawa za Kawaida' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.productType === 'medicine' || profile.mode === 'pharmacy'
                        ? 'border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Pill className="w-4 h-4 text-teal-500" />
                    <span>Dawa (Famasi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'bar_bottle', unit: 'Chupa' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.productType === 'bar_bottle'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Beer className="w-4 h-4 text-amber-500" />
                    <span>Chupa ya Bar</span>
                  </button>
                </div>
              </div>

              {/* Pharmacy-Specific Information Box */}
              {(formData.productType === 'medicine' || profile.mode === 'pharmacy') && (
                <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5 text-xs">
                      <Pill className="w-4 h-4 text-teal-600" />
                      <span>Taarifa Maalumu za Kifamasia (Pharmacy Specifications)</span>
                    </div>
                    {formData.expiryDate && (
                      <div>
                        {(() => {
                          const st = getMedicineExpiryStatus(formData.expiryDate);
                          if (st.status === 'expired') {
                            return <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">🔴 Imeisha Muda</span>;
                          }
                          if (st.status === 'critical_30' || st.status === 'warning_90') {
                            return <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">🟡 Inaisha Siku {st.daysRemaining}</span>;
                          }
                          return <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">🟢 Nzuri</span>;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jina la Biashara (Brand Name) *
                      </label>
                      <input
                        type="text"
                        value={formData.brandName}
                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value, name: e.target.value })}
                        placeholder="Mfano: Panadol Extra / Coartem"
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Jina la Kisayansi / Kemikali (Generic Name) *
                      </label>
                      <input
                        type="text"
                        value={formData.genericName}
                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                        placeholder="Mfano: Paracetamol + Caffeine"
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nambari ya Baachi (Batch No) *
                      </label>
                      <input
                        type="text"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        placeholder="ALU-4402"
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tarehe ya Kuisha (Expiry Date) *
                      </label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kipimo (Strength)
                      </label>
                      <input
                        type="text"
                        value={formData.strength}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                        placeholder="500mg, 250mg/5ml"
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Umbo la Dawa (Dosage Form):
                      </label>
                      <select
                        value={formData.dosageForm}
                        onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        {PHARMACY_DOSAGE_FORMS.map((form) => (
                          <option key={form} value={form}>
                            {form}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Uainishaji wa Kisheria (Classification):
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, medicineType: 'OTC' })}
                          className={`p-2 rounded-lg border text-[11px] font-bold transition text-center ${
                            formData.medicineType === 'OTC'
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          🟢 OTC (Bila Cheti)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, medicineType: 'POM' })}
                          className={`p-2 rounded-lg border text-[11px] font-bold transition text-center ${
                            formData.medicineType === 'POM'
                              ? 'border-blue-600 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          💊 POM (Cheti Pekee)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Packaging Units Section (Crate / Boksi / Katoni) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>Vifungashio vya Jumla (Crate / Boksi / Katoni)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      StockQty inabaki kwa base unit ({formData.unit || 'Chupa'}). Mauzo ya kifungashio yatapunguza stock ya base unit kiotomatiki.
                    </p>
                  </div>
                  {!showAddPkgRow && (
                    <button
                      type="button"
                      onClick={() => setShowAddPkgRow(true)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ongeza Kifungashio</span>
                    </button>
                  )}
                </div>

                {/* List of configured packaging units */}
                {packagingUnits.length > 0 && (
                  <div className="space-y-2">
                    {packagingUnits.map((u) => (
                      <div
                        key={u.id}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900 dark:text-white">
                            {(u?.name || 'Kipimo')}{' '}
                            <span className="text-slate-500 font-normal">
                              ({u.unitsPerPackage} {formData.unit || 'units'} kwa kifungashio)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>Kununua: <strong className="text-slate-700 dark:text-slate-300">{formatTZS(u.buyingPrice)}</strong></span>
                            <span>Kuuza: <strong className="text-emerald-600 font-bold">{formatTZS(u.sellingPrice)}</strong></span>
                            {u.barcode && <span className="font-mono">Barcode: {u.barcode}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePackagingUnit(u.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Futa Kifungashio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to add a new packaging unit */}
                {showAddPkgRow && (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      Sajili Kifungashio Kipya cha Bidhaa Hii
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jina la Kifungashio *</label>
                        <input
                          type="text"
                          value={newPkgName}
                          onChange={(e) => setNewPkgName(e.target.value)}
                          placeholder="mfano: Crate ya 24 au Boksi la 12"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Idadi ya {formData.unit || 'Units'} Ndani ya Kifungashio *
                        </label>
                        <input
                          type="number"
                          value={newPkgUnits}
                          onChange={(e) => setNewPkgUnits(e.target.value)}
                          placeholder="mfano: 24"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Bei ya Kununua Kifungashio TZS</label>
                        <input
                          type="number"
                          value={newPkgBuying}
                          onChange={(e) => setNewPkgBuying(e.target.value)}
                          placeholder="mfano: 48000"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Bei ya Kuuzia Kifungashio TZS *</label>
                        <input
                          type="number"
                          value={newPkgSelling}
                          onChange={(e) => setNewPkgSelling(e.target.value)}
                          placeholder="mfano: 60000"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Barcode ya Kifungashio (Hiari)</label>
                        <input
                          type="text"
                          value={newPkgBarcode}
                          onChange={(e) => setNewPkgBarcode(e.target.value)}
                          placeholder="Scanner Code"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddPkgRow(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Ghairi
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPackagingUnit}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                      >
                        Hifadhi Kifungashio
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                  {adjustTargetProduct?.name || 'Bidhaa'} (Iliyopo: {adjustTargetProduct?.stockQty || 0} {adjustTargetProduct?.unit || ''})
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

      {/* Archive / Deactivate Product Confirmation Modal */}
      {archiveTargetProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Ondoa "{archiveTargetProduct?.name || 'Bidhaa'}"?
                </h3>
                <div className="text-[11px] text-slate-500">
                  SKU: {archiveTargetProduct.sku} • Stoo: {archiveTargetProduct.stockQty} {archiveTargetProduct.unit}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Chagua kama unataka <strong>kuizima</strong> ili isionekane kwenye mauzo na stoo (huku ukihifadhi ripoti za zamani), au <strong>kuifuta kabisa</strong> kwenye mfumo.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setArchiveTargetProduct(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = archiveTargetProduct;
                  setArchiveTargetProduct(null);
                  setDeleteTargetProduct(target);
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50"
              >
                Futa Kabisa
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20"
              >
                Zima & Ondoa Sasa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteTargetProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Futa Kabisa "{deleteTargetProduct?.name || 'Bidhaa'}"?
                </h3>
                <div className="text-[11px] text-slate-500">Kitendo hiki hakiwezi kurudishwa</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ikiwa bidhaa hii haina risiti au mauzo ya zamani, itafutwa kabisa. Ikiwa ina historia ya mauzo, mfumo utailinda na kuifanya ibaki imezimwa ili kulinda usahihi wa hesabu na ukaguzi wa TRA.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleConfirmHardDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                Futa Kabisa Sasa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Demo Data Confirmation Modal */}
      {showClearDemoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Ondoa Data za Majaribio (Demo Data)
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Kuanza Biashara Yako Halisi nchini Tanzania
                  </div>
                </div>
              </div>
              <button onClick={() => setShowClearDemoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5 text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Nini Kitakachofanyika:</span>
              </div>
              <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-slate-300">
                <li>Mfumo utatengeneza <strong>backup ya usalama kiotomatiki</strong> kabla ya kufuta chochote.</li>
                <li>Bidhaa zote za mfano, mauzo ya demo, gharama na madeni ya majaribio yatafutwa.</li>
                <li>Akaunti ya Mmiliki, neno la siri, PIN, jina la biashara na mipangilio ya TRA vitabaki salama 100%.</li>
                <li>Utaweza kusajili bidhaa halisi za duka, bar au mgahawa wako mara moja.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearDemoModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleClearDemoConfirm}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Ndio, Ondoa Data za Majaribio Sasa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
