import React, { useState } from 'react';
import { X, Coins, CheckCircle, Calendar, Tag, User, CreditCard, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { addOtherIncome } from '../lib/database';
import { formatRupiah, generateOtherIncomeReceiptNumber } from '../lib/formatters';
import type { OtherIncomeCategory, PaymentMethod, UserRole } from '../types';

interface NewOtherIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onSuccess?: () => void;
}

const CATEGORIES: { label: OtherIncomeCategory; color: string }[] = [
  { label: 'Donasi / Sumbangan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Sewa Fasilitas', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Bantuan / CSR', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Bank Sampah', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { label: 'Bazar & Sponsorship', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Kas Parkir', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Bunga Bank', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Lainnya', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const QUICK_TITLES = [
  'Sumbangan Sukarela Warga',
  'Sewa Balai Warga / Gedung Serbaguna',
  'Bagi Hasil Penjualan Bank Sampah',
  'Bantuan Dana CSR Perusahaan',
  'Sponsorship Kegiatan 17 Agustus',
  'Sewa Tenda & Kursi Inventaris RT',
  'Infaq / Sedekah Warga untuk Kas Paguyuban Komplek',
];

export const NewOtherIncomeModal: React.FC<NewOtherIncomeModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onSuccess,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<OtherIncomeCategory>('Donasi / Sumbangan');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(today);
  const [payerName, setPayerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [receiptNo, setReceiptNo] = useState(generateOtherIncomeReceiptNumber(today));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || userRole !== 'admin') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('Hanya admin yang berwenang mencatat pendapatan.');
      return;
    }
    if (!title.trim()) {
      alert('Mohon isi nama/judul penerimaan pendapatan.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('Mohon isi nominal pendapatan yang valid.');
      return;
    }
    if (!payerName.trim()) {
      alert('Mohon sebutkan sumber dana atau nama pemberi/penyewa.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOtherIncome({
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        payerName: payerName.trim(),
        paymentMethod,
        receiptNo: receiptNo || generateOtherIncomeReceiptNumber(date),
        recordedBy: userRole === 'admin' ? 'Pengurus RT' : 'Warga',
        notes: notes.trim() || undefined,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // Reset form
        setTitle('');
        setAmount('');
        setPayerName('');
        setNotes('');
        setReceiptNo(generateOtherIncomeReceiptNumber(today));
      }, 1500);
    } catch (err) {
      console.error('Error adding other income:', err);
      alert('Terjadi kendala saat menyimpan pendapatan lain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-lg">
              <Coins className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Catat Pendapatan Lain</h3>
              <p className="text-xs text-emerald-100">Pendapatan di luar iuran bulanan warga komplek</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Overlay */}
        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Pendapatan Berhasil Dicatat!</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              Penerimaan sebesar <span className="font-semibold text-emerald-700">{formatRupiah(Number(amount))}</span> telah masuk ke saldo kas Paguyuban Komplek.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Quick Suggestions */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Pilihan Cepat Jenis Pendapatan:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {QUICK_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTitle(t);
                      if (t.includes('Sewa')) setCategory('Sewa Fasilitas');
                      else if (t.includes('Sampah')) setCategory('Bank Sampah');
                      else if (t.includes('CSR')) setCategory('Bantuan / CSR');
                      else if (t.includes('Sponsor')) setCategory('Bazar & Sponsorship');
                      else setCategory('Donasi / Sumbangan');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition text-left ${
                      title === t
                        ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama / Judul Pendapatan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama / Uraian Pendapatan *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sumbangan Sukarela Pengecatan Balai RT"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Pendapatan *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setCategory(c.label)}
                    className={`px-2 py-1.5 text-[11px] rounded-lg border text-center transition font-medium ${
                      category === c.label
                        ? `${c.color} ring-2 ring-emerald-500 border-transparent`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Penerimaan (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900"
                  />
                </div>
                {amount !== '' && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {formatRupiah(Number(amount))}
                  </p>
                )}
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Diterima *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setReceiptNo(generateOtherIncomeReceiptNumber(e.target.value));
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sumber Dana / Nama Pemberi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Dana / Pemberi / Penyewa *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bpk. H. Sukardi / Panitia Acara"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Penerimaan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tunai')}
                    className={`py-2 text-xs rounded-lg border font-semibold transition flex items-center justify-center space-x-1.5 ${
                      paymentMethod === 'tunai'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>💵 Tunai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 text-xs rounded-lg border font-semibold transition flex items-center justify-center space-x-1.5 ${
                      paymentMethod === 'transfer'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>💳 Transfer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* No Kuitansi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Kuitansi / Bukti Penerimaan
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan / Keterangan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Diserahkan langsung ke bendahara untuk kas cadangan."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Coins className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pendapatan'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
