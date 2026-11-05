import React, { useState, useMemo, useEffect } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { addPayment } from '../lib/database';
import confetti from 'canvas-confetti';
import type { Resident, AppSettings, PaymentMethod } from '../types';
import {
  getCurrentPeriodMonth,
  generateReceiptNumber,
  getAvailablePeriodMonths,
  formatPeriodMonth,
} from '../lib/formatters';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  settings: AppSettings;
  initialResidentId?: string;
  initialPeriodMonth?: string;
  onSuccess: () => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  residents,
  settings,
  initialResidentId,
  initialPeriodMonth,
  onSuccess,
}) => {
  const [residentId, setResidentId] = useState(initialResidentId || '');
  const [periodMonth, setPeriodMonth] = useState(initialPeriodMonth || getCurrentPeriodMonth());
  const [amount, setAmount] = useState(settings.defaultMonthlyFee || 125000);
  const [feeType, setFeeType] = useState('Iuran Wajib (Keamanan & Kebersihan)');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialResidentId) setResidentId(initialResidentId);
      if (initialPeriodMonth) setPeriodMonth(initialPeriodMonth);
    }
  }, [isOpen, initialResidentId, initialPeriodMonth]);

  const periodOptions = useMemo(() => {
    const list = getAvailablePeriodMonths(2, 1);
    if (periodMonth && !list.some((item) => item.value === periodMonth)) {
      list.unshift({
        value: periodMonth,
        label: formatPeriodMonth(periodMonth),
      });
    }
    return list;
  }, [periodMonth]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentId) {
      setError('Silakan pilih warga / nomor rumah');
      return;
    }

    const resident = residents.find((r) => r.id === residentId);
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
        feeType,
        paymentMethod,
        status: 'lunas' as const,
        paidAt,
        recordedBy: settings.treasurerName || 'Bendahara RT',
        receiptNo,
        notes,
      };

      await addPayment(newPayment);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Safe fallback
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err?.message || 'Gagal mencatat pembayaran');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Catat Pembayaran Iuran</h3>
              <p className="text-xs text-slate-500">Input transaksi pembayaran warga oleh Pengurus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
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
              Pilih Rumah / Warga *
            </label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Pilih Warga --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.houseNumber} - {r.headOfFamily} ({r.occupancyStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bulan Periode *
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
                Tanggal Diterima *
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Bayar (Rp) *
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Bayar *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="transfer">Transfer Bank</option>
                <option value="tunai">Tunai / Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jenis Iuran
            </label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="Iuran Wajib (Keamanan & Kebersihan)">Iuran Wajib (Keamanan & Kebersihan)</option>
              <option value="Iuran Kas RT">Iuran Kas RT</option>
              <option value="Dana Sosial / Duka Cita">Dana Sosial / Duka Cita</option>
              <option value="THR Petugas Keamanan & Kebersihan">THR Petugas Satpam & Kebersihan</option>
              <option value="Iuran Pembangunan / Fasum">Iuran Pembangunan / Fasum</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Diterima langsung di pos satpam"
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Terbitkan Kuitansi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
