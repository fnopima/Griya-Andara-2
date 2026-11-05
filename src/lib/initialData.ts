import type { Resident, Payment, Expense, OtherIncome, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  complexName: 'Pencatatan Kas & Iuran RT',
  rtRw: 'RT 01 / RW 01',
  subDistrict: 'Kelurahan Setempat',
  defaultMonthlyFee: 50000,
  adminPin: '1234',
  wargaPassword: 'andara',
  treasurerName: 'Bendahara RT',
  treasurerPhone: '',
  bankName: 'BCA / Mandiri / BRI',
  bankAccount: '',
  bankHolder: 'Kas RT',
  announcement: '',
  googleSheetsUrl: '',
  googleSheetSpreadsheetUrl: '',
};

// Clean initial data with zero dummy records
export const INITIAL_RESIDENTS: Omit<Resident, 'id'>[] = [];
export const INITIAL_PAYMENTS: Omit<Payment, 'id'>[] = [];
export const INITIAL_EXPENSES: Omit<Expense, 'id'>[] = [];
export const INITIAL_OTHER_INCOMES: Omit<OtherIncome, 'id'>[] = [];

