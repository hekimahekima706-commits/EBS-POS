import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, UserPermissions, BusinessMode, ThemeMode, PrimaryColor, FontSize, BackgroundStyle, Language } from '../types';
import { BUSINESS_TYPES_CATALOG, ROLE_INFO, TANZANIA_REGIONS } from '../utils/formatters';
import { validatePasswordStrength, validateTanzanianPhone } from '../utils/security';
import { COLOR_SCHEMES, THEME_MODES, FONT_SIZES, BACKGROUND_STYLES } from '../utils/themeHelper';
import {
  Building2,
  Users,
  CreditCard,
  Package,
  Beer,
  Video,
  Bell,
  HardDrive,
  Shield,
  Info,
  Check,
  Plus,
  Trash2,
  Edit2,
  Key,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Percent,
  Printer,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Palette,
  Globe,
  Monitor,
  Clock,
  Laptop
} from 'lucide-react';

type SettingsTab =
  | 'business'
  | 'users'
  | 'appearance'
  | 'language'
  | 'pos'
  | 'inventory'
  | 'bar'
  | 'security'
  | 'camera'
  | 'notifications'
  | 'backup'
  | 'about';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    resetUserPassword,
    changePassword,
    canAccess,
    exportDatabaseJson,
    importDatabaseJson,
    resetToDemoData,
    themeMode,
    setThemeMode,
    primaryColor,
    setPrimaryColor,
    fontSize,
    setFontSize,
    backgroundStyle,
    setBackgroundStyle,
    language,
    setLanguage,
    sessionTimeoutMinutes,
    setSessionTimeoutMinutes,
    sessions,
    terminateSession,
    activeSession,
    can
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Business Form State
  const [bizName, setBizName] = useState(profile.name || '');
  const [bizOwner, setBizOwner] = useState(profile.ownerName || '');
  const [bizTagline, setBizTagline] = useState(profile.tagline || '');
  const [bizPhone, setBizPhone] = useState(profile.phone || '');
  const [bizEmail, setBizEmail] = useState(profile.email || '');
  const [bizMkoa, setBizMkoa] = useState(profile.mkoa || 'Dar es Salaam');
  const [bizWilaya, setBizWilaya] = useState(profile.wilaya || 'Ubungo');
  const [bizAddress, setBizAddress] = useState(profile.address || '');
  const [bizTin, setBizTin] = useState(profile.tin || '');
  const [bizVrn, setBizVrn] = useState(profile.vrn || '');
  const [bizLicense, setBizLicense] = useState(profile.licenseNumber || '');
  const [bizReceiptFooter, setBizReceiptFooter] = useState(profile.receiptFooterText || profile.receiptFooter || '');
  const [bizMode, setBizMode] = useState<BusinessMode>(profile.mode || 'bar');

  // POS Settings State
  const [enableVat, setEnableVat] = useState(profile.enableVat || profile.vatEnabled || false);
  const [vatRate, setVatRate] = useState(profile.taxRate || profile.vatRate || 18);
  const [pinDiscount, setPinDiscount] = useState(profile.requirePinForDiscount || false);
  const [pinRefund, setPinRefund] = useState(profile.requirePinForRefund ?? true);
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('80mm');

  // Inventory Settings State
  const [lowStockThreshold, setLowStockThreshold] = useState(profile.lowStockThresholdDefault || 5);

  // Bar Settings State
  const [enableBarFeatures, setEnableBarFeatures] = useState(profile.enableBarFeatures ?? true);
  const [enableRestaurantFeatures, setEnableRestaurantFeatures] = useState(profile.enableRestaurantFeatures ?? true);

  // Camera Settings State
  const [enableCamera, setEnableCamera] = useState(profile.enableCameraIntegration ?? true);

  // User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add User Fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('cashier');
  const [newUserPassword, setNewUserPassword] = useState('Ebs12345!');
  const [showNewUserPass, setShowNewUserPass] = useState(false);

  // Edit User Permissions
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    canViewReports: false,
    canViewProfit: false,
    canManageUsers: false,
    canManagePermissions: false,
    canManageCCTV: false,
    canViewAuditLogs: false,
    canManageSettings: false,
    canBackupRestore: false,
    canManageStock: false,
    canAdjustStock: false,
    canManageProducts: false,
    canMakeSales: true,
    canDeleteSales: false,
    canGiveDiscount: false,
    canRefundSale: false,
    canManageCustomers: true,
    canManageSuppliers: false,
    canManageExpenses: false,
    canManageTables: false,
    canAccessBarMode: false,
  });

  // Reset Password Fields
  const [adminResetPass, setAdminResetPass] = useState('');

  // Security (Change Own Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newSecurityPassword, setNewSecurityPassword] = useState('');
  const [confirmSecurityPassword, setConfirmSecurityPassword] = useState('');
  const [showSecurityPass, setShowSecurityPass] = useState(false);

  // Backup Import
  const [importFile, setImportFile] = useState<File | null>(null);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage('');
    } else {
      setSuccessMessage(msg);
      setErrorMessage('');
    }
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 4000);
  };

  // Handlers
  const handleSaveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: bizName,
      ownerName: bizOwner,
      tagline: bizTagline,
      phone: bizPhone,
      email: bizEmail,
      mkoa: bizMkoa,
      wilaya: bizWilaya,
      address: bizAddress,
      tin: bizTin,
      vrn: bizVrn,
      licenseNumber: bizLicense,
      receiptFooterText: bizReceiptFooter,
      receiptFooter: bizReceiptFooter,
      mode: bizMode,
    });
    showToast('Taarifa za biashara zimehifadhiwa kikamilifu!');
  };

  const handleSavePosSettings = () => {
    updateProfile({
      enableVat,
      vatEnabled: enableVat,
      taxRate: Number(vatRate),
      vatRate: Number(vatRate),
      requirePinForDiscount: pinDiscount,
      requirePinForRefund: pinRefund,
      receiptFooterText: bizReceiptFooter,
    });
    showToast('Mipangilio ya POS na Mauzo imehifadhiwa!');
  };

  const handleSaveInventorySettings = () => {
    updateProfile({
      lowStockThresholdDefault: Number(lowStockThreshold),
    });
    showToast('Mipangilio ya Stoo na Bidhaa imehifadhiwa!');
  };

  const handleSaveBarSettings = () => {
    updateProfile({
      enableBarFeatures,
      enableRestaurantFeatures,
    });
    showToast('Mipangilio ya Bar na Mgahawa imehifadhiwa!');
  };

  const handleSaveCameraSettings = () => {
    updateProfile({
      enableCameraIntegration: enableCamera,
    });
    showToast('Mipangilio ya CCTV imehifadhiwa!');
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      showToast('Jina kamili na jina la mtumiaji (Username) vinahitajika.', true);
      return;
    }

    const cleanUsername = newUserUsername.toLowerCase().trim();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      showToast(`Jina la mtumiaji "${cleanUsername}" tayari linatumiwa na mtumishi mwingine.`, true);
      return;
    }

    const passCheck = validatePasswordStrength(newUserPassword);
    if (!passCheck.isValid) {
      showToast(passCheck.errors.join(' '), true);
      return;
    }

    try {
      await addUser({
        name: newUserName,
        username: cleanUsername,
        phone: newUserPhone,
        role: newUserRole,
        active: true,
        initialPassword: newUserPassword,
      });

      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPhone('');
      setNewUserPassword('Ebs12345!');
      showToast(`Mtumiaji mpya ${newUserName} amesajiliwa kikamilifu!`);
    } catch (err: any) {
      showToast(err.message || 'Hitilafu imetokea.', true);
    }
  };

  const handleOpenEditUser = (user: User) => {
    setSelectedUser(user);
    setEditPermissions(
      user.permissions || {
        canViewReports: false,
        canViewProfit: false,
        canManageUsers: false,
        canManagePermissions: false,
        canManageCCTV: false,
        canViewAuditLogs: false,
        canManageSettings: false,
        canBackupRestore: false,
        canManageStock: false,
        canAdjustStock: false,
        canManageProducts: false,
        canMakeSales: true,
        canDeleteSales: false,
        canGiveDiscount: false,
        canRefundSale: false,
        canManageCustomers: true,
        canManageSuppliers: false,
        canManageExpenses: false,
        canManageTables: false,
        canAccessBarMode: false,
      }
    );
    setShowEditUserModal(true);
  };

  const handleSaveUserPermissions = () => {
    if (!selectedUser) return;
    updateUser(selectedUser.id, {
      permissions: editPermissions,
      canDiscount: editPermissions.canGiveDiscount,
      canRefund: editPermissions.canRefundSale,
      canAdjustStock: editPermissions.canAdjustStock,
      canViewProfit: editPermissions.canViewProfit,
      canManageUsers: editPermissions.canManageUsers,
    });
    setShowEditUserModal(false);
    showToast(`Mamlaka ya ${selectedUser.name} yamesasishwa!`);
  };

  const handleOpenResetPass = (user: User) => {
    setSelectedUser(user);
    setAdminResetPass('');
    setShowResetPassModal(true);
  };

  const handleResetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const res = await resetUserPassword(selectedUser.id, adminResetPass);
    if (res.success) {
      setShowResetPassModal(false);
      showToast(`Neno la siri la ${selectedUser.name} limewekwa upya!`);
    } else {
      showToast(res.message || 'Imeshindikana kubadilisha.', true);
    }
  };

  const handleChangeOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSecurityPassword !== confirmSecurityPassword) {
      showToast('Neno jipya la siri na uthibitisho havifanani.', true);
      return;
    }

    const res = await changePassword(currentPassword, newSecurityPassword);
    if (res.success) {
      setCurrentPassword('');
      setNewSecurityPassword('');
      setConfirmSecurityPassword('');
      showToast('Neno lako la siri limebadilishwa kikamilifu!');
    } else {
      showToast(res.message || 'Hitilafu imetokea.', true);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `EBS_Backup_${profile.name.replace(/\s+/g, '_')}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Faili la nakala (Backup) limepakuliwa!');
  };

  const handleImportBackup = () => {
    if (!importFile) {
      showToast('Chagua faili la JSON la backup kwanza.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importDatabaseJson(content);
      if (success) {
        showToast('Data zote zimerudishwa kikamilifu!');
        setImportFile(null);
      } else {
        showToast('Faili la backup halina mfumo sahihi.', true);
      }
    };
    reader.readAsText(importFile);
  };

  const handleResetDataConfirm = () => {
    if (window.confirm('Je, una uhakika unataka kurudisha mfumo kwenye Demo Data? Taarifa zote zilizorekodiwa zitaondolewa.')) {
      resetToDemoData();
      showToast('Mfumo umerudishwa kwenye hali ya demo.');
    }
  };

  const isOwnerOrAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4" />
            <span>Kituo Kikuu cha Mipangilio • EBS V1.3.0 Production</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Mipangilio & Backup</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sanidi taarifa za biashara yako, mamlaka ya wafanyakazi, kamera CCTV, kodi na nakala ya mfumo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Pakua Backup</span>
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs font-bold flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Settings Navigation & Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-1 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-3xl backdrop-blur-md h-fit">
          {[
            { id: 'business', label: 'Taarifa za Biashara', icon: Building2, desc: 'Jina, Eneo & TIN' },
            { id: 'users', label: 'Watumiaji & Mamlaka', icon: Users, desc: 'Akaunti & Passwords', badge: users.length },
            { id: 'appearance', label: 'Mwonekano & Rangi', icon: Palette, desc: 'Dark/Light, Font & Rangi' },
            { id: 'language', label: 'Lugha (Language)', icon: Globe, desc: 'Kiswahili / Kiingereza' },
            { id: 'pos', label: 'POS & Mauzo', icon: CreditCard, desc: 'Kodi, Risiti & Punguzo' },
            { id: 'inventory', label: 'Stoo & Bidhaa', icon: Package, desc: 'Ukomo wa Stock' },
            { id: 'bar', label: 'Bar & Mgahawa', icon: Beer, desc: 'Vipimo vya Shoti' },
            { id: 'security', label: 'Usalama & Session', icon: Shield, desc: 'Auto-Lock & Passwords' },
            { id: 'camera', label: 'Kamera CCTV', icon: Video, desc: 'RTSP & Ulinzi' },
            { id: 'notifications', label: 'Taarifa & Alert', icon: Bell, desc: 'Arifa za Madeni' },
            { id: 'backup', label: 'Hifadhi & Rejesha', icon: HardDrive, desc: 'JSON Database Backup' },
            { id: 'about', label: 'Kuhusu EBS', icon: Info, desc: 'Toleo & Msaada' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-settings-${item.id}`}
                onClick={() => setActiveTab(item.id as SettingsTab)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {item.desc}
                    </div>
                  </div>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="lg:col-span-3">
          {/* TAB 1: BUSINESS SETTINGS */}
          {activeTab === 'business' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span>Taarifa za Biashara (Business Profile)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Taarifa hizi hutumika kutambulisha biashara na kuchapishwa juu ya risiti za mauzo.
                </p>
              </div>

              <form onSubmit={handleSaveBusinessProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Jina Rasmi la Biashara *</label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Jina la Mmiliki</label>
                    <input
                      type="text"
                      value={bizOwner}
                      onChange={(e) => setBizOwner(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Kaulimbiu (Tagline / Slogan)</label>
                    <input
                      type="text"
                      value={bizTagline}
                      onChange={(e) => setBizTagline(e.target.value)}
                      placeholder="Mfano: Huduma Bora na Vinywaji Baridi"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Aina Kuu ya Biashara</label>
                    <select
                      value={bizMode}
                      onChange={(e) => setBizMode(e.target.value as BusinessMode)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    >
                      {BUSINESS_TYPES_CATALOG.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.emoji} {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Namba ya Simu ya Biashara *</label>
                    <input
                      type="text"
                      required
                      value={bizPhone}
                      onChange={(e) => setBizPhone(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Barua Pepe (Email)</label>
                    <input
                      type="email"
                      value={bizEmail}
                      onChange={(e) => setBizEmail(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Mkoa</label>
                    <select
                      value={bizMkoa}
                      onChange={(e) => setBizMkoa(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    >
                      {TANZANIA_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Wilaya / Eneo</label>
                    <input
                      type="text"
                      value={bizWilaya}
                      onChange={(e) => setBizWilaya(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-300 mb-1">Mtaa & Eneo Halisi (Physical Address)</label>
                    <input
                      type="text"
                      value={bizAddress}
                      onChange={(e) => setBizAddress(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Namba ya TIN (TRA)</label>
                    <input
                      type="text"
                      value={bizTin}
                      onChange={(e) => setBizTin(e.target.value)}
                      placeholder="134-589-201"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Namba ya VRN (Kama umesajiliwa VAT)</label>
                    <input
                      type="text"
                      value={bizVrn}
                      onChange={(e) => setBizVrn(e.target.value)}
                      placeholder="40-002341-K"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Namba ya Leseni ya Biashara</label>
                    <input
                      type="text"
                      value={bizLicense}
                      onChange={(e) => setBizLicense(e.target.value)}
                      placeholder="BL-DAR-2026-9811"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Maandishi ya Chini ya Risiti (Receipt Footer)</label>
                    <input
                      type="text"
                      value={bizReceiptFooter}
                      onChange={(e) => setBizReceiptFooter(e.target.value)}
                      placeholder="Asante kwa kufanya biashara nasi! Karibu tena."
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hifadhi Mabadiliko ya Biashara</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: USERS & PERMISSIONS */}
          {activeTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Wafanyakazi & Mamlaka ya Kuingia</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Kila mfanyakazi ana akaunti yake binafsi na neno la siri. Usiruhusu kutumia neno la siri moja.
                  </p>
                </div>

                {isOwnerOrAdmin && (
                  <button
                    id="btn-add-new-user"
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ongeza Mfanyakazi Mpya</span>
                  </button>
                )}
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Mfanyakazi</th>
                      <th className="p-3.5">Username</th>
                      <th className="p-3.5">Jukumu (Role)</th>
                      <th className="p-3.5">Simu</th>
                      <th className="p-3.5">Hali</th>
                      <th className="p-3.5 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {users.map((u) => {
                      const roleInfo = ROLE_INFO[u.role] || { label: u.role, badgeColor: 'bg-slate-800 text-slate-300', description: '' };
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-black">
                                  Wewe
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {u.lastLogin ? `Aliingia: ${new Date(u.lastLogin).toLocaleDateString('sw-TZ')}` : 'Hajaingia bado'}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 font-bold">@{u.username}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${roleInfo.badgeColor}`}>
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-400">{u.phone || '—'}</td>
                          <td className="p-3.5">
                            <button
                              disabled={!isOwnerOrAdmin || isCurrent}
                              onClick={() => toggleUserActive(u.id)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                                u.active
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-red-950/80 text-red-400 border border-red-800/60'
                              } ${!isOwnerOrAdmin || isCurrent ? 'cursor-default' : 'hover:opacity-80'}`}
                            >
                              {u.active ? 'Hai (Active)' : 'Imefungwa'}
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {isOwnerOrAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenResetPass(u)}
                                  title="Weka Neno Jipya la Siri"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Hariri Mamlaka (Permissions)"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!isCurrent && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Je, una uhakika unataka kufuta mtumiaji ${u.name}?`)) {
                                        deleteUser(u.id);
                                        showToast(`Mtumiaji ${u.name} amefutwa.`);
                                      }
                                    }}
                                    title="Futa Mtumiaji"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-red-400 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Security Rule Callout */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white">Sheria za Usalama wa Akaunti (EBS Security Policy)</div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Maneno yote ya siri yamehifadhiwa kwa mfumo salama wa cryptographic hashing (SHA-256). Mfumo unazuia kuingia baada ya majaribio 5 yasiyo sahihi kwa dakika 15.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POS & SALES SETTINGS */}
          {activeTab === 'pos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <span>Mipangilio ya POS & Risiti za Mauzo</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Dhibiti kodi ya VAT ya TRA, idhini ya punguzo, na muundo wa kuchapisha risiti.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* VAT Settings */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Kodi ya Ongezeko la Thamani (VAT - TRA)</div>
                      <div className="text-slate-400 text-[11px]">Washa kama unatoa risiti zenye VAT kwa wateja.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableVat}
                        onChange={(e) => setEnableVat(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {enableVat && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Kiwango cha VAT (%)</label>
                        <input
                          type="number"
                          value={vatRate}
                          onChange={(e) => setVatRate(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold"
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center">
                        Kiwango cha kawaida cha VAT Tanzania ni 18%.
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Approvals */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="font-bold text-white">Idhini za Usalama wa Mauzo (Security Approvals)</div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="font-semibold text-slate-200">Hitaji Idhini ya Meneja kwa Punguzo (Discount)</div>
                      <div className="text-slate-500 text-[11px]">Keshia hawezi kutoa punguzo bila mamlaka.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={pinDiscount}
                      onChange={(e) => setPinDiscount(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <div>
                      <div className="font-semibold text-slate-200">Hitaji Idhini kwa Kurudisha Risiti (Refund / Void)</div>
                      <div className="text-slate-500 text-[11px]">Inazuia udanganyifu wa kufuta mauzo yaliyofanyika.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={pinRefund}
                      onChange={(e) => setPinRefund(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>
                </div>

                {/* Receipt Printer Width */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="font-bold text-white">Ukubwa wa Mashine ya Risiti (Thermal Printer)</div>
                  <div className="flex gap-4">
                    {['58mm', '80mm'].map((size) => (
                      <label key={size} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="printerSize"
                          value={size}
                          checked={receiptWidth === size}
                          onChange={() => setReceiptWidth(size as any)}
                          className="text-emerald-600 bg-slate-900 border-slate-800"
                        />
                        <span className="font-bold text-slate-300">{size} Thermal Paper</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSavePosSettings}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hifadhi Mipangilio ya POS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY & STOCK */}
          {activeTab === 'inventory' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  <span>Mipangilio ya Stoo & Bidhaa</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sanidi ukomo wa kutoa tahadhari ya bidhaa zinazokaribia kuisha (Low Stock Alert).
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="block font-bold text-slate-300">
                    Kiwango cha Chini cha Bidhaa (Default Minimum Stock Threshold)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full sm:w-48 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    Bidhaa ikifikia idadi hii au chini yake, itaonyeshwa kwenye orodha ya tahadhari (Low Stock Warning).
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveInventorySettings}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hifadhi Mipangilio ya Stoo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BAR & RESTAURANT */}
          {activeTab === 'bar' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Beer className="w-5 h-5 text-emerald-400" />
                  <span>Mipangilio ya Bar & Mgahawa</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Mfumo maalum wa kuhesabu shoti za vinywaji vikali (Spirits/Whisky), spillage na meza za mgahawa.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Washa Bar Mode (Bottle & Shot Tracking)</div>
                      <div className="text-slate-400 text-[11px]">Huruhusu kuuza chupa nzima au shoti za ml 30 / 60.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableBarFeatures}
                      onChange={(e) => setEnableBarFeatures(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Washa Mgahawa & Usimamizi wa Meza (Restaurant Tables)</div>
                      <div className="text-slate-400 text-[11px]">Huruhusu kufungua bili ya meza na kuhamisha oda.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableRestaurantFeatures}
                      onChange={(e) => setEnableRestaurantFeatures(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveBarSettings}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hifadhi Mipangilio ya Bar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CAMERA CCTV */}
          {activeTab === 'camera' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <span>Mipangilio ya Ulinzi & Kamera CCTV</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Uunganishaji wa kamera za IP/RTSP kwa ajili ya kufuatilia kaunta ya pesa, rafu ya vinywaji na stoo.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Washa Ufuatiliaji wa Kamera (CCTV Module)</div>
                      <div className="text-slate-400 text-[11px]">
                        Hufungua ukurasa wa CCTV na kuunganisha mauzo na rekodi za kamera.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableCamera}
                      onChange={(e) => setEnableCamera(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-slate-400">
                  <div className="font-bold text-white">Mamlaka ya Kutazama Kamera:</div>
                  <div>• Mmiliki (Owner) & Meneja wana haki ya kutazama live feed.</div>
                  <div>• Kila muamala wa POS unahusishwa na tukio la kamera (Surveillance Event Linking).</div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveCameraSettings}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hifadhi Mipangilio ya CCTV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  <span>Arifa & Tahadhari (Notifications)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Arifa za moja kwa moja za bidhaa zilizobaki kidogo na madeni yaliyopitiliza muda wa kulipwa.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Arifa ya Bidhaa Zilizopungua Stoo</div>
                    <div className="text-slate-400 text-[11px]">Hutoa taarifa bidhaa inapofikia kiwango cha chini.</div>
                  </div>
                  <span className="text-emerald-400 font-bold">Imewashwa (Active)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Arifa ya Madeni Yaliyopitiliza Siku (Overdue Debts)</div>
                    <div className="text-slate-400 text-[11px]">Hukumbusha wateja ambao hawajalipa deni kwa wakati.</div>
                  </div>
                  <span className="text-emerald-400 font-bold">Imewashwa (Active)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                  <span>Hifadhi & Rejesha Taarifa (Database Backup)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pakua nakala ya data zote za biashara yako (Mauzo, Bidhaa, Wateja, CCTV, Wafanyakazi) kama faili la JSON au rejesha kutoka faili la awali.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Export Card */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-base text-white">Pakua Backup ya Mfumo</div>
                    <p className="text-slate-400 text-[11px]">
                      Hifadhi faili zote za biashara yako kwenye kompyuta au flash drive kwa usalama.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pakua Faili la JSON</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-base text-white">Rejesha Data (Restore Backup)</div>
                    <p className="text-slate-400 text-[11px]">
                      Chagua faili la JSON lililohifadhiwa awali ili kurudisha data zote.
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200"
                    />
                  </div>
                  <button
                    disabled={!importFile}
                    onClick={handleImportBackup}
                    className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-40"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Rejesha Data Sasa</span>
                  </button>
                </div>
              </div>

              {/* Reset to Demo Data Card */}
              {isOwnerOrAdmin && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-red-200">Rejesha Taarifa za Demo (Reset Data)</div>
                    <div className="text-red-300/80 text-[11px]">
                      Futa data zilizorekodiwa na kurudisha mfumo kwenye mfano wa kuanzia.
                    </div>
                  </div>
                  <button
                    onClick={handleResetDataConfirm}
                    className="px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Rejesha Demo Data</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: APPEARANCE & THEMES */}
          {activeTab === 'appearance' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-emerald-400" />
                  <span>Mwonekano & Mandhari (Appearance & Themes)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Badilisha mtindo wa rangi, ukubwa wa maandishi, na mandhari ya EBS kulingana na mazingira ya kazi yako.
                </p>
              </div>

              {/* Theme Mode */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-200">Mtindo wa Mandhari (Theme Mode)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {THEME_MODES.map((mode) => {
                    const isSelected = themeMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(mode.id as ThemeMode);
                          showToast(`Mandhari imebadilishwa kuwa: ${mode.name}`);
                        }}
                        className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs">{mode.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{mode.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Color Palette */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-200">Rangi Kuu ya Vitufe & Viashiria (Primary Accent Color)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {COLOR_SCHEMES.map((scheme) => {
                    const isSelected = primaryColor === scheme.id;
                    return (
                      <button
                        key={scheme.id}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(scheme.id as PrimaryColor);
                          showToast(`Rangi kuu imebadilishwa kuwa: ${scheme.name}`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-white text-white shadow-lg'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-4 h-4 rounded-full ${scheme.previewClass} shadow-sm`} />
                          <span className="font-bold text-xs">{scheme.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-200">Ukubwa wa Maandishi (Font Size Scale)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FONT_SIZES.map((f) => {
                    const isSelected = fontSize === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFontSize(f.id as FontSize);
                          showToast(`Ukubwa wa maandishi umewekwa: ${f.name}`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 text-white shadow-lg'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{f.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Style */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-200">Mtindo wa Mandhari ya Nyuma (Background Texture)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BACKGROUND_STYLES.map((bg) => {
                    const isSelected = backgroundStyle === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => {
                          setBackgroundStyle(bg.id as BackgroundStyle);
                          showToast(`Mandhari ya nyuma imewekwa: ${bg.name}`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 text-white shadow-lg'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{bg.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{bg.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: LANGUAGE SELECTION */}
          {activeTab === 'language' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>Lugha ya Mfumo (Language Settings)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Chagua lugha kuu inayotumika kuonyesha menyu, vitufe, na risiti za mfumo wa EBS.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('sw');
                    showToast('Lugha imewekwa: Kiswahili (Swahili)');
                  }}
                  className={`p-5 rounded-2xl border text-left transition flex items-center justify-between ${
                    language === 'sw'
                      ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇹🇿</span>
                    <div>
                      <div className="font-bold text-sm text-white">Kiswahili</div>
                      <div className="text-[11px] text-slate-400">Lugha ya Taifa ya Tanzania (Chaguo-msingi)</div>
                    </div>
                  </div>
                  {language === 'sw' && <Check className="w-5 h-5 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    showToast('Language set to: English');
                  }}
                  className={`p-5 rounded-2xl border text-left transition flex items-center justify-between ${
                    language === 'en'
                      ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <div className="font-bold text-sm text-white">English</div>
                      <div className="text-[11px] text-slate-400">International Business Language</div>
                    </div>
                  </div>
                  {language === 'en' && <Check className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: SECURITY, SESSIONS & PASSWORD */}
          {activeTab === 'security' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8">
              {/* Auto Lock Timeout */}
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>Usalama & Kufunga Mfumo Kiotomatiki (Auto-Lock)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ikiwa terminal haitaguswa kwa muda huu, EBS itafunga kiotomatiki na kuhitaji nenosiri ili kuzuia matumizi yasiyo halali.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 1, label: 'Dakika 1' },
                  { value: 2, label: 'Dakika 2' },
                  { value: 5, label: 'Dakika 5' },
                  { value: 10, label: 'Dakika 10' },
                  { value: 15, label: 'Dakika 15' },
                  { value: 30, label: 'Dakika 30' },
                  { value: 0, label: 'Haikufungi kamwe' },
                ].map((item) => {
                  const isSelected = sessionTimeoutMinutes === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setSessionTimeoutMinutes(item.value);
                        showToast(`Muda wa Auto-lock umewekwa: ${item.label}`);
                      }}
                      className={`p-3 rounded-2xl border text-center transition ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <div className="text-xs">{item.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Active Sessions Monitor (Accountability) */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-400" />
                    <span>Session Zilizopo Hewani (Active User Sessions)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mfumo unarekodi nani ameingia, lini, na kwenye kifaa gani.
                  </p>
                </div>

                <div className="space-y-2">
                  {sessions.map((sess) => {
                    const isMe = sess.id === activeSession?.id;
                    return (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                            {sess.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{sess.userName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 uppercase font-mono">
                                {sess.userRole}
                              </span>
                              {isMe && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 font-bold">
                                  Kifaa Hiki (Wewe)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Kifaa: {sess.deviceInfo || 'Terminal Web'} • IP: {sess.ipAddress || '127.0.0.1'} • Kuingia: {new Date(sess.loginTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              terminateSession(sess.id);
                              showToast(`Session ya ${sess.userName} imefungwa.`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[11px] transition"
                          >
                            Funga Session
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Change Own Password */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Badilisha Neno Lako la Siri (My Password)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Weka neno jipya la siri kwa ajili ya akaunti yako ya sasa (<strong>@{currentUser.username}</strong>).
                  </p>
                </div>

                <form onSubmit={handleChangeOwnPasswordSubmit} className="space-y-4 text-xs max-w-md">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Neno la Siri la Sasa (Current Password) *</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Neno Jipya la Siri (New Password) *</label>
                    <div className="relative">
                      <input
                        type={showSecurityPass ? 'text' : 'password'}
                        required
                        value={newSecurityPassword}
                        onChange={(e) => setNewSecurityPassword(e.target.value)}
                        placeholder="Angalau herufi 8 na namba"
                        className="w-full p-3 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecurityPass(!showSecurityPass)}
                        className="absolute right-3 top-3 text-slate-400"
                      >
                        {showSecurityPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Thibitisha Neno Jipya la Siri *</label>
                    <input
                      type={showSecurityPass ? 'text' : 'password'}
                      required
                      value={confirmSecurityPassword}
                      onChange={(e) => setConfirmSecurityPassword(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Hifadhi Neno Jipya la Siri</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 10: ABOUT & INFO */}
          {activeTab === 'about' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                  EBS
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">EBS — Enterprise Business System</h2>
                  <div className="text-xs font-bold text-emerald-400">Version: V1.3.0</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-white">Mfumo wa Biashara</div>
                  <div className="text-slate-400">Version: <strong>V1.3.0</strong></div>
                  <div className="text-slate-400">Sarafu: <strong>TZS (Tanzanian Shilling)</strong></div>
                  <div className="text-slate-400">Muda: <strong>Africa/Dar_es_Salaam (GMT+3)</strong></div>
                  <div className="text-slate-400">Hali ya Mtandao: <strong>Offline & Local Storage Enabled</strong></div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-white">Msaada & Mawasiliano (Support)</div>
                  <div className="text-slate-400">Version: <strong>V1.3.0</strong></div>
                  <div className="text-slate-400">Support: <strong>0676674705</strong></div>
                  <div className="text-slate-400">Email: <strong>support@ebsbiz.co.tz</strong></div>
                  <div className="text-slate-400">Country: <strong>Tanzania</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs leading-relaxed">
                EBS imeundwa mahususi kwa ajili ya biashara ndogo, za kati na kubwa nchini Tanzania ikiwemo Bar, Pub, Grocery, Maduka ya Jumla, Rejareja, Vifaa vya Ujenzi, Dawa na Migahawa.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Sajili Mfanyakazi Mpya</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Jina Kamili la Mfanyakazi *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Mfano: Juma Shabani"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jina la Kuingilia (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="juma"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold lowercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Namba ya Simu</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="0754 000 000"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Jukumu (Role) *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="cashier">Keshia (Cashier) — Mauzo tu</option>
                  <option value="waiter">Mhudumu (Waiter) — Oda & Meza</option>
                  <option value="storekeeper">Mtunza Stoo (Storekeeper) — Stock</option>
                  <option value="manager">Meneja (Manager) — Ripoti & Usimamizi</option>
                  <option value="admin">Msimamizi Msaidizi (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Neno la Siri la Kuanzia (Default Password) *</label>
                <div className="relative">
                  <input
                    type={showNewUserPass ? 'text' : 'password'}
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full p-3 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPass(!showNewUserPass)}
                    className="absolute right-3 top-3 text-slate-400"
                  >
                    {showNewUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Hifadhi Mfanyakazi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER PERMISSIONS */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Mamlaka ya {selectedUser.name}</h3>
                <div className="text-xs text-slate-400">Jukumu: <strong>{selectedUser.role.toUpperCase()}</strong></div>
              </div>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'canMakeSales', label: 'Kufanya Mauzo (POS)' },
                  { key: 'canGiveDiscount', label: 'Kutoa Punguzo (Discount)' },
                  { key: 'canRefundSale', label: 'Kufuta/Kurudisha Risiti (Refund)' },
                  { key: 'canManageStock', label: 'Kusimamia Stoo (Stock)' },
                  { key: 'canAdjustStock', label: 'Kurekebisha Hesabu ya Stoo' },
                  { key: 'canManageProducts', label: 'Kuongeza / Kubadili Bei za Bidhaa' },
                  { key: 'canViewReports', label: 'Kutazama Ripoti za Mauzo' },
                  { key: 'canViewProfit', label: 'Kuona Faida Halisi (Profit/Loss)' },
                  { key: 'canManageCCTV', label: 'Kutazama Kamera CCTV' },
                  { key: 'canManageUsers', label: 'Kusimamia Watumiaji' },
                  { key: 'canManageExpenses', label: 'Kurekodi Gharama za Biashara' },
                  { key: 'canAccessBarMode', label: 'Kutumia Bar Mode & Shoti' },
                ].map((perm) => (
                  <label
                    key={perm.key}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700"
                  >
                    <span className="font-semibold text-slate-200">{perm.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(editPermissions[perm.key as keyof UserPermissions])}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({
                          ...prev,
                          [perm.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-800"
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Hifadhi Mamlaka
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showResetPassModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Weka Neno Jipya la Siri</h3>
                <div className="text-xs text-slate-400">Kwa mtumiaji: <strong>{selectedUser.name}</strong> (@{selectedUser.username})</div>
              </div>
              <button onClick={() => setShowResetPassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Neno Jipya la Siri *</label>
                <input
                  type="text"
                  required
                  value={adminResetPass}
                  onChange={(e) => setAdminResetPass(e.target.value)}
                  placeholder="Angalau herufi 8 na namba"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-600/20"
                >
                  Badilisha Sasa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
