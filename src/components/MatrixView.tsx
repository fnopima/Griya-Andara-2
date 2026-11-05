import React, { useState } from 'react';
import { Check, Clock, X, Calendar, Download } from 'lucide-react';
import type { Resident, Payment, AppSettings, UserRole } from '../types';
import { formatRupiah, INDONESIAN_MONTHS } from '../lib/formatters';

interface MatrixViewProps {
  residents: Resident[];
  payments: Payment[];
  settings: AppSettings;
  userRole: UserRole;
  onQuickPay?: (resident: Resident, periodMonth: string) => void;
  onViewReceipt: (payment: Payment) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  residents,
  payments,
  settings,
  userRole,
  onQuickPay,
  onViewReceipt,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [filterBlock, setFilterBlock] = useState<string>('all');

  // Extract blocks for filtering (e.g. "Blok A", "Blok B")
  const blocks = Array.from(
    new Set(
      residents.map((r) => {
        const parts = r.houseNumber.split(' ');
        return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : r.houseNumber;
      })
    )
  ).sort();

  const filteredResidents = residents.filter((r) => {
    if (filterBlock === 'all') return true;
    return r.houseNumber.startsWith(filterBlock);
  });

  // Calculate year totals
  const yearPayments = payments.filter(
    (p) => p.periodMonth.startsWith(`${selectedYear}-`) && p.status === 'lunas'
  );
  const totalYearIncome = yearPayments.reduce((acc, curr) => acc + curr.amount, 0);

  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No Rumah,Nama Warga,Status Hunian,' + monthShorts.join(',') + '\n';

    filteredResidents.forEach((res) => {
      const row = [
        `"${res.houseNumber}"`,
        `"${res.headOfFamily}"`,
        `"${res.occupancyStatus}"`,
      ];

      for (let m = 1; m <= 12; m++) {
        const monthKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const p = payments.find(
          (pay) =>
            (pay.residentId === res.id || pay.houseNumber === res.houseNumber) &&
            pay.periodMonth === monthKey &&
            pay.status === 'lunas'
        );
        row.push(p ? 'LUNAS' : 'BELUM');
      }

      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriks_Iuran_${settings.rtRw}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Buku Matriks Iuran Tahunan</h2>
          <p className="text-xs text-slate-500">
            Pemantauan status pelunasan seluruh rumah dari Januari sampai Desember {selectedYear}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Year Switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              {selectedYear - 1}
            </button>
            <span className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-md shadow-2xs">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              {selectedYear + 1}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Iuran Terkumpul ({selectedYear})</span>
            <p className="text-xl font-bold text-slate-900">{formatRupiah(totalYearIncome)}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs flex-wrap gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>Lunas</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
              ⏳
            </span>
            <span>Menunggu</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
            <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold">
              ✕
            </span>
            <span>Belum Bayar</span>
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left whitespace-nowrap sticky left-0 bg-slate-50 z-10">
                  Unit & Nama Warga
                </th>
                {monthShorts.map((m, idx) => (
                  <th key={idx} className="py-3 px-2 text-center min-w-[50px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.map((resident) => (
                <tr key={resident.id} className="hover:bg-slate-50/60 transition">
                  {/* Sticky House & Name Column */}
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-100">
                    <div className="font-bold text-slate-800 text-xs">{resident.houseNumber}</div>
                    <div className="text-[11px] text-slate-500 font-normal truncate max-w-[160px]">
                      {resident.headOfFamily}
                    </div>
                  </td>

                  {/* 12 Months Columns */}
                  {Array.from({ length: 12 }).map((_, mIdx) => {
                    const monthNumber = String(mIdx + 1).padStart(2, '0');
                    const periodKey = `${selectedYear}-${monthNumber}`;

                    const payment = payments.find(
                      (p) =>
                        (p.residentId === resident.id || p.houseNumber === resident.houseNumber) &&
                        p.periodMonth === periodKey
                    );

                    const isLunas = payment?.status === 'lunas';
                    const isPending = payment?.status === 'pending';

                    return (
                      <td key={mIdx} className="py-2.5 px-1.5 text-center">
                        {isLunas ? (
                          <button
                            onClick={() => payment && onViewReceipt(payment)}
                            title={`Lunas (${formatRupiah(payment.amount)}). Klik untuk kuitansi.`}
                            className="w-7 h-7 mx-auto rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold hover:bg-emerald-200 transition"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        ) : isPending ? (
                          <button
                            onClick={() => payment && onViewReceipt(payment)}
                            title="Menunggu verifikasi admin"
                            className="w-7 h-7 mx-auto rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (userRole === 'admin' && onQuickPay) {
                                onQuickPay(resident, periodKey);
                              }
                            }}
                            title={
                              userRole === 'admin'
                                ? `Belum Bayar. Klik untuk catat iuran ${INDONESIAN_MONTHS[mIdx]}`
                                : 'Belum Bayar'
                            }
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[11px] transition ${
                              userRole === 'admin'
                                ? 'bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700 cursor-pointer'
                                : 'bg-slate-50 text-slate-300'
                            }`}
                          >
                            -
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
