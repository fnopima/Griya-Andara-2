import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  AlertCircle,
  Building,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import type { AppSettings, UserRole, DatabaseInfo } from '../types';

interface LoginGateModalProps {
  isOpen: boolean;
  onSuccess: (role: UserRole) => void;
  settings: AppSettings;
  dbInfo?: DatabaseInfo;
}

export const LoginGateModal: React.FC<LoginGateModalProps> = ({
  isOpen,
  onSuccess,
  settings,
  dbInfo,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('warga');
  const [wargaPassword, setWargaPassword] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleWargaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = (settings.wargaPassword || 'andara').trim();
    const entered = wargaPassword.trim();

    if (entered === correctPassword) {
      setError('');
      onSuccess('warga');
    } else {
      setError('Password warga salah. Silakan coba lagi (Default: andara)');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = (settings.adminPin || '1234').trim();
    const entered = adminPin.trim();

    if (entered === correctPin) {
      setError('');
      onSuccess('admin');
    } else {
      setError('PIN Pengurus (Admin) salah.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-6 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden border-2 border-white/30 shadow-md bg-[#536758] flex items-center justify-center">
            <img
              src="/assets/aistudio/IMG-20261104-WA0005_e17c1c0f.jpg"
              alt="Logo Griya Andara"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Paguyuban {settings.complexName || 'Pencatatan Iuran Komplek'}
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Sistem Kas & Transparansi Iuran
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/15 text-indigo-100 border border-white/20">
            <Lock className="w-3 h-3 text-indigo-200" />
            <span>Akses Masuk Terproteksi</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('warga');
                setError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                selectedRole === 'warga'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Warga Komplek</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                selectedRole === 'admin'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Pengurus (Admin)</span>
            </button>
          </div>

          {/* Form Warga */}
          {selectedRole === 'warga' ? (
            <form onSubmit={handleWargaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Masukkan Password Warga Komplek
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={wargaPassword}
                    onChange={(e) => {
                      setWargaPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Masukkan password warga..."
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Password bawaan: <strong className="font-mono text-slate-600 font-semibold">andara</strong></span>
                </div>
              </div>

              {error && (
                <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Masuk sebagai Warga Komplek</span>
              </button>
            </form>
          ) : (
            /* Form Admin */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Masukkan PIN Keamanan Admin</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) => {
                      setAdminPin(e.target.value);
                      setError('');
                    }}
                    placeholder=""
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 text-center text-sm font-mono tracking-widest rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk sebagai Admin</span>
              </button>
            </form>
          )}

          {/* Footer Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Aplikasi Kas & Iuran • Paguyuban Komplek Griya Andara
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
