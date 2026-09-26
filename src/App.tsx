import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { App as CapApp } from '@capacitor/app';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PosView } from './components/PosView';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { BarModeView } from './components/BarModeView';
import { CustomersDebtView } from './components/CustomersDebtView';
import { SuppliersView } from './components/SuppliersView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { EmployeesView } from './components/EmployeesView';
import { CameraView } from './components/CameraView';
import { GoogleCalendarView } from './components/GoogleCalendarView';
import { AiAssistantView } from './components/AiAssistantView';
import { DevicesView } from './components/DevicesView';
import { SettingsView } from './components/SettingsView';
import { FirstTimeSetupWizard } from './components/FirstTimeSetupWizard';
import { LoginView } from './components/auth/LoginView';
import { LockScreenModal } from './components/auth/LockScreenModal';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { SuperAdminView } from './components/SuperAdminView';
import {
  ShoppingCart,
  Beer,
  Package,
  Users,
  Menu,
  LayoutDashboard,
  BarChart3,
  Receipt
} from 'lucide-react';
import { getThemeModeClass, getBackgroundClass, getFontSizeClass, COLOR_SCHEMES } from './utils/themeHelper';

import { ErrorBoundary } from './components/ErrorBoundary';

const MainAppContent: React.FC = () => {
  const {
    businessProfile,
    isAuthenticated,
    isLocked,
    currentUser,
    isLoading,
    can,
    themeMode,
    primaryColor,
    fontSize,
    backgroundStyle,
  } = useApp();

  const [currentView, setCurrentView] = useState('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSuperAdminView, setIsSuperAdminView] = useState(
    () => typeof window !== 'undefined' && (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin'))
  );

  // Listen for admin hash navigation (e.g. /#admin or /admin)
  useEffect(() => {
    const handleHashChange = () => {
      setIsSuperAdminView(window.location.hash === '#admin' || window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Set appropriate landing view per user role upon login
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    if (currentUser?.role === 'cashier') {
      setCurrentView('pos');
    } else if (currentUser?.role === 'waiter') {
      setCurrentView('pos');
    } else if (currentUser?.role === 'storekeeper') {
      setCurrentView('inventory');
    } else if (currentUser?.role === 'accountant') {
      setCurrentView('reports');
    } else if (currentUser?.role === 'owner' || currentUser?.role === 'manager' || currentUser?.role === 'admin') {
      setCurrentView((prev) => (prev === 'pos' ? 'dashboard' : prev));
    }
  }, [currentUser?.id, currentUser?.role]);

  // Android Capacitor Hardware Back Button Support
  useEffect(() => {
    let listenerHandler: any;
    try {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (sidebarOpen) {
          setSidebarOpen(false);
        } else if (currentView !== 'pos' && currentView !== 'dashboard') {
          setCurrentView(currentUser?.role === 'cashier' || currentUser?.role === 'waiter' ? 'pos' : 'dashboard');
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.minimizeApp().catch(() => {});
        }
      }).then(handler => {
        listenerHandler = handler;
      }).catch(() => {});
    } catch {}

    return () => {
      if (listenerHandler && listenerHandler.remove) {
        listenerHandler.remove();
      }
    };
  }, [sidebarOpen, currentView, currentUser?.role]);

  // 0. Super Admin / EBS Head Office Portal Mode
  if (isSuperAdminView) {
    return (
      <SuperAdminView
        onBackToApp={() => {
          setIsSuperAdminView(false);
          window.location.hash = '';
        }}
      />
    );
  }

  // Loading Screen while state and business data hydrates
  if (isLoading || !businessProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium tracking-wide">Inapakia mfumo wa biashara...</p>
      </div>
    );
  }

  // 1. First-Time Business Setup Wizard (if not yet completed)
  if (!businessProfile || !businessProfile.setupCompleted) {
    return (
      <FirstTimeSetupWizard
        onComplete={() => {
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // 2. Main Authentication Screen (KARIBU EBS)
  if (!isAuthenticated || !currentUser?.id) {
    return (
      <LoginView
        onLoginSuccess={() => {
          // Route will update according to useEffect on currentUser
        }}
        onOpenSuperAdmin={() => {
          setIsSuperAdminView(true);
          window.location.hash = '#admin';
        }}
      />
    );
  }

  const bgClass = getBackgroundClass(backgroundStyle, themeMode);
  const fontClass = getFontSizeClass(fontSize);

  return (
    <div className={`min-h-screen ${bgClass} ${fontClass} text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white`}>
      {/* Auto-Update Banner for Safe Seamless Updates */}
      <AutoUpdateBanner />

      {/* Lock Screen Modal if locked */}
      {isLocked && <LockScreenModal />}

      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Dynamic Content View Area with safe padding for mobile bottom bar */}
        <main className="flex-1 overflow-y-auto relative focus:outline-none pb-20 md:pb-6">
          {currentView === 'pos' && can('canMakeSales') && <PosView />}
          {currentView === 'dashboard' && can('canViewDashboard') && <DashboardView onNavigate={setCurrentView} />}
          {currentView === 'inventory' && (can('canViewStock') || can('canManageStock')) && <InventoryView />}
          {currentView === 'barmode' && can('canAccessBarMode') && <BarModeView />}
          {(currentView === 'debts' || currentView === 'customers') && (can('canViewDebts') || can('canManageCustomers')) && <CustomersDebtView />}
          {currentView === 'suppliers' && (can('canViewSuppliers') || can('canManageSuppliers')) && <SuppliersView />}
          {currentView === 'expenses' && (can('canViewExpenses') || can('canManageExpenses')) && <ExpensesView />}
          {currentView === 'reports' && can('canViewReports') && <ReportsView />}
          {currentView === 'employees' && (can('canManageUsers') || can('canViewAuditLogs')) && <EmployeesView />}
          {currentView === 'camera' && can('canViewCCTV') && <CameraView />}
          {currentView === 'calendar' && <GoogleCalendarView />}
          {(currentView === 'ai_assistant' || currentView === 'ai') && <AiAssistantView />}
          {currentView === 'devices' && <DevicesView onNavigate={setCurrentView} />}
          {currentView === 'settings' && (can('canManageSettings') || can('canBackupRestore')) && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Ergonomic Smartphone Usage - Filtered by role */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 px-2 flex items-center justify-around">
        {can('canViewDashboard') && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'dashboard' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Mwanzo</span>
          </button>
        )}

        {can('canMakeSales') && (
          <button
            onClick={() => setCurrentView('pos')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'pos' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">POS</span>
          </button>
        )}

        {can('canAccessBarMode') && (
          <button
            onClick={() => setCurrentView('barmode')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'barmode' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Beer className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Bar</span>
          </button>
        )}

        {(can('canViewStock') || can('canManageStock')) && (
          <button
            onClick={() => setCurrentView('inventory')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'inventory' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Stoo</span>
          </button>
        )}

        {(can('canViewDebts') || can('canManageCustomers')) && (
          <button
            onClick={() => setCurrentView('debts')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'debts' || currentView === 'customers'
                ? 'text-emerald-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Madeni</span>
          </button>
        )}

        {can('canViewReports') && !can('canMakeSales') && (
          <button
            onClick={() => setCurrentView('reports')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition min-h-[44px] ${
              currentView === 'reports' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Ripoti</span>
          </button>
        )}

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition min-h-[44px]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Zaidi</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
