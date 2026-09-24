import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const MainAppContent: React.FC = () => {
  const {
    businessProfile,
    isAuthenticated,
    isLocked,
    currentUser,
    can,
    themeMode,
    primaryColor,
    fontSize,
    backgroundStyle,
  } = useApp();

  const [currentView, setCurrentView] = useState('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set appropriate landing view per user role upon login
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'cashier') {
      setCurrentView('pos');
    } else if (currentUser.role === 'waiter') {
      setCurrentView('pos');
    } else if (currentUser.role === 'storekeeper') {
      setCurrentView('inventory');
    } else if (currentUser.role === 'accountant') {
      setCurrentView('reports');
    } else if (currentUser.role === 'owner' || currentUser.role === 'manager' || currentUser.role === 'admin') {
      setCurrentView((prev) => (prev === 'pos' ? 'dashboard' : prev));
    }
  }, [currentUser?.id, currentUser?.role]);

  // 1. First-Time Business Setup Wizard (if not yet completed)
  if (!businessProfile.setupCompleted) {
    return (
      <FirstTimeSetupWizard
        onComplete={() => {
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // 2. Main Authentication Screen (KARIBU EBS)
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={() => {
          // Route will update according to useEffect on currentUser
        }}
      />
    );
  }

  const bgClass = getBackgroundClass(backgroundStyle, themeMode);
  const fontClass = getFontSizeClass(fontSize);

  return (
    <div className={`min-h-screen ${bgClass} ${fontClass} text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white`}>
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
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
