import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  MessageSquare,
  Building,
  CreditCard,
  Lock,
  Copy,
  Check,
  Megaphone,
  Share2,
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  ExternalLink,
  FileSpreadsheet,
  Code2,
  HelpCircle,
  Send,
  ArrowDownToLine,
  X,
} from 'lucide-react';
import {
  updateAppSettings,
  exportDatabaseBackup,
  importDatabaseBackup,
  clearAllDummyData,
  resetAllDataToEmpty,
  testGoogleSheets,
  migrateAllToGoogleSheets,
  loadFromGoogleSheets,
} from '../lib/database';
import { GOOGLE_APPS_SCRIPT_CODE } from '../lib/googleSheets';
import type { AppSettings, UserRole, Payment, Expense, Resident, OtherIncome, DatabaseInfo } from '../types';
import { formatRupiah, getCurrentPeriodMonth, formatPeriodMonth } from '../lib/formatters';

interface SettingsViewProps {
  settings: AppSettings;
  userRole: UserRole;
  payments: Payment[];
  expenses: Expense[];
  residents: Resident[];
  otherIncomes?: OtherIncome[];
  dbInfo?: DatabaseInfo;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  userRole,
  payments,
  expenses,
  residents,
  otherIncomes = [],
  dbInfo,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [dbNotice, setDbNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheets integration state
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [isMigratingSheets, setIsMigratingSheets] = useState(false);
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [sheetsNotice, setSheetsNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTestSheets = async () => {
    if (!formData.googleSheetsUrl) {
      setSheetsNotice({ type: 'error', message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.' });
      return;
    }
    setIsTestingSheets(true);
    setSheetsNotice(null);
    try {
      const res = await testGoogleSheets(formData.googleSheetsUrl);
      if (res.success) {
        setSheetsNotice({ type: 'success', message: res.message });
      } else {
        setSheetsNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setSheetsNotice({ type: 'error', message: err?.message || 'Gagal tes koneksi ke Google Sheets.' });
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleMigrateToSheets = async () => {
    if (!formData.googleSheetsUrl) {
      setSheetsNotice({ type: 'error', message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.' });
      return;
    }
    if (
      !window.confirm(
        'Unggah dan sinkronkan seluruh data warga, iuran, pengeluaran, dan pengaturan komplek ke Google Sheet sekarang?'
      )
    ) {
      return;
    }
    setIsMigratingSheets(true);
    setSheetsNotice(null);
    try {
      // First save settings with googleSheetsUrl
      await updateAppSettings(formData);
      const res = await migrateAllToGoogleSheets(formData.googleSheetsUrl);
      setSheetsNotice({ type: 'success', message: res.message });
    } catch (err: any) {
      setSheetsNotice({ type: 'error', message: err?.message || 'Gagal migrasi ke Google Sheet.' });
    } finally {
      setIsMigratingSheets(false);
    }
  };

  const handleLoadFromSheets = async () => {
    if (!formData.googleSheetsUrl) {
      setSheetsNotice({ type: 'error', message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.' });
      return;
    }
    if (
      !window.confirm(
        'Muat data dari Google Sheet? Data di aplikasi akan disinkronkan sesuai data yang ada di Google Sheet Anda.'
      )
    ) {
      return;
    }
    setIsLoadingFromSheets(true);
    setSheetsNotice(null);
    try {
      const res = await loadFromGoogleSheets(formData.googleSheetsUrl);
      setSheetsNotice({
        type: 'success',
        message: `Berhasil memuat ${res.count} data warga dan catatan iuran dari Google Sheet!`,
      });
    } catch (err: any) {
      setSheetsNotice({ type: 'error', message: err?.message || 'Gagal memuat data dari Google Sheet.' });
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  const handleCopyAppsScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 3000);
  };

  const [announcementItems, setAnnouncementItems] = useState<string[]>(() => {
    const list = (settings.announcement || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [''];
  });

  useEffect(() => {
    setFormData(settings);
    const list = (settings.announcement || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setAnnouncementItems(list.length > 0 ? list : ['']);
  }, [settings]);

  const updateAnnouncementItem = (index: number, value: string) => {
    const updated = [...announcementItems];
    updated[index] = value;
    setAnnouncementItems(updated);
    setFormData((prev) => ({
      ...prev,
      announcement: updated.map((s) => s.trim()).filter(Boolean).join('\n'),
    }));
  };

  const addAnnouncementItem = () => {
    setAnnouncementItems((prev) => [...prev, '']);
  };

  const removeAnnouncementItem = (index: number) => {
    const updated = announcementItems.filter((_, idx) => idx !== index);
    const result = updated.length > 0 ? updated : [''];
    setAnnouncementItems(result);
    setFormData((prev) => ({
      ...prev,
      announcement: result.map((s) => s.trim()).filter(Boolean).join('\n'),
    }));
  };

  const currentPeriod = getCurrentPeriodMonth();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAppSettings(formData);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Gagal menyimpan pengaturan.');
      setIsSaving(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = exportDatabaseBackup();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-iuran-komplek-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDbNotice({ type: 'success', message: 'Cadangan database berhasil diunduh!' });
      setTimeout(() => setDbNotice(null), 4000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal mengunduh cadangan database.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importDatabaseBackup(content);
        setDbNotice({ type: 'success', message: 'Database berhasil dipulihkan dari berkas JSON!' });
        setTimeout(() => setDbNotice(null), 4000);
      } catch (err: any) {
        setDbNotice({
          type: 'error',
          message: err?.message || 'Format berkas tidak sesuai atau data korup.',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePurgeDummyData = async () => {
    if (!confirm('Bersihkan semua data bawaan/dummy yang masih tersisa dari database? Data riil yang Anda input tidak akan terhapus.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await clearAllDummyData();
      setDbNotice({
        type: 'success',
        message: `Pembersihan berhasil! ${res.residentsRemoved} warga dummy, ${res.paymentsRemoved} iuran dummy, dan ${res.expensesRemoved} pengeluaran dummy telah dihapus.`,
      });
      setTimeout(() => setDbNotice(null), 5000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal membersihkan data dummy.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('PERHATIAN: Apakah Anda yakin ingin mengosongkan seluruh data transaksi (Warga, Iuran, Pendapatan Lain, Pengeluaran) untuk memulai dari nol?')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetAllDataToEmpty();
      setDbNotice({ type: 'success', message: 'Semua data transaksi telah dikosongkan. Siap untuk pencatatan riil!' });
      setTimeout(() => setDbNotice(null), 5000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal mengosongkan data.' });
    } finally {
      setIsResetting(false);
    }
  };

  // Generate WhatsApp Monthly Broadcast Recap
  const generateMonthlyRecapMessage = () => {
    const totalIuran = payments
      .filter((p) => p.status === 'lunas')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalOtherIncome = otherIncomes.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = totalIuran + totalOtherIncome;
    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    const monthPayments = payments.filter(
      (p) => p.periodMonth === currentPeriod && p.status === 'lunas'
    );
    const monthIuran = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const monthOther = otherIncomes
      .filter((inc) => inc.date.startsWith(currentPeriod))
      .reduce((acc, curr) => acc + curr.amount, 0);
    const monthTotalIncome = monthIuran + monthOther;

    const monthExpense = expenses
      .filter((e) => e.date.startsWith(currentPeriod))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const paidHouses = new Set(monthPayments.map((p) => p.houseNumber));
    const occupiedCount = residents.filter((r) => r.occupancyStatus === 'dihuni').length || 1;

    return `📢 *LAPORAN KEUANGAN KAS ${formData.complexName.toUpperCase()}*
PAGUYUBAN WARGA ${formData.rtRw}
Periode: ${formatPeriodMonth(currentPeriod)}
================================
💰 *RINGKASAN KAS BULAN INI:*
• Pemasukan Iuran: ${formatRupiah(monthIuran)}
${monthOther > 0 ? `• Pendapatan Lain: ${formatRupiah(monthOther)}\n• Total Pemasukan: ${formatRupiah(monthTotalIncome)}\n` : ''}• Pengeluaran Kas: ${formatRupiah(monthExpense)}
• Warga Lunas: ${paidHouses.size} dari ${occupiedCount} Rumah (${Math.round((paidHouses.size / occupiedCount) * 100)}%)

💵 *TOTAL SALDO KAS PAGUYUBAN KOMPLEK SAAT INI:*
👉 *${formatRupiah(balance)}*
================================
💳 *REKENING KAS PAGUYUBAN KOMPLEK:*
Bank: ${formData.bankName}
No. Rekening: ${formData.bankAccount}
Atas Nama: ${formData.bankHolder}
Nominal Iuran: ${formatRupiah(formData.defaultMonthlyFee)} / bulan

Mohon bagi warga yang belum sempat melunasi iuran agar dapat melakukan transfer dan konfirmasi ke Bendahara RT (${formData.treasurerName} - ${formData.treasurerPhone}).

Terima kasih atas partisipasi dan kepedulian seluruh warga. 🙏✨`;
  };

  // Generate WhatsApp Payment Reminder
  const generateReminderMessage = () => {
    const monthPayments = payments.filter(
      (p) => p.periodMonth === currentPeriod && p.status === 'lunas'
    );
    const paidHouseNumbers = new Set(monthPayments.map((p) => p.houseNumber));
    const unpaidList = residents
      .filter((r) => r.occupancyStatus === 'dihuni' && !paidHouseNumbers.has(r.houseNumber))
      .map((r) => `• ${r.houseNumber} (${r.headOfFamily})`)
      .join('\n');

    return `🔔 *PENGINGAT IURAN KOMPLEK - ${formatPeriodMonth(currentPeriod).toUpperCase()}*
Kepada Yth. Bapak/Ibu Warga ${formData.complexName} (${formData.rtRw}),

Iuran wajib bulanan kebersihan & keamanan sebesar *${formatRupiah(formData.defaultMonthlyFee)}* untuk periode *${formatPeriodMonth(currentPeriod)}* telah dibuka.

Pembayaran dapat ditransfer melalui:
🏦 Bank: *${formData.bankName}*
🔢 No. Rek: *${formData.bankAccount}*
👤 A.N: *${formData.bankHolder}*

Bagi yang belum melunasi:
${unpaidList || 'Semua warga sudah lunas!'}

Setelah transfer, mohon kirim bukti pembayaran atau lapor mandiri di aplikasi iuran komplek.
Salam hangat,
Pengurus & Bendahara ${formData.rtRw}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const shareToWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Pengaturan & Broadcast WA</h2>
        <p className="text-xs text-slate-500">
          Kelola profil komplek, nomor rekening kas, tarif iuran, dan format broadcast grup WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Profil Komplek & Tarif Iuran</h3>
              </div>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Tersimpan ke Database
                </span>
              )}
            </div>

            {userRole !== 'admin' && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                Perhatian: Anda sedang dalam mode Warga. Anda dapat melihat informasi ini, namun perubahan hanya dapat disimpan oleh Pengurus (Admin).
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Komplek / Perumahan *
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.complexName}
                  onChange={(e) => setFormData({ ...formData, complexName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wilayah RT / RW *
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.rtRw}
                  onChange={(e) => setFormData({ ...formData, rtRw: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelurahan / Desa / Kecamatan
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.subDistrict}
                  onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Besaran Iuran Bulanan Default (Rp) *
                </label>
                <input
                  type="number"
                  disabled={userRole !== 'admin'}
                  min={10000}
                  step={5000}
                  value={formData.defaultMonthlyFee}
                  onChange={(e) => setFormData({ ...formData, defaultMonthlyFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Rekening Kas Paguyuban Komplek */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2 mb-3">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rekening Bank Penerimaan Kas Paguyuban Komplek
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="BCA, Mandiri, BRI"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Atas Nama (A.N)</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankHolder}
                    onChange={(e) => setFormData({ ...formData, bankHolder: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Kontak Pengurus */}
            <div className="pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Bendahara / Pengurus
                  </label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.treasurerName}
                    onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp Bendahara
                  </label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.treasurerPhone}
                    onChange={(e) => setFormData({ ...formData, treasurerPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Keamanan & Akses Masuk Aplikasi */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Keamanan & Akses Masuk Aplikasi
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Password Warga Komplek
                    </label>
                    <span className="text-[10px] font-medium text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                      Default: andara
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.wargaPassword ?? 'andara'}
                    onChange={(e) => setFormData({ ...formData, wargaPassword: e.target.value })}
                    placeholder="andara"
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Password wajib yang dimasukkan oleh warga saat akan masuk & membuka aplikasi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      PIN Keamanan Admin
                    </label>
                    <span className="text-[10px] font-medium text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300">
                      Default: 1234
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    maxLength={6}
                    value={formData.adminPin}
                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 tracking-wider"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    PIN 4–6 digit khusus pengurus/bendahara untuk akses penuh & pengelolaan.
                  </p>
                </div>
              </div>
            </div>

            {/* Pengumuman Pengurus Paguyuban Komplek */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                    <span>Pengumuman Pengurus Paguyuban Komplek (Tampil di Dashboard)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admin dapat memasukkan beberapa pengumuman berbeda. Masing-masing pengumuman akan ditampilkan dalam baris terpisah pada dashboard.
                  </p>
                </div>
                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={addAnnouncementItem}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Baris Pengumuman</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {announcementItems.map((item, index) => (
                  <div key={index} className="flex items-start space-x-2.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        disabled={userRole !== 'admin'}
                        value={item}
                        onChange={(e) => updateAnnouncementItem(index, e.target.value)}
                        placeholder={`Pengumuman baris ke-${index + 1} (misal: Jadwal gotong royong Minggu pkl 07.00, atau Jadwal ronda malam)...`}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 leading-relaxed"
                      />
                    </div>
                    {userRole === 'admin' && announcementItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAnnouncementItem(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 mt-0.5"
                        title="Hapus baris pengumuman ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {userRole === 'admin' && (
                <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500">
                  <span>
                    {announcementItems.filter((s) => s.trim()).length} pengumuman aktif tersimpan
                  </span>
                  <button
                    type="button"
                    onClick={addAnnouncementItem}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Tambah Pengumuman Lain
                  </button>
                </div>
              )}
            </div>

            {userRole === 'admin' && (
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Col: WhatsApp Broadcast Generator */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generator Broadcast WhatsApp</h3>
                <p className="text-[11px] text-slate-500">Kirim update cepat ke grup warga</p>
              </div>
            </div>

            {/* Message 1: Rekap Bulanan */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">1. Laporan Kas Bulanan</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                  Format Siap Kirim
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pemasukan, pengeluaran, sisa saldo kas dan persentase warga lunas.
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => copyToClipboard(generateMonthlyRecapMessage(), 'recap')}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  {copiedType === 'recap' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'recap' ? 'Disalin!' : 'Salin Pesan'}</span>
                </button>
                <button
                  onClick={() => shareToWhatsApp(generateMonthlyRecapMessage())}
                  className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>

            {/* Message 2: Pengingat Iuran */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2. Pengingat Iuran Bulan Ini</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  Pengingat Ramah
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ajakan pembayaran bulan berjalan lengkap dengan nomor rekening kas Paguyuban Komplek.
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => copyToClipboard(generateReminderMessage(), 'reminder')}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  {copiedType === 'reminder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'reminder' ? 'Disalin!' : 'Salin Pesan'}</span>
                </button>
                <button
                  onClick={() => shareToWhatsApp(generateReminderMessage())}
                  className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Sheets Database Integration Card */}
          <div className="p-5 rounded-xl bg-white border border-emerald-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Database Google Sheets</h3>
                  <p className="text-[11px] text-emerald-700 font-medium">Bebas Limit Kuota • Akses Spreadsheet Langsung</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Panduan & Kode Script</span>
              </button>
            </div>

            {/* Google Sheets Notice */}
            {sheetsNotice && (
              <div
                className={`p-3 rounded-lg flex items-start space-x-2 text-xs font-medium ${
                  sheetsNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {sheetsNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                )}
                <span className="leading-relaxed">{sheetsNotice.message}</span>
              </div>
            )}

            {/* Google Sheets Information Notice */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start space-x-2.5 text-xs text-emerald-900">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-semibold text-emerald-950">Database Google Sheets: </span>
                Seluruh data warga, pembayaran iuran, kas pengeluaran, dan pengaturan disimpan langsung ke Google Spreadsheet Anda secara permanen dan bebas dari batas kuota.
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Web App Google Apps Script:
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={formData.googleSheetsUrl || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, googleSheetsUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Didapatkan dari menu Deployment baru di Apps Script dengan akses: Siapa saja (Anyone).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan File Google Spreadsheet (Opsional):
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={formData.googleSheetSpreadsheetUrl || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, googleSheetSpreadsheetUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tautan langsung agar pengurus dapat membuka Google Sheet hanya dengan satu klik dari aplikasi.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestSheets}
                disabled={isTestingSheets || !formData.googleSheetsUrl}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheets ? 'animate-spin' : ''}`} />
                <span>{isTestingSheets ? 'Menguji...' : 'Tes Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={handleMigrateToSheets}
                disabled={isMigratingSheets || !formData.googleSheetsUrl}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-2xs"
                title="Kirim semua data warga, iuran, pengeluaran saat ini ke Google Sheet"
              >
                <Send className={`w-3.5 h-3.5 ${isMigratingSheets ? 'animate-pulse' : ''}`} />
                <span>{isMigratingSheets ? 'Mengunggah...' : 'Unggah ke Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadFromSheets}
                disabled={isLoadingFromSheets || !formData.googleSheetsUrl}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition"
                title="Tarik data terbaru dari Google Sheet ke aplikasi"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${isLoadingFromSheets ? 'animate-bounce' : ''}`} />
                <span>{isLoadingFromSheets ? 'Memuat...' : 'Tarik dari Sheet'}</span>
              </button>
            </div>

            {formData.googleSheetSpreadsheetUrl && (
              <div className="pt-1">
                <a
                  href={formData.googleSheetSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Buka Lembar Kerja di Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Database System & Free Publishing Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Database className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Status Database & Cadangan</h3>
                <p className="text-[11px] text-slate-500">100% Fitur Gratis & Tanpa Perlu Billing</p>
              </div>
            </div>

            {/* Notification alert */}
            {dbNotice && (
              <div
                className={`p-3 rounded-lg flex items-start space-x-2 text-xs font-medium ${
                  dbNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {dbNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                )}
                <span>{dbNotice.message}</span>
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Penyimpanan Aktif:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dbInfo?.sheetsConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                    } animate-pulse`}
                  />
                  {dbInfo?.sheetsConfigured
                    ? 'Google Sheets (Apps Script Web App)'
                    : 'Penyimpanan Lokal Browser (Belum Terhubung)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Status Biaya:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                  100% Gratis & Bebas Kuota
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Terakhir Disinkron:</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {dbInfo?.lastSyncedAt || 'Aktif'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Warga</div>
                  <div className="font-bold text-slate-800">{residents.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Catatan Iuran</div>
                  <div className="font-bold text-slate-800">{payments.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Pendapatan Lain</div>
                  <div className="font-bold text-emerald-700">{otherIncomes.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Pengeluaran</div>
                  <div className="font-bold text-rose-700">{expenses.length}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unduh Cadangan Database (.json)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pulihkan Database dari Berkas (.json)</span>
              </button>

              {userRole === 'admin' && (
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handlePurgeDummyData}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Hapus / Bersihkan Sisa Data Dummy</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllData}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Semua Data Transaksi (Mulai Baru)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apps Script Guide Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Panduan Setup Google Apps Script (2 Menit)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Menghubungkan Spreadsheet Anda sebagai database aplikasi tanpa batas kuota
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Buat Google Sheet Baru</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Buka tab baru dan buat Google Sheet kosong melalui tautan{' '}
                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                      >
                        sheets.new <ExternalLink className="w-3 h-3" />
                      </a>
                      . Beri nama file misalnya: <em>Database Kas Griya Andara</em>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Buka Menu Apps Script</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Di halaman Google Sheet Anda, klik menu <strong>Ekstensi</strong> (atau <em>Extensions</em>) &gt; pilih <strong>Apps Script</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div className="space-y-2 flex-1">
                    <p className="font-bold text-slate-900">Tempelkan Kode Script di Bawah</p>
                    <p className="text-slate-600 text-[11px]">
                      Hapus semua teks di file <code>Code.gs</code>, lalu klik tombol di bawah untuk menyalin seluruh kode dan tempelkan ke editor Apps Script.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyAppsScriptCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition"
                    >
                      {isCodeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCodeCopied ? 'Kode Berhasil Disalin!' : 'Salin Seluruh Kode (Code.gs)'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Terapkan Sebagai Aplikasi Web (Web App)</p>
                    <div className="text-slate-600 text-[11px] mt-0.5 space-y-1">
                      <p>• Klik tombol biru <strong>Terapkan</strong> (<em>Deploy</em>) di kanan atas &gt; pilih <strong>Deployment baru</strong>.</p>
                      <p>• Klik ikon gerigi (⚙️) di samping "Pilih jenis" &gt; pilih <strong>Aplikasi Web</strong>.</p>
                      <p>• Atur <strong>Jalankan sebagai</strong>: <em>Saya (email Anda)</em>.</p>
                      <p className="font-semibold text-rose-700">• Atur <strong>Siapa yang memiliki akses</strong>: <u>Siapa saja (Anyone)</u> (Wajib agar warga dapat melihat data tanpa error izin).</p>
                      <p>• Klik <strong>Terapkan</strong>, berikan izin Google jika diminta, lalu <strong>Salin URL Aplikasi Web</strong> (berakhiran <code>/exec</code>).</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    5
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Tempelkan URL ke Aplikasi & Klik 'Unggah ke Sheet'</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Tempel URL Web App ke kolom di Pengaturan, lalu klik tombol <strong>Unggah ke Sheet</strong>. Seluruh lembar (*Warga, Pembayaran, Pengeluaran, Pendapatan Lain, Pengaturan*) akan otomatis terbuat di Google Sheet Anda!
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Preview Box */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                    Pratinjau Kode (Code.gs):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    {isCodeCopied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono max-h-48 overflow-y-auto leading-relaxed border border-slate-800">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Data Anda sepenuhnya tersimpan di Google Drive milik Anda sendiri.
              </span>
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
