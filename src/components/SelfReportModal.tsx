import React, { useState, useMemo } from 'react';
import { X, Send, Upload, CheckCircle2, AlertCircle, Building2, QrCode } from 'lucide-react';
import { addPayment } from '../lib/database';
import type { Resident, AppSettings } from '../types';
import {
  formatRupiah,
  getCurrentPeriodMonth,
  generateReceiptNumber,
  getAvailablePeriodMonths,
  formatPeriodMonth,
} from '../lib/formatters';
import { QrisModal } from './QrisModal';

interface SelfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  settings: AppSettings;
  onSuccess: () => void;
}

export const SelfReportModal: React.FC<SelfReportModalProps> = ({
  isOpen,
  onClose,
  residents,
  settings,
  onSuccess,
}) => {
  const [showQris, setShowQris] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth());
  const [amount, setAmount] = useState(settings.defaultMonthlyFee || 125000);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'tunai'>('transfer');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const periodOptions = useMemo(() => {
    const list = getAvailablePeriodMonths(1, 1);
    if (periodMonth && !list.some((item) => item.value === periodMonth)) {
      list.unshift({
        value: periodMonth,
        label: formatPeriodMonth(periodMonth),
      });
    }
    return list;
  }, [periodMonth]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResidentId) {
      setError('Pilih nama warga / nomor rumah');
      return;
    }

    const resident = residents.find((r) => r.id === selectedResidentId);
    if (!resident) {
      setError('Data warga tidak ditemukan');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const receiptNo = generateReceiptNumber(periodMonth);
      const newPayment = {
        residentId: resident.id,
        houseNumber: resident.houseNumber,
        headOfFamily: resident.headOfFamily,
        periodMonth,
        amount: Number(amount),
        feeType: 'Iuran Wajib (Keamanan & Kebersihan)',
        paymentMethod,
        status: 'pending' as const, // Awaiting Admin confirmation
        paidAt: new Date().toISOString().split('T')[0],
        recordedBy: 'Warga (Lapor Mandiri)',
        receiptNo,
        notes: notes || 'Konfirmasi transfer mandiri dari warga',
        transferProofUrl: proofImage || '',
      };

      await addPayment(newPayment);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting payment report:', err);
      setError(err?.message || 'Gagal mengirim laporan pembayaran');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lapor Pembayaran Iuran</h3>
              <p className="text-xs text-slate-500">Konfirmasi bukti transfer ke bendahara paguyuban</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bank Account Info Box */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 text-slate-700 font-medium">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Rekening Kas Paguyuban Komplek</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQris(true)}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded transition"
            >
              <QrCode className="w-3 h-3" />
              <span>Lihat QRIS</span>
            </button>
          </div>
          <p className="text-slate-800 font-semibold">
            {settings.bankName}: <span className="font-mono text-indigo-700">{settings.bankAccount}</span>
          </p>
          <p className="text-slate-500 text-[11px]">a.n. {settings.bankHolder}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Rumah & Nama Warga *
            </label>
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Pilih Unit Rumah --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.houseNumber} - {r.headOfFamily}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bulan Iuran *
              </label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah (Rp) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={0}
                step={5000}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metode Pembayaran *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 text-xs rounded-lg border text-center font-semibold transition ${
                  paymentMethod === 'transfer'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Transfer Bank / QRIS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('tunai')}
                className={`py-2 px-3 text-xs rounded-lg border text-center font-semibold transition ${
                  paymentMethod === 'tunai'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tunai ke Pos / Pengurus
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lampirkan Bukti Transfer (Opsional)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {proofImage ? (
                <div className="flex items-center justify-center space-x-2 text-emerald-700 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Foto Bukti Terlampir</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-xs text-slate-500">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span>Klik atau seret foto struk/tangkapan layar transfer</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Transfer via rekening Mandiri an. Hendra"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg shadow-sm transition"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>

      <QrisModal isOpen={showQris} onClose={() => setShowQris(false)} />
    </div>
  );
};
