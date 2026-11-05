import React, { useState, useEffect } from 'react';
import { X, UserPlus, Home, Phone, User, FileText } from 'lucide-react';
import { addResident, updateResident } from '../lib/database';
import type { Resident } from '../types';

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentToEdit: Resident | null;
  onSuccess: () => void;
}

export const ResidentModal: React.FC<ResidentModalProps> = ({
  isOpen,
  onClose,
  residentToEdit,
  onSuccess,
}) => {
  const [houseNumber, setHouseNumber] = useState('');
  const [headOfFamily, setHeadOfFamily] = useState('');
  const [phone, setPhone] = useState('');
  const [residentType, setResidentType] = useState<'tetap' | 'kontrak'>('tetap');
  const [occupancyStatus, setOccupancyStatus] = useState<'dihuni' | 'kosong'>('dihuni');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (residentToEdit) {
      setHouseNumber(residentToEdit.houseNumber);
      setHeadOfFamily(residentToEdit.headOfFamily);
      setPhone(residentToEdit.phone || '');
      setResidentType(residentToEdit.residentType || 'tetap');
      setOccupancyStatus(residentToEdit.occupancyStatus || 'dihuni');
      setNotes(residentToEdit.notes || '');
    } else {
      setHouseNumber('');
      setHeadOfFamily('');
      setPhone('');
      setResidentType('tetap');
      setOccupancyStatus('dihuni');
      setNotes('');
    }
  }, [residentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber.trim() || !headOfFamily.trim()) {
      setError('Nomor rumah dan nama kepala keluarga wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = {
        houseNumber: houseNumber.trim(),
        headOfFamily: headOfFamily.trim(),
        phone: phone.trim(),
        residentType,
        occupancyStatus,
        notes: notes.trim(),
      };

      if (residentToEdit) {
        await updateResident(residentToEdit.id, data);
      } else {
        await addResident({
          ...data,
          createdAt: new Date().toISOString().split('T')[0],
        });
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving resident:', err);
      setError(err?.message || 'Gagal menyimpan data warga.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {residentToEdit ? 'Edit Data Warga' : 'Tambah Warga & Rumah Baru'}
              </h3>
              <p className="text-xs text-slate-500">Pencatatan unit komplek dan kepala keluarga</p>
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
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Rumah / Blok *
            </label>
            <div className="relative">
              <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="Contoh: Blok A1 No. 05"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kepala Keluarga / Penghuni *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={headOfFamily}
                onChange={(e) => setHeadOfFamily(e.target.value)}
                placeholder="Contoh: Bpk. Bambang Pamungkas"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Kepemilikan
              </label>
              <select
                value={residentType}
                onChange={(e) => setResidentType(e.target.value as 'tetap' | 'kontrak')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="tetap">Warga Tetap</option>
                <option value="kontrak">Warga Kontrak / Sewa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Hunian
              </label>
              <select
                value={occupancyStatus}
                onChange={(e) => setOccupancyStatus(e.target.value as 'dihuni' | 'kosong')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="dihuni">Dihuni</option>
                <option value="kosong">Kosong</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Tambahan (Opsional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Seksi Keamanan RT / Sering dinas luar kota"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data Warga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
