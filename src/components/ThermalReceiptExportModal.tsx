import React, { useState } from 'react';
import { Sale, BusinessProfile } from '../types';
import {
  ThermalPaperWidth,
  EscPosOptions,
  generateEscPosReceipt,
  generateEscPosTextPreview,
  downloadEscPosFile,
  exportReceiptAsBase64,
  openRawBtIntent,
  printViaWebBluetooth,
  printViaWebUsbOrSerial,
} from '../utils/escpos';
import {
  X,
  Printer,
  Bluetooth,
  Usb,
  Download,
  Share2,
  Copy,
  Check,
  Smartphone,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
} from 'lucide-react';

interface ThermalReceiptExportModalProps {
  sale: Sale;
  profile: BusinessProfile;
  onClose: () => void;
  viewMode?: 'standard' | 'pharmacy';
}

export const ThermalReceiptExportModal: React.FC<ThermalReceiptExportModalProps> = ({
  sale,
  profile,
  onClose,
  viewMode = 'standard',
}) => {
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(
    profile.thermalPrinterWidth || '58mm'
  );
  const [openDrawer, setOpenDrawer] = useState<boolean>(
    profile.kickCashDrawerOnPrint ?? false
  );
  const [cutPaper, setCutPaper] = useState<boolean>(
    profile.cutPaperOnPrint ?? true
  );
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'quick' | 'preview' | 'advanced'>('quick');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | null>(null);
  const [copiedBase64, setCopiedBase64] = useState<boolean>(false);

  const escPosOptions: EscPosOptions = {
    width: paperWidth,
    openDrawer,
    cutPaper,
    includeQr,
    viewMode,
  };

  const rawBytes = generateEscPosReceipt(sale, profile, escPosOptions);
  const textPreview = generateEscPosTextPreview(sale, profile, escPosOptions);

  // 1. Bluetooth Print Handler
  const handleBluetoothPrint = async () => {
    setIsProcessing(true);
    setStatusType('info');
    setStatusMessage('Inaanzisha Bluetooth...');

    const result = await printViaWebBluetooth(sale, profile, escPosOptions, (status) => {
      setStatusMessage(status);
    });

    setIsProcessing(false);
    if (result.success) {
      setStatusType('success');
      setStatusMessage('Risiti imechapwa kwa mafanikio kupitia Bluetooth!');
    } else {
      setStatusType('error');
      setStatusMessage(result.error || 'Haikuweza kuchapa kwa Bluetooth.');
    }
  };

  // 2. USB / Serial Print Handler
  const handleUsbPrint = async () => {
    setIsProcessing(true);
    setStatusType('info');
    setStatusMessage('Inaunganisha na printa ya USB...');

    const result = await printViaWebUsbOrSerial(sale, profile, escPosOptions, (status) => {
      setStatusMessage(status);
    });

    setIsProcessing(false);
    if (result.success) {
      setStatusType('success');
      setStatusMessage('Risiti imechapwa kwa mafanikio kupitia USB!');
    } else {
      setStatusType('error');
      setStatusMessage(result.error || 'Haikuweza kuchapa kwa USB.');
    }
  };

  // 3. RawBT / Android Print Intent
  const handleRawBtLaunch = () => {
    setStatusType('info');
    setStatusMessage('Inafungua huduma ya RawBT kwenye kifaa chako...');
    const opened = openRawBtIntent(sale, profile, escPosOptions);
    if (opened) {
      setTimeout(() => {
        setStatusType('success');
        setStatusMessage('Amri ya kuchapa imetumwa kwenye programu ya printa!');
      }, 1000);
    } else {
      setStatusType('error');
      setStatusMessage('Haikuweza kufungua programu ya RawBT.');
    }
  };

  // 4. Download Raw Binary File
  const handleDownloadBin = (ext: 'bin' | 'escpos') => {
    downloadEscPosFile(sale, profile, escPosOptions, ext);
    setStatusType('success');
    setStatusMessage(`Faili la risiti (.${ext}) limepakuliwa kwa mafanikio!`);
  };

  // 5. Copy Base64
  const handleCopyBase64 = () => {
    const b64 = exportReceiptAsBase64(sale, profile, escPosOptions);
    navigator.clipboard.writeText(b64);
    setCopiedBase64(true);
    setStatusType('success');
    setStatusMessage('Msimbo wa Base64 (ESC/POS) umenakiliwa kwenye clipboard!');
    setTimeout(() => setCopiedBase64(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[60] animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Utoaji wa Risiti ya ESC/POS
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Thermal POS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Risiti No: <span className="font-mono text-white">{sale.invoiceNo}</span> • Keshia: {sale.cashierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size & Quick Toggles */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Paper Width Picker */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ukubwa wa Karatasi:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  paperWidth === '58mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm (32 Safu)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  paperWidth === '80mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm (48 Safu)
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                activeTab === 'quick' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Chapa / Export</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Hakiki (Preview)</span>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                activeTab === 'advanced' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Vipimo</span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition animate-in fade-in ${
              statusType === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : statusType === 'error'
                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            }`}
          >
            {statusType === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {statusType === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            {statusType === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-400" />}
            <span className="flex-1 font-medium">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {/* Primary Direct Print Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Bluetooth Direct Print */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleBluetoothPrint}
                  className="p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-slate-800 border border-blue-500/30 hover:border-blue-400/60 transition group text-left relative overflow-hidden active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition">
                      <Bluetooth className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Printa ya Bluetooth</div>
                      <div className="text-[11px] text-blue-300/80">
                        Chapa moja kwa moja bila kebo (Wireless)
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Inasaidia Xprinter, Rongta, Sunmi, Goojprt</span>
                  </div>
                </button>

                {/* 2. USB / Serial Direct Print */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleUsbPrint}
                  className="p-4 rounded-xl bg-gradient-to-br from-teal-900/40 to-slate-800 border border-teal-500/30 hover:border-teal-400/60 transition group text-left relative overflow-hidden active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 group-hover:bg-teal-500 group-hover:text-white transition">
                      <Usb className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Printa ya USB (Cable)</div>
                      <div className="text-[11px] text-teal-300/80">
                        Chapa kwa kebo ya USB / Serial Port
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>Plug & Play (WebUSB / WebSerial)</span>
                  </div>
                </button>
              </div>

              {/* Secondary Options */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  Chaguo za Faili & Programu za Nje
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Download .bin */}
                  <button
                    type="button"
                    onClick={() => handleDownloadBin('bin')}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 flex flex-col items-start gap-1 transition text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">Pakua Faili .bin</span>
                      <Download className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Raw binary ESC/POS ({rawBytes.length} bytes)
                    </span>
                  </button>

                  {/* Android RawBT Intent */}
                  <button
                    type="button"
                    onClick={handleRawBtLaunch}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 flex flex-col items-start gap-1 transition text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">Tuma kwa RawBT</span>
                      <Smartphone className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Programu ya Android Bluetooth POS
                    </span>
                  </button>

                  {/* Copy Base64 */}
                  <button
                    type="button"
                    onClick={handleCopyBase64}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 flex flex-col items-start gap-1 transition text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">
                        {copiedBase64 ? 'Imenakiliwa!' : 'Nakili Base64'}
                      </span>
                      {copiedBase64 ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Kwa API au huduma za printa</span>
                  </button>
                </div>
              </div>

              {/* Thermal Specs Footer Info */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200 font-semibold">
                    Muundo Sanifu wa ESC/POS (Epson Standard):
                  </span>{' '}
                  Inaendana na printa zote za kibiashara za joto (Thermal Receipt Printers) zinazotumia Bluetooth, USB, au Serial Port. Hakuna haja ya kusakinisha madereva magumu ya kompyuta.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Muonekano wa Karatasi ({paperWidth}, {paperWidth === '80mm' ? '48' : '32'} safu):
                </span>
                <span className="font-mono text-emerald-400">{rawBytes.length} bytes</span>
              </div>
              <div className="p-4 rounded-xl bg-black border border-slate-800 font-mono text-[11px] text-emerald-400 leading-tight overflow-x-auto whitespace-pre selection:bg-emerald-900 shadow-inner max-h-96">
                {textPreview}
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-white text-sm">Mipangilio ya Utoaji wa ESC/POS</div>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {/* Kick Cash Drawer */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-200">Fungua Droo ya Pesa (Cash Drawer)</div>
                    <div className="text-[11px] text-slate-400">
                      Inatuma amri ya `ESC p` kufungua droo ya pesa mara moja.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={openDrawer}
                    onChange={(e) => setOpenDrawer(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-850 border-slate-700 focus:ring-emerald-500"
                  />
                </label>

                {/* Cut Paper */}
                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Kata Karatasi Kiotomatiki (Auto-Cut)</div>
                    <div className="text-[11px] text-slate-400">
                      Inatuma amri ya `GS V` kukata karatasi mwishoni mwa risiti.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={cutPaper}
                    onChange={(e) => setCutPaper(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-850 border-slate-700 focus:ring-emerald-500"
                  />
                </label>

                {/* Include QR */}
                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Jumuisha 2D QR Code</div>
                    <div className="text-[11px] text-slate-400">
                      Inajumuisha alama ya QR ya uthibitisho wa kielektroniki wa mauzo.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeQr}
                    onChange={(e) => setIncludeQr(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded bg-slate-850 border-slate-700 focus:ring-emerald-500"
                  />
                </label>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
                <span className="font-bold text-white">Ushauri wa Kibiashara:</span> Kwa simu au tablet za Android zenye printa zilizojengwa ndani (mfano Sunmi V2 au POS Handheld), unaweza kutumia chaguo la <strong>Tuma kwa RawBT</strong> au <strong>Pakua Faili .bin</strong> kwa ufanisi mkubwa zaidi.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span>EBS Thermal Engine</span>
            <span>•</span>
            <span className="text-emerald-400">{rawBytes.length} Bytes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Funga
            </button>
            <button
              onClick={() => handleDownloadBin('bin')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pakua .bin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
