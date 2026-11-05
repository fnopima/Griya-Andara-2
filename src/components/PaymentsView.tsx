import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Send,
  AlertTriangle,
  ImageIcon,
  Filter,
} from 'lucide-react';
import { updatePayment, deletePayment } from '../lib/database';
import type { Payment, Resident, AppSettings, UserRole, PaymentStatus } from '../types';
import {
  formatRupiah,
  formatPeriodMonth,
  formatDateIndo,
  getCurrentPeriodMonth,
  getAvailablePeriodMonths,
} from '../lib/formatters';

interface PaymentsViewProps {
  payments: Payment[];
  residents: Resident[];
  settings: AppSettings;
  userRole: UserRole;
  onOpenNewPayment: () => void;
  onOpenSelfReport: () => void;
  onViewReceipt: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  residents,
  settings,
  userRole,
  onOpenNewPayment,
  onOpenSelfReport,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.periodMonth) set.add(p.periodMonth);
    });
    getAvailablePeriodMonths(1, 0).forEach((m) => set.add(m.value));
    return Array.from(set)
      .sort()
      .reverse()
      .map((val) => ({
        value: val,
        label: formatPeriodMonth(val),
      }));
  }, [payments]);

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.houseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.headOfFamily.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = selectedMonth ? p.periodMonth === selectedMonth : true;
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

    return matchesSearch && matchesMonth && matchesStatus;
  });

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const handleVerify = async (paymentId: string) => {
    try {
      await updatePayment(paymentId, {
        status: 'lunas',
        verifiedAt: new Date().toISOString(),
        recordedBy: settings.treasurerName || 'Bendahara RT',
      });
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Gagal memverifikasi pembayaran.');
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!confirm('Tolak laporan pembayaran ini?')) return;
    try {
      await updatePayment(paymentId, {
        status: 'ditolak',
      });
    } catch (err) {
      console.error('Error rejecting payment:', err);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Hapus transaksi pembayaran ini secara permanen?')) return;
    try {
      await deletePayment(paymentId);
    } catch (err) {
      console.error('Error deleting payment:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Catatan & Histori Iuran</h2>
          <p className="text-xs text-slate-500">
            {userRole === 'admin'
              ? 'Kelola transaksi, verifikasi bukti transfer warga, dan terbitkan kuitansi'
              : 'Periksa riwayat pembayaran rumah Anda dan laporkan bukti transfer'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {userRole === 'admin' ? (
            <button
              onClick={onOpenNewPayment}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pembayaran</span>
            </button>
          ) : (
            <button
              onClick={onOpenSelfReport}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              <span>Konfirmasi Bayar Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification alert for Admin if any pending */}
      {userRole === 'admin' && pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Ada {pendingCount} Laporan Pembayaran Warga Menunggu Verifikasi
              </h4>
              <p className="text-xs text-amber-700">
                Warga telah mengirim bukti transfer. Silakan periksa mutasi bank dan klik verifikasi.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending')}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg transition"
          >
            Tinjau Sekarang
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Blok / No Rumah, Nama Warga, atau No Kuitansi..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Semua Periode Bulan</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({payments.length})
          </button>
          <button
            onClick={() => setStatusFilter('lunas')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
              statusFilter === 'lunas'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Lunas ({payments.filter((p) => p.status === 'lunas').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Menunggu Verifikasi ({pendingCount})
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter bulan</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPayments.map((payment) => {
              const isLunas = payment.status === 'lunas';
              const isPending = payment.status === 'pending';

              return (
                <div
                  key={payment.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isLunas
                          ? 'bg-blue-100 text-blue-700'
                          : isPending
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {payment.houseNumber.replace('Blok ', '')}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm font-semibold text-slate-900">{payment.headOfFamily}</span>
                        <span className="text-xs text-slate-500">({payment.houseNumber})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isLunas
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPending
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Bulan: {formatPeriodMonth(payment.periodMonth)}
                        </span>
                        <span>•</span>
                        <span>{formatDateIndo(payment.paidAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{payment.paymentMethod}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{payment.receiptNo}</span>
                      </div>

                      {payment.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Catatan: {payment.notes}
                        </p>
                      )}

                      {payment.transferProofUrl && (
                        <button
                          onClick={() => setPreviewProofUrl(payment.transferProofUrl || null)}
                          className="inline-flex items-center space-x-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Transfer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:border-l sm:border-slate-100 sm:pl-4">
                    <div className="sm:text-right">
                      <p className="text-base font-bold text-slate-900">
                        {formatRupiah(payment.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400">{payment.feeType}</p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* View Receipt Button (available if lunas) */}
                      {isLunas && (
                        <button
                          onClick={() => onViewReceipt(payment)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                          title="Lihat Kuitansi Resmi"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Kuitansi</span>
                        </button>
                      )}

                      {/* Admin Verification Actions for pending items */}
                      {userRole === 'admin' && isPending && (
                        <>
                          <button
                            onClick={() => handleVerify(payment.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-2xs"
                            title="Konfirmasi Lunas"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Verifikasi</span>
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                            title="Tolak Laporan"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {/* Admin Delete Action */}
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Previewing Attached Transfer Proof Image */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800">Lampiran Bukti Transfer Warga</h3>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2">
              <img
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="mt-3 text-right">
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
