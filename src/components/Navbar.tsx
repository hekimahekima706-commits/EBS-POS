import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BUSINESS_MODE_INFO, ROLE_INFO } from '../utils/formatters';
import { isProductActive } from '../utils/productUtils';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  Bell, 
  ChevronDown, 
  Check, 
  Wifi, 
  WifiOff,
  ShoppingBag,
  Video,
  Menu,
  Lock,
  LogOut,
  Palette,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { BusinessMode } from '../types';
import { getLocalDeviceIdentity, isSimulatedOffline, getOfflineQueue } from '../utils/syncEngine';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenQuickSale?: () => void;
  currentView?: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenQuickSale, currentView, onNavigate }) => {
  const { profile, setBusinessMode, currentUser, setCurrentUser, users, cameraEvents, products, lockSession, logoutUser } = useApp();
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const lowStockCount = products.filter(p => isProductActive(p) && p.stockQty <= p.minStock).length;
  const recentAlertsCount = cameraEvents.slice(0, 5).length + (lowStockCount > 0 ? 1 : 0);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Hamburger (Mobile) & Brand / Business Title & Mode */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Fungua Menyu"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <img
            src="/ebs-app-icon-pure.png"
            alt="EBS"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover shadow-md shadow-emerald-950/40 border border-emerald-500/30 shrink-0"
          />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5 truncate max-w-[160px] lg:max-w-none">
              <span>{profile.name}</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              TIN: {profile.tin || '134-589-201'} • TZS
            </p>
          </div>
        </div>

        {/* Business Mode Switcher */}
        <div className="relative">
          <button
            id="btn-switch-mode"
            onClick={() => {
              setShowModeDropdown(!showModeDropdown);
              setShowUserDropdown(false);
              setShowNotificationMenu(false);
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition"
          >
            <span>{BUSINESS_MODE_INFO[profile.mode]?.emoji || '🏢'}</span>
            <span className="hidden sm:inline">{BUSINESS_MODE_INFO[profile.mode]?.label || 'General'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showModeDropdown && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-xs font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800 mb-1">
                Chagua Hali ya Biashara (Mode):
              </div>
              {(Object.keys(BUSINESS_MODE_INFO) as BusinessMode[]).map((modeKey) => {
                const info = BUSINESS_MODE_INFO[modeKey];
                const isSelected = profile.mode === modeKey;
                return (
                  <button
                    key={modeKey}
                    id={`mode-select-${modeKey}`}
                    onClick={() => {
                      setBusinessMode(modeKey);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start space-x-2.5 transition ${
                      isSelected
                        ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-800'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-base">{info.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold flex items-center justify-between">
                        <span>{info.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal leading-normal mt-0.5">
                        {info.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick New Sale button */}
        <button
          id="btn-navbar-quick-sale"
          onClick={() => {
            if (onOpenQuickSale) onOpenQuickSale();
            else onNavigate('pos');
          }}
          className="hidden md:flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/30 transition active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Mauzo (POS)</span>
        </button>

        {/* AI Assistant Quick Button */}
        <button
          id="btn-navbar-ai-assistant"
          onClick={() => onNavigate('ai_assistant')}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 text-xs font-bold border border-purple-800 transition"
          title="EBS AI Msaidizi wa Biashara"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="hidden lg:inline">AI Msaidizi</span>
        </button>

        {/* Online / Offline & Multi-Device Status Pill */}
        <button
          onClick={() => onNavigate('devices')}
          title="Usimamizi wa Vifaa & Sync (Bofya kuona)"
          className={`hidden sm:flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-xl border transition ${
            isSimulatedOffline()
              ? 'bg-amber-950/50 text-amber-300 border-amber-800 hover:bg-amber-900/50'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-900 hover:bg-emerald-900/40'
          }`}
        >
          {isSimulatedOffline() ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-[11px]">Offline Sim</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px] hidden md:inline">Sync Live</span>
            </>
          )}
          <span className="text-[10px] text-slate-400 font-mono hidden xl:inline border-l border-slate-700 pl-1.5">
            {getLocalDeviceIdentity().name.split(' ')[0]}
          </span>
        </button>

        {/* Notifications & Alerts */}
        <div className="relative">
          <button
            id="btn-navbar-alerts"
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowUserDropdown(false);
              setShowModeDropdown(false);
            }}
            className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <Bell className="w-4 h-4" />
            {recentAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
            {recentAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-white">
                  Taarifa & Tahadhari ({recentAlertsCount})
                </span>
                <button
                  onClick={() => {
                    setShowNotificationMenu(false);
                    onNavigate('camera');
                  }}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Video className="w-3 h-3" />
                  Kamera CCTV
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {lowStockCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900 text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <span>📦</span>
                      <span>Tahadhari ya Stoo</span>
                    </div>
                    <div className="text-amber-400 text-[11px] mt-0.5">
                      Kuna bidhaa {lowStockCount} zimefikia au ziko chini ya kiwango cha tahadhari.
                    </div>
                  </div>
                )}

                {cameraEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setShowNotificationMenu(false);
                      onNavigate('camera');
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 border border-slate-800 cursor-pointer text-xs transition"
                  >
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="truncate pr-2">{ev.title}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick 1-Click Terminal Lock */}
        <button
          id="btn-navbar-quick-lock"
          onClick={lockSession}
          title="Funga EBS (Lock Screen)"
          className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-xl border border-amber-500/20 transition flex items-center gap-1 text-xs"
        >
          <Lock className="w-4 h-4" />
          <span className="hidden xl:inline text-[11px] font-semibold">Funga</span>
        </button>

        {/* Current Active User Selector */}
        <div className="relative">
          <button
            id="btn-active-user-menu"
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowModeDropdown(false);
              setShowNotificationMenu(false);
            }}
            className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-bold text-white leading-tight truncate max-w-[100px]">
                {currentUser?.name ? currentUser.name.split(' ')[0] : 'Mtumiaji'}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase">
                {currentUser?.role || 'Staff'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="text-xs font-bold text-white">{currentUser?.name || 'Mtumiaji'}</div>
                <div className="text-[11px] text-slate-400">
                  {(currentUser?.role && ROLE_INFO[currentUser.role]?.label) || currentUser?.role || 'Staff'}
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-400 px-3 py-1">
                Badilisha Mtumiaji / Role:
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {users.map((u) => {
                  const isCurrent = u?.id && currentUser?.id ? u.id === currentUser.id : false;
                  return (
                    <button
                      key={u?.id || Math.random()}
                      id={u?.id ? `switch-user-${u.id}` : undefined}
                      onClick={() => {
                        if (u) setCurrentUser(u);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-800'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{u.role}</div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 mt-2 pt-2 space-y-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mwonekano & Mipangilio</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onNavigate('employees');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dhibiti Wafanyakazi & Ruhusa</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    lockSession();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-amber-300 hover:bg-amber-950/40 flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Funga EBS (Lock Screen)</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logoutUser();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Toka (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
