import React, { useState } from 'react';
import { Sale, User } from '../types';
import { formatTZS, formatDateTime, PAYMENT_METHOD_INFO } from '../utils/formatters';
import { X, Video, RotateCcw, AlertTriangle, Printer } from 'lucide-react';

interface TransactionDetailsModalProps {
  sale: Sale;
  currentUser?: User;
  onClose: () => void;
  onPrintReceipt: (sale: Sale) => void;
  onRefund?: (saleId: string, reason: string) => void;
  onCancel?: (saleId: string, reason: string) => void;
  onViewCameraEvent?: (eventId: string) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  sale,
  currentUser,
  onClose,
  onPrintReceipt,
  onRefund,
  onCancel,
  onViewCameraEvent,
}) => {
  const [showRefundPrompt, setShowRefundPrompt] = useState(false);
  const [actionType, setActionType] = useState<'refund' | 'cancel'>('refund');
  const [reason, setReason] = useState('');

  const canManageSale = currentUser?.canRefund || currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const handleConfirmAction = () => {
    if (!reason.trim()) {
      alert('Tafadhali weka sababu ya kurejesha au kufuta muamala huu.');
      return;
    }
    if (actionType === 'refund') {
      onRefund?.(sale.id, reason);
    } else {
      onCancel?.(sale.id, reason);
    }
    setShowRefundPrompt(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Muamala: {sale.invoiceNo}
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  sale.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : sale.status === 'refunded'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                {sale.status === 'completed' ? 'Imekamilika' : sale.status === 'refunded' ? 'Imerejeshwa' : 'Imefutwa'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDateTime(sale.timestamp)} • Keshia: {sale.cashierName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status notes if cancelled/refunded */}
          {sale.refundReason && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-300">
              <span className="font-bold">Sababu ya Kurejesha/Kufuta:</span> {sale.refundReason}
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                Ilifanywa na: {sale.refundedBy} tarehe {formatDateTime(sale.refundedAt)}
              </div>
            </div>
          )}

          {/* Customer & Table details */}
          {(sale.customerName || sale.tableName || sale.waiterName) && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
              {sale.customerName && (
                <div>
                  <span className="text-slate-400">Mteja:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{sale.customerName}</div>
                </div>
              )}
              {sale.tableName && (
                <div>
                  <span className="text-slate-400">Meza:</span>
                  <div className="font-semibold text-emerald-600">{sale.tableName}</div>
                </div>
              )}
              {sale.waiterName && (
                <div>
                  <span className="text-slate-400">Mhudumu:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{sale.waiterName}</div>
                </div>
              )}
            </div>
          )}

          {/* Items List */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Bidhaa Zilizouzwa ({sale.items.length})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sale.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.productName}
                    </div>
                    {item.isServing && (
                      <span className="text-[10px] text-amber-600 font-bold">
                        ★ Kipimo cha Shot ({item.servingSizeMl || 30}ml)
                      </span>
                    )}
                    <div className="text-[11px] text-slate-400">
                      {item.quantity} × {formatTZS(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900 dark:text-white">
                    {formatTZS(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payments */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Jumla ya Awali:</span>
              <span>{formatTZS(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Punguzo (Discount):</span>
                <span>-{formatTZS(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>JUMLA YA RISITI:</span>
              <span className="text-emerald-600">{formatTZS(sale.total)}</span>
            </div>
            {currentUser?.canViewProfit && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                <span>Faida Iliyopatikana (Profit):</span>
                <span className="font-bold text-teal-600">+{formatTZS(sale.profit)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Malipo Yaliyopokelewa:</span>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 dark:text-slate-300">
                    {PAYMENT_METHOD_INFO[p.method]?.label || p.method}
                    {p.reference && ` (${p.reference})`}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatTZS(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Prompt Section */}
          {showRefundPrompt && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center space-x-2 text-red-800 dark:text-red-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {actionType === 'refund' ? 'Kurejesha Fedha (Refund)' : 'Kufuta Mauzo (Cancel)'}
                </span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-400">
                Hatua hii itarudisha bidhaa zote kwenye stoo na kurekodi sababu kwenye kumbukumbu ya ukaguzi (Audit Log).
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Weka Sababu ya Hatua Hii:
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mfano: Mteja amebadili mawazo / Chupa ilikuwa na hitilafu..."
                  rows={2}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRefundPrompt(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Ghairi
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                >
                  Thibitisha Hatua
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {sale.cameraEventId && onViewCameraEvent && (
            <button
              onClick={() => {
                onClose();
                onViewCameraEvent(sale.cameraEventId!);
              }}
              className="px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg flex items-center gap-1.5 transition border border-blue-200 dark:border-blue-800"
            >
              <Video className="w-4 h-4" />
              <span>Tazama Tukio la Kamera 📹</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            {sale.status === 'completed' && canManageSale && !showRefundPrompt && (
              <button
                onClick={() => {
                  setActionType('refund');
                  setShowRefundPrompt(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rejesha (Refund)</span>
              </button>
            )}

            <button
              onClick={() => onPrintReceipt(sale)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Chapa Risiti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
