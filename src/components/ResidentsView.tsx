import React, { useState } from 'react';
import {
  Users,
  Home,
  Plus,
  Search,
  MessageCircle,
  Edit2,
  Trash2,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { deleteResident } from '../lib/database';
import type { Resident, UserRole } from '../types';
import { ResidentModal } from './ResidentModal';

interface ResidentsViewProps {
  residents: Resident[];
  userRole: UserRole;
  onRefresh?: () => void;
}

export const ResidentsView: React.FC<ResidentsViewProps> = ({
  residents,
  userRole,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'dihuni' | 'kosong'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null);

  const totalHouses = residents.length;
  const occupiedCount = residents.filter((r) => r.occupancyStatus === 'dihuni').length;
  const emptyCount = totalHouses - occupiedCount;
  const contractCount = residents.filter((r) => r.residentType === 'kontrak').length;

  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      r.houseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.headOfFamily.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOccupancy =
      filterOccupancy === 'all' ? true : r.occupancyStatus === filterOccupancy;

    return matchesSearch && matchesOccupancy;
  });

  const handleDelete = async (resident: Resident) => {
    if (!confirm(`Hapus data warga ${resident.houseNumber} (${resident.headOfFamily})?`)) return;
    try {
      await deleteResident(resident.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting resident:', err);
      alert('Gagal menghapus data warga.');
    }
  };

  const getWaLink = (phone: string, head: string, house: string) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    const msg = `Halo ${head} (${house}), salam hangat dari Pengurus RT.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Direktori Warga & Rumah</h2>
          <p className="text-xs text-slate-500">
            Daftar seluruh unit rumah komplek, kepala keluarga, dan status hunian
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => {
              setResidentToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Warga Baru</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Unit Rumah</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalHouses}</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Rumah Dihuni</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{occupiedCount}</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Rumah Kosong</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{emptyCount}</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Warga Sewa/Kontrak</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{contractCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, blok rumah, atau nomor HP..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterOccupancy('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterOccupancy === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalHouses})
          </button>
          <button
            onClick={() => setFilterOccupancy('dihuni')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterOccupancy === 'dihuni'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Dihuni ({occupiedCount})
          </button>
          <button
            onClick={() => setFilterOccupancy('kosong')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterOccupancy === 'kosong'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Kosong ({emptyCount})
          </button>
        </div>
      </div>

      {/* Resident Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResidents.map((res) => {
          const isOccupied = res.occupancyStatus === 'dihuni';
          const waUrl = getWaLink(res.phone, res.headOfFamily, res.houseNumber);

          return (
            <div
              key={res.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{res.houseNumber}</h4>
                      <p className="text-xs font-medium text-slate-600">{res.headOfFamily}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      isOccupied
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {res.occupancyStatus}
                  </span>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Kepemilikan:</span>
                    <span className="font-medium text-slate-700 capitalize">{res.residentType}</span>
                  </div>
                  {res.phone && (
                    <div className="flex justify-between">
                      <span>WhatsApp/HP:</span>
                      <span className="font-mono text-slate-700">{res.phone}</span>
                    </div>
                  )}
                  {res.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg">
                      {res.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Belum ada no WA</span>
                )}

                {userRole === 'admin' && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setResidentToEdit(res);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Data"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(res)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resident Modal */}
      <ResidentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setResidentToEdit(null);
        }}
        residentToEdit={residentToEdit}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
