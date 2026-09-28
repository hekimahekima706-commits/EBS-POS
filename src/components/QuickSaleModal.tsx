import React, { useState } from 'react';
import { SaleItem } from '../types';
import { formatTZS } from '../utils/formatters';
import { Zap, ShoppingBag, Plus, Minus, X, Check, Tag } from 'lucide-react';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: SaleItem) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [itemName, setItemName] = useState('Bidhaa ya Jumla');
  const [priceStr, setPriceStr] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('Jumla / Vinginevyo');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPresets = [
    { label: 'Bidhaa ya Jumla', cat: 'Jumla' },
    { label: 'Chai / Kahawa', cat: 'Vyakula' },
    { label: 'Juisi / Soda Maalum', cat: 'Vinywaji' },
    { label: 'Huduma / Ufundi', cat: 'Huduma' },
    { label: 'Ufungaji / Usafiri', cat: 'Huduma' },
    { label: 'Kipande cha Keki', cat: 'Vyakula' },
  ];

  const pricePresets = [1000, 2000, 3000, 5000, 10000, 20000];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const unitPrice = parseFloat(priceStr.replace(/,/g, ''));
    if (isNaN(unitPrice) || unitPrice <= 0) {
      setErrorMsg('Tafadhali weka bei halali ya kuuzia (kubwa kuliko 0 TZS).');
      return;
    }

    const cleanName = itemName.trim() || 'Bidhaa ya Jumla';
    const subtotal = unitPrice * quantity;

    const quickItem: SaleItem = {
      productId: `quick-${Date.now()}`,
      productName: cleanName,
      quantity,
      unitPrice,
      subtotal,
      sellingPrice: unitPrice,
      customCategory: category,
      isCustom: true,
    } as any;

    onAddToCart(quickItem);

    // Reset and close
    setItemName('Bidhaa ya Jumla');
    setPriceStr('');
    setQuantity(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Mauzo ya Haraka (Quick Sale)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  Bila Stoo Rasmi
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Uza bidhaa au huduma ya jumla kwa kuweka bei yako mwenyewe papo hapo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick preset chips */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Chagua Jina la Haraka au Andika:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setItemName(preset.label);
                    setCategory(preset.cat);
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition ${
                    itemName === preset.label
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Jina la Bidhaa / Huduma:
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Mfano: Bidhaa ya Jumla, Keki Maalum, n.k."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Selling Price Input & Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Bei ya Kuuza kwa Kila Kimoja (TZS): <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="50"
                step="50"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="Mfano: 2500"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">
                TZS
              </span>
            </div>

            {/* Price shortcuts */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pricePresets.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setPriceStr(amt.toString())}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono border border-slate-700 transition"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Idadi (Quantity):
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg border border-slate-700 transition active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-extrabold text-white font-mono px-4">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg border border-slate-700 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="flex-1 text-right">
                <span className="text-xs text-slate-400 block">Jumla Ndogo:</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatTZS((parseFloat(priceStr) || 0) * quantity)}
                </span>
              </div>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Kategoria:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Jumla / Vinginevyo">Jumla / Vinginevyo</option>
              <option value="Vinywaji">Vinywaji</option>
              <option value="Vyakula">Vyakula</option>
              <option value="Huduma">Huduma</option>
              <option value="Vifaa">Vifaa</option>
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Weka Kwenye Kikapu cha POS</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
