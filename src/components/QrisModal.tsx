import React, { useState } from 'react';
import { X, Download, Copy, Check, QrCode, Send, ExternalLink, ShieldCheck } from 'lucide-react';

interface QrisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSelfReport?: () => void;
}

export const QrisModal: React.FC<QrisModalProps> = ({
  isOpen,
  onClose,
  onOpenSelfReport,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const nmid = 'ID1026631092354';
  const merchantName = 'PAGUYUBAN GRIYA ANDARA';
  const qrisImagePath = '/qris-paguyuban-andara.jpg';

  const handleCopyNmid = async () => {
    try {
      await navigator.clipboard.writeText(`${merchantName}\nNMID: ${nmid}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                QRIS Pembayaran Kas Paguyuban Komplek
              </h3>
              <p className="text-xs text-red-100 font-medium">
                Paguyuban Griya Andara
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* QR Code Container */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center flex flex-col items-center">
            <div className="relative group p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <img
                src={qrisImagePath}
                alt="QRIS Paguyuban Griya Andara"
                className="w-full max-w-[280px] sm:max-w-[320px] mx-auto rounded-lg object-contain"
              />
            </div>

            {/* Merchant Details */}
            <div className="mt-3.5 w-full max-w-xs bg-white py-2.5 px-3 rounded-xl border border-slate-200 text-center shadow-2xs">
              <p className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                {merchantName}
              </p>
              <div className="mt-1 flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-500 font-mono text-[11px]">NMID: {nmid}</span>
                <button
                  type="button"
                  onClick={handleCopyNmid}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 py-0.5 px-1.5 rounded bg-indigo-50 hover:bg-indigo-100 transition"
                  title="Salin NMID"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-center space-x-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Standar QRIS Nasional (GPN / ASPI / Bank Indonesia)</span>
            </div>
          </div>

          {/* Action Buttons: Download & Report */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={qrisImagePath}
              download="QRIS-Paguyuban-Griya-Andara.jpg"
              className="w-full inline-flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Gambar QRIS</span>
            </a>

            {onOpenSelfReport ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSelfReport();
                }}
                className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition"
              >
                <Send className="w-4 h-4" />
                <span>Lapor Bukti Bayar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
              >
                <span>Tutup</span>
              </button>
            )}
          </div>

          {/* Petunjuk Pembayaran */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-4 text-xs">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <span>Cara Pembayaran Menggunakan QRIS:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
              <li>
                Buka aplikasi <strong>m-Banking</strong> (BCA Mobile, Livin Mandiri, BRImo, BNI Mobile, dll.) atau <strong>e-Wallet</strong> (GoPay, OVO, DANA, ShopeePay, LinkAja).
              </li>
              <li>
                Pilih menu <strong>Scan QR / QRIS</strong> di aplikasi Anda.
              </li>
              <li>
                Arahkan kamera ke kode QR di atas, atau pilih dari <em>Galeri Foto</em> jika Anda mengunduh QRIS ini.
              </li>
              <li>
                Pastikan nama tujuan yang muncul adalah <strong>PAGUYUBAN GRIYA ANDARA</strong>.
              </li>
              <li>
                Masukkan nominal iuran sesuai tagihan rumah Anda dan konfirmasi pembayaran.
              </li>
              <li>
                Simpan screenshot bukti transfer, kemudian laporkan melalui tombol <strong>Lapor Bukti Bayar</strong> agar segera diverifikasi oleh bendahara dan diterbitkan kuitansi resmi.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">Satu QRIS untuk semua aplikasi perbankan & e-wallet</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-medium text-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
