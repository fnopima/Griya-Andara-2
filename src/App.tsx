import React, { useState, useEffect } from 'react';
import {
  initializeDatabase,
  subscribeSettings,
  subscribeResidents,
  subscribePayments,
  subscribeExpenses,
  subscribeOtherIncomes,
  subscribeDbInfo,
} from './lib/database';
import { DEFAULT_SETTINGS } from './lib/initialData';
import type {
  Resident,
  Payment,
  Expense,
  OtherIncome,
  AppSettings,
  ActiveTab,
  UserRole,
  DatabaseInfo,
} from './types';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PaymentsView } from './components/PaymentsView';
import { OtherIncomesView } from './components/OtherIncomesView';
import { MatrixView } from './components/MatrixView';
import { ResidentsView } from './components/ResidentsView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { AdminPinModal } from './components/AdminPinModal';
import { LoginGateModal } from './components/LoginGateModal';
import { SelfReportModal } from './components/SelfReportModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { NewOtherIncomeModal } from './components/NewOtherIncomeModal';
import { Loader2, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { firestoreConsoleUrl } from './lib/firebase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('iuran_komplek_authenticated') === 'true';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = sessionStorage.getItem('iuran_komplek_auth_role');
    return saved === 'admin' || saved === 'warga' ? (saved as UserRole) : 'warga';
  });
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState<boolean>(false);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    mode: 'firestore',
    isOnline: true,
    firestoreConfigured: true,
  });

  // Modals
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [quickPayResidentId, setQuickPayResidentId] = useState('');
  const [quickPayPeriodMonth, setQuickPayPeriodMonth] = useState('');
  const [isNewOtherIncomeOpen, setIsNewOtherIncomeOpen] = useState(false);
  const [isSelfReportOpen, setIsSelfReportOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Initialize unified database engine (Cloud Firestore + LocalStorage fallback)
  useEffect(() => {
    let isMounted = true;

    initializeDatabase().then(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    const unsubSettings = subscribeSettings((data) => setSettings(data));
    const unsubResidents = subscribeResidents((data) => setResidents(data));
    const unsubPayments = subscribePayments((data) => setPayments(data));
    const unsubExpenses = subscribeExpenses((data) => setExpenses(data));
    const unsubOtherIncomes = subscribeOtherIncomes((data) => setOtherIncomes(data));
    const unsubDbInfo = subscribeDbInfo((info) => {
      setDbInfo(info);
      if (info.isQuotaExceeded || info.errorMessage) {
        setIsLoading(false);
      }
    });

    // Safety timeout so UI never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubSettings();
      unsubResidents();
      unsubPayments();
      unsubExpenses();
      unsubOtherIncomes();
      unsubDbInfo();
    };
  }, []);

  const pendingVerificationCount = payments.filter((p) => p.status === 'pending').length;

  // Auto redirect away from settings or residents if non-admin
  useEffect(() => {
    if (userRole !== 'admin' && (currentTab === 'settings' || currentTab === 'residents')) {
      setCurrentTab('dashboard');
    }
  }, [userRole, currentTab]);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    sessionStorage.setItem('iuran_komplek_auth_role', role);
    if (role !== 'admin' && (currentTab === 'settings' || currentTab === 'residents')) {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('iuran_komplek_authenticated');
    sessionStorage.removeItem('iuran_komplek_auth_role');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        userRole={userRole}
        onChangeRole={handleRoleChange}
        onOpenPinModal={() => setIsAdminPinOpen(true)}
        settings={settings}
        pendingVerificationCount={pendingVerificationCount}
        dbInfo={dbInfo}
        onLogout={handleLogout}
      />

      {/* Quota Exceeded Notification Banner (Only shown if Google Sheets is not active) */}
      {dbInfo.isQuotaExceeded && dbInfo.mode !== 'sheets' && !isQuotaBannerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-300 text-amber-950 px-4 py-3.5 transition-all animate-fadeIn">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <span className="p-1.5 rounded-full bg-amber-200/80 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-amber-950 text-xs sm:text-sm">
                  Batas Kuota Gratis Firestore Tercapai (Free Daily Read Units)
                </p>
                <p className="text-amber-900/90 text-xs leading-relaxed max-w-3xl">
                  Database komplek saat ini aktif dalam <strong>Mode Cache Browser</strong>. Data tetap aman dapat dilihat. Kuota gratis harian Google Cloud Firestore akan otomatis di-reset besok (setiap hari pukul 14:00 WIB / 00:00 PST), atau pemilik database dapat meng-upgrade ke paket Blaze di Firebase Console untuk akses tanpa batas kuota.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <a
                href={dbInfo.consoleUrl || firestoreConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition"
              >
                <span>Buka Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setIsQuotaBannerDismissed(true)}
                title="Tutup pemberitahuan"
                className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-200/60 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && residents.length === 0 && !dbInfo.isQuotaExceeded ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">
              Memuat database kas komplek...
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                payments={payments}
                expenses={expenses}
                residents={residents}
                otherIncomes={otherIncomes}
                settings={settings}
                userRole={userRole}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenSelfReport={() => setIsSelfReportOpen(true)}
                onOpenNewPayment={() => {
                  setQuickPayResidentId('');
                  setQuickPayPeriodMonth('');
                  setIsNewPaymentOpen(true);
                }}
                onOpenNewOtherIncome={() => setIsNewOtherIncomeOpen(true)}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                payments={payments}
                residents={residents}
                settings={settings}
                userRole={userRole}
                onOpenNewPayment={() => {
                  setQuickPayResidentId('');
                  setQuickPayPeriodMonth('');
                  setIsNewPaymentOpen(true);
                }}
                onOpenSelfReport={() => setIsSelfReportOpen(true)}
                onViewReceipt={(payment) => setReceiptPayment(payment)}
              />
            )}

            {currentTab === 'other_incomes' && (
              <OtherIncomesView
                otherIncomes={otherIncomes}
                userRole={userRole}
                settings={settings}
                onOpenNewIncomeModal={() => {
                  if (userRole === 'admin') {
                    setIsNewOtherIncomeOpen(true);
                  }
                }}
              />
            )}

            {currentTab === 'matrix' && (
              <MatrixView
                residents={residents}
                payments={payments}
                settings={settings}
                userRole={userRole}
                onQuickPay={(resident, periodMonth) => {
                  setQuickPayResidentId(resident.id);
                  setQuickPayPeriodMonth(periodMonth);
                  setIsNewPaymentOpen(true);
                }}
                onViewReceipt={(payment) => setReceiptPayment(payment)}
              />
            )}

            {currentTab === 'residents' && userRole === 'admin' && (
              <ResidentsView
                residents={residents}
                userRole={userRole}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                userRole={userRole}
                settings={settings}
              />
            )}

            {currentTab === 'settings' && userRole === 'admin' && (
              <SettingsView
                settings={settings}
                userRole={userRole}
                payments={payments}
                expenses={expenses}
                residents={residents}
                otherIncomes={otherIncomes}
                dbInfo={dbInfo}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            {settings.complexName} • {settings.rtRw}
          </p>
          <p className="text-[11px] text-slate-400">
            Sistem Informasi & Transparansi Keuangan Kas Paguyuban Warga
          </p>
        </div>
      </footer>

      {/* Modals */}
      <LoginGateModal
        isOpen={!isAuthenticated}
        onSuccess={(role) => {
          setUserRole(role);
          setIsAuthenticated(true);
          sessionStorage.setItem('iuran_komplek_authenticated', 'true');
          sessionStorage.setItem('iuran_komplek_auth_role', role);
        }}
        settings={settings}
        dbInfo={dbInfo}
      />

      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={() => {
          handleRoleChange('admin');
          setIsAdminPinOpen(false);
        }}
        correctPin={settings.adminPin || '1234'}
      />

      <ReceiptModal
        payment={receiptPayment}
        settings={settings}
        residents={residents}
        onClose={() => setReceiptPayment(null)}
      />

      <NewPaymentModal
        isOpen={isNewPaymentOpen}
        onClose={() => {
          setIsNewPaymentOpen(false);
          setQuickPayResidentId('');
          setQuickPayPeriodMonth('');
        }}
        residents={residents}
        settings={settings}
        initialResidentId={quickPayResidentId}
        initialPeriodMonth={quickPayPeriodMonth}
        onSuccess={() => {
          setIsNewPaymentOpen(false);
          setQuickPayResidentId('');
          setQuickPayPeriodMonth('');
        }}
      />

      {userRole === 'admin' && (
        <NewOtherIncomeModal
          isOpen={isNewOtherIncomeOpen}
          onClose={() => setIsNewOtherIncomeOpen(false)}
          userRole={userRole}
          onSuccess={() => {
            setIsNewOtherIncomeOpen(false);
          }}
        />
      )}

      <SelfReportModal
        isOpen={isSelfReportOpen}
        onClose={() => setIsSelfReportOpen(false)}
        residents={residents}
        settings={settings}
        onSuccess={() => {
          setIsSelfReportOpen(false);
        }}
      />
    </div>
  );
}
