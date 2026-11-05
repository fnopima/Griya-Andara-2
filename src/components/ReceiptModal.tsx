import React, { useState, useEffect } from 'react';
import { X, Printer, Share2, CheckCircle2, ArrowLeft, Phone, MessageSquare } from 'lucide-react';
import type { Payment, AppSettings, Resident } from '../types';
import {
  formatRupiah,
  formatPeriodMonth,
  formatDateIndo,
  formatPhoneNumberForWhatsApp,
} from '../lib/formatters';

interface ReceiptModalProps {
  payment: Payment | null;
  settings: AppSettings;
  residents?: Resident[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  settings,
  residents = [],
  onClose,
}) => {
  if (!payment) return null;

  // Find resident phone number from residents data
  const resident = residents.find(
    (r) => r.id === payment.residentId || r.houseNumber === payment.houseNumber
  );
  const defaultPhone = resident?.phone || '';

  const [targetPhone, setTargetPhone] = useState(defaultPhone);
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  useEffect(() => {
    if (payment) {
      const found = residents.find(
        (r) => r.id === payment.residentId || r.houseNumber === payment.houseNumber
      );
      setTargetPhone(found?.phone || '');
      setShowPhoneEditor(false);
    }
  }, [payment, residents]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = (customPhone?: string) => {
    const phoneToUse = customPhone !== undefined ? customPhone : targetPhone;
    const cleanPhone = formatPhoneNumberForWhatsApp(phoneToUse);

    const text =
      `*BUKTI PEMBAYARAN IURAN KOMPLEK*\n` +
      `🏛️ *${settings.complexName}* (${settings.rtRw})\n` +
      `------------------------------------------------\n` +
      `No. Kuitansi : *${payment.receiptNo}*\n` +
      `Tanggal      : ${formatDateIndo(payment.paidAt)}\n` +
      `Status       : ✅ *LUNAS*\n\n` +
      `*TELAH TERIMA DARI:*\n` +
      `Nama Warga   : *${payment.headOfFamily}*\n` +
      `Unit / Rumah : *${payment.houseNumber}*\n\n` +
      `*RINCIAN PEMBAYARAN:*\n` +
      `Periode      : *${formatPeriodMonth(payment.periodMonth)}*\n` +
      `Jenis Iuran  : ${payment.feeType}\n` +
      `Metode Bayar : ${payment.paymentMethod.toUpperCase()}\n` +
      `*Jumlah Bayar : ${formatRupiah(payment.amount)}*\n` +
      (payment.notes ? `Catatan      : ${payment.notes}\n` : '') +
      `Dicatat Oleh : ${payment.recordedBy || settings.treasurerName || 'Pengurus RT'}\n` +
      `------------------------------------------------\n` +
      `Terima kasih Bapak/Ibu ${payment.headOfFamily} atas partisipasinya dalam membayar iuran komplek demi keamanan, kebersihan, dan kenyamanan lingkungan kita bersama! 🙏\n\n` +
      `_Kuitansi digital ini sah diterbitkan oleh Pengurus ${settings.complexName}_`;

    let url = '';
    if (cleanPhone) {
      url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none">
        {/* Top action bar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition"
              title="Tutup kuitansi dan kembali ke tampilan sebelumnya"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Kembali</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kuitansi Sah
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleShareWhatsApp()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition"
              title={`Kirim kuitansi via WhatsApp ${targetPhone ? 'ke ' + targetPhone : ''}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Kirim WA</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition"
              title="Cetak Kuitansi"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Notification Banner (hidden during print) */}
        <div className="px-6 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs truncate">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                <span>Kirim WA ke:</span>
                <span className="font-bold text-slate-800">{payment.headOfFamily}</span>
                {targetPhone ? (
                  <span className="font-mono text-[11px] text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-medium">
                    {targetPhone}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-normal">
                    Nomor belum ada
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {showPhoneEditor ? (
              <div className="flex items-center gap-1">
                <input
                  type="tel"
                  placeholder="0812xxxx"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono w-28"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(targetPhone)}
                  className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition"
                >
                  Kirim
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhoneEditor(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-1"
                >
                  Batal
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(targetPhone)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-800 bg-emerald-200/70 hover:bg-emerald-200 transition"
                >
                  <Phone className="w-3 h-3 text-emerald-700" />
                  <span>Kirim Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhoneEditor(true)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 underline px-1"
                >
                  {targetPhone ? 'Ganti No' : '+ Tambah No'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Official Receipt Body */}
        <div id="receipt-content" className="p-8 bg-white relative">
          {/* Header */}
          <div className="text-center pb-5 border-b-2 border-dashed border-slate-200">
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-full overflow-hidden border border-slate-200 shadow-xs bg-[#536758] flex items-center justify-center">
              <img
                src="/assets/aistudio/IMG-20261104-WA0005_e17c1c0f.jpg"
                alt="Logo Griya Andara"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
              {settings.complexName}
            </h2>
            <p className="text-xs font-medium text-slate-600">
              PAGUYUBAN WARGA {settings.rtRw} • {settings.subDistrict || 'Kecamatan'}
            </p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded border border-indigo-600 text-indigo-700 font-bold text-xs uppercase tracking-widest bg-indigo-50">
              Kuitansi Iuran Resmi
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
            <div>
              <span className="text-slate-400 block">No. Kuitansi:</span>
              <span className="font-mono font-semibold text-slate-800">{payment.receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Tanggal Pembayaran:</span>
              <span className="font-semibold text-slate-800">{formatDateIndo(payment.paidAt)}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="py-5 space-y-3 text-xs">
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Telah Terima Dari:</span>
              <span className="font-bold text-slate-900 w-2/3 text-right">{payment.headOfFamily}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Alamat / No. Rumah:</span>
              <span className="font-semibold text-slate-800 w-2/3 text-right">{payment.houseNumber}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Periode Iuran:</span>
              <span className="font-semibold text-indigo-700 w-2/3 text-right bg-indigo-50 px-2 py-0.5 rounded">
                {formatPeriodMonth(payment.periodMonth)}
              </span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Jenis Iuran:</span>
              <span className="font-medium text-slate-700 w-2/3 text-right">{payment.feeType}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Metode Bayar:</span>
              <span className="font-medium text-slate-700 w-2/3 text-right capitalize">
                {payment.paymentMethod}
              </span>
            </div>
            {payment.notes && (
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 w-1/3">Catatan:</span>
                <span className="text-slate-600 italic w-2/3 text-right">{payment.notes}</span>
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Total Pembayaran
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatRupiah(payment.amount)}
            </span>
          </div>

          {/* Signature & Stamp Footer */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
            <div>
              <p className="text-[11px] text-slate-400 mb-10">Warga Pembayar</p>
              <p className="font-semibold text-slate-800 border-t border-slate-200 pt-1 inline-block min-w-[120px]">
                {payment.headOfFamily}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-10">Bendahara / Pengurus RT</p>
              <p className="font-semibold text-slate-800 border-t border-slate-200 pt-1 inline-block min-w-[120px]">
                {payment.recordedBy || settings.treasurerName}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 text-center border-t border-slate-100 text-[10px] text-slate-400">
            Kuitansi ini dibuat secara digital dan merupakan bukti pembayaran yang sah bagi warga {settings.complexName}.
          </div>
        </div>

        {/* Bottom action bar with explicit Close button (hidden during print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Tutup & Kembali ke Tampilan Sebelumnya</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleShareWhatsApp()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Kirim via WA</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
