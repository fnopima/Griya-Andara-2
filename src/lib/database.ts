import { DEFAULT_SETTINGS } from './initialData';
import {
  fetchAllFromGoogleSheets,
  sendToGoogleSheets,
  testGoogleSheetsConnection,
} from './googleSheets';
import type {
  Resident,
  Payment,
  Expense,
  OtherIncome,
  AppSettings,
  DatabaseInfo,
} from '../types';

// Storage cache keys for instant responsiveness and offline persistence
const STORAGE_PREFIX = 'iuran_andara_';
const CACHE_KEYS = {
  SETTINGS: `${STORAGE_PREFIX}settings`,
  RESIDENTS: `${STORAGE_PREFIX}residents`,
  PAYMENTS: `${STORAGE_PREFIX}payments`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
  OTHER_INCOMES: `${STORAGE_PREFIX}other_incomes`,
  LAST_SYNC: `${STORAGE_PREFIX}last_sync`,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Failed to read ${key} from storage:`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage:`, e);
  }
}

// In-Memory state caches (Initialized from localStorage cache for instant zero-wait startup)
let currentSettings: AppSettings = loadFromStorage(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
let currentResidents: Resident[] = loadFromStorage(CACHE_KEYS.RESIDENTS, []);
let currentPayments: Payment[] = loadFromStorage(CACHE_KEYS.PAYMENTS, []);
let currentExpenses: Expense[] = loadFromStorage(CACHE_KEYS.EXPENSES, []);
let currentOtherIncomes: OtherIncome[] = loadFromStorage(CACHE_KEYS.OTHER_INCOMES, []);

const hasSheetsUrl = Boolean(currentSettings.googleSheetsUrl && currentSettings.googleSheetsUrl.trim());

let currentDbInfo: DatabaseInfo = {
  mode: hasSheetsUrl ? 'sheets' : 'local',
  isOnline: true,
  sheetsConfigured: hasSheetsUrl,
  sheetUrl: currentSettings.googleSheetSpreadsheetUrl,
  lastSyncedAt: loadFromStorage(CACHE_KEYS.LAST_SYNC, new Date().toLocaleTimeString('id-ID')),
  firestoreConfigured: false,
};

// Listeners for UI components
type Listener<T> = (data: T) => void;
const settingsListeners: Set<Listener<AppSettings>> = new Set();
const residentsListeners: Set<Listener<Resident[]>> = new Set();
const paymentsListeners: Set<Listener<Payment[]>> = new Set();
const expensesListeners: Set<Listener<Expense[]>> = new Set();
const otherIncomesListeners: Set<Listener<OtherIncome[]>> = new Set();
const dbInfoListeners: Set<Listener<DatabaseInfo>> = new Set();

function notifyDbInfo() {
  dbInfoListeners.forEach((cb) => cb({ ...currentDbInfo }));
}

function notifySettings() {
  settingsListeners.forEach((cb) => cb({ ...currentSettings }));
}

function notifyResidents() {
  residentsListeners.forEach((cb) => cb([...currentResidents]));
}

function notifyPayments() {
  paymentsListeners.forEach((cb) => cb([...currentPayments]));
}

function notifyExpenses() {
  expensesListeners.forEach((cb) => cb([...currentExpenses]));
}

function notifyOtherIncomes() {
  otherIncomesListeners.forEach((cb) => cb([...currentOtherIncomes]));
}

// Initialize Database system: Google Sheets as primary cloud storage + Browser Cache
let isInitialized = false;
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  // Immediately notify listeners with cached data for instant zero-wait startup
  notifySettings();
  notifyResidents();
  notifyPayments();
  notifyExpenses();
  notifyOtherIncomes();
  notifyDbInfo();

  // If user has configured Google Sheets Web App, fetch fresh data from Google Sheets in the background
  if (currentSettings.googleSheetsUrl && currentSettings.googleSheetsUrl.trim()) {
    currentDbInfo.mode = 'sheets';
    currentDbInfo.sheetsConfigured = true;
    currentDbInfo.sheetUrl = currentSettings.googleSheetSpreadsheetUrl;
    notifyDbInfo();

    loadFromGoogleSheets(currentSettings.googleSheetsUrl).catch((err) => {
      console.warn('Initial Google Sheets fetch notice:', err);
    });
  } else {
    currentDbInfo.mode = 'local';
    currentDbInfo.sheetsConfigured = false;
    notifyDbInfo();
  }
}

// Subscriptions
export function subscribeSettings(callback: (settings: AppSettings) => void): () => void {
  settingsListeners.add(callback);
  callback({ ...currentSettings });
  return () => settingsListeners.delete(callback);
}

export function subscribeResidents(callback: (residents: Resident[]) => void): () => void {
  residentsListeners.add(callback);
  callback([...currentResidents]);
  return () => residentsListeners.delete(callback);
}

export function subscribePayments(callback: (payments: Payment[]) => void): () => void {
  paymentsListeners.add(callback);
  callback([...currentPayments]);
  return () => paymentsListeners.delete(callback);
}

export function subscribeExpenses(callback: (expenses: Expense[]) => void): () => void {
  expensesListeners.add(callback);
  callback([...currentExpenses]);
  return () => expensesListeners.delete(callback);
}

export function subscribeOtherIncomes(callback: (otherIncomes: OtherIncome[]) => void): () => void {
  otherIncomesListeners.add(callback);
  callback([...currentOtherIncomes]);
  return () => otherIncomesListeners.delete(callback);
}

export function subscribeDbInfo(callback: (info: DatabaseInfo) => void): () => void {
  dbInfoListeners.add(callback);
  callback({ ...currentDbInfo });
  return () => dbInfoListeners.delete(callback);
}

export function getDatabaseInfo(): DatabaseInfo {
  return { ...currentDbInfo };
}

// -------------------------------------------------------------
// CRUD OPERATIONS (Saved to Local Cache & Synced to Google Sheets)
// -------------------------------------------------------------

// Settings
export async function updateAppSettings(newSettings: AppSettings): Promise<void> {
  currentSettings = newSettings;
  saveToStorage(CACHE_KEYS.SETTINGS, newSettings);
  notifySettings();

  const hasSheets = Boolean(newSettings.googleSheetsUrl && newSettings.googleSheetsUrl.trim());
  currentDbInfo.sheetsConfigured = hasSheets;
  currentDbInfo.mode = hasSheets ? 'sheets' : 'local';
  currentDbInfo.sheetUrl = newSettings.googleSheetSpreadsheetUrl;
  currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
  saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
  notifyDbInfo();

  if (hasSheets && newSettings.googleSheetsUrl) {
    sendToGoogleSheets(newSettings.googleSheetsUrl, 'updateSettings', newSettings).catch((err) => {
      console.warn('Sync settings to Google Sheets notice:', err);
    });
  }
}

// Residents
export async function addResident(data: Omit<Resident, 'id'>): Promise<string> {
  const newId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullResident: Resident = {
    id: newId,
    ...data,
  };

  currentResidents = [fullResident, ...currentResidents].sort((a, b) =>
    a.houseNumber.localeCompare(b.houseNumber)
  );
  saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'addResident', fullResident).catch((err) => {
      console.warn('Sync addResident to Google Sheets notice:', err);
    });
  }

  return newId;
}

export async function updateResident(id: string, data: Partial<Resident>): Promise<void> {
  currentResidents = currentResidents.map((r) => (r.id === id ? { ...r, ...data } : r));
  saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  const updatedResident = currentResidents.find((r) => r.id === id);
  if (currentSettings.googleSheetsUrl && updatedResident) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'updateResident', updatedResident).catch(
      (err) => console.warn('Sync updateResident to Google Sheets notice:', err)
    );
  }
}

export async function deleteResident(id: string): Promise<void> {
  currentResidents = currentResidents.filter((r) => r.id !== id);
  saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'deleteResident', { id }).catch((err) =>
      console.warn('Sync deleteResident to Google Sheets notice:', err)
    );
  }
}

// Payments
export async function addPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const newId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullPayment: Payment = {
    id: newId,
    ...data,
  };

  currentPayments = [fullPayment, ...currentPayments];
  saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'addPayment', fullPayment).catch((err) =>
      console.warn('Sync addPayment to Google Sheets notice:', err)
    );
  }

  return newId;
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  currentPayments = currentPayments.map((p) => (p.id === id ? { ...p, ...data } : p));
  saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  const updatedPayment = currentPayments.find((p) => p.id === id);
  if (currentSettings.googleSheetsUrl && updatedPayment) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'updatePayment', updatedPayment).catch(
      (err) => console.warn('Sync updatePayment to Google Sheets notice:', err)
    );
  }
}

export async function deletePayment(id: string): Promise<void> {
  currentPayments = currentPayments.filter((p) => p.id !== id);
  saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'deletePayment', { id }).catch((err) =>
      console.warn('Sync deletePayment to Google Sheets notice:', err)
    );
  }
}

// Expenses
export async function addExpense(data: Omit<Expense, 'id'>): Promise<string> {
  const newId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullExpense: Expense = {
    id: newId,
    ...data,
  };

  currentExpenses = [fullExpense, ...currentExpenses];
  saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'addExpense', fullExpense).catch((err) =>
      console.warn('Sync addExpense to Google Sheets notice:', err)
    );
  }

  return newId;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  currentExpenses = currentExpenses.map((e) => (e.id === id ? { ...e, ...data } : e));
  saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  const updatedExpense = currentExpenses.find((e) => e.id === id);
  if (currentSettings.googleSheetsUrl && updatedExpense) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'updateExpense', updatedExpense).catch(
      (err) => console.warn('Sync updateExpense to Google Sheets notice:', err)
    );
  }
}

export async function deleteExpense(id: string): Promise<void> {
  currentExpenses = currentExpenses.filter((e) => e.id !== id);
  saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'deleteExpense', { id }).catch((err) =>
      console.warn('Sync deleteExpense to Google Sheets notice:', err)
    );
  }
}

// Other Incomes (Pendapatan di Luar Iuran Warga)
export async function addOtherIncome(data: Omit<OtherIncome, 'id'>): Promise<string> {
  const newId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullIncome: OtherIncome = {
    id: newId,
    createdAt: new Date().toISOString(),
    ...data,
  };

  currentOtherIncomes = [fullIncome, ...currentOtherIncomes];
  saveToStorage(CACHE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'addOtherIncome', fullIncome).catch((err) =>
      console.warn('Sync addOtherIncome to Google Sheets notice:', err)
    );
  }

  return newId;
}

export async function updateOtherIncome(id: string, data: Partial<OtherIncome>): Promise<void> {
  currentOtherIncomes = currentOtherIncomes.map((i) => (i.id === id ? { ...i, ...data } : i));
  saveToStorage(CACHE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  const updatedIncome = currentOtherIncomes.find((i) => i.id === id);
  if (currentSettings.googleSheetsUrl && updatedIncome) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'updateOtherIncome', updatedIncome).catch(
      (err) => console.warn('Sync updateOtherIncome to Google Sheets notice:', err)
    );
  }
}

export async function deleteOtherIncome(id: string): Promise<void> {
  currentOtherIncomes = currentOtherIncomes.filter((i) => i.id !== id);
  saveToStorage(CACHE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  if (currentSettings.googleSheetsUrl) {
    sendToGoogleSheets(currentSettings.googleSheetsUrl, 'deleteOtherIncome', { id }).catch((err) =>
      console.warn('Sync deleteOtherIncome to Google Sheets notice:', err)
    );
  }
}

// -------------------------------------------------------------
// GOOGLE SHEETS SYNC & MIGRATION CONTROLLERS
// -------------------------------------------------------------

export async function testGoogleSheets(url: string): Promise<{ success: boolean; message: string }> {
  return await testGoogleSheetsConnection(url);
}

export async function migrateAllToGoogleSheets(url?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url || currentSettings.googleSheetsUrl;
  if (!targetUrl || !targetUrl.trim()) {
    throw new Error('URL Web App Google Sheets belum diisi.');
  }

  const res = await sendToGoogleSheets(targetUrl, 'syncAll', {
    settings: currentSettings,
    residents: currentResidents,
    payments: currentPayments,
    expenses: currentExpenses,
    otherIncomes: currentOtherIncomes,
  });

  if (!res.success) {
    throw new Error(res.error || 'Gagal menyinkronkan data ke Google Sheets.');
  }

  currentDbInfo.mode = 'sheets';
  currentDbInfo.sheetsConfigured = true;
  currentDbInfo.isOnline = true;
  currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
  saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
  notifyDbInfo();

  return {
    success: true,
    message: `Berhasil menyimpan ${currentResidents.length} data warga, ${currentPayments.length} catatan iuran, dan ${currentExpenses.length} pengeluaran ke Google Sheets!`,
  };
}

export async function loadFromGoogleSheets(url?: string): Promise<{ success: boolean; count: number }> {
  const targetUrl = url || currentSettings.googleSheetsUrl;
  if (!targetUrl || !targetUrl.trim()) {
    throw new Error('URL Web App Google Sheets belum diisi.');
  }

  const res = await fetchAllFromGoogleSheets(targetUrl);
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Gagal memuat data dari Google Sheets.');
  }

  if (res.data.settings && Object.keys(res.data.settings).length > 0) {
    currentSettings = { ...currentSettings, ...res.data.settings };
    saveToStorage(CACHE_KEYS.SETTINGS, currentSettings);
    notifySettings();
  }
  if (Array.isArray(res.data.residents)) {
    currentResidents = res.data.residents.sort((a, b) =>
      a.houseNumber.localeCompare(b.houseNumber)
    );
    saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
    notifyResidents();
  }
  if (Array.isArray(res.data.payments)) {
    currentPayments = res.data.payments.sort(
      (a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
    );
    saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
    notifyPayments();
  }
  if (Array.isArray(res.data.expenses)) {
    currentExpenses = res.data.expenses.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
    saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);
    notifyExpenses();
  }
  if (Array.isArray(res.data.otherIncomes)) {
    currentOtherIncomes = res.data.otherIncomes.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
    saveToStorage(CACHE_KEYS.OTHER_INCOMES, currentOtherIncomes);
    notifyOtherIncomes();
  }

  currentDbInfo.mode = 'sheets';
  currentDbInfo.sheetsConfigured = true;
  currentDbInfo.isOnline = true;
  currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
  saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
  notifyDbInfo();

  return {
    success: true,
    count: (res.data.residents?.length || 0) + (res.data.payments?.length || 0),
  };
}

// -------------------------------------------------------------
// PURGE DUMMY DATA / RESET DATABASE
// -------------------------------------------------------------

const DUMMY_HEADS = new Set([
  'Bpk. Hendra Gunawan',
  'Ibu Ratna Sari',
  'Bpk. Bambang Pamungkas',
  'Bpk. Dedi Kusnandar',
  'Ibu Siti Nurhaliza',
  'Bpk. Eko Prasetyo',
  'Bpk. Surya Wijaya',
  'Bpk. Agus Santoso',
  'Ibu Maya Anggraini',
  'Bpk. Rian Pratama',
]);

const DUMMY_EXPENSE_TITLES = new Set([
  'Honorarium Petugas Satpam (2 Orang)',
  'Retribusi Angkut Sampah Komplek',
  'Penggantian Bohlam Lampu PJU Blok B',
]);

function isDummyResident(r: Resident): boolean {
  if (r.id.startsWith('res-local-') || r.id.startsWith('res-seed-')) return true;
  if (DUMMY_HEADS.has(r.headOfFamily)) return true;
  return false;
}

function isDummyPayment(p: Payment): boolean {
  if (p.id.startsWith('pay-local-') || p.id.startsWith('pay-seed-')) return true;
  if (p.residentId.startsWith('res-local-') || p.residentId.startsWith('res-seed-')) return true;
  if (DUMMY_HEADS.has(p.headOfFamily)) return true;
  if (p.receiptNo.startsWith('KWT-202609-100') || p.receiptNo.startsWith('KWT-202608-090')) return true;
  return false;
}

function isDummyExpense(e: Expense): boolean {
  if (e.id.startsWith('exp-local-') || e.id.startsWith('exp-seed-')) return true;
  if (DUMMY_EXPENSE_TITLES.has(e.title)) return true;
  return false;
}

export async function clearAllDummyData(): Promise<{ residentsRemoved: number; paymentsRemoved: number; expensesRemoved: number }> {
  const prevResCount = currentResidents.length;
  const prevPayCount = currentPayments.length;
  const prevExpCount = currentExpenses.length;

  currentResidents = currentResidents.filter((r) => !isDummyResident(r));
  currentPayments = currentPayments.filter((p) => !isDummyPayment(p));
  currentExpenses = currentExpenses.filter((e) => !isDummyExpense(e));

  saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
  saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
  saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);

  notifyResidents();
  notifyPayments();
  notifyExpenses();

  if (currentSettings.googleSheetsUrl) {
    migrateAllToGoogleSheets().catch((err) => {
      console.warn('Sync after clearDummyData to Google Sheets notice:', err);
    });
  }

  return {
    residentsRemoved: prevResCount - currentResidents.length,
    paymentsRemoved: prevPayCount - currentPayments.length,
    expensesRemoved: prevExpCount - currentExpenses.length,
  };
}

export async function resetAllDataToEmpty(): Promise<void> {
  currentResidents = [];
  currentPayments = [];
  currentExpenses = [];
  currentOtherIncomes = [];

  saveToStorage(CACHE_KEYS.RESIDENTS, []);
  saveToStorage(CACHE_KEYS.PAYMENTS, []);
  saveToStorage(CACHE_KEYS.EXPENSES, []);
  saveToStorage(CACHE_KEYS.OTHER_INCOMES, []);

  notifyResidents();
  notifyPayments();
  notifyExpenses();
  notifyOtherIncomes();

  if (currentSettings.googleSheetsUrl) {
    migrateAllToGoogleSheets().catch((err) => {
      console.warn('Sync after resetAllDataToEmpty to Google Sheets notice:', err);
    });
  }
}

// -------------------------------------------------------------
// BACKUP & RESTORE
// -------------------------------------------------------------

export interface DatabaseBackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  residents: Resident[];
  payments: Payment[];
  expenses: Expense[];
  otherIncomes: OtherIncome[];
}

export function exportDatabaseBackup(): string {
  const payload: DatabaseBackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: currentSettings,
    residents: currentResidents,
    payments: currentPayments,
    expenses: currentExpenses,
    otherIncomes: currentOtherIncomes,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString) as DatabaseBackupPayload;
    if (!parsed || !parsed.settings || !Array.isArray(parsed.residents)) {
      throw new Error('Format berkas cadangan database tidak valid.');
    }

    currentSettings = { ...currentSettings, ...parsed.settings };
    currentResidents = (parsed.residents || []).filter((r) => !isDummyResident(r));
    currentPayments = (parsed.payments || []).filter((p) => !isDummyPayment(p));
    currentExpenses = (parsed.expenses || []).filter((e) => !isDummyExpense(e));
    currentOtherIncomes = parsed.otherIncomes || [];

    saveToStorage(CACHE_KEYS.SETTINGS, currentSettings);
    saveToStorage(CACHE_KEYS.RESIDENTS, currentResidents);
    saveToStorage(CACHE_KEYS.PAYMENTS, currentPayments);
    saveToStorage(CACHE_KEYS.EXPENSES, currentExpenses);
    saveToStorage(CACHE_KEYS.OTHER_INCOMES, currentOtherIncomes);

    notifySettings();
    notifyResidents();
    notifyPayments();
    notifyExpenses();
    notifyOtherIncomes();

    if (currentSettings.googleSheetsUrl) {
      migrateAllToGoogleSheets().catch((err) => {
        console.warn('Sync after importDatabaseBackup to Google Sheets notice:', err);
      });
    }

    return true;
  } catch (err) {
    console.error('Error importing backup:', err);
    throw err;
  }
}
