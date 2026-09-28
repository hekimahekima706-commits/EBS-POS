import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductType } from '../types';
import { formatTZS } from '../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (addedCount: number) => void;
}

interface ParsedProductItem {
  id?: string;
  name: string;
  barcode: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQty: number;
  category: string;
  unit: string;
  selected?: boolean;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addProduct, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'csv' | 'ai_scan'>('csv');
  const [csvItems, setCsvItems] = useState<ParsedProductItem[]>([]);
  const [aiItems, setAiItems] = useState<ParsedProductItem[]>([]);
  const [supplierName, setSupplierName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isExecutive = ['owner', 'boss', 'admin', 'manager'].includes(
    (currentUser?.role || '').toLowerCase()
  );

  // 1. Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'jina,barcode,bei_ya_kununua,bei_ya_kuuza,stock,kategoria,kipimo\n' +
      'Kilimanjaro Premium Lager,616110012345,2000,2500,24,Vinywaji,Chupa\n' +
      'Konyagi 750ml,616110056789,12000,15000,12,Vinywaji,Chupa\n' +
      'Coca-Cola 350ml,616110098765,700,1000,48,Vinywaji,Chupa\n' +
      'Panadol Extra Tablets,616110022334,1500,2500,50,Dawa,Pakiti\n' +
      'Mchele Safi Super (1kg),616110044556,2200,3000,30,Vyakula,Kilo\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ebs_orodha_ya_bidhaa_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse CSV File
  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessCount(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Faili halina maudhui yoyote');

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('Faili la CSV lazima liwe na kichwa (header) na angalau mstari 1 wa bidhaa.');
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const nameIdx = headers.findIndex((h) => h.includes('jina') || h.includes('name'));
        const barcodeIdx = headers.findIndex((h) => h.includes('barcode') || h.includes('sku'));
        const buyIdx = headers.findIndex((h) => h.includes('kununua') || h.includes('buy') || h.includes('cost'));
        const sellIdx = headers.findIndex((h) => h.includes('kuuza') || h.includes('sell') || h.includes('price'));
        const stockIdx = headers.findIndex((h) => h.includes('stock') || h.includes('idadi') || h.includes('qty'));
        const catIdx = headers.findIndex((h) => h.includes('kategoria') || h.includes('category'));
        const unitIdx = headers.findIndex((h) => h.includes('kipimo') || h.includes('unit'));

        if (nameIdx === -1 || sellIdx === -1) {
          throw new Error('Faili lazima liwe na safu ya "jina" na "bei_ya_kuuza".');
        }

        const parsedList: ParsedProductItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = parseCsvRow(lines[i]);
          if (row.length <= nameIdx) continue;

          const name = row[nameIdx]?.trim();
          if (!name) continue;

          const barcode = barcodeIdx !== -1 ? row[barcodeIdx]?.trim() || '' : '';
          const buyingPrice = buyIdx !== -1 ? parseFloat(row[buyIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0;
          const sellingPrice = sellIdx !== -1 ? parseFloat(row[sellIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0;
          const stockQty = stockIdx !== -1 ? parseFloat(row[stockIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0;
          const category = catIdx !== -1 ? row[catIdx]?.trim() || 'Jumla' : 'Jumla';
          const unit = unitIdx !== -1 ? row[unitIdx]?.trim() || 'Chupa' : 'Chupa';

          parsedList.push({
            id: `csv-${Date.now()}-${i}`,
            name,
            barcode,
            buyingPrice,
            sellingPrice,
            stockQty,
            category,
            unit,
            selected: true,
          });
        }

        if (parsedList.length === 0) {
          throw new Error('Hakuna bidhaa sahihi zilizopatikana kwenye faili hili.');
        }

        setCsvItems(parsedList);
      } catch (err: any) {
        console.error('CSV parse error:', err);
        setErrorMessage(err.message || 'Hitilafu wakati wa kusoma faili la CSV.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Hitilafu wakati wa kupakia faili.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Helper to split row handling commas inside quotes
  const parseCsvRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // 3. AI Scan Supplier Price List / Image
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessCount(null);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      const savedServer = typeof window !== 'undefined' ? localStorage.getItem('ebs_server_url') || '' : '';
      const apiBase = (savedServer || (import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
      const apiUrl = `${apiBase}/api/ai/parse-supplier-list`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Hitilafu ya seva (${response.status})`);
      }

      const data = await response.json();
      if (data.supplierName) {
        setSupplierName(data.supplierName);
      }

      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        throw new Error('Gemini haikuweza kusoma orodha ya bidhaa kutoka kwenye picha hii. Tafadhali hakikisha picha inasomeka vizuri au tumia CSV.');
      }

      const parsedAiList: ParsedProductItem[] = items.map((it: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        name: it.name || 'Bidhaa Isiyojulikana',
        barcode: it.barcode || '',
        buyingPrice: Number(it.buyingPrice) || 0,
        sellingPrice: Number(it.sellingPrice) || Math.round((Number(it.buyingPrice) || 0) * 1.25),
        stockQty: Number(it.stockQty) || 10,
        category: it.category || 'Jumla',
        unit: it.unit || 'Kipande',
        selected: true,
      }));

      setAiItems(parsedAiList);
    } catch (err: any) {
      console.error('AI Scan error:', err);
      setErrorMessage(err.message || 'Hitilafu wakati wa kuchanganua hati ya msambazaji.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // 4. Save parsed items to inventory
  const handleCommitItems = async (itemsToCommit: ParsedProductItem[]) => {
    const selected = itemsToCommit.filter((i) => i.selected);
    if (selected.length === 0) {
      setErrorMessage('Tafadhali chagua angalau bidhaa moja ya kuingiza.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let count = 0;
      for (const item of selected) {
        await addProduct({
          name: item.name,
          category: item.category || 'Jumla',
          barcode: item.barcode || '',
          sku: item.barcode || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          stockQty: item.stockQty,
          minStock: 5,
          unit: item.unit || 'Chupa',
          active: true,
          productType: 'standard' as ProductType,
        });
        count++;
      }

      setSuccessCount(count);
      if (activeTab === 'csv') setCsvItems([]);
      if (activeTab === 'ai_scan') setAiItems([]);

      if (onSuccess) {
        onSuccess(count);
      }
    } catch (err: any) {
      console.error('Commit products error:', err);
      setErrorMessage('Hitilafu wakati wa kuhifadhi bidhaa: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-purple-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pakia Bidhaa kwa Wingi (Bulk Inventory Import)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ongeza bidhaa nyingi mara moja kupitia faili la CSV au Changanua Ankara ya Bei (AI Scan)
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-950/50">
          <button
            onClick={() => {
              setActiveTab('csv');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'csv'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. Faili la CSV (Excel / CSV)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai_scan');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'ai_scan'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>2. Ankara / Orodha ya Msambazaji (Gemini AI Scan)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Success Notification */}
          {successCount !== null && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">
                  Hongera! Bidhaa {successCount} zimeingizwa kwenye stoo yako kikamilifu.
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Funga
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CSV FILE IMPORT */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              {/* Instructions and Template Download Card */}
              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white mb-1">
                    Hatua ya 1: Pakua Fomu ya Mfano (Template)
                  </h3>
                  <p className="text-[11px] text-slate-400 max-w-lg">
                    Pakua faili hili la Excel/CSV, jaza majina ya bidhaa, bei za kununua, bei za kuuza, na idadi ya stoo, kisha lipakie hapa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Pakua Template (.CSV)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="p-6 rounded-3xl bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 text-center transition flex flex-col items-center justify-center">
                <Upload className="w-10 h-10 text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Chagua au Vuta Faili la CSV Hapa
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Inakubali faili za .csv zilizotengenezwa kwa Excel au Google Sheets
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Chagua Faili la CSV</span>
                </button>
              </div>

              {/* CSV Preview Table */}
              {csvItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Bidhaa Zilizotambuliwa ({csvItems.length})
                    </span>
                    <button
                      onClick={() =>
                        setCsvItems((prev) =>
                          prev.map((i) => ({ ...i, selected: !prev.every((p) => p.selected) }))
                        )
                      }
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      {csvItems.every((p) => p.selected) ? 'Ondoa Zote' : 'Chagua Zote'}
                    </button>
                  </div>

                  <div className="border border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 w-8">#</th>
                          <th className="p-2.5">Jina la Bidhaa</th>
                          <th className="p-2.5">Kategoria</th>
                          <th className="p-2.5 text-right">Bei ya Kununua</th>
                          <th className="p-2.5 text-right">Bei ya Kuuza</th>
                          <th className="p-2.5 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {csvItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-800/50">
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                checked={Boolean(item.selected)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setCsvItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, selected: checked } : p))
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-white">{item.name}</td>
                            <td className="p-2.5 text-slate-400">{item.category}</td>
                            <td className="p-2.5 text-right font-mono text-slate-400">
                              {formatTZS(item.buyingPrice)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              {formatTZS(item.sellingPrice)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-white">
                              {item.stockQty} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleCommitItems(csvItems)}
                      disabled={isProcessing}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>
                        Ingiza Bidhaa {csvItems.filter((i) => i.selected).length} Kwenye Stoo
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI SCAN SUPPLIER PRICE LIST */}
          {activeTab === 'ai_scan' && (
            <div className="space-y-4">
              {/* Executive Role Notice */}
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/70 text-purple-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-300 block mb-0.5">
                    Gemini AI Mchanganuzi wa Bei za Wasambazaji (Smart Invoice Scanner)
                  </span>
                  <p className="text-[11px] text-purple-200/90 leading-relaxed">
                    Pakia picha ya karatasi ya bei au risiti ya muuzaji wa jumla. Gemini itasoma bidhaa zote, bei za ununuzi na kupendekeza bei za kuuzia zenye faida. Boss anathibitisha kabla ya kuweka stoo.
                  </p>
                </div>
              </div>

              {/* Image Upload Zone */}
              <div className="p-6 rounded-3xl bg-slate-950/60 border-2 border-dashed border-purple-800/50 hover:border-purple-500 text-center transition flex flex-col items-center justify-center">
                <ImageIcon className="w-10 h-10 text-purple-400 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Piga Picha au Chagua Picha ya Ankara / Orodha ya Bei
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Inasaidia faili za picha za JPG, PNG, WebP au picha ya simu
                </p>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Changanua Picha kwa Gemini AI</span>
                </button>
              </div>

              {/* AI Parsed Results Table */}
              {aiItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">
                        Mapendekezo ya Bidhaa Kutoka kwa Msambazaji
                      </span>
                      {supplierName && (
                        <span className="text-[11px] text-purple-400 ml-2 font-semibold">
                          (Msambazaji: {supplierName})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                      Uthibitisho wa Boss Unahitajika
                    </span>
                  </div>

                  <div className="border border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 w-8">#</th>
                          <th className="p-2.5">Jina la Bidhaa</th>
                          <th className="p-2.5 text-right">Bei ya Kununua</th>
                          <th className="p-2.5 text-right">Bei ya Kuuza (Iliyopendekezwa)</th>
                          <th className="p-2.5 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {aiItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-800/50">
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                checked={Boolean(item.selected)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAiItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, selected: checked } : p))
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAiItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, name: v } : p))
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-semibold w-full"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                value={item.buyingPrice}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  setAiItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, buyingPrice: v } : p))
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-right font-mono text-slate-300 w-24"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                value={item.sellingPrice}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  setAiItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, sellingPrice: v } : p))
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-purple-500/60 text-xs text-right font-mono font-bold text-emerald-400 w-24"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                value={item.stockQty}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  setAiItems((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, stockQty: v } : p))
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-right font-bold text-white w-16"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleCommitItems(aiItems)}
                      disabled={isProcessing}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>
                        {isExecutive ? 'Boss Thibitisha' : 'Thibitisha'} na Weka Bidhaa {aiItems.filter((i) => i.selected).length} Stoo
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
