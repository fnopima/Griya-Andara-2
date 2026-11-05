import React, { useState, useMemo } from 'react';
import {
  Coins,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
  Receipt,
  Download,
  Printer,
  X,
  TrendingUp,
  Tag,
  Building,
} from 'lucide-react';
import { deleteOtherIncome } from '../lib/database';
import { formatRupiah, formatDateIndo, getCurrentPeriodMonth, formatPeriodMonth } from '../lib/formatters';
import type { OtherIncome, OtherIncomeCategory, UserRole, AppSettings } from '../types';

interface OtherIncomesViewProps {
  otherIncomes: OtherIncome[];
  userRole: UserRole;
  settings: AppSettings;
  onOpenNewIncomeModal: () => void;
}

const CATEGORY_COLORS: Record<OtherIncomeCategory, string> = {
  'Donasi / Sumbangan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sewa Fasilitas': 'bg-blue-50 text-blue-700 border-blue-200',
  'Bantuan / CSR': 'bg-purple-50 text-purple-700 border-purple-200',
  'Bank Sampah': 'bg-teal-50 text-teal-700 border-teal-200',
  'Bazar & Sponsorship': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kas Parkir': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Bunga Bank': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Lainnya': 'bg-slate-50 text-slate-700 border-slate-200',
};

export const OtherIncomesView: React.FC<OtherIncomesViewProps> = ({
  otherIncomes,
  userRole,
  settings,
  onOpenNewIncomeModal,
}) => {
  const currentPeriod = getCurrentPeriodMonth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeReceipt, setActiveReceipt] = useState<OtherIncome | null>(null);

  // Month list available in data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentPeriod);
    otherIncomes.forEach((inc) => {
      if (inc.date && inc.date.length >= 7) {
        set.add(inc.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [otherIncomes, currentPeriod]);

  // Filtered other incomes
  const filteredIncomes = useMemo(() => {
    return otherIncomes.filter((inc) => {
      const matchSearch =
        inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'all' || inc.category === selectedCategory;
      const matchMonth = selectedMonth === 'all' || inc.date.startsWith(selectedMonth);

      return matchSearch && matchCategory && matchMonth;
    });
  }, [otherIncomes, searchTerm, selectedCategory, selectedMonth]);

  // Statistics
  const totalAllTime = useMemo(() => {
    return otherIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  }, [otherIncomes]);

  const totalThisMonth = useMemo(() => {
    return otherIncomes
      .filter((inc) => inc.date.startsWith(currentPeriod))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [otherIncomes, currentPeriod]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus catatan pendapatan "${title}"?`)) return;
    try {
      await deleteOtherIncome(id);
    } catch (err) {
      console.error('Error deleting income:', err);
      alert('Gagal menghapus pendapatan.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" />
            Pendapatan Lain di Luar Iuran
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Pencatatan sumber penerimaan kas alternatif: donasi sukarela, sewa balai/fasilitas, CSR, dan sponsor kegiatan.
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={onOpenNewIncomeModal}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pendapatan Lain</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pendapatan Lain Bulan Ini</span>
            <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {formatRupiah(totalThisMonth)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Periode {formatPeriodMonth(currentPeriod)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Akumulasi Pendapatan Lain</span>
            <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {formatRupiah(totalAllTime)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dari {otherIncomes.length} catatan transaksi
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Status Pencatatan Kas</span>
            <span className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 mt-2">
            100% Transparan & Riil
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Otomatis terhitung pada Saldo Kas Keseluruhan Paguyuban Komplek
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari uraian pendapatan, nama donatur/pemberi, atau no kuitansi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="Donasi / Sumbangan">Donasi / Sumbangan</option>
            <option value="Sewa Fasilitas">Sewa Fasilitas</option>
            <option value="Bantuan / CSR">Bantuan / CSR</option>
            <option value="Bank Sampah">Bank Sampah</option>
            <option value="Bazar & Sponsorship">Bazar & Sponsorship</option>
            <option value="Kas Parkir">Kas Parkir</option>
            <option value="Bunga Bank">Bunga Bank</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Periode</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatPeriodMonth(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredIncomes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Catatan Pendapatan Lain</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada pencatatan pemasukan non-iuran yang sesuai dengan filter saat ini.
            </p>
            {userRole === 'admin' ? (
              <button
                onClick={onOpenNewIncomeModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pendapatan Sekarang</span>
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Pencatatan penerimaan pendapatan lain hanya dapat dilakukan oleh Pengurus RT (Admin).
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Uraian & Kategori</th>
                  <th className="py-3 px-4">Sumber / Pemberi</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">No. Kuitansi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateIndo(inc.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inc.title}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            CATEGORY_COLORS[inc.category] || CATEGORY_COLORS['Lainnya']
                          }`}
                        >
                          {inc.category}
                        </span>
                        {inc.notes && (
                          <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                            "{inc.notes}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {inc.payerName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {inc.paymentMethod === 'tunai' ? '💵 Tunai' : '💳 Transfer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-emerald-700 text-sm">
                      {formatRupiah(inc.amount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {inc.receiptNo}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(inc)}
                          title="Lihat / Cetak Kuitansi"
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(inc.id, inc.title)}
                            title="Hapus Catatan"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kuitansi Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (hidden in print) */}
            <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between print:hidden">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Bukti Tanda Terima Kas
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 text-slate-300 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Card */}
            <div className="p-6 space-y-4 bg-white text-slate-800">
              <div className="text-center border-b pb-3 border-slate-200">
                <h3 className="text-base font-bold uppercase tracking-tight text-slate-900">
                  {settings.complexName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {settings.rtRw} • {settings.subDistrict}
                </p>
                <div className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase rounded">
                  Kuitansi Pendapatan Kas Paguyuban Komplek
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kuitansi:</span>
                  <span className="font-mono font-bold text-slate-900">{activeReceipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Terima:</span>
                  <span className="font-medium text-slate-900">{formatDateIndo(activeReceipt.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diterima Dari:</span>
                  <span className="font-semibold text-slate-900">{activeReceipt.payerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-semibold text-slate-800">{activeReceipt.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="font-medium text-slate-800 capitalize">
                    {activeReceipt.paymentMethod === 'tunai' ? 'Tunai (Kas RT)' : 'Transfer Bank'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1">Untuk Pembayaran / Peruntukan:</span>
                  <p className="font-medium text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
                    {activeReceipt.title}
                  </p>
                </div>
                {activeReceipt.notes && (
                  <div>
                    <span className="text-slate-500 block mb-0.5">Keterangan:</span>
                    <p className="text-[11px] text-slate-600 italic">"{activeReceipt.notes}"</p>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">JUMLAH DITERIMA:</span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  {formatRupiah(activeReceipt.amount)}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-600">
                <div>
                  <p className="text-slate-400">Penyetor / Sumber:</p>
                  <p className="font-semibold text-slate-800 mt-6">{activeReceipt.payerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Penerima (Kas Paguyuban Komplek):</p>
                  <p className="font-semibold text-slate-800 mt-6">
                    {settings.treasurerName || 'Bendahara RT'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action footer (hidden in print) */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center print:hidden">
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
              >
                Tutup & Kembali
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                Cetak Kuitansi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
