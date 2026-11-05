import type {
  Resident,
  Payment,
  Expense,
  OtherIncome,
  AppSettings,
} from '../types';

export interface GoogleSheetsSyncPayload {
  action:
    | 'ping'
    | 'syncAll'
    | 'getAll'
    | 'addResident'
    | 'updateResident'
    | 'deleteResident'
    | 'addPayment'
    | 'updatePayment'
    | 'deletePayment'
    | 'addExpense'
    | 'updateExpense'
    | 'deleteExpense'
    | 'addOtherIncome'
    | 'updateOtherIncome'
    | 'deleteOtherIncome'
    | 'updateSettings';
  payload?: any;
}

export interface GoogleSheetsResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

// Complete, ready-to-deploy Google Apps Script Code
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ====================================================================
 * SCRIPT DATABASE GOOGLE APPS SCRIPT - PAGUYUBAN GRIYA ANDARA
 * ====================================================================
 * Panduan Pemasangan:
 * 1. Buat Google Sheet baru di https://sheets.new
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'
 * 3. Hapus semua kode yang ada di 'Code.gs', lalu tempel seluruh kode ini
 * 4. Klik 'Simpan' (ikon disket / Ctrl+S)
 * 5. Klik tombol 'Terapkan' (Deploy) -> 'Deployment baru' (New deployment)
 * 6. Pilih jenis: 'Aplikasi Web' (Web app)
 * 7. Deskripsi: Database Paguyuban
 *    Jalankan sebagai (Execute as): Saya (Me / email Anda)
 *    Siapa yang memiliki akses (Who has access): Siapa saja (Anyone) -> PENTING!
 * 8. Klik 'Terapkan', izinkan akses jika diminta.
 * 9. Salin URL Aplikasi Web (berakhiran /exec) dan tempelkan ke aplikasi!
 */

function doGet(e) {
  try {
    var data = getAllDataFromSheets();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    var action = requestData.action || 'ping';
    var payload = requestData.payload || {};

    if (action === 'ping') {
      return jsonResponse({ status: 'success', message: 'Koneksi ke Google Sheets berhasil!' });
    }

    if (action === 'getAll') {
      var data = getAllDataFromSheets();
      return jsonResponse({ status: 'success', data: data });
    }

    if (action === 'syncAll') {
      syncAllDataToSheets(payload);
      return jsonResponse({ status: 'success', message: 'Semua data berhasil disinkronkan ke Google Sheets.' });
    }

    if (action === 'addResident') {
      appendRowToSheet('Warga', residentToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'updateResident') {
      updateRowById('Warga', payload.id, residentToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'deleteResident') {
      deleteRowById('Warga', payload.id);
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'addPayment') {
      appendRowToSheet('Pembayaran', paymentToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'updatePayment') {
      updateRowById('Pembayaran', payload.id, paymentToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'deletePayment') {
      deleteRowById('Pembayaran', payload.id);
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'addExpense') {
      appendRowToSheet('Pengeluaran', expenseToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'updateExpense') {
      updateRowById('Pengeluaran', payload.id, expenseToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'deleteExpense') {
      deleteRowById('Pengeluaran', payload.id);
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'addOtherIncome') {
      appendRowToSheet('Pendapatan_Lain', otherIncomeToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'updateOtherIncome') {
      updateRowById('Pendapatan_Lain', payload.id, otherIncomeToRow(payload));
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'deleteOtherIncome') {
      deleteRowById('Pendapatan_Lain', payload.id);
      return jsonResponse({ status: 'success', id: payload.id });
    }

    if (action === 'updateSettings') {
      saveSettingsToSheet(payload);
      return jsonResponse({ status: 'success' });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// HELPER SHEETS OPERATIONS
// -------------------------------------------------------------

function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e2ece3');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function getAllDataFromSheets() {
  var settings = readSettingsFromSheet();
  var residents = readSheetObjects('Warga', rowToResident);
  var payments = readSheetObjects('Pembayaran', rowToPayment);
  var expenses = readSheetObjects('Pengeluaran', rowToExpense);
  var otherIncomes = readSheetObjects('Pendapatan_Lain', rowToOtherIncome);

  return {
    settings: settings,
    residents: residents,
    payments: payments,
    expenses: expenses,
    otherIncomes: otherIncomes
  };
}

function syncAllDataToSheets(data) {
  if (data.settings) saveSettingsToSheet(data.settings);
  if (data.residents) overwriteSheetData('Warga', getResidentHeaders(), data.residents.map(residentToRow));
  if (data.payments) overwriteSheetData('Pembayaran', getPaymentHeaders(), data.payments.map(paymentToRow));
  if (data.expenses) overwriteSheetData('Pengeluaran', getExpenseHeaders(), data.expenses.map(expenseToRow));
  if (data.otherIncomes) overwriteSheetData('Pendapatan_Lain', getOtherIncomeHeaders(), data.otherIncomes.map(otherIncomeToRow));
}

function overwriteSheetData(sheetName, headers, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e2ece3');
  sheet.setFrozenRows(1);

  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function appendRowToSheet(sheetName, rowValues) {
  var sheet = getOrCreateSheet(sheetName, getDefaultHeaders(sheetName));
  sheet.appendRow(rowValues);
}

function updateRowById(sheetName, id, rowValues) {
  var sheet = getOrCreateSheet(sheetName, getDefaultHeaders(sheetName));
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  // Jika ID tidak ditemukan, tambahkan sebagai baris baru
  sheet.appendRow(rowValues);
}

function deleteRowById(sheetName, id) {
  var sheet = getOrCreateSheet(sheetName, getDefaultHeaders(sheetName));
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function readSheetObjects(sheetName, mapperFn) {
  var sheet = getOrCreateSheet(sheetName, getDefaultHeaders(sheetName));
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] && String(row[0]).trim() !== '') {
      var obj = mapperFn(row);
      if (obj) result.push(obj);
    }
  }
  return result;
}

// -------------------------------------------------------------
// HEADERS & MAPPERS
// -------------------------------------------------------------

function getDefaultHeaders(sheetName) {
  if (sheetName === 'Warga') return getResidentHeaders();
  if (sheetName === 'Pembayaran') return getPaymentHeaders();
  if (sheetName === 'Pengeluaran') return getExpenseHeaders();
  if (sheetName === 'Pendapatan_Lain') return getOtherIncomeHeaders();
  return ['Key', 'Value'];
}

function getResidentHeaders() {
  return ['ID', 'No Rumah', 'Nama KK', 'No HP', 'Tipe Warga', 'Status Hunian', 'Catatan', 'Dibuat Pada'];
}

function residentToRow(r) {
  return [
    r.id || '',
    r.houseNumber || '',
    r.headOfFamily || '',
    r.phone || '',
    r.residentType || 'tetap',
    r.occupancyStatus || 'dihuni',
    r.notes || '',
    r.createdAt || new Date().toISOString()
  ];
}

function rowToResident(row) {
  return {
    id: String(row[0] || ''),
    houseNumber: String(row[1] || ''),
    headOfFamily: String(row[2] || ''),
    phone: String(row[3] || ''),
    residentType: String(row[4] || 'tetap'),
    occupancyStatus: String(row[5] || 'dihuni'),
    notes: String(row[6] || ''),
    createdAt: String(row[7] || '')
  };
}

function getPaymentHeaders() {
  return ['ID', 'ID Warga', 'No Rumah', 'Nama KK', 'Periode', 'Jumlah', 'Jenis Iuran', 'Metode', 'Status', 'Tanggal Bayar', 'Dicatat Oleh', 'No Kwitansi', 'Catatan', 'Bukti Transfer', 'Diverifikasi Pada'];
}

function paymentToRow(p) {
  return [
    p.id || '',
    p.residentId || '',
    p.houseNumber || '',
    p.headOfFamily || '',
    p.periodMonth || '',
    Number(p.amount) || 0,
    p.feeType || 'Iuran Wajib Bulanan',
    p.paymentMethod || 'transfer',
    p.status || 'lunas',
    p.paidAt || '',
    p.recordedBy || '',
    p.receiptNo || '',
    p.notes || '',
    p.transferProofUrl || '',
    p.verifiedAt || ''
  ];
}

function rowToPayment(row) {
  return {
    id: String(row[0] || ''),
    residentId: String(row[1] || ''),
    houseNumber: String(row[2] || ''),
    headOfFamily: String(row[3] || ''),
    periodMonth: String(row[4] || ''),
    amount: Number(row[5]) || 0,
    feeType: String(row[6] || 'Iuran Wajib Bulanan'),
    paymentMethod: String(row[7] || 'transfer'),
    status: String(row[8] || 'lunas'),
    paidAt: String(row[9] || ''),
    recordedBy: String(row[10] || ''),
    receiptNo: String(row[11] || ''),
    notes: String(row[12] || ''),
    transferProofUrl: String(row[13] || ''),
    verifiedAt: String(row[14] || '')
  };
}

function getExpenseHeaders() {
  return ['ID', 'Judul', 'Kategori', 'Jumlah', 'Tanggal', 'Penerima', 'Dicatat Oleh', 'Catatan'];
}

function expenseToRow(e) {
  return [
    e.id || '',
    e.title || '',
    e.category || 'Lainnya',
    Number(e.amount) || 0,
    e.date || '',
    e.recipient || '',
    e.recordedBy || '',
    e.notes || ''
  ];
}

function rowToExpense(row) {
  return {
    id: String(row[0] || ''),
    title: String(row[1] || ''),
    category: String(row[2] || 'Lainnya'),
    amount: Number(row[3]) || 0,
    date: String(row[4] || ''),
    recipient: String(row[5] || ''),
    recordedBy: String(row[6] || ''),
    notes: String(row[7] || '')
  };
}

function getOtherIncomeHeaders() {
  return ['ID', 'Judul', 'Kategori', 'Jumlah', 'Tanggal', 'Pemberi / Pembayar', 'Metode', 'Dicatat Oleh', 'No Kwitansi', 'Catatan', 'Dibuat Pada'];
}

function otherIncomeToRow(inc) {
  return [
    inc.id || '',
    inc.title || '',
    inc.category || 'Donasi / Sumbangan',
    Number(inc.amount) || 0,
    inc.date || '',
    inc.payerName || '',
    inc.paymentMethod || 'transfer',
    inc.recordedBy || '',
    inc.receiptNo || '',
    inc.notes || '',
    inc.createdAt || ''
  ];
}

function rowToOtherIncome(row) {
  return {
    id: String(row[0] || ''),
    title: String(row[1] || ''),
    category: String(row[2] || 'Donasi / Sumbangan'),
    amount: Number(row[3]) || 0,
    date: String(row[4] || ''),
    payerName: String(row[5] || ''),
    paymentMethod: String(row[6] || 'transfer'),
    recordedBy: String(row[7] || ''),
    receiptNo: String(row[8] || ''),
    notes: String(row[9] || ''),
    createdAt: String(row[10] || '')
  };
}

function saveSettingsToSheet(settings) {
  var sheet = getOrCreateSheet('Pengaturan', ['Parameter', 'Nilai']);
  sheet.clear();
  sheet.appendRow(['Parameter', 'Nilai']);
  var headerRange = sheet.getRange(1, 1, 1, 2);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e2ece3');
  sheet.setFrozenRows(1);

  var rows = [];
  for (var key in settings) {
    if (settings.hasOwnProperty(key)) {
      rows.push([key, String(settings[key] || '')]);
    }
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

function readSettingsFromSheet() {
  var sheet = getOrCreateSheet('Pengaturan', ['Parameter', 'Nilai']);
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0] || '').trim();
    var val = data[i][1];
    if (key) {
      if (key === 'defaultMonthlyFee') {
        settings[key] = Number(val) || 50000;
      } else {
        settings[key] = String(val || '');
      }
    }
  }
  return settings;
}
`;

// -------------------------------------------------------------
// CLIENT API CALLS TO GOOGLE APPS SCRIPT WEB APP
// -------------------------------------------------------------

/**
 * Fetch all data from Google Sheets Web App
 */
export async function fetchAllFromGoogleSheets(webAppUrl: string): Promise<{
  success: boolean;
  data?: {
    settings: Partial<AppSettings>;
    residents: Resident[];
    payments: Payment[];
    expenses: Expense[];
    otherIncomes: OtherIncome[];
  };
  error?: string;
}> {
  if (!webAppUrl || !webAppUrl.trim().startsWith('https://script.google.com/')) {
    return { success: false, error: 'URL Web App Google Sheets tidak valid. Harus dimulai dengan https://script.google.com/macros/s/.../exec' };
  }

  try {
    const timestamp = Date.now();
    const cleanUrl = webAppUrl.trim().split('#')[0];
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const finalUrl = `${cleanUrl}${separator}t=${timestamp}`;

    const res = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Server Google Sheets merespons kode: ${res.status} (${res.statusText})`);
    }

    const json = (await res.json()) as GoogleSheetsResponse;
    if (json.status !== 'success') {
      throw new Error(json.message || 'Gagal memuat data dari Google Sheets.');
    }

    return {
      success: true,
      data: json.data || {
        settings: {},
        residents: [],
        payments: [],
        expenses: [],
        otherIncomes: [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal terhubung ke Google Apps Script Web App.',
    };
  }
}

/**
 * Post a mutation or sync action to Google Apps Script Web App
 */
export async function sendToGoogleSheets(
  webAppUrl: string,
  action: GoogleSheetsSyncPayload['action'],
  payload?: any
): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
  if (!webAppUrl || !webAppUrl.trim().startsWith('https://script.google.com/')) {
    return { success: false, error: 'URL Web App Google Sheets belum dikonfigurasi.' };
  }

  try {
    const cleanUrl = webAppUrl.trim().split('#')[0];
    const bodyText = JSON.stringify({ action, payload });

    // Use text/plain Content-Type to avoid CORS preflight (OPTIONS) which Apps Script cannot handle
    const res = await fetch(cleanUrl, {
      method: 'POST',
      body: bodyText,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Google Apps Script merespons kode HTTP ${res.status}`);
    }

    const json = (await res.json()) as GoogleSheetsResponse;
    if (json.status !== 'success') {
      throw new Error(json.message || `Operasi ${action} gagal di Google Sheets.`);
    }

    return {
      success: true,
      message: json.message,
      data: json.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Gagal mengirim data ke Google Sheets (${action})`,
    };
  }
}

/**
 * Test connectivity to Google Apps Script Web App
 */
export async function testGoogleSheetsConnection(webAppUrl: string): Promise<{ success: boolean; message: string }> {
  const result = await sendToGoogleSheets(webAppUrl, 'ping');
  if (result.success) {
    return {
      success: true,
      message: 'Koneksi ke Google Sheets Web App BERHASIL! Spreadsheet siap digunakan sebagai database.',
    };
  }
  return {
    success: false,
    message: result.error || 'Gagal menghubungi Google Apps Script.',
  };
}
