import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, SaleItem, Sale } from '../types';
import { formatTZS } from '../utils/formatters';
import {
  speakTextSwahili,
  sendVoiceCommand,
  VoiceCommandResult,
} from '../utils/audioVoiceService';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  Printer,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Send,
  AlertCircle,
  X,
} from 'lucide-react';

interface VoiceSalesAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSaleSuccess?: (completedSale: Sale) => void;
  onOpenReceipt?: (sale: Sale) => void;
}

export const VoiceSalesAssistantModal: React.FC<VoiceSalesAssistantModalProps> = ({
  isOpen,
  onClose,
  onCompleteSaleSuccess,
  onOpenReceipt,
}) => {
  const { products, completeSale, currentUser } = useApp();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pending draft sale state
  const [pendingDraftItems, setPendingDraftItems] = useState<
    Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
      productRef?: Product;
    }>
  >([]);
  const [pendingTotal, setPendingTotal] = useState<number>(0);
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('');

  // Completed sale reference for receipt
  const [completedSaleRef, setCompletedSaleRef] = useState<Sale | null>(null);

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopListening();
    };
  }, []);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'sw-TZ';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorMessage('Ruhusa ya maikrofoni imezuiwa. Tafadhali ruhusu maikrofoni kwenye kivinjari.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Start speech listening
  const startListening = () => {
    setErrorMessage(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be running
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch {}
        }, 200);
      }
    } else {
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Speak and update speaking state
  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    setLastSpokenResponse(text);
    try {
      await speakTextSwahili(text);
    } catch (e) {
      console.warn('Speech output error:', e);
    } finally {
      if (isMountedRef.current) {
        setIsSpeaking(false);
      }
    }
  };

  // Process speech transcript
  const handleProcessVoiceCommand = async (commandText: string) => {
    const textToProcess = (commandText || transcript).trim();
    if (!textToProcess) return;

    setIsProcessing(true);
    setErrorMessage(null);
    stopListening();

    try {
      const hasDraft = pendingDraftItems.length > 0;
      const res: VoiceCommandResult = await sendVoiceCommand(
        textToProcess,
        products,
        hasDraft
      );

      if (res.action === 'CONFIRM_SALE') {
        if (pendingDraftItems.length > 0) {
          await handleFinalizeSale();
        } else {
          const msg = 'Hakuna mauzo yaliyosubiri kuthibitishwa. Sema kwanza unachotaka kuuza.';
          await speakResponse(msg);
        }
        return;
      }

      if (res.action === 'CANCEL_SALE') {
        setPendingDraftItems([]);
        setPendingTotal(0);
        const msg = 'Mauzo yamefutwa. Unaweza kusema tena bidhaa mpya.';
        await speakResponse(msg);
        return;
      }

      if (res.action === 'PRINT_RECEIPT') {
        if (completedSaleRef && onOpenReceipt) {
          await speakResponse('Nafungua risiti yako sasa hivi.');
          onOpenReceipt(completedSaleRef);
          onClose();
        } else {
          const msg = 'Hakuna risiti ya hivi karibuni ya kutoa. Tafadhali fanya mauzo kwanza.';
          await speakResponse(msg);
        }
        return;
      }

      if (res.action === 'CREATE_SALE' && res.items && res.items.length > 0) {
        // Map recognized items to actual active products in system
        const enrichedItems = res.items.map((item) => {
          const matchedProd = products.find(
            (p) =>
              p.id === item.productId ||
              p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
              item.productName.toLowerCase().includes(p.name.toLowerCase())
          );

          const unitPrice = matchedProd?.sellingPrice || item.unitPrice;
          const quantity = item.quantity || 1;
          const total = unitPrice * quantity;

          return {
            productId: matchedProd?.id || item.productId,
            productName: matchedProd?.name || item.productName,
            quantity,
            unitPrice,
            total,
            productRef: matchedProd,
          };
        });

        const totalAmt = enrichedItems.reduce((acc, curr) => acc + curr.total, 0);

        setPendingDraftItems(enrichedItems);
        setPendingTotal(totalAmt);
        setCompletedSaleRef(null);

        // App responds with voice: items, price, total and asks to confirm
        const spoken =
          res.spokenResponse ||
          `Nimeandaa muhtasari wa mauzo: ${enrichedItems
            .map((i) => `${i.productName} ${i.quantity}`)
            .join(' na ')}, jumla ni Shilingi ${totalAmt.toLocaleString()}. Thibitisha kukamilisha.`;

        await speakResponse(spoken);
      } else {
        const spoken =
          res.spokenResponse ||
          `Nimekuelewa: "${textToProcess}". Tafadhali taja bidhaa na idadi, kwa mfano: "EBS niuzie Kilimanjaro mbili na Konyagi moja".`;
        await speakResponse(spoken);
      }
    } catch (err: any) {
      console.error('Error handling voice command:', err);
      setErrorMessage(err.message || 'Hitilafu wakati wa kuchakata sauti.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Finalize and execute sale (Stock decreases and sale is saved)
  const handleFinalizeSale = async () => {
    if (pendingDraftItems.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const saleItems: SaleItem[] = pendingDraftItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        category: item.productRef?.category || 'Jumla',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.productRef?.buyingPrice || 0,
        discount: 0,
        total: item.total,
      }));

      // Complete sale in AppContext (triggers stock decrease, logging and Supabase sync)
      const newSale = completeSale(
        saleItems,
        [{ method: 'cash', amount: pendingTotal }],
        {
          notes: 'Mauzo ya Sauti (EBS Gemini Voice)',
        }
      );

      setCompletedSaleRef(newSale);
      setPendingDraftItems([]);

      if (onCompleteSaleSuccess) {
        onCompleteSaleSuccess(newSale);
      }

      // App speaks confirmation
      const voiceReply = 'Mauzo yamethibitishwa na kukamilika! Stoo imepunguzwa. Sema "Toa risiti" au bofya kitufe cha risiti.';
      await speakResponse(voiceReply);
    } catch (err: any) {
      console.error('Failed to complete sale:', err);
      setErrorMessage('Imeshindikana kukamilisha mauzo: ' + (err.message || 'Hitilafu ya stoo'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-emerald-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>EBS Msaidizi wa Sauti (Voice POS)</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-mono">
                  Gemini Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ongea kwa Kiswahili kufanya mauzo, kuthibitisha, na kutoa risiti
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Microphone Interactive Zone */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/60 border border-slate-800/80 text-center relative overflow-hidden">
            {/* Glowing background animation when listening or speaking */}
            {isListening && (
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
            )}
            {isSpeaking && (
              <div className="absolute inset-0 bg-purple-500/10 animate-pulse pointer-events-none" />
            )}

            {/* Big Mic Button */}
            <button
              onClick={() => {
                if (isListening) stopListening();
                else startListening();
              }}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group active:scale-95 ${
                isListening
                  ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 animate-bounce'
                  : isSpeaking
                  ? 'bg-purple-600 text-white ring-8 ring-purple-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/20'
              }`}
            >
              {isListening ? (
                <MicOff className="w-9 h-9" />
              ) : isSpeaking ? (
                <Volume2 className="w-9 h-9 animate-pulse" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            {/* Status Text & Hints */}
            <div className="mt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isListening
                  ? 'Inasikiliza sasa... Ongea kwa Kiswahili'
                  : isSpeaking
                  ? 'EBS AI inaongea...'
                  : isProcessing
                  ? 'Inachakata amri yako...'
                  : 'Bofya kitufe cha 🎤 uanze kuongea'}
              </span>
            </div>

            {/* Live Transcript / Speech Bubble */}
            {transcript && (
              <div className="mt-3 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-emerald-300 font-medium max-w-md">
                "{transcript}"
              </div>
            )}

            {/* Quick Test Voice Commands Bar */}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-w-md">
              <button
                onClick={() => {
                  setTranscript('EBS niuzie Kilimanjaro mbili, Konyagi moja');
                  handleProcessVoiceCommand('EBS niuzie Kilimanjaro mbili, Konyagi moja');
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                🗣️ "EBS niuzie Kilimanjaro mbili..."
              </button>
              <button
                onClick={() => {
                  setTranscript('Thibitisha mauzo');
                  handleProcessVoiceCommand('Thibitisha mauzo');
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-900 transition"
              >
                🗣️ "Sawa / Thibitisha"
              </button>
              <button
                onClick={() => {
                  setTranscript('Toa risiti');
                  handleProcessVoiceCommand('Toa risiti');
                }}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-900 transition"
              >
                🗣️ "Toa risiti"
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Spoken AI Feedback Bubble */}
          {lastSpokenResponse && (
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/70 text-purple-200 text-xs flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-purple-300 block mb-0.5">EBS Msaidizi alisema:</span>
                <p>{lastSpokenResponse}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Pending Draft Sale Summary (Items, Prices, Total - NOT COMPLETED YET) */}
          {pendingDraftItems.length > 0 && (
            <div className="p-4 rounded-3xl bg-slate-800/80 border-2 border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Muhtasari wa Mauzo (Yanasubiri Uthibitisho)
                  </span>
                </div>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  Bado Hayajakamilika
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-700/60 max-h-48 overflow-y-auto">
                {pendingDraftItems.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{item.productName}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.quantity} × {formatTZS(item.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-400">
                      {formatTZS(item.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">JUMLA KUU:</span>
                <span className="text-base font-extrabold text-white">
                  {formatTZS(pendingTotal)}
                </span>
              </div>

              {/* Action Buttons: Confirm or Cancel */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPendingDraftItems([]);
                    setPendingTotal(0);
                    speakResponse('Mauzo yameghairiwa.');
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Ghairi (Sema 'Acha')</span>
                </button>

                <button
                  onClick={handleFinalizeSale}
                  disabled={isProcessing}
                  className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Thibitisha (Sema 'Sawa')</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Sale Completed Card with Print Receipt Option */}
          {completedSaleRef && (
            <div className="p-4 rounded-3xl bg-emerald-950/50 border border-emerald-500/50 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mauzo Yamethibitishwa na Kukamilika!
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Stoo imepunguzwa kiotomatiki. Risiti namba{' '}
                <span className="font-mono text-emerald-300 font-bold">
                  {completedSaleRef.invoiceNo}
                </span>{' '}
                ya thamani ya{' '}
                <span className="font-bold text-white">
                  {formatTZS(completedSaleRef.total)}
                </span>{' '}
                iko tayari.
              </p>

              <button
                onClick={() => {
                  if (onOpenReceipt) {
                    onOpenReceipt(completedSaleRef);
                    onClose();
                  }
                }}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Toa Risiti Sasa (Au sema 'Toa risiti')</span>
              </button>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Au Andika Amri ya Mauzo / Swali:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleProcessVoiceCommand(transcript);
                }}
                placeholder="Mfano: EBS niuzie Kilimanjaro mbili na Konyagi moja..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleProcessVoiceCommand(transcript)}
                disabled={!transcript.trim() || isProcessing}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
