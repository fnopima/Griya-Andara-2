export interface Resident {
  id: string;
  houseNumber: string; // e.g. "Blok A1 No. 05"
  headOfFamily: string; // e.g. "Bpk. Hendra Wijaya"
  phone: string; // e.g. "081234567890"
  residentType: 'tetap' | 'kontrak';
  occupancyStatus: 'dihuni' | 'kosong';
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'tunai' | 'transfer';
export type PaymentStatus = 'lunas' | 'pending' | 'ditolak';

export interface Payment {
  id: string;
  residentId: string;
  houseNumber: string;
  headOfFamily: string;
  periodMonth: string; // Format: "YYYY-MM", e.g. "2026-09"
  amount: number;
  feeType: string; // e.g. "Iuran Wajib Bulanan (Keamanan & Kebersihan)"
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string; // ISO date or "YYYY-MM-DD"
  recordedBy: string; // e.g. "Admin RT" or "Warga (Konfirmasi Mandiri)"
  receiptNo: string;
  notes?: string;
  transferProofUrl?: string; // Data URL or note
  verifiedAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'Gaji Satpam' | 'Petugas Kebersihan' | 'Listrik & Air Fasum' | 'Perbaikan Fasilitas' | 'Kegiatan Warga' | 'Lainnya';
  amount: number;
  date: string; // YYYY-MM-DD
  recipient: string;
  recordedBy: string;
  notes?: string;
}

export type OtherIncomeCategory =
  | 'Donasi / Sumbangan'
  | 'Sewa Fasilitas'
  | 'Bantuan / CSR'
  | 'Bank Sampah'
  | 'Bazar & Sponsorship'
  | 'Kas Parkir'
  | 'Bunga Bank'
  | 'Lainnya';

export interface OtherIncome {
  id: string;
  title: string; // e.g. "Sumbangan Sukarela Pembangunan Musholla", "Sewa Balai RW"
  category: OtherIncomeCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  payerName: string; // Sumber dana / nama pemberi / penyewa
  paymentMethod: PaymentMethod;
  recordedBy: string;
  receiptNo: string;
  notes?: string;
  createdAt?: string;
}

export interface AppSettings {
  complexName: string; // e.g. "Komplek Taman Asri Indah"
  rtRw: string; // e.g. "RT 03 / RW 07"
  subDistrict: string; // e.g. "Kelurahan Sukamaju"
  defaultMonthlyFee: number; // e.g. 100000
  adminPin: string; // e.g. "1234"
  wargaPassword?: string; // e.g. "andara" (default: "andara")
  treasurerName: string; // e.g. "Bpk. Budi Santoso (Bendahara)"
  treasurerPhone: string;
  bankName: string; // e.g. "BCA"
  bankAccount: string; // e.g. "123-456-7890"
  bankHolder: string; // e.g. "Kas RT 03 Taman Asri"
  announcement: string;
  storageProvider?: 'sheets' | 'firestore';
  googleSheetsUrl?: string; // Web App URL (https://script.google.com/macros/s/.../exec)
  googleSheetSpreadsheetUrl?: string; // Direct link to Google Spreadsheet for easy access
}

export type ActiveTab = 'dashboard' | 'payments' | 'other_incomes' | 'matrix' | 'residents' | 'expenses' | 'settings';
export type UserRole = 'admin' | 'warga';

export interface DatabaseInfo {
  mode: 'firestore' | 'sheets' | 'local';
  isOnline: boolean;
  firestoreConfigured: boolean;
  sheetsConfigured?: boolean;
  sheetUrl?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  isQuotaExceeded?: boolean;
  consoleUrl?: string;
}

