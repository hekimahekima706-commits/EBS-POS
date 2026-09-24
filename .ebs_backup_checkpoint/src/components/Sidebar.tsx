import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Beer,
  Users,
  Building,
  Receipt,
  BarChart3,
  UserCog,
  Video,
  Sparkles,
  Settings,
  Smartphone,
  Lock,
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen = false, onClose }) => {
  const { profile, products, debts, currentUser, can, lockSession, logoutUser } = useApp();

  const lowStockCount = products.filter((p) => p.active && p.stockQty <= p.minStock).length;
  const overdueDebtsCount = debts.filter(
    (d) => d.status !== 'paid' && new Date(d.dueDate) < new Date()
  ).length;

  const rawNavItems = [
    {
      id: 'dashboard',
      label: 'Mwanzo',
      sublabel: 'Owner Dashboard',
      icon: LayoutDashboard,
      badge: null,
      visible: can('canViewDashboard'),
    },
    {
      id: 'pos',
      label: 'Mauzo (POS)',
      sublabel: 'Kukata Risiti & Mauzo',
      icon: ShoppingCart,
      badge: null,
      highlight: true,
      visible: can('canMakeSales'),
    },
    {
      id: 'inventory',
      label: 'Bidhaa & Stoo',
      sublabel: 'Inventory & Alerts',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} Chini` : null,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      visible: can('canViewStock') || can('canManageStock'),
    },
    {
      id: 'barmode',
      label: 'Bar Mode 🍺',
      sublabel: 'Chupa, Shots & Variance',
      icon: Beer,
      badge: profile.mode === 'bar' ? 'Active' : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      visible: can('canAccessBarMode'),
    },
    {
      id: 'debts',
      label: 'Wateja & Madeni',
      sublabel: 'Mikopo & Malipo',
      icon: Users,
      badge: overdueDebtsCount > 0 ? `${overdueDebtsCount} Yamechelewa` : null,
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      visible: can('canViewDebts') || can('canManageCustomers'),
    },
    {
      id: 'suppliers',
      label: 'Wasambazaji',
      sublabel: 'Suppliers & Purchases',
      icon: Building,
      badge: null,
      visible: can('canViewSuppliers') || can('canManageSuppliers'),
    },
    {
      id: 'expenses',
      label: 'Gharama',
      sublabel: 'LUKU, Maji, Mishahara',
      icon: Receipt,
      badge: null,
      visible: can('canViewExpenses') || can('canManageExpenses'),
    },
    {
      id: 'reports',
      label: 'Ripoti & Takwimu',
      sublabel: 'Daily, Weekly, Faida',
      icon: BarChart3,
      badge: null,
      visible: can('canViewReports'),
    },
    {
      id: 'employees',
      label: 'Wafanyakazi & Ukaguzi',
      sublabel: 'Roles & Audit Logs',
      icon: UserCog,
      badge: null,
      visible: can('canManageUsers') || can('canViewAuditLogs'),
    },
    {
      id: 'camera',
      label: 'Camera CCTV 📹',
      sublabel: 'Surveillance & Matukio',
      icon: Video,
      badge: 'Live',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      visible: can('canViewCCTV'),
    },
    {
      id: 'ai_assistant',
      label: 'AI Msaidizi 🤖',
      sublabel: 'Mchambuzi wa Biashara',
      icon: Sparkles,
      badge: 'Smart',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      visible: true,
    },
    {
      id: 'devices',
      label: 'Vifaa & Sync 📱',
      sublabel: 'Multi-Device Network',
      icon: Smartphone,
      badge: 'V1.3.0',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      visible: can('canManageSettings') || can('canViewReports') || can('canManageUsers'),
    },
    {
      id: 'settings',
      label: 'Mipangilio & Backup',
      sublabel: 'System & Database',
      icon: Settings,
      badge: null,
      visible: can('canManageSettings') || can('canBackupRestore'),
    },
  ];

  const navItems = rawNavItems.filter((i) => i.visible !== false);

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-50 md:z-20 w-72 md:w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 h-screen md:h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between md:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
              EBS
            </div>
            <div className="font-bold text-white text-sm truncate">{profile.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mode Indicator Banner */}
        <div className="p-3 bg-slate-800/60 border border-slate-800 m-3 rounded-2xl">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Hali ya Mfumo:</span>
            <span className="text-emerald-400 font-semibold">{profile.mode.toUpperCase()}</span>
          </div>
          <div className="text-xs font-bold text-white mt-1 truncate">
            {profile.name}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Mtumiaji: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1 pb-6">
          {navItems.map((item) => {
            const isActive = currentView === item.id || (item.id === 'debts' && currentView === 'customers');
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition text-xs group ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                    }`}
                  />
                  <div className="truncate">
                    <div className="leading-tight truncate">{item.label}</div>
                    <div
                      className={`text-[10px] font-normal truncate mt-0.5 ${
                        isActive ? 'text-emerald-100' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          {/* Lock Screen & Logout Actions */}
          <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
            <button
              type="button"
              id="btn-sidebar-lock"
              onClick={() => {
                lockSession();
                if (onClose) onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-2xl text-left transition text-xs text-amber-300 hover:bg-amber-950/30 hover:text-amber-200"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-semibold leading-tight">Funga Mfumo 🔒</div>
                <div className="text-[10px] text-slate-500">Lock Screen Terminal</div>
              </div>
            </button>

            <button
              type="button"
              id="btn-sidebar-logout"
              onClick={() => {
                logoutUser();
                if (onClose) onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-2xl text-left transition text-xs text-rose-300 hover:bg-rose-950/30 hover:text-rose-200"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <div>
                <div className="font-semibold leading-tight">Toka (Logout)</div>
                <div className="text-[10px] text-slate-500">Funga Session Yako</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Footer System Status */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-300">EBS V1.3.0</span> Tz
          </div>
          <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mtandao / Offline OK</span>
          </div>
        </div>
      </aside>
    </>
  );
};
