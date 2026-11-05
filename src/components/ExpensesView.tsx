import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  ArrowDownRight,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Tag,
} from 'lucide-react';
import { addExpense, deleteExpense } from '../lib/database';
import type { Expense, UserRole, AppSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../lib/formatters';

interface ExpensesViewProps {
  expenses: Expense[];
  userRole: UserRole;
  settings: AppSettings;
}

const CATEGORIES: Expense['category'][] = [
  'Gaji Satpam',
  'Petugas Kebersihan',
  'Listrik & Air Fasum',
  'Perbaikan Fasilitas',
  'Kegiatan Warga',
  'Lainnya',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  userRole,
  settings,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Gaji Satpam');
  const [amount, setAmount] = useState<number>(100000);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const filteredExpenses = expenses
    .filter((e) => (selectedCategory === 'all' ? true : e.category === selectedCategory))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      setError('Judul pengeluaran dan jumlah valid harus diisi.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addExpense({
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        recipient: recipient.trim() || '-',
        recordedBy: settings.treasurerName || 'Bendahara RT',
        notes: notes.trim(),
      });

      setIsSubmitting(false);
      setIsModalOpen(false);
      setTitle('');
      setAmount(100000);
      setRecipient('');
      setNotes('');
    } catch (err: any) {
      console.error('Error adding expense:', err);
      setError(err?.message || 'Gagal menyimpan pengeluaran.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, expTitle: string) => {
    if (!confirm(`Hapus pengeluaran "${expTitle}"?`)) return;
    try {
      await deleteExpense(id);
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Pengeluaran Kas Komplek</h2>
          <p className="text-xs text-slate-500">
            Laporan transparansi penggunaan dana kas iuran warga secara terbuka
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        )}
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Akumulasi Pengeluaran</span>
            <p className="text-2xl font-bold text-rose-600">{formatRupiah(totalExpense)}</p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <WalletCards className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Belum ada catatan pengeluaran</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 flex-shrink-0 mt-0.5">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{expense.title}</h4>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        {expense.category}
                      </span>
                      <span>•</span>
                      <span>{formatDateIndo(expense.date)}</span>
                      {expense.recipient && (
                        <>
                          <span>•</span>
                          <span>Penerima: {expense.recipient}</span>
                        </>
                      )}
                    </div>
                    {expense.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1">{expense.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <div className="sm:text-right">
                    <p className="text-base font-extrabold text-rose-600">
                      -{formatRupiah(expense.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">Kas Keluar</p>
                  </div>

                  {userRole === 'admin' && (
                    <button
                      onClick={() => handleDelete(expense.id, expense.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal New Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <WalletCards className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Catat Pengeluaran Kas</h3>
                  <p className="text-xs text-slate-500">Transparansi dana keluar RT/RW</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">{error}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Keperluan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Honor 2 Petugas Satpam Shift Pagi/Malam"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Expense['category'])}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengeluaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penerima / Toko
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Contoh: Bpk. Slamet"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Rincian Tambahan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Lampiran nota fisik disimpan bendahara"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
