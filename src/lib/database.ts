import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, testFirebaseConnection, firestoreConsoleUrl } from './firebase';
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

// Error handling per Firebase Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Storage cache keys for offline and quota resilience
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

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  const isQuota =
    message.toLowerCase().includes('quota') ||
    code === 'resource-exhausted';
  const isPermission =
    message.toLowerCase().includes('permission') ||
    code === 'permission-denied';

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (isQuota) {
    currentDbInfo.isOnline = false;
    currentDbInfo.isQuotaExceeded = true;
    currentDbInfo.consoleUrl = firestoreConsoleUrl;
    currentDbInfo.errorMessage = `Batas kuota harian gratis Cloud Firestore (Free daily read units) telah tercapai untuk database proyek ini. Data saat ini dimuat dari cache lokal browser. Kuota akan otomatis di-reset besok (setiap hari pukul 14:00 WIB / 00:00 PST) atau tingkatkan ke paket Blaze di Firebase Console: ${firestoreConsoleUrl}`;
    notifyDbInfo();
    console.warn('Firestore Quota Exceeded. Console Link:', firestoreConsoleUrl);
  } else if (isPermission) {
    currentDbInfo.isOnline = false;
    currentDbInfo.errorMessage = `Akses Cloud Firestore terbatas atau kuota baca harian habis. Data dimuat dari cache lokal browser.`;
    notifyDbInfo();
    console.warn('Firestore Permission notice:', message, 'Path:', path);
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }

  return errInfo;
}

// In-Memory state caches (Initialized from localStorage cache for instant rendering and offline resilience)
let currentSettings: AppSettings = loadFromStorage(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
let currentResidents: Resident[] = loadFromStorage(CACHE_KEYS.RESIDENTS, []);
let currentPayments: Payment[] = loadFromStorage(CACHE_KEYS.PAYMENTS, []);
let currentExpenses: Expense[] = loadFromStorage(CACHE_KEYS.EXPENSES, []);
let currentOtherIncomes: OtherIncome[] = loadFromStorage(CACHE_KEYS.OTHER_INCOMES, []);

const isSheetsPreferred =
  currentSettings.storageProvider === 'sheets' && Boolean(currentSettings.googleSheetsUrl);

let currentDbInfo: DatabaseInfo = {
  mode: isSheetsPreferred ? 'sheets' : 'firestore',
  isOnline: true,
  firestoreConfigured: true,
  sheetsConfigured: Boolean(currentSettings.googleSheetsUrl),
  sheetUrl: currentSettings.googleSheetSpreadsheetUrl,
  lastSyncedAt: loadFromStorage(CACHE_KEYS.LAST_SYNC, new Date().toLocaleTimeString('id-ID')),
  consoleUrl: firestoreConsoleUrl,
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

// Initialize Database system: Cloud Firestore Real-time + Browser Cache Resilience
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

  // If user selected Google Sheets as the storage provider, DO NOT start Firestore listeners
  if (currentSettings.storageProvider === 'sheets') {
    currentDbInfo.mode = 'sheets';
    currentDbInfo.sheetsConfigured = Boolean(currentSettings.googleSheetsUrl);
    currentDbInfo.isOnline = true;
    currentDbInfo.sheetUrl = currentSettings.googleSheetSpreadsheetUrl;
    notifyDbInfo();

    if (currentSettings.googleSheetsUrl) {
      loadFromGoogleSheets(currentSettings.googleSheetsUrl).catch((err) => {
        console.warn('Initial Google Sheets fetch notice:', err);
      });
    }
    return;
  }

  // Test Cloud Firestore connection before attaching listeners
  try {
    const conn = await testFirebaseConnection();
    if (!conn.connected) {
      currentDbInfo.isOnline = false;
      if (conn.isQuota) {
        currentDbInfo.isQuotaExceeded = true;
        currentDbInfo.consoleUrl = firestoreConsoleUrl;
      }
      currentDbInfo.errorMessage = conn.error;
      notifyDbInfo();

      // If Google Sheets is configured, load fresh data from Google Sheets in background
      if (currentSettings.googleSheetsUrl) {
        currentDbInfo.mode = 'sheets';
        currentDbInfo.sheetsConfigured = true;
        currentDbInfo.sheetUrl = currentSettings.googleSheetSpreadsheetUrl;
        loadFromGoogleSheets(currentSettings.googleSheetsUrl).catch((err) => {
          console.warn('Initial Google Sheets fetch notice:', err);
        });
      }

      console.warn('Firestore is currently unavailable or over quota; running in cache/sheets mode and skipping onSnapshot listeners.');
      return;
    }
  } catch (err) {
    console.warn('testFirebaseConnection caught error:', err);
    return;
  }

  // Attach Firestore real-time onSnapshot listeners
  // 1. Settings listener
  try {
    onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const rawData = snap.data() as AppSettings;
          currentSettings = {
            ...DEFAULT_SETTINGS,
            ...rawData,
            wargaPassword: rawData.wargaPassword || DEFAULT_SETTINGS.wargaPassword || 'andara',
          };
          saveToStorage(CACHE_KEYS.SETTINGS, currentSettings);
          notifySettings();
        } else {
          setDoc(doc(db, 'settings', 'general'), DEFAULT_SETTINGS).catch((e) =>
            handleFirestoreError(e, OperationType.WRITE, 'settings/general')
          );
        }
        currentDbInfo.isOnline = true;
        currentDbInfo.isQuotaExceeded = false;
        currentDbInfo.errorMessage = undefined;
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/general');
  }

  // 2. Residents listener
  try {
    onSnapshot(
      collection(db, 'residents'),
      (snap) => {
        const list: Resident[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Resident);
        });

        list.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
        currentResidents = list;
        saveToStorage(CACHE_KEYS.RESIDENTS, list);
        notifyResidents();

        currentDbInfo.isOnline = true;
        currentDbInfo.isQuotaExceeded = false;
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'residents');
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'residents');
  }

  // 3. Payments listener
  try {
    onSnapshot(
      collection(db, 'payments'),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Payment);
        });

        list.sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());
        currentPayments = list;
        saveToStorage(CACHE_KEYS.PAYMENTS, list);
        notifyPayments();

        currentDbInfo.isOnline = true;
        currentDbInfo.isQuotaExceeded = false;
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'payments');
  }

  // 4. Expenses listener
  try {
    onSnapshot(
      collection(db, 'expenses'),
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Expense);
        });

        list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        currentExpenses = list;
        saveToStorage(CACHE_KEYS.EXPENSES, list);
        notifyExpenses();

        currentDbInfo.isOnline = true;
        currentDbInfo.isQuotaExceeded = false;
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'expenses');
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'expenses');
  }

  // 5. OtherIncomes listener
  try {
    onSnapshot(
      collection(db, 'otherIncomes'),
      (snap) => {
        const list: OtherIncome[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as OtherIncome);
        });

        list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        currentOtherIncomes = list;
        saveToStorage(CACHE_KEYS.OTHER_INCOMES, list);
        notifyOtherIncomes();

        currentDbInfo.isOnline = true;
        currentDbInfo.isQuotaExceeded = false;
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        saveToStorage(CACHE_KEYS.LAST_SYNC, currentDbInfo.lastSyncedAt);
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'otherIncomes');
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'otherIncomes');
  }
}


// -------------------------------------------------------------
// SUBSCRIPTIONS
// -------------------------------------------------------------
export function subscribeSettings(cb: Listener<AppSettings>): () => void {
  settingsListeners.add(cb);
  cb({ ...currentSettings });
  return () => settingsListeners.delete(cb);
}

export function subscribeResidents(cb: Listener<Resident[]>): () => void {
  residentsListeners.add(cb);
  cb([...currentResidents]);
  return () => residentsListeners.delete(cb);
}

export function subscribePayments(cb: Listener<Payment[]>): () => void {
  paymentsListeners.add(cb);
  cb([...currentPayments]);
  return () => paymentsListeners.delete(cb);
}

export function subscribeExpenses(cb: Listener<Expense[]>): () => void {
  expensesListeners.add(cb);
  cb([...currentExpenses]);
  return () => expensesListeners.delete(cb);
}

export function subscribeOtherIncomes(cb: Listener<OtherIncome[]>): () => void {
  otherIncomesListeners.add(cb);
  cb([...currentOtherIncomes]);
  return () => otherIncomesListeners.delete(cb);
}

export function subscribeDbInfo(cb: Listener<DatabaseInfo>): () => void {
  dbInfoListeners.add(cb);
  cb({ ...currentDbInfo });
  return () => dbInfoListeners.delete(cb);
}

export function getDatabaseInfo(): DatabaseInfo {
  return { ...currentDbInfo };
}

// -------------------------------------------------------------
// CRUD OPERATIONS (Direct to Cloud Firestore, Realtime Sync)
// -------------------------------------------------------------

// Settings
export async function updateAppSettings(newSettings: AppSettings): Promise<void> {
  currentSettings = newSettings;
  saveToStorage(CACHE_KEYS.SETTINGS, newSettings);
  notifySettings();

  if (newSettings.googleSheetsUrl) {
    currentDbInfo.sheetsConfigured = true;
    currentDbInfo.sheetUrl = newSettings.googleSheetSpreadsheetUrl;
    if (newSettings.storageProvider === 'sheets') {
      currentDbInfo.mode = 'sheets';
    }
    notifyDbInfo();
    // Send to Google Sheets
    sendToGoogleSheets(newSettings.googleSheetsUrl, 'updateSettings', newSettings).catch((err) => {
      console.warn('Sync settings to Google Sheets notice:', err);
    });
  }

  try {
    await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });
  } catch (err) {
    if (newSettings.storageProvider !== 'sheets') {
      handleFirestoreError(err, OperationType.WRITE, 'settings/general');
      throw err;
    }
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

  try {
    await setDoc(doc(db, 'residents', newId), fullResident);
    return newId;
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return newId;
    }
    handleFirestoreError(err, OperationType.CREATE, `residents/${newId}`);
    throw err;
  }
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

  try {
    await updateDoc(doc(db, 'residents', id), data);
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, `residents/${id}`);
    throw err;
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

  try {
    await deleteDoc(doc(db, 'residents', id));
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `residents/${id}`);
    throw err;
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

  try {
    await setDoc(doc(db, 'payments', newId), fullPayment);
    return newId;
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return newId;
    }
    handleFirestoreError(err, OperationType.CREATE, `payments/${newId}`);
    throw err;
  }
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

  try {
    await updateDoc(doc(db, 'payments', id), data);
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, `payments/${id}`);
    throw err;
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

  try {
    await deleteDoc(doc(db, 'payments', id));
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
    throw err;
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

  try {
    await setDoc(doc(db, 'expenses', newId), fullExpense);
    return newId;
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return newId;
    }
    handleFirestoreError(err, OperationType.CREATE, `expenses/${newId}`);
    throw err;
  }
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

  try {
    await updateDoc(doc(db, 'expenses', id), data);
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
    throw err;
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

  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    throw err;
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

  try {
    await setDoc(doc(db, 'otherIncomes', newId), fullIncome);
    return newId;
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return newId;
    }
    handleFirestoreError(err, OperationType.CREATE, `otherIncomes/${newId}`);
    throw err;
  }
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

  try {
    await updateDoc(doc(db, 'otherIncomes', id), data);
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, `otherIncomes/${id}`);
    throw err;
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

  try {
    await deleteDoc(doc(db, 'otherIncomes', id));
  } catch (err) {
    if (currentSettings.storageProvider === 'sheets') {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `otherIncomes/${id}`);
    throw err;
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
  if (!targetUrl) {
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
    message: `Berhasil migrasi ${currentResidents.length} data warga, ${currentPayments.length} catatan iuran, dan ${currentExpenses.length} pengeluaran ke Google Sheets!`,
  };
}

export async function loadFromGoogleSheets(url?: string): Promise<{ success: boolean; count: number }> {
  const targetUrl = url || currentSettings.googleSheetsUrl;
  if (!targetUrl) {
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
// PURGE DUMMY DATA / RESET DATABASE (Direct Cloud Operation)
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
  let residentsRemoved = 0;
  let paymentsRemoved = 0;
  let expensesRemoved = 0;

  try {
    const resSnap = await getDocs(collection(db, 'residents'));
    for (const d of resSnap.docs) {
      const r = { id: d.id, ...d.data() } as Resident;
      if (isDummyResident(r)) {
        await deleteDoc(doc(db, 'residents', d.id));
        residentsRemoved++;
      }
    }

    const paySnap = await getDocs(collection(db, 'payments'));
    for (const d of paySnap.docs) {
      const p = { id: d.id, ...d.data() } as Payment;
      if (isDummyPayment(p)) {
        await deleteDoc(doc(db, 'payments', d.id));
        paymentsRemoved++;
      }
    }

    const expSnap = await getDocs(collection(db, 'expenses'));
    for (const d of expSnap.docs) {
      const e = { id: d.id, ...d.data() } as Expense;
      if (isDummyExpense(e)) {
        await deleteDoc(doc(db, 'expenses', d.id));
        expensesRemoved++;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'cleanup');
  }

  return { residentsRemoved, paymentsRemoved, expensesRemoved };
}

export async function resetAllDataToEmpty(): Promise<void> {
  try {
    const [resSnap, paySnap, expSnap, incSnap] = await Promise.all([
      getDocs(collection(db, 'residents')),
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'expenses')),
      getDocs(collection(db, 'otherIncomes')),
    ]);

    const batch = writeBatch(db);
    resSnap.forEach((d) => batch.delete(doc(db, 'residents', d.id)));
    paySnap.forEach((d) => batch.delete(doc(db, 'payments', d.id)));
    expSnap.forEach((d) => batch.delete(doc(db, 'expenses', d.id)));
    incSnap.forEach((d) => batch.delete(doc(db, 'otherIncomes', d.id)));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'resetAll');
    throw err;
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

    // Write settings
    await setDoc(doc(db, 'settings', 'general'), parsed.settings, { merge: true });

    // Write residents
    for (const res of parsed.residents || []) {
      if (!isDummyResident(res)) {
        await setDoc(doc(db, 'residents', res.id), res);
      }
    }

    // Write payments
    for (const pay of parsed.payments || []) {
      if (!isDummyPayment(pay)) {
        await setDoc(doc(db, 'payments', pay.id), pay);
      }
    }

    // Write expenses
    for (const exp of parsed.expenses || []) {
      if (!isDummyExpense(exp)) {
        await setDoc(doc(db, 'expenses', exp.id), exp);
      }
    }

    // Write otherIncomes
    for (const inc of parsed.otherIncomes || []) {
      await setDoc(doc(db, 'otherIncomes', inc.id), inc);
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'import');
    throw err;
  }
}
