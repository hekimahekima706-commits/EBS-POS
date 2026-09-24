import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, SaleItem, PaymentMethod, PaymentSplit, Customer, Sale } from '../types';
import { formatTZS, PAYMENT_METHOD_INFO, formatDateTime } from '../utils/formatters';
import { validateTanzanianPhone } from '../utils/security';
import { ReceiptModal } from './ReceiptModal';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  User,
  ShoppingBag,
  Beer,
  Clock,
  Printer,
  Eye,
  Percent,
  X,
  Smartphone,
  Banknote,
  UtensilsCrossed,
  UserCheck,
  AlertTriangle,
  Sparkles,
  Phone,
  Layers
} from 'lucide-react';

interface PosViewProps {
  onSelectSale?: (sale: Sale) => void;
  onPrintReceipt?: (sale: Sale) => void;
}

export const PosView: React.FC<PosViewProps> = ({ onSelectSale, onPrintReceipt }) => {
  const { products, customers, addCustomer, completeSale, profile, sales, tables, users, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart state
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerMode, setCustomerMode] = useState<'walkin' | 'existing' | 'new'>('walkin');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Shot selector modal for bar bottles
  const [shotModalProduct, setShotModalProduct] = useState<Product | null>(null);
  const [selectedShotType, setSelectedShotType] = useState<'single' | 'double' | 'bottle'>('single');

  // Checkout modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [mobileRef, setMobileRef] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: number; reference?: string }[]>([
    { method: 'cash', amount: 0 },
    { method: 'mpesa', amount: 0 },
  ]);

  // Quick Add Customer modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('100000');
  const [customerModalError, setCustomerModalError] = useState('');

  // Internal Modals
  const [modalReceiptSale, setModalReceiptSale] = useState<Sale | null>(null);
  const [modalDetailsSale, setModalDetailsSale] = useState<Sale | null>(null);

  // Category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.active && p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Filtered Customers for search
  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  // Cart calculations
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const cartTax = profile.enableVat ? (cartSubtotal - discountAmount) * (profile.taxRate / 100) : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + cartTax);

  // Add standard product or open shot modal if it's a bar bottle
  const handleProductClick = (product: Product) => {
    if (product.productType === 'bar_bottle' && product.servingSizeMl) {
      setShotModalProduct(product);
      setSelectedShotType('single');
    } else {
      addToCart(product, false);
    }
  };

  const addToCart = (product: Product, isServing: boolean, servingMultiplier = 1) => {
    setCartItems((prev) => {
      const servingSize = (product.servingSizeMl || 30) * servingMultiplier;
      const unitPrice = isServing
        ? (product.sellingPricePerServing || product.sellingPrice) * servingMultiplier
        : product.sellingPrice;
      const costPrice = isServing
        ? (product.buyingPrice / (product.servingsPerBottle || 25)) * servingMultiplier
        : product.buyingPrice;

      const existingIndex = prev.findIndex(
        (i) => i.productId === product.id && i.isServing === isServing && (i.servingSizeMl || 0) === (isServing ? servingSize : 0)
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          total: newQty * current.unitPrice - current.discount,
        };
        return updated;
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: isServing
            ? `${product.name} (Shot ${servingSize}ml)`
            : product.name,
          category: product.category,
          quantity: 1,
          unitPrice,
          costPrice,
          discount: 0,
          total: unitPrice,
          isServing,
          servingSizeMl: isServing ? servingSize : undefined,
          servingsCount: isServing ? servingMultiplier : undefined,
        };
        return [newItem, ...prev];
      }
    });
  };

  const handleShotModalConfirm = () => {
    if (!shotModalProduct) return;
    if (selectedShotType === 'bottle') {
      addToCart(shotModalProduct, false);
    } else if (selectedShotType === 'single') {
      addToCart(shotModalProduct, true, 1);
    } else if (selectedShotType === 'double') {
      addToCart(shotModalProduct, true, 2);
    }
    setShotModalProduct(null);
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        total: newQty * item.unitPrice - item.discount,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountAmount(0);
    setSelectedCustomer(null);
    setSelectedTableId('');
    setSelectedWaiterId('');
    setOrderNotes('');
  };

  // Barcode handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.active && (p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim())
    );

    if (matched) {
      handleProductClick(matched);
      setBarcodeInput('');
    } else {
      alert(`Hakuna bidhaa yenye barcode: ${barcodeInput}`);
    }
  };

  // Final checkout process
  const handleFinalCheckout = () => {
    if (cartItems.length === 0) return;

    if (primaryPaymentMethod === 'debt' && !selectedCustomer) {
      alert('Tafadhali chagua mteja mwenye akaunti kabla ya kuweka mauzo ya deni/mkopo.');
      return;
    }

    let payments: PaymentSplit[] = [];

    if (isSplitPayment) {
      const splitTotal = splitPayments.reduce((s, p) => s + (p.amount || 0), 0);
      if (splitTotal !== cartTotal) {
        alert(`Jumla ya malipo yaliyogawanywa (TZS ${splitTotal.toLocaleString()}) hailingani na jumla ya bili (TZS ${cartTotal.toLocaleString()}).`);
        return;
      }
      payments = splitPayments.filter((p) => p.amount > 0);
    } else {
      payments = [
        {
          method: primaryPaymentMethod,
          amount: cartTotal,
          reference: mobileRef || undefined,
        },
      ];
    }

    const tableObj = tables.find((t) => t.id === selectedTableId);
    const waiterObj = users.find((u) => u.id === selectedWaiterId);

    const completedSale = completeSale(cartItems, payments, {
      discount: discountAmount,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      tableId: selectedTableId || undefined,
      tableName: tableObj?.name || undefined,
      waiterId: selectedWaiterId || undefined,
      waiterName: waiterObj?.name || undefined,
      notes: orderNotes || undefined,
    });

    setShowCheckoutModal(false);
    clearCart();

    // Trigger Print Receipt or Modal
    if (onPrintReceipt) {
      onPrintReceipt(completedSale);
    } else {
      setModalReceiptSale(completedSale);
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerModalError('');

    if (!newCustName.trim()) {
      setCustomerModalError('Jina la mteja linahitajika.');
      return;
    }

    const phoneVal = validateTanzanianPhone(newCustPhone);
    if (!phoneVal.isValid) {
      setCustomerModalError(phoneVal.error || 'Namba ya simu ya Tanzania si sahihi.');
      return;
    }

    const res = addCustomer({
      name: newCustName.trim(),
      phone: phoneVal.formatted || newCustPhone.trim(),
      customerType: 'regular',
      category: 'regular',
      creditLimit: parseFloat(newCustCreditLimit) || 100000,
    });

    if (res.isDuplicate) {
      setCustomerModalError(`Namba hii ipo tayari kwa mteja: ${res.existingCustomer?.name}`);
      setSelectedCustomer(res.existingCustomer || null);
      setShowAddCustomerModal(false);
      return;
    }

    setSelectedCustomer(res.customer);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const changeDue = Math.max(0, (parseFloat(amountTendered) || 0) - cartTotal);

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Top POS / History Toggle & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Kaunta ya POS (Mauzo)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historia ya Mauzo ({sales.length})</span>
          </button>
        </div>

        {activeTab === 'pos' && (
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Scan / Weka Barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shrink-0"
            >
              Scan
            </button>
          </form>
        )}
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Product Catalog */}
          <div className="lg:col-span-7 space-y-3">
            {/* Category Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Bidhaa Zote ({products.filter((p) => p.active).length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Filter Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tafuta jina la bidhaa, nambari ya SKU, au chapa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stockQty <= 0;
                const isLowStock = product.stockQty <= product.minStock;
                const isBarBottle = product.productType === 'bar_bottle';

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleProductClick(product)}
                    className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between cursor-pointer active:scale-98 ${
                      isOutOfStock
                        ? 'opacity-50 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                          {product.category}
                        </span>
                        {isBarBottle && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-black shrink-0">
                            🥃 Shoti / Chupa
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {product.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                          {formatTZS(product.sellingPrice)}
                        </div>
                        {isBarBottle && product.sellingPricePerServing && (
                          <div className="text-[10px] text-amber-500 font-bold">
                            Shoti: {formatTZS(product.sellingPricePerServing)}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {product.stockQty} {product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Active Order & Cart */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm space-y-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    Kapu la Mauzo ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Futa</span>
                  </button>
                )}
              </div>

              {/* Enhanced 3-Mode Customer Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Mteja wa Mauzo Haya:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerModalError('');
                      setShowAddCustomerModal(true);
                    }}
                    className="text-[11px] text-emerald-600 font-black hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Sajili Mteja Mpya</span>
                  </button>
                </div>

                {/* 3 Modes */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('walkin');
                      setSelectedCustomer(null);
                    }}
                    className={`py-1.5 px-2 rounded-xl font-bold text-[11px] transition ${
                      customerMode === 'walkin'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Mteja wa Kawaida
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`py-1.5 px-2 rounded-xl font-bold text-[11px] transition ${
                      customerMode === 'existing'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Mteja Mwenye Akaunti
                  </button>
                </div>

                {customerMode === 'existing' && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Tafuta jina au simu ya mteja..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />

                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {searchedCustomers.map((cust) => {
                        const isSelected = selectedCustomer?.id === cust.id;
                        return (
                          <div
                            key={cust.id}
                            onClick={() => setSelectedCustomer(cust)}
                            className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition ${
                              isSelected
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{cust.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cust.phone}</div>
                            </div>
                            {cust.currentDebt > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 font-bold">
                                Deni: {formatTZS(cust.currentDebt)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Table / Waiter Assignment (Bar / Restaurant) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Meza / Eneo:</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold truncate"
                  >
                    <option value="">-- Hakuna Meza --</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mhudumu (Waiter):</label>
                  <select
                    value={selectedWaiterId}
                    onChange={(e) => setSelectedWaiterId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold truncate"
                  >
                    <option value="">-- Hakuna Mhudumu --</option>
                    {users.filter((u) => u.active).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="py-2 space-y-2 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                    <div>Kapu ni tupu. Bofya bidhaa upande wa kushoto au scan barcode.</div>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                      <div className="pr-2 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          @{item.unitPrice.toLocaleString()} TZS
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => updateItemQuantity(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-black text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="text-right font-black text-slate-900 dark:text-white min-w-[70px]">
                        {formatTZS(item.total)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart Calculations & Checkout */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Discount Row */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Percent className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Punguzo (Discount):</span>
                </span>
                <input
                  type="number"
                  min={0}
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 p-1.5 text-right font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {profile.enableVat && (
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>VAT ({profile.taxRate}%):</span>
                  <span className="font-bold">{formatTZS(cartTax)}</span>
                </div>
              )}

              {/* Total Calculation */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
                    Jumla ya Malipo
                  </div>
                  <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                    {formatTZS(cartTotal)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                  {cartItems.reduce((s, i) => s + i.quantity, 0)} Bidhaa
                </div>
              </div>

              {/* Checkout Button */}
              <button
                id="btn-pos-checkout"
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => {
                  setAmountTendered(cartTotal.toString());
                  setShowCheckoutModal(true);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <CheckCircle className="w-5 h-5" />
                <span>POKEA MALIPO ({formatTZS(cartTotal)})</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sales History Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Orodha ya Miamala Yote ya Mauzo
              </h2>
              <p className="text-xs text-slate-500">Bofya muamala kuona maelezo, kuchapa risiti au kufanya refund</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-bold">Ankara</th>
                  <th className="p-3.5 font-bold">Tarehe na Saa</th>
                  <th className="p-3.5 font-bold">Keshia</th>
                  <th className="p-3.5 font-bold">Mteja / Meza</th>
                  <th className="p-3.5 font-bold">Njia ya Malipo</th>
                  <th className="p-3.5 font-bold">Hali</th>
                  <th className="p-3.5 font-bold text-right">Jumla</th>
                  <th className="p-3.5 font-bold text-right">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => {
                      if (onSelectSale) onSelectSale(s);
                      else setModalDetailsSale(s);
                    }}
                  >
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{s.invoiceNo}</td>
                    <td className="p-3.5 text-slate-500">{formatDateTime(s.timestamp)}</td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{s.cashierName}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {s.customerName || s.tableName || 'Mteja wa Kawaida'}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[11px] px-2.5 py-1 rounded-xl font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-xl font-black uppercase ${
                          s.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : s.status === 'refunded'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-right text-slate-900 dark:text-white">
                      {formatTZS(s.total)}
                    </td>
                    <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (onPrintReceipt) onPrintReceipt(s);
                          else setModalReceiptSale(s);
                        }}
                        title="Chapa Risiti"
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHOT SELECTOR MODAL */}
      {shotModalProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Beer className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {shotModalProduct.name}
                </h3>
              </div>
              <button onClick={() => setShotModalProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedShotType('single')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  selectedShotType === 'single'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Shoti 1 (Single - 30ml)</div>
                  <div className="text-[10px] text-slate-500">Kipimo cha kawaida cha glasi</div>
                </div>
                <div className="font-black text-emerald-600 text-xs">
                  {formatTZS(shotModalProduct.sellingPricePerServing || 4500)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShotType('double')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  selectedShotType === 'double'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Shoti 2 (Double - 60ml)</div>
                  <div className="text-[10px] text-slate-500">Kipimo kikubwa cha glasi</div>
                </div>
                <div className="font-black text-emerald-600 text-xs">
                  {formatTZS((shotModalProduct.sellingPricePerServing || 4500) * 2)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShotType('bottle')}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                  selectedShotType === 'bottle'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Chupa Nzima (Full Bottle)</div>
                  <div className="text-[10px] text-slate-500">{shotModalProduct.bottleSizeMl || 750}ml</div>
                </div>
                <div className="font-black text-emerald-600 text-xs">
                  {formatTZS(shotModalProduct.sellingPrice)}
                </div>
              </button>
            </div>

            <button
              onClick={handleShotModalConfirm}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/30"
            >
              Weka Kwenye Kapu
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl space-y-4">
            <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Kamilisha Malipo (Checkout)</h3>
                <div className="text-xs text-slate-500">Chagua njia ya malipo au gawa kwa njia tofauti</div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 space-y-4 text-xs">
              {/* Payment Methods Grid */}
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'mpesa', 'tigopesa', 'airtel', 'halopesa', 'bank', 'card', 'debt'] as PaymentMethod[]).map(
                  (method) => {
                    const isSelected = primaryPaymentMethod === method;
                    const info = PAYMENT_METHOD_INFO[method];
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPrimaryPaymentMethod(method)}
                        className={`p-2.5 rounded-2xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base">
                          {method === 'cash' ? '💵' : method === 'debt' ? '📝' : method === 'card' || method === 'bank' ? '💳' : '📱'}
                        </span>
                        <span className="truncate text-[10px]">{info.label.split(' ')[0]}</span>
                      </button>
                    );
                  }
                )}
              </div>

              {primaryPaymentMethod === 'cash' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Pesa Iliyotolewa (Cash):</label>
                    <input
                      type="number"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Chenji ya Mteja:</label>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700 font-black text-emerald-400 text-sm">
                      {formatTZS(changeDue)}
                    </div>
                  </div>
                </div>
              )}

              {['mpesa', 'airtel', 'tigopesa', 'halopesa', 'bank'].includes(primaryPaymentMethod) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Namba ya Muamala / Reference (Hiari):
                  </label>
                  <input
                    type="text"
                    value={mobileRef}
                    onChange={(e) => setMobileRef(e.target.value)}
                    placeholder="Mfano: MP982019..."
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white uppercase font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleFinalCheckout}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Kamilisha Mauzo & Kata Risiti</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Sajili Mteja Mpya Haraka</span>
              </h3>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {customerModalError && (
              <div className="p-2.5 rounded-xl bg-red-950 border border-red-800 text-red-200 text-xs font-semibold">
                {customerModalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Jina Kamili la Mteja *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Mfano: Juma Ally"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Namba ya Simu (Tanzania) *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Ukomo wa Deni (Credit Limit TZS)</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={(e) => setNewCustCreditLimit(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3 py-2 text-xs text-slate-400 font-bold"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20"
              >
                Hifadhi Mteja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INTERNAL RECEIPT MODAL FALLBACK */}
      {modalReceiptSale && (
        <ReceiptModal
          sale={modalReceiptSale}
          profile={profile}
          onClose={() => setModalReceiptSale(null)}
        />
      )}

      {/* INTERNAL DETAILS MODAL FALLBACK */}
      {modalDetailsSale && (
        <TransactionDetailsModal
          sale={modalDetailsSale}
          onClose={() => setModalDetailsSale(null)}
          onPrintReceipt={() => {
            const saleToPrint = modalDetailsSale;
            setModalDetailsSale(null);
            setModalReceiptSale(saleToPrint);
          }}
        />
      )}
    </div>
  );
};
