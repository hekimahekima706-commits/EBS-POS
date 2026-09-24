import React, { useRef } from 'react';
import { Sale, BusinessProfile } from '../types';
import { formatTZS, formatDateTime, PAYMENT_METHOD_INFO } from '../utils/formatters';
import { Printer, X, CheckCircle, Share2, Video } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  profile: BusinessProfile;
  onClose: () => void;
  onViewCameraEvent?: (eventId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  profile,
  onClose,
  onViewCameraEvent,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">
              Risiti ya Mauzo ({sale.invoiceNo})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex justify-center">
          <div
            ref={receiptRef}
            id="thermal-receipt"
            className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded-lg shadow-sm font-mono text-xs border border-slate-200"
          >
            {/* Business Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-sm uppercase tracking-wider">{profile.name}</h2>
              <p className="text-[11px] text-slate-600">{profile.tagline}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{profile.address}</p>
              <p className="text-[11px] text-slate-600">Simu: {profile.phone}</p>
              <div className="mt-1 text-[10px] text-slate-500 space-y-0.5">
                <div>TIN: {profile.tin || '134-589-201'}</div>
                {profile.vrn && <div>VRN: {profile.vrn}</div>}
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Ankara (Invoice):</span>
                <span className="font-bold">{sale.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tarehe na Saa:</span>
                <span>{formatDateTime(sale.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Keshia / Muuzaji:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.tableName && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Meza:</span>
                  <span>{sale.tableName}</span>
                </div>
              )}
              {sale.waiterName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mhudumu:</span>
                  <span>{sale.waiterName}</span>
                </div>
              )}
              {sale.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mteja:</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="text-left pb-1 font-semibold">Bidhaa</th>
                    <th className="text-center pb-1 font-semibold">Idadi</th>
                    <th className="text-right pb-1 font-semibold">Jumla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 pr-1">
                        <div className="font-medium text-slate-800">{item.productName}</div>
                        {item.isServing && (
                          <div className="text-[9px] text-amber-700 font-semibold">
                            ★ Kipimo cha Shot ({item.servingSizeMl || 30}ml)
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          @{item.unitPrice.toLocaleString()} TZS
                        </div>
                      </td>
                      <td className="py-1 text-center font-bold text-slate-700">{item.quantity}</td>
                      <td className="py-1 text-right font-bold text-slate-900">
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Jumla ya Awali (Subtotal):</span>
                <span>{sale.subtotal.toLocaleString()} TZS</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Punguzo (Discount):</span>
                  <span>-{sale.discount.toLocaleString()} TZS</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>VAT ({profile.taxRate}%):</span>
                  <span>{sale.tax.toLocaleString()} TZS</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200 text-slate-900">
                <span>JUMLA KUU:</span>
                <span>{sale.total.toLocaleString()} TZS</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
              <div className="font-bold text-slate-600 uppercase">Njia ya Malipo:</div>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-slate-700">
                    • {PAYMENT_METHOD_INFO[p.method]?.label || p.method}
                    {p.reference && ` (Ref: ${p.reference})`}
                  </span>
                  <span className="font-bold">{p.amount.toLocaleString()} TZS</span>
                </div>
              ))}
            </div>

            {/* Footer QR Simulation & Message */}
            <div className="text-center pt-3 space-y-2">
              <div className="w-16 h-16 bg-slate-900 mx-auto rounded p-1 flex items-center justify-center text-white text-[8px] font-mono tracking-tighter">
                [ QR CODE ]
                <br />
                {sale.invoiceNo}
              </div>
              <p className="text-[10px] text-slate-600 font-sans italic">{profile.receiptFooterText}</p>
              <div className="text-[9px] text-slate-400 pt-1">
                EBS — Enterprise Business System Tanzania
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {sale.cameraEventId && onViewCameraEvent && (
            <button
              onClick={() => onViewCameraEvent(sale.cameraEventId!)}
              className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg flex items-center gap-1.5 transition"
            >
              <Video className="w-4 h-4" />
              <span>Tazama Kamera CCTV</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Funga
            </button>
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Chapa Risiti (Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
