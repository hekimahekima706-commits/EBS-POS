import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Product,
  User,
  Customer,
  DebtRecord,
  Supplier,
  Expense,
  Sale,
  AuditLog,
  RestaurantTable,
  BarVarianceRecord,
  CCTVCamera,
  CameraEvent,
  BusinessProfile,
  StockMovement,
  BusinessMode,
  StockMovementType,
  PaymentMethod,
  PaymentSplit,
  SaleItem,
  UserRole,
  UserPermissions,
  ActiveModules,
  PermissionKey,
  GranularPermissions,
  ThemeMode,
  PrimaryColor,
  FontSize,
  BackgroundStyle,
  AppLanguage,
  UserSession,
  AnyPermissionKey
} from '../types';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_DEBTS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_SALES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_TABLES,
  INITIAL_BAR_VARIANCE,
  INITIAL_CAMERAS,
  INITIAL_CAMERA_EVENTS,
  INITIAL_AUDIT_LOGS
} from '../data/initialData';
import { hashPassword, validatePasswordStrength } from '../utils/security';
import { isProductActive, isDemoProduct } from '../utils/productUtils';
import { hasPermission as checkHasPermission, ROLE_DEFAULT_PERMISSIONS } from '../utils/permissions';
import { TranslationKey, t as translateHelper } from '../i18n/translations';
import {
  getLocalDeviceIdentity,
  generateLocalTransactionId,
  enqueueOfflineTransaction,
  pushSyncQueueToServer,
  pullDeltaFromServer,
  isSimulatedOffline
} from '../utils/syncEngine';

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
}

interface AppContextType {
  // Profile & Setup
  profile: BusinessProfile;
  businessProfile: BusinessProfile; // alias for compatibility
  updateProfile: (updates: Partial<BusinessProfile>) => void;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void; // alias
  setBusinessMode: (mode: BusinessMode) => void;
  completeSetupWizard: (profileUpdates: Partial<BusinessProfile>, ownerData: { name: string; username: string; phone: string; password: string }) => Promise<void>;
  resetSetupWizard: () => void;

  // Active User & Authentication
  isAuthenticated: boolean;
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: (pinOrPassword: string) => Promise<{ success: boolean; message?: string }>;
  switchUser: (identifier: string, pass: string) => Promise<AuthResponse>;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  loginUser: (usernameOrPhone: string, password: string) => Promise<AuthResponse>;
  logoutUser: () => void;
  changePassword: (oldPassword: string, newPassword: string, newPin?: string) => Promise<AuthResponse>;
  resetUserPassword: (userId: string, customNewPassword?: string) => Promise<AuthResponse>;
  addUser: (userData: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>> & { name: string; phone: string; role: UserRole; username?: string; initialPassword?: string }) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserActive: (id: string) => void;
  updateUserPermissions: (userId: string, granularOverrides: Partial<GranularPermissions>) => void;

  // Sessions & Devices
  activeSession: UserSession | null;
  sessions: UserSession[];
  terminateSession: (sessionId: string) => void;
  sessionTimeoutMinutes: number;
  setSessionTimeoutMinutes: (minutes: number) => void;

  // Granular & Role RBAC
  canAccess: (permission: keyof UserPermissions) => boolean;
  hasGranularPermission: (permissionKey: AnyPermissionKey) => boolean;
  can: (permissionKey: AnyPermissionKey) => boolean; // short alias
  hasRole: (roles: UserRole[]) => boolean;
  verifyManagerApproval: (approverIdentifier: string, pinOrPass: string, actionDesc: string) => Promise<{ success: boolean; approver?: User; message?: string }>;

  // Appearance & Personal Preferences
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey) => string;

  // Products & Inventory
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  hardDeleteProduct: (id: string) => { success: boolean; message: string };
  adjustStock: (
    productId: string,
    quantityDelta: number,
    type: StockMovementType,
    reason: string,
    note?: string,
    varianceMl?: number
  ) => void;
  stockMovements: StockMovement[];

  // Sales & POS
  sales: Sale[];
  completeSale: (
    items: SaleItem[],
    payments: PaymentSplit[],
    options?: {
      discount?: number;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      tableId?: string;
      tableName?: string;
      waiterId?: string;
      waiterName?: string;
      patientName?: string;
      patientPhone?: string;
      doctorName?: string;
      prescriptionNumber?: string;
      pharmacistName?: string;
      isDispensing?: boolean;
    }
  ) => Sale;
  refundSale: (saleId: string, reason: string, approvedBy?: string) => void;
  cancelSale: (saleId: string, reason: string, approvedBy?: string) => void;

  // Customers & Debts
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'currentDebt' | 'totalSpent' | 'transactionCount'>) => { customer: Customer; isDuplicate?: boolean; existingCustomer?: Customer };
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  debts: DebtRecord[];
  payDebt: (debtId: string, amount: number, method: PaymentMethod, reference?: string, note?: string) => void;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'amountOwed'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  recordSupplierPayment: (supplierId: string, amount: number, note?: string) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'paymentMethod'> & { paymentMethod?: PaymentMethod }) => void;
  deleteExpense: (id: string) => void;

  // Bar Specific
  barVariances: BarVarianceRecord[];
  recordBarVariance: (record: Omit<BarVarianceRecord, 'id' | 'date' | 'recordedBy'>) => void;

  // Restaurant Tables
  tables: RestaurantTable[];
  updateTableStatus: (tableId: string, status: RestaurantTable['status'], activeWaiter?: string, totalBill?: number) => void;

  // CCTV & Events
  cameras: CCTVCamera[];
  addCamera: (cam: Omit<CCTVCamera, 'id'>) => void;
  updateCamera: (id: string, updates: Partial<CCTVCamera>) => void;
  deleteCamera: (id: string) => void;
  cameraEvents: CameraEvent[];
  addCameraEvent: (event: Omit<CameraEvent, 'id' | 'timestamp'>) => void;
  logCameraAccess: (cameraId: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  logAction: (action: string, details: string, entityType: AuditLog['entityType'], entityId?: string) => void;

  // Backup & Restore
  exportDatabaseJson: () => string;
  exportDataJson: () => string; // alias
  importDatabaseJson: (jsonString: string) => boolean;
  importDataJson: (jsonString: string) => boolean; // alias
  resetToDemoData: () => void;
  clearDemoData: () => { success: boolean; backupJson: string };
  startFreshBusiness: (details?: Partial<BusinessProfile>) => { success: boolean; backupJson: string };

  // Calculated Metrics
  todayStats: {
    salesRevenue: number;
    grossProfit: number;
    expensesTotal: number;
    netProfit: number;
    transactionsCount: number;
    cashTotal: number;
    mobileMoneyTotal: number;
    debtTotal: number;
    cardBankTotal: number;
    lowStockCount: number;
    overdueDebtsCount: number;
  };
}

const STORAGE_KEY = 'ebs_tanzania_data_v1_1';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Safe State Initializers with Database Migration
  const [profile, setProfile] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_profile`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_BUSINESS_PROFILE, ...parsed };
      }
      // Check legacy key
      const legacy = localStorage.getItem('ebs_tanzania_data_v1_profile');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return { ...INITIAL_BUSINESS_PROFILE, ...parsed, setupCompleted: true };
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
    return INITIAL_BUSINESS_PROFILE;
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Safely migrate and repair any seed user accounts that had corrupted hashes or obsolete demo credentials
          return parsed.filter(Boolean).map((u) => {
            if (!u || typeof u !== 'object') return INITIAL_USERS[0];
            // If this is the seed owner account or has corrupted legacy hash, safely sync with production credentials
            if (u?.id === 'usr-1' || (u?.role === 'owner' && (u?.passwordHash === '8e1b6f04c64b58e72614b62db419c8f9db1c3ca5e1f0e2d36d4dfbcbfb1d8481' || u?.username === 'amani' || u?.username === 'elly'))) {
              return {
                ...u,
                id: 'usr-1',
                username: 'owner01',
                name: u?.name || 'Selemani Rashid (Owner)',
                passwordHash: 'e1b642412970a6c896342c5e199144d5f53c093f8fcbffe304b2d4432db3c1af',
                mustChangePassword: true,
                pin: u?.pin || '1234',
                failedLoginAttempts: 0,
                lockoutUntil: undefined,
                active: true,
              };
            }
            // Also fix legacy broken hashes on seed staff accounts if needed
            const matchInitial = INITIAL_USERS.find((iu) => iu?.id === u?.id || (u?.username && iu?.username === u.username));
            if (matchInitial && (
              u?.passwordHash === 'f4b1626fcf017c6031f0cf8aa5efd24e756858e77a16f2fe102cc0a12e3e5c94' ||
              u?.passwordHash === '7c89f55e09841f3e7ff79aa806f1d07c3cb4adcf5c6cbafbfe07d0db3b6f2ec5' ||
              u?.passwordHash === 'c7c8c366ff117db3672d17cf3cf39f8fbd868b4e23cfc23e8006e8b4e18342ee' ||
              u?.passwordHash === '9a9de7c61ec4cfba7318ec7e7f6f5951d3b76cf5177a46f7c81aa99015f8a0ff' ||
              u?.passwordHash === '8e1b6f04c64b58e72614b62db419c8f9db1c3ca5e1f0e2d36d4dfbcbfb1d8481'
            )) {
              return {
                ...u,
                passwordHash: matchInitial.passwordHash,
                pin: u?.pin || matchInitial.pin,
              };
            }
            return u;
          });
        }
      }
      const legacy = localStorage.getItem('ebs_tanzania_data_v1_users');
      if (legacy) {
        const parsed: User[] = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(Boolean).map((u) => {
            if (!u || typeof u !== 'object') return INITIAL_USERS[0];
            const initMatch = INITIAL_USERS.find((iu) => iu?.id === u?.id || (u?.username && iu?.username === u.username));
            return {
              ...u,
              id: u?.id || (initMatch ? initMatch.id : 'usr-1'),
              passwordHash: (initMatch ? initMatch.passwordHash : 'e1b642412970a6c896342c5e199144d5f53c093f8fcbffe304b2d4432db3c1af'),
              createdAt: u?.createdAt || new Date().toISOString(),
              permissions: u?.permissions || (initMatch ? initMatch.permissions : INITIAL_USERS[0].permissions),
            };
          });
        }
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
    return INITIAL_USERS;
  });

  // Auth & Session State (Must NOT be true without valid user session)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem(`${STORAGE_KEY}_is_authenticated`);
      const authVal = savedAuth !== null ? JSON.parse(savedAuth) : false;
      if (authVal) {
        const savedUser = localStorage.getItem(`${STORAGE_KEY}_current_user`);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && typeof parsed === 'object' && parsed.id) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const savedLock = localStorage.getItem(`${STORAGE_KEY}_is_locked`);
      return savedLock ? JSON.parse(savedLock) : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedSession = localStorage.getItem(`${STORAGE_KEY}_current_user`);
      if (savedSession) {
        const userObj = JSON.parse(savedSession);
        if (userObj && typeof userObj === 'object' && userObj.id) {
          const match = users?.find((u) => u?.id === userObj.id && u?.active);
          if (match) return match;
          return userObj;
        }
      }
    } catch (e) {
      console.error('Error loading current user:', e);
    }
    return users?.[0] || INITIAL_USERS[0];
  });

  // Theme & Preferences State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_theme_mode`);
      if (saved) return saved as ThemeMode;
    } catch {}
    return currentUser?.preferences?.themeMode || 'dark';
  });

  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_primary_color`);
      if (saved) return saved as PrimaryColor;
    } catch {}
    return currentUser?.preferences?.primaryColor || 'emerald';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_font_size`);
      if (saved) return saved as FontSize;
    } catch {}
    return currentUser?.preferences?.fontSize || 'normal';
  });

  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_bg_style`);
      if (saved) return saved as BackgroundStyle;
    } catch {}
    return currentUser?.preferences?.backgroundStyle || 'default';
  });

  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_language`);
      if (saved) return saved as AppLanguage;
    } catch {}
    return currentUser?.preferences?.language || 'sw';
  });

  const [sessionTimeoutMinutes, setSessionTimeoutMinutesState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_session_timeout`);
      if (saved) return Number(saved);
    } catch {}
    return 30; // 30 minutes default
  });

  const [sessions, setSessions] = useState<UserSession[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sessions`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(Boolean);
        }
      }
    } catch {}
    return [
      {
        id: `sess-${Date.now()}`,
        userId: currentUser?.id || 'usr-1',
        userName: currentUser?.name || 'Amani Mwenyewe',
        userRole: currentUser?.role || 'owner',
        device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Main POS Terminal',
        loginTime: new Date().toISOString(),
        lastActivityTime: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        status: 'active'
      }
    ];
  });

  const [activeSession, setActiveSession] = useState<UserSession | null>(() => {
    return sessions?.[0] || null;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_products`) || localStorage.getItem('ebs_tanzania_data_v1_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading products:', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_customers`) || localStorage.getItem('ebs_tanzania_data_v1_customers');
      if (saved) {
        const parsed: Customer[] = JSON.parse(saved);
        return parsed.map((c) => ({
          ...c,
          category: c.category || (c.customerType === 'vip' ? 'vip' : c.customerType === 'wholesale' ? 'wholesale' : 'regular'),
          transactionCount: c.transactionCount || 1,
        }));
      }
    } catch (e) {
      console.error('Error loading customers:', e);
    }
    return INITIAL_CUSTOMERS;
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_debts`) || localStorage.getItem('ebs_tanzania_data_v1_debts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading debts:', e);
    }
    return INITIAL_DEBTS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`) || localStorage.getItem('ebs_tanzania_data_v1_suppliers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading suppliers:', e);
    }
    return INITIAL_SUPPLIERS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`) || localStorage.getItem('ebs_tanzania_data_v1_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading expenses:', e);
    }
    return INITIAL_EXPENSES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sales`) || localStorage.getItem('ebs_tanzania_data_v1_sales');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading sales:', e);
    }
    return INITIAL_SALES;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stock_movements`) || localStorage.getItem('ebs_tanzania_data_v1_stock_movements');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading stock movements:', e);
    }
    return INITIAL_STOCK_MOVEMENTS;
  });

  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tables`) || localStorage.getItem('ebs_tanzania_data_v1_tables');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading tables:', e);
    }
    return INITIAL_TABLES;
  });

  const [barVariances, setBarVariances] = useState<BarVarianceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_bar_variances`) || localStorage.getItem('ebs_tanzania_data_v1_bar_variances');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading bar variances:', e);
    }
    return INITIAL_BAR_VARIANCE;
  });

  const [cameras, setCameras] = useState<CCTVCamera[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cameras`) || localStorage.getItem('ebs_tanzania_data_v1_cameras');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading cameras:', e);
    }
    return INITIAL_CAMERAS;
  });

  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_camera_events`) || localStorage.getItem('ebs_tanzania_data_v1_camera_events');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading camera events:', e);
    }
    return INITIAL_CAMERA_EVENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_audit_logs`) || localStorage.getItem('ebs_tanzania_data_v1_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Persist State Changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_profile`, JSON.stringify(profile));
      localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
      localStorage.setItem(`${STORAGE_KEY}_current_user`, JSON.stringify(currentUser));
      localStorage.setItem(`${STORAGE_KEY}_is_authenticated`, JSON.stringify(isAuthenticated));
      localStorage.setItem(`${STORAGE_KEY}_is_locked`, JSON.stringify(isLocked));
      localStorage.setItem(`${STORAGE_KEY}_theme_mode`, themeMode);
      localStorage.setItem(`${STORAGE_KEY}_primary_color`, primaryColor);
      localStorage.setItem(`${STORAGE_KEY}_font_size`, fontSize);
      localStorage.setItem(`${STORAGE_KEY}_bg_style`, backgroundStyle);
      localStorage.setItem(`${STORAGE_KEY}_language`, language);
      localStorage.setItem(`${STORAGE_KEY}_session_timeout`, String(sessionTimeoutMinutes));
      localStorage.setItem(`${STORAGE_KEY}_sessions`, JSON.stringify(sessions));
      localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
      localStorage.setItem(`${STORAGE_KEY}_debts`, JSON.stringify(debts));
      localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
      localStorage.setItem(`${STORAGE_KEY}_stock_movements`, JSON.stringify(stockMovements));
      localStorage.setItem(`${STORAGE_KEY}_tables`, JSON.stringify(tables));
      localStorage.setItem(`${STORAGE_KEY}_bar_variances`, JSON.stringify(barVariances));
      localStorage.setItem(`${STORAGE_KEY}_cameras`, JSON.stringify(cameras));
      localStorage.setItem(`${STORAGE_KEY}_camera_events`, JSON.stringify(cameraEvents));
      localStorage.setItem(`${STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, [
    profile,
    users,
    currentUser,
    isAuthenticated,
    isLocked,
    themeMode,
    primaryColor,
    fontSize,
    backgroundStyle,
    language,
    sessionTimeoutMinutes,
    sessions,
    products,
    customers,
    debts,
    suppliers,
    expenses,
    sales,
    stockMovements,
    tables,
    barVariances,
    cameras,
    cameraEvents,
    auditLogs
  ]);

  // Logging Action Helper
  const logAction = useCallback((action: string, details: string, entityType: AuditLog['entityType'], entityId?: string) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'System / Admin',
      userRole: currentUser?.role || 'owner',
      action,
      details,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      deviceInfo: `${navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser'} (${navigator.platform})`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentUser]);

  // Inactivity Auto-Lock Timer
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('touchstart', resetActivity);
    window.addEventListener('click', resetActivity);

    const interval = setInterval(() => {
      if (sessionTimeoutMinutes > 0 && isAuthenticated && !isLocked) {
        const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
        if (elapsedMinutes >= sessionTimeoutMinutes) {
          setIsLocked(true);
          logAction('SESSION_AUTO_LOCKED', `Mfumo umefungwa kiotomatiki kwa kutokuwa na shughuli kwa dakika ${sessionTimeoutMinutes}`, 'auth', currentUser?.id);
        }
      }
    }, 30000); // check every 30s

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('click', resetActivity);
      clearInterval(interval);
    };
  }, [sessionTimeoutMinutes, isAuthenticated, isLocked, currentUser, logAction]);

  // Granular & Role RBAC Permission Checkers
  const hasGranularPermission = useCallback((permissionKey: AnyPermissionKey): boolean => {
    if (!currentUser) return false;
    return checkHasPermission(currentUser, permissionKey);
  }, [currentUser]);

  const can = hasGranularPermission;

  const canAccess = useCallback((permission: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'owner' || currentUser.role === 'admin') return true;
    return Boolean(currentUser.permissions?.[permission]);
  }, [currentUser]);

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  }, [currentUser]);

  // Theme & Appearance Setters
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    if (currentUser?.id) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          themeMode: mode,
        },
      };
      setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const setPrimaryColor = useCallback((color: PrimaryColor) => {
    setPrimaryColorState(color);
    if (currentUser?.id) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          primaryColor: color,
        },
      };
      setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    if (currentUser?.id) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          fontSize: size,
        },
      };
      setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const setBackgroundStyle = useCallback((style: BackgroundStyle) => {
    setBackgroundStyleState(style);
    if (currentUser?.id) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          backgroundStyle: style,
        },
      };
      setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    if (currentUser?.id) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          language: lang,
        },
      };
      setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updatedUser : u)));
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const setSessionTimeoutMinutes = useCallback((minutes: number) => {
    setSessionTimeoutMinutesState(minutes);
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return translateHelper(key, language);
  }, [language]);

  // Profile and Mode updates
  const updateProfile = useCallback((updates: Partial<BusinessProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.receiptFooter !== undefined) next.receiptFooterText = updates.receiptFooter;
      if (updates.receiptFooterText !== undefined) next.receiptFooter = updates.receiptFooterText;
      if (updates.vatEnabled !== undefined) next.enableVat = updates.vatEnabled;
      if (updates.enableVat !== undefined) next.vatEnabled = updates.enableVat;
      if (updates.vatRate !== undefined) next.taxRate = updates.vatRate;
      if (updates.taxRate !== undefined) next.vatRate = updates.taxRate;
      return next;
    });
    logAction('PROFILE_UPDATED', `Taarifa za biashara zimesasishwa: ${updates.name || ''}`, 'setting');
  }, [logAction]);

  const setBusinessMode = useCallback((mode: BusinessMode) => {
    setProfile((prev) => ({
      ...prev,
      mode,
      enableBarFeatures: mode === 'bar' ? true : prev.enableBarFeatures,
      enableRestaurantFeatures: mode === 'restaurant' ? true : prev.enableRestaurantFeatures,
      enablePharmacyFeatures: mode === 'pharmacy' ? true : prev.enablePharmacyFeatures,
    }));
    logAction('MODE_CHANGED', `Hali ya biashara imebadilishwa kuwa: ${mode.toUpperCase()}`, 'setting');
  }, [logAction]);

  // First Time Setup Wizard Completion
  const completeSetupWizard = useCallback(async (
    profileUpdates: Partial<BusinessProfile>,
    ownerData: { name: string; username: string; phone: string; password: string }
  ) => {
    const ownerPassHash = await hashPassword(ownerData.password);
    const ownerUser: User = {
      id: `usr-owner-${Date.now()}`,
      name: ownerData.name,
      username: ownerData.username.toLowerCase().trim(),
      phone: ownerData.phone,
      role: 'owner',
      passwordHash: ownerPassHash,
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      permissions: {
        canViewReports: true,
        canViewProfit: true,
        canManageUsers: true,
        canManagePermissions: true,
        canManageCCTV: true,
        canViewAuditLogs: true,
        canManageSettings: true,
        canBackupRestore: true,
        canManageStock: true,
        canAdjustStock: true,
        canManageProducts: true,
        canMakeSales: true,
        canDeleteSales: true,
        canGiveDiscount: true,
        canRefundSale: true,
        canManageCustomers: true,
        canManageSuppliers: true,
        canManageExpenses: true,
        canManageTables: true,
        canAccessBarMode: true,
      },
    };

    setUsers([ownerUser]);
    setCurrentUser(ownerUser);

    setProfile((prev) => ({
      ...prev,
      ...profileUpdates,
      ownerName: ownerData.name,
      setupCompleted: true,
    }));

    logAction('SETUP_COMPLETED', `Usanidi wa kwanza umekamilika na mmiliki ${ownerData.name} kusajiliwa.`, 'setting');
  }, [logAction]);

  const resetSetupWizard = useCallback(() => {
    setProfile((prev) => ({ ...prev, setupCompleted: false }));
  }, []);

  // Authentication & Passwords
  const loginUser = useCallback(async (usernameOrPhone: string, pass: string): Promise<AuthResponse> => {
    const cleanIdentifier = usernameOrPhone.toLowerCase().trim();
    const cleanPhone = usernameOrPhone.replace(/\D/g, '');

    const targetUser = users.find((u) => {
      const matchUsername = u.username.toLowerCase() === cleanIdentifier;
      const matchPhone = cleanPhone.length > 5 && u.phone.replace(/\D/g, '').includes(cleanPhone);
      return matchUsername || matchPhone;
    });

    if (!targetUser) {
      logAction('LOGIN_FAILED', `Majaribio ya kuingia na akaunti isiyopo: ${usernameOrPhone}`, 'auth');
      return { success: false, message: 'Username au Namba ya Simu haijapatikana.' };
    }

    if (!targetUser.active) {
      logAction('LOGIN_BLOCKED', `Mtumiaji aliyefungwa amejaribu kuingia: ${targetUser.name}`, 'auth', targetUser.id);
      return { success: false, message: 'Akaunti hii imesitishwa. Wasiliana na Mwenye Biashara.' };
    }

    // Check lockout
    if (targetUser.lockoutUntil && new Date(targetUser.lockoutUntil) > new Date()) {
      const waitSeconds = Math.ceil((new Date(targetUser.lockoutUntil).getTime() - Date.now()) / 1000);
      return {
        success: false,
        message: `Akaunti imefungwa kwa muda kutokana na makosa mengi ya password. Tafadhali subiri kwa sekunde ${waitSeconds}.`
      };
    }

    const inputHash = await hashPassword(pass);
    if (inputHash !== targetUser.passwordHash) {
      const newAttempts = (targetUser.failedLoginAttempts || 0) + 1;
      let lockoutTime: string | undefined = undefined;
      if (newAttempts >= 5) {
        lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min lockout
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, failedLoginAttempts: newAttempts, lockoutUntil: lockoutTime } : u))
      );

      logAction('LOGIN_FAILED_PASSWORD', `Password isiyo sahihi kwa: ${targetUser.name} (Majaribio: ${newAttempts})`, 'auth', targetUser.id);
      return { success: false, message: 'Neno la siri (Password) si sahihi.' };
    }

    // Success login
    const updatedUser: User = {
      ...targetUser,
      lastLogin: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);

    // If user must change password (e.g. first login with temporary password),
    // keep isAuthenticated=false so user is forced to create a new personal password and PIN before gaining full system access
    if (updatedUser.mustChangePassword) {
      setIsAuthenticated(false);
      setIsLocked(false);
      logAction('LOGIN_TEMP_PASSWORD', `Mtumiaji ${targetUser.name} ameingia kwa neno la muda na anaelekezwa kuweka neno jipya la siri`, 'auth', targetUser.id);
      return {
        success: true,
        user: updatedUser,
        mustChangePassword: true
      };
    }

    setIsAuthenticated(true);
    setIsLocked(false);

    // Apply user preferences if available
    if (updatedUser.preferences?.themeMode) setThemeModeState(updatedUser.preferences.themeMode);
    if (updatedUser.preferences?.primaryColor) setPrimaryColorState(updatedUser.preferences.primaryColor);
    if (updatedUser.preferences?.fontSize) setFontSizeState(updatedUser.preferences.fontSize);
    if (updatedUser.preferences?.backgroundStyle) setBackgroundStyleState(updatedUser.preferences.backgroundStyle);
    if (updatedUser.preferences?.language) setLanguageState(updatedUser.preferences.language);

    // Create / Update Session
    const newSession: UserSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: updatedUser.id,
      userName: updatedUser.name,
      userRole: updatedUser.role,
      deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Terminal' : 'Desktop / POS Register',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Local)',
      status: 'active'
    };

    setActiveSession(newSession);
    setSessions((prev) => [newSession, ...prev.slice(0, 19)]); // keep last 20

    logAction('LOGIN_SUCCESS', `Mtumiaji ${targetUser.name} (${targetUser.role}) ameingia kwenye mfumo`, 'auth', targetUser.id);

    return {
      success: true,
      user: updatedUser,
      mustChangePassword: false
    };
  }, [users, logAction]);

  const logoutUser = useCallback(() => {
    if (activeSession?.id) {
      setSessions((prev) =>
        prev.map((s) => (s?.id === activeSession.id ? { ...s, logoutTime: new Date().toISOString(), status: 'terminated' } : s))
      );
    }
    setActiveSession(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    logAction('LOGOUT', `Mtumiaji ${currentUser?.name || 'Mtumiaji'} ametoka kwenye mfumo`, 'auth', currentUser?.id);
  }, [currentUser, activeSession, logAction]);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    logAction('SESSION_LOCKED', `Mfumo umefungwa kwa kitufe cha Lock (🔒) na ${currentUser?.name || 'Mtumiaji'}`, 'auth', currentUser?.id);
  }, [currentUser, logAction]);

  const unlockSession = useCallback(async (pinOrPassword: string): Promise<{ success: boolean; message?: string }> => {
    const clean = pinOrPassword.trim();
    if (!clean) {
      return { success: false, message: 'Tafadhali ingiza PIN au Password.' };
    }

    // Check PIN first
    if (currentUser?.pin && currentUser.pin === clean) {
      setIsLocked(false);
      logAction('SESSION_UNLOCKED_PIN', `Mfumo umefunguliwa na ${currentUser?.name || 'Mtumiaji'} kwa PIN`, 'auth', currentUser?.id);
      return { success: true };
    }

    // Check Password Hash
    const hashed = await hashPassword(clean);
    if (currentUser?.passwordHash && hashed === currentUser.passwordHash) {
      setIsLocked(false);
      logAction('SESSION_UNLOCKED_PASS', `Mfumo umefunguliwa na ${currentUser?.name || 'Mtumiaji'} kwa Password`, 'auth', currentUser?.id);
      return { success: true };
    }

    // Check if another active user is unlocking
    const otherUser = users.find((u) => u?.pin === clean && u?.active);
    if (otherUser) {
      setCurrentUser(otherUser);
      setIsLocked(false);
      logAction('SESSION_SWITCH_UNLOCKED', `Mfumo umefunguliwa na mtumiaji mwingine: ${otherUser.name}`, 'auth', otherUser.id);
      return { success: true };
    }

    return { success: false, message: 'PIN au Password si sahihi.' };
  }, [currentUser, users, logAction]);

  const switchUser = useCallback(async (identifier: string, pass: string): Promise<AuthResponse> => {
    return loginUser(identifier, pass);
  }, [loginUser]);

  const terminateSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, logoutTime: new Date().toISOString(), status: 'terminated' } : s))
    );
    if (activeSession?.id === sessionId) {
      logoutUser();
    }
  }, [activeSession, logoutUser]);

  const changePassword = useCallback(async (oldPass: string, newPass: string, newPin?: string): Promise<AuthResponse> => {
    const oldHash = await hashPassword(oldPass);
    if (oldHash !== currentUser.passwordHash) {
      return { success: false, message: 'Neno la siri la sasa (au la muda) si sahihi.' };
    }

    const strength = validatePasswordStrength(newPass);
    if (!strength.isValid) {
      return { success: false, message: strength.errors.join(' ') };
    }

    const newHash = await hashPassword(newPass);
    const updated: User = {
      ...currentUser,
      passwordHash: newHash,
      pin: newPin ? newPin.trim() : (currentUser.pin || '1234'),
      mustChangePassword: false, // cleared
    };

    setUsers((prev) => prev.map((u) => (u?.id === currentUser?.id ? updated : u)));
    setCurrentUser(updated);
    setIsAuthenticated(true);
    setIsLocked(false);

    // Create session now that password has been safely established
    const newSession: UserSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: updated.id,
      userName: updated.name,
      userRole: updated.role,
      deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Terminal' : 'Desktop / POS Register',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Local)',
      status: 'active'
    };
    setActiveSession(newSession);
    setSessions((prev) => [newSession, ...prev.slice(0, 19)]);

    logAction('PASSWORD_CHANGED', `Mtumiaji ${currentUser?.name || ''} amesasisha neno lake la siri na PIN kikamilifu`, 'auth', currentUser?.id);

    return { success: true, message: 'Neno jipya la siri na PIN vimewekwa kikamilifu!' };
  }, [currentUser, logAction]);

  // Reset User Password (generates or sets temporary password for user, forces first login change)
  const resetUserPassword = useCallback(async (userId: string, customNewPassword?: string): Promise<AuthResponse> => {
    if (!canAccess('canManageUsers')) {
      return { success: false, message: 'Huna mamlaka ya kuweka upya maneno ya siri ya wafanyakazi.' };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'Mtumiaji hajapatikana.' };
    }

    // Generate readable random temporary password if not provided
    let tempPass = customNewPassword?.trim();
    if (!tempPass) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      tempPass = 'Ebs@';
      for (let i = 0; i < 4; i++) {
        tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const newHash = await hashPassword(tempPass);
    const updated: User = {
      ...targetUser,
      passwordHash: newHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    logAction('USER_PASSWORD_RESET', `Neno la siri la muda limewekwa kwa ${targetUser.name} na ${currentUser.name}`, 'user', userId);

    return {
      success: true,
      message: `Neno jipya la siri limewekwa: ${tempPass}`,
      temporaryPassword: tempPass,
    };
  }, [canAccess, currentUser, users, logAction]);

  const updateUserPermissions = useCallback((userId: string, granularOverrides: Partial<GranularPermissions>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updatedGranular = {
            ...(u.granularPermissions || {}),
            ...granularOverrides,
          };
          return { ...u, granularPermissions: updatedGranular };
        }
        return u;
      })
    );
    logAction('PERMISSIONS_UPDATED', `Ruhusa za kipekee zimesasishwa kwa mtumiaji ID: ${userId}`, 'user', userId);
  }, [logAction]);

  // Business Owner / Manager Approval Verification
  const verifyManagerApproval = useCallback(async (
    approverIdentifier: string,
    pinOrPass: string,
    actionDesc: string
  ): Promise<{ success: boolean; approver?: User; message?: string }> => {
    const cleanId = approverIdentifier.toLowerCase().trim();
    const approver = users.find(
      (u) => (u.username.toLowerCase() === cleanId || u.phone.includes(cleanId)) && (u.role === 'owner' || u.role === 'manager' || u.role === 'admin') && u.active
    );

    if (!approver) {
      return { success: false, message: 'Akaunti ya Msimamizi au Mmiliki haijapatikana.' };
    }

    // Check PIN or Password
    let matched = approver.pin === pinOrPass.trim();
    if (!matched) {
      const hashed = await hashPassword(pinOrPass.trim());
      matched = hashed === approver.passwordHash;
    }

    if (!matched) {
      logAction('APPROVAL_REJECTED', `Idhini imeshindwa kwa kitendo: "${actionDesc}". Neno la siri la msimamizi si sahihi.`, 'auth', approver.id);
      return { success: false, message: 'PIN au Password ya Msimamizi si sahihi.' };
    }

    logAction('APPROVAL_GRANTED', `Kitendo: "${actionDesc}" kimeidhinishwa na ${approver.name} (${approver.role})`, 'auth', approver.id);
    return { success: true, approver };
  }, [users, logAction]);

  const addUser = useCallback(async (userData: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>> & { name: string; phone: string; role: UserRole; username?: string; initialPassword?: string }): Promise<User> => {
    const cleanPass = userData.initialPassword || 'Ebs12345!';
    const passHash = await hashPassword(cleanPass);
    const generatedUsername = (userData.username || userData.name.toLowerCase().replace(/[^a-z0-9]/gi, '')).toLowerCase().trim();
    const newUser: User = {
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      pin: userData.pin || '1234',
      active: userData.active !== undefined ? userData.active : true,
      canDiscount: userData.canDiscount,
      canRefund: userData.canRefund,
      canAdjustStock: userData.canAdjustStock,
      canViewProfit: userData.canViewProfit,
      canManageUsers: userData.canManageUsers,
      id: `usr-${Date.now()}`,
      username: generatedUsername || `user${Date.now().toString().slice(-4)}`,
      passwordHash: passHash,
      createdAt: new Date().toISOString(),
      permissions: userData.permissions || {
        canViewReports: userData.role === 'owner' || userData.role === 'manager' || userData.role === 'accountant',
        canViewProfit: userData.canViewProfit !== undefined ? userData.canViewProfit : (userData.role === 'owner' || userData.role === 'manager'),
        canManageUsers: userData.canManageUsers !== undefined ? userData.canManageUsers : (userData.role === 'owner' || userData.role === 'manager'),
        canManagePermissions: userData.role === 'owner',
        canManageCCTV: userData.role === 'owner' || userData.role === 'manager',
        canViewAuditLogs: userData.role === 'owner' || userData.role === 'manager',
        canManageSettings: userData.role === 'owner',
        canBackupRestore: userData.role === 'owner',
        canManageStock: userData.canAdjustStock !== undefined ? userData.canAdjustStock : (userData.role === 'storekeeper' || userData.role === 'manager' || userData.role === 'owner'),
        canAdjustStock: userData.canAdjustStock !== undefined ? userData.canAdjustStock : (userData.role === 'storekeeper' || userData.role === 'manager' || userData.role === 'owner'),
        canManageProducts: userData.role === 'manager' || userData.role === 'owner',
        canMakeSales: userData.role === 'cashier' || userData.role === 'waiter' || userData.role === 'manager' || userData.role === 'owner',
        canDeleteSales: userData.role === 'owner',
        canGiveDiscount: userData.canDiscount !== undefined ? userData.canDiscount : (userData.role === 'manager' || userData.role === 'owner'),
        canRefundSale: userData.canRefund !== undefined ? userData.canRefund : (userData.role === 'manager' || userData.role === 'owner'),
        canManageCustomers: true,
        canManageSuppliers: userData.role === 'manager' || userData.role === 'storekeeper' || userData.role === 'owner',
        canManageExpenses: userData.role === 'manager' || userData.role === 'owner' || userData.role === 'accountant',
        canManageTables: true,
        canAccessBarMode: true,
      },
    };

    setUsers((prev) => [...prev, newUser]);
    logAction('USER_CREATED', `Mtumiaji mpya ${newUser.name} (${newUser.role}) ameongezwa`, 'user', newUser.id);
    return newUser;
  }, [logAction]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u?.id === id ? { ...u, ...updates } : u)));
    if (currentUser?.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
    logAction('USER_UPDATED', `Mtumiaji aliyesasishwa: ID ${id}`, 'user', id);
  }, [currentUser?.id, logAction]);

  const deleteUser = useCallback((id: string) => {
    if (currentUser?.id === id) {
      alert('Huwezi kufuta akaunti unayotumia sasa hivi!');
      return;
    }
    setUsers((prev) => prev.filter((u) => u?.id !== id));
    logAction('USER_DELETED', `Mtumiaji amefutwa: ID ${id}`, 'user', id);
  }, [currentUser?.id, logAction]);

  const toggleUserActive = useCallback((id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextActive = !u.active;
          logAction('USER_STATUS_TOGGLE', `Mtumiaji ${u.name} ${nextActive ? 'Amefunguliwa' : 'Amefungwa'}`, 'user', id);
          return { ...u, active: nextActive };
        }
        return u;
      })
    );
  }, [logAction]);

  // Products
  const addProduct = useCallback((productData: Omit<Product, 'id'>): Product => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
    logAction('PRODUCT_ADDED', `Bidhaa mpya: ${newProd.name} (Bei: ${newProd.sellingPrice})`, 'product', newProd.id);
    return newProd;
  }, [logAction]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    logAction('PRODUCT_UPDATED', `Bidhaa iliyorekebishwa: ID ${id}`, 'product', id);
  }, [logAction]);

  const deleteProduct = useCallback((id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
    logAction('PRODUCT_ARCHIVED', `Bidhaa imehifadhiwa/kuzimwa kwenye mfumo: ${target?.name || id}`, 'product', id);
  }, [products, logAction]);

  const restoreProduct = useCallback((id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: true } : p)));
    logAction('PRODUCT_RESTORED', `Bidhaa imerejeshwa kutumika: ${target?.name || id}`, 'product', id);
  }, [products, logAction]);

  const hardDeleteProduct = useCallback((id: string): { success: boolean; message: string } => {
    const target = products.find((p) => p.id === id);
    const hasSalesHistory = sales.some((s) => s.items.some((i) => i.productId === id));
    
    if (hasSalesHistory) {
      // Keep deactivated to protect financial audit history and sales reports
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
      logAction('PRODUCT_ARCHIVED', `Bidhaa imehifadhiwa (haijafutwa kabisa ili kulinda ripoti za zamani za mauzo): ${target?.name || id}`, 'product', id);
      return {
        success: true,
        message: `Bidhaa ya "${target?.name || 'Hii'}" ina historia ya mauzo yaliyopita. Imehifadhiwa (Archived) na kufichwa ili kulinda usahihi wa hesabu na ripoti za fedha.`
      };
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    logAction('PRODUCT_PERMANENTLY_DELETED', `Bidhaa imefutwa kabisa kwenye mfumo (haina historia ya mauzo): ${target?.name || id}`, 'product', id);
    return {
      success: true,
      message: `Bidhaa ya "${target?.name || 'Hii'}" imefutwa kabisa kwenye mfumo.`
    };
  }, [products, sales, logAction]);

  const adjustStock = useCallback((
    productId: string,
    quantityDelta: number,
    type: StockMovementType,
    reason: string,
    note?: string,
    varianceMl?: number
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.stockQty;
    const newStock = Math.max(0, previousStock + quantityDelta);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockQty: newStock } : p))
    );

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      productId,
      productName: product.name,
      type,
      quantity: quantityDelta,
      previousStock,
      newStock,
      unit: product.unit,
      reason,
      note,
      userId: currentUser?.id || 'usr-anon',
      userName: currentUser?.name || 'Mtumiaji',
      timestamp: new Date().toISOString(),
      varianceMl,
    };

    setStockMovements((prev) => [movement, ...prev]);
    logAction('STOCK_ADJUSTED', `${product.name}: Hesabu imerekebishwa toka ${previousStock} hadi ${newStock} (${reason})`, 'stock', productId);

    // Queue in Offline-First Sync Engine
    const device = getLocalDeviceIdentity();
    const bizId = (profile as any)?.id || 'EBS-BIZ-000001';
    const deviceId = device?.id || 'DEV-LOCAL-001';
    const deviceName = device?.name || 'Local POS Terminal';
    enqueueOfflineTransaction(bizId, {
      localId: generateLocalTransactionId(deviceId),
      businessId: bizId,
      userId: currentUser?.id || 'usr-anon',
      userName: currentUser?.name || 'Mtumiaji',
      deviceId: deviceId,
      deviceName: deviceName,
      entityType: 'stock_adjustment',
      action: 'update',
      payload: {
        productId,
        quantityDelta,
        type,
        reason,
        note,
        varianceMl,
        newStock
      }
    });

    if (!isSimulatedOffline()) {
      pushSyncQueueToServer(bizId, deviceId).catch(() => {});
    }
  }, [products, profile, currentUser, logAction]);

  // Sales & POS
  const completeSale = useCallback((
    items: SaleItem[],
    payments: PaymentSplit[],
    options?: {
      discount?: number;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      tableId?: string;
      tableName?: string;
      waiterId?: string;
      waiterName?: string;
      patientName?: string;
      patientPhone?: string;
      doctorName?: string;
      prescriptionNumber?: string;
      pharmacistName?: string;
      isDispensing?: boolean;
    }
  ): Sale => {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const discount = options?.discount || 0;
    const tax = profile.enableVat ? (subtotal - discount) * (profile.taxRate / 100) : 0;
    const total = Math.max(0, subtotal - discount + tax);
    const totalCost = items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
    const profit = total - totalCost;

    const invSeq = sales.length + 1049;
    const invoiceNo = `INV-${invSeq}`;
    const saleId = `sale-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const isDebtSale = payments.some((p) => p.method === 'debt');
    const primaryMethod = payments[0]?.method || 'cash';

    const isPharmacyDispense = options?.isDispensing ?? (
      profile.mode === 'pharmacy' || 
      items.some((i) => !!i.dosageInstruction || !!i.batchNumber || !!i.expiryDate || !!i.genericName)
    );

    const newSale: Sale = {
      id: saleId,
      invoiceNo,
      items,
      subtotal,
      discount,
      tax,
      total,
      profit,
      payments,
      paymentMethod: primaryMethod,
      customerId: options?.customerId,
      customerName: options?.customerName || (options?.customerId ? 'Mteja wa Kawaida' : undefined),
      customerPhone: options?.customerPhone,
      cashierId: currentUser?.id || 'usr-cashier',
      cashierName: currentUser?.name || 'Mhudumu / Keshia',
      status: 'completed',
      tableId: options?.tableId,
      tableName: options?.tableName,
      waiterId: options?.waiterId,
      waiterName: options?.waiterName,
      timestamp,
      notes: options?.notes,
      cameraEventId: `cam-ev-${Date.now()}`,
      // Pharmacy Dispensing Details
      patientName: options?.patientName,
      patientPhone: options?.patientPhone,
      doctorName: options?.doctorName,
      prescriptionNumber: options?.prescriptionNumber,
      pharmacistName: options?.pharmacistName || (isPharmacyDispense ? currentUser.name : undefined),
      isDispensing: isPharmacyDispense,
    };

    setSales((prev) => [newSale, ...prev]);

    // Deduct stock for sold items
    items.forEach((item) => {
      if (item.isServing && item.servingSizeMl) {
        // Deduct remaining ml on open bottle
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === item.productId) {
              const currentMl = p.openBottleRemainingMl || p.bottleSizeMl || 750;
              const deductedMl = item.servingSizeMl! * item.quantity;
              let nextMl = currentMl - deductedMl;
              let nextStock = p.stockQty;
              if (nextMl <= 0) {
                // Opened bottle finished, open a new one if available
                nextStock = Math.max(0, p.stockQty - 1);
                nextMl = (p.bottleSizeMl || 750) + nextMl;
              }
              return { ...p, openBottleRemainingMl: Math.max(0, nextMl), stockQty: nextStock };
            }
            return p;
          })
        );
      } else {
        // Whole unit or packaging unit deduction (always maintains stockQty in baseUnit)
        const qtyToDeduct = item.isPackage && item.unitsPerPackage
          ? item.quantity * item.unitsPerPackage
          : (item.baseUnitEquivalentQuantity || item.quantity);

        setProducts((prev) =>
          prev.map((p) => (p.id === item.productId ? { ...p, stockQty: Math.max(0, p.stockQty - qtyToDeduct) } : p))
        );
      }
    });

    // Create debt record if sold on credit
    if (isDebtSale && options?.customerId) {
      const debtAmount = payments.filter((p) => p.method === 'debt').reduce((s, p) => s + p.amount, 0);
      const newDebt: DebtRecord = {
        id: `debt-${Date.now()}`,
        customerId: options.customerId,
        customerName: options.customerName || 'Mteja',
        customerPhone: options.customerPhone || '',
        saleId,
        invoiceNo,
        originalAmount: debtAmount,
        paidAmount: 0,
        remainingAmount: debtAmount,
        status: 'unpaid',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: timestamp,
        notes: options.notes,
        payments: [],
      };
      setDebts((prev) => [newDebt, ...prev]);

      // Update customer stats
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === options.customerId
            ? {
                ...c,
                currentDebt: c.currentDebt + debtAmount,
                totalSpent: c.totalSpent + total,
                transactionCount: (c.transactionCount || 0) + 1,
                lastPurchaseDate: timestamp,
              }
            : c
        )
      );
    } else if (options?.customerId) {
      // Normal customer purchase stats update
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === options.customerId
            ? {
                ...c,
                totalSpent: c.totalSpent + total,
                transactionCount: (c.transactionCount || 0) + 1,
                lastPurchaseDate: timestamp,
              }
            : c
        )
      );
    }

    // Auto-create Camera Surveillance Event for Transaction
    const cameraEv: CameraEvent = {
      id: newSale.cameraEventId!,
      cameraId: 'cam-1',
      cameraName: 'CAM 01 — Kaunta ya POS',
      timestamp,
      type: 'sale',
      title: `Risiti ${invoiceNo} Imetolewa`,
      description: `Mauzo ya ${total.toLocaleString()} TZS yamekamilika (${primaryMethod.toUpperCase()}) na ${currentUser?.name || 'Keshia'}`,
      relatedTransactionId: saleId,
      invoiceNo,
      operatorName: currentUser?.name || 'Keshia',
      amount: total,
      snapshotColor: '#059669',
    };
    setCameraEvents((prev) => [cameraEv, ...prev]);

    logAction('SALE_COMPLETED', `Risiti ${invoiceNo} ya TZS ${total.toLocaleString()} (${primaryMethod})`, 'sale', saleId);

    // Queue in Offline-First Sync Engine & push if connected
    const device = getLocalDeviceIdentity();
    const bizId = (profile as any)?.id || 'EBS-BIZ-000001';
    const deviceId = device?.id || 'DEV-LOCAL-001';
    const deviceName = device?.name || 'Local POS Terminal';
    enqueueOfflineTransaction(bizId, {
      localId: generateLocalTransactionId(deviceId),
      businessId: bizId,
      userId: currentUser?.id || 'usr-cashier',
      userName: currentUser?.name || 'Keshia',
      deviceId: deviceId,
      deviceName: deviceName,
      entityType: 'sale',
      action: 'create',
      payload: newSale
    });

    if (!isSimulatedOffline()) {
      pushSyncQueueToServer(bizId, deviceId).catch(() => {});
    }

    return newSale;
  }, [sales.length, profile, currentUser, logAction]);

  const refundSale = useCallback((saleId: string, reason: string, approvedBy?: string) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'refunded',
              refundReason: reason,
              refundedBy: approvedBy ? `${currentUser.name} (Idhinishwa na ${approvedBy})` : currentUser.name,
              refundedAt: new Date().toISOString(),
            }
          : s
      )
    );
    logAction('SALE_REFUNDED', `Risiti imerejeshwa: ${saleId} (Sababu: ${reason})${approvedBy ? ` [Idhini: ${approvedBy}]` : ''}`, 'sale', saleId);
  }, [currentUser.name, logAction]);

  const cancelSale = useCallback((saleId: string, reason: string, approvedBy?: string) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'cancelled',
              refundReason: reason,
              refundedBy: approvedBy ? `${currentUser.name} (Idhinishwa na ${approvedBy})` : currentUser.name,
              refundedAt: new Date().toISOString(),
            }
          : s
      )
    );
    logAction('SALE_CANCELLED', `Risiti imefutwa: ${saleId} (Sababu: ${reason})${approvedBy ? ` [Idhini: ${approvedBy}]` : ''}`, 'sale', saleId);
  }, [currentUser.name, logAction]);

  // Customers & Debts
  const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'createdAt' | 'currentDebt' | 'totalSpent' | 'transactionCount'>) => {
    const cleanPhone = customerData.phone.replace(/[\s\-\(\)]/g, '');
    const existing = customers.find((c) => c.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone);

    if (existing && cleanPhone.length > 5) {
      return { customer: existing, isDuplicate: true, existingCustomer: existing };
    }

    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      currentDebt: 0,
      totalSpent: 0,
      transactionCount: 0,
      category: customerData.category || 'regular',
      customerType: customerData.customerType || 'regular',
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    logAction('CUSTOMER_ADDED', `Mteja mpya: ${newCustomer.name} (${newCustomer.phone})`, 'debt', newCustomer.id);
    return { customer: newCustomer, isDuplicate: false };
  }, [customers, logAction]);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAction('CUSTOMER_UPDATED', `Mteja aliyesasishwa: ID ${id}`, 'debt', id);
  }, [logAction]);

  const payDebt = useCallback((debtId: string, amount: number, method: PaymentMethod, reference?: string, note?: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const remaining = Math.max(0, debt.remainingAmount - amount);
    const newStatus = remaining === 0 ? 'paid' : 'partial';

    const paymentRecord = {
      id: `dp-${Date.now()}`,
      amount,
      date: new Date().toISOString(),
      receivedBy: currentUser.name,
      method,
      reference,
      note,
    };

    setDebts((prev) =>
      prev.map((d) =>
        d.id === debtId
          ? {
              ...d,
              paidAmount: d.paidAmount + amount,
              remainingAmount: remaining,
              status: newStatus,
              payments: [...d.payments, paymentRecord],
            }
          : d
      )
    );

    // Update customer debt balance
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === debt.customerId
          ? { ...c, currentDebt: Math.max(0, c.currentDebt - amount) }
          : c
      )
    );

    logAction('DEBT_PAYMENT_RECEIVED', `Malipo ya deni TZS ${amount.toLocaleString()} yamepokelewa kutoka ${debt.customerName}`, 'debt', debtId);
  }, [debts, currentUser.name, logAction]);

  // Suppliers
  const addSupplier = useCallback((supplierData: Omit<Supplier, 'id' | 'createdAt' | 'amountOwed'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      amountOwed: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    logAction('SUPPLIER_ADDED', `Msambazaji mpya: ${newSupplier.name}`, 'stock', newSupplier.id);
  }, [logAction]);

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    logAction('SUPPLIER_UPDATED', `Msambazaji aliyesasishwa: ID ${id}`, 'stock', id);
  }, [logAction]);

  const recordSupplierPayment = useCallback((supplierId: string, amount: number, note?: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, amountOwed: Math.max(0, s.amountOwed - amount) } : s))
    );
    logAction('SUPPLIER_PAYMENT', `Malipo ya msambazaji TZS ${amount.toLocaleString()} (${note || ''})`, 'stock', supplierId);
  }, [logAction]);

  // Expenses
  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'paymentMethod'> & { paymentMethod?: PaymentMethod }) => {
    const newExpense: Expense = {
      category: expenseData.category,
      amount: expenseData.amount,
      description: expenseData.description,
      date: expenseData.date,
      recordedBy: expenseData.recordedBy,
      paymentMethod: expenseData.paymentMethod || 'cash',
      receiptNumber: expenseData.receiptNumber,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    logAction('EXPENSE_RECORDED', `Gharama: ${newExpense.category} - TZS ${newExpense.amount.toLocaleString()} (${newExpense.description})`, 'expense', newExpense.id);
  }, [logAction]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    logAction('EXPENSE_DELETED', `Gharama imefutwa: ID ${id}`, 'expense', id);
  }, [logAction]);

  // Bar Variance
  const recordBarVariance = useCallback((recordData: Omit<BarVarianceRecord, 'id' | 'date' | 'recordedBy'>) => {
    const newRecord: BarVarianceRecord = {
      ...recordData,
      id: `bv-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: `${currentUser.name} (${currentUser.role})`,
    };
    setBarVariances((prev) => [newRecord, ...prev]);
    logAction('BAR_VARIANCE_RECORDED', `Ukaguzi wa Bar: ${newRecord.productName} - Tofauti ml ${newRecord.varianceMl}`, 'bar', newRecord.id);
  }, [currentUser, logAction]);

  // Restaurant Tables
  const updateTableStatus = useCallback((tableId: string, status: RestaurantTable['status'], activeWaiter?: string, totalBill?: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status, activeWaiter: activeWaiter !== undefined ? activeWaiter : t.activeWaiter, totalBill: totalBill !== undefined ? totalBill : t.totalBill } : t))
    );
  }, []);

  // CCTV & Surveillance
  const addCamera = useCallback((camData: Omit<CCTVCamera, 'id'>) => {
    const newCam: CCTVCamera = {
      ...camData,
      id: `cam-${Date.now()}`,
    };
    setCameras((prev) => [...prev, newCam]);
    logAction('CAMERA_ADDED', `Kamera mpya imeunganishwa: ${newCam.name} (${newCam.ipOrRtsp})`, 'camera', newCam.id);
  }, [logAction]);

  const updateCamera = useCallback((id: string, updates: Partial<CCTVCamera>) => {
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAction('CAMERA_CONFIG_UPDATED', `Mipangilio ya kamera imesasishwa: ID ${id}`, 'camera', id);
  }, [logAction]);

  const deleteCamera = useCallback((id: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
    logAction('CAMERA_DELETED', `Kamera imefutwa: ID ${id}`, 'camera', id);
  }, [logAction]);

  const addCameraEvent = useCallback((eventData: Omit<CameraEvent, 'id' | 'timestamp'>) => {
    const newEvent: CameraEvent = {
      ...eventData,
      id: `cam-ev-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setCameraEvents((prev) => [newEvent, ...prev]);
  }, []);

  const logCameraAccess = useCallback((cameraId: string) => {
    const cam = cameras.find((c) => c.id === cameraId);
    logAction('CAMERA_VIEWED', `Mtumiaji ${currentUser.name} ameangalia live feed ya ${cam?.name || cameraId}`, 'camera', cameraId);
  }, [cameras, currentUser.name, logAction]);

  // Database Backup & Restore
  const exportDatabaseJson = useCallback((): string => {
    const data = {
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      profile,
      users: users.map((u) => ({ ...u, passwordHash: u.passwordHash })),
      products,
      customers,
      debts,
      suppliers,
      expenses,
      sales,
      stockMovements,
      tables,
      barVariances,
      cameras,
      cameraEvents,
      auditLogs,
    };
    logAction('DATABASE_BACKUP_CREATED', 'Nakala ya mfumo (JSON Backup) imepakuliwa', 'backup');
    return JSON.stringify(data, null, 2);
  }, [currentUser.name, profile, users, products, customers, debts, suppliers, expenses, sales, stockMovements, tables, barVariances, cameras, cameraEvents, auditLogs, logAction]);

  const importDatabaseJson = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.profile || !data.products || !data.sales) {
        throw new Error('Invalid schema format');
      }

      if (data.profile) setProfile(data.profile);
      if (data.users) setUsers(data.users);
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.debts) setDebts(data.debts);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.expenses) setExpenses(data.expenses);
      if (data.sales) setSales(data.sales);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.tables) setTables(data.tables);
      if (data.barVariances) setBarVariances(data.barVariances);
      if (data.cameras) setCameras(data.cameras);
      if (data.cameraEvents) setCameraEvents(data.cameraEvents);
      if (data.auditLogs) setAuditLogs(data.auditLogs);

      logAction('DATABASE_RESTORED', `Data zimerudishwa kutoka kwenye faili la backup (Version: ${data.version || 'unknown'})`, 'backup');
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }, [logAction]);

  const clearDemoData = useCallback((): { success: boolean; backupJson: string } => {
    // 1. Create a safety backup first
    const backupJson = exportDatabaseJson();

    // 2. Identify demo product IDs
    const demoProductIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    
    // 3. Clear demo items while preserving user created items if any
    setProducts((prev) => prev.filter((p) => !demoProductIds.has(p.id) && !isDemoProduct(p) && !p.id.startsWith('prod-demo-')));
    setSales([]);
    setExpenses([]);
    setDebts([]);
    setCustomers([]);
    setSuppliers([]);
    setStockMovements([]);
    setBarVariances([]);
    setCameraEvents([]);

    logAction('DEMO_DATA_CLEARED', 'Data zote za majaribio (Demo Products, Sales, Expenses, Debts) zimeondolewa. Mfumo upo tayari kwa biashara halisi.', 'backup');

    return {
      success: true,
      backupJson,
    };
  }, [exportDatabaseJson, logAction]);

  const startFreshBusiness = useCallback((details?: Partial<BusinessProfile>): { success: boolean; backupJson: string } => {
    // 1. Create a safety backup
    const backupJson = exportDatabaseJson();

    // 2. Clear all transactional and inventory demo data
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setDebts([]);
    setCustomers([]);
    setSuppliers([]);
    setStockMovements([]);
    setBarVariances([]);
    setCameraEvents([]);

    // 3. Update business details if provided
    if (details) {
      setProfile((prev) => ({
        ...prev,
        ...details,
        setupCompleted: true,
      }));
    }

    logAction('FRESH_BUSINESS_STARTED', `Biashara mpya imeanzishwa rasmi: ${details?.name || profile.name || 'EBS Business'}. Mfumo umeanza bila data za zamani.`, 'setting');

    return {
      success: true,
      backupJson,
    };
  }, [exportDatabaseJson, profile.name, logAction]);

  const resetToDemoData = useCallback(() => {
    setProfile(INITIAL_BUSINESS_PROFILE);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setDebts(INITIAL_DEBTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setExpenses(INITIAL_EXPENSES);
    setSales(INITIAL_SALES);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setTables(INITIAL_TABLES);
    setBarVariances(INITIAL_BAR_VARIANCE);
    setCameras(INITIAL_CAMERAS);
    setCameraEvents(INITIAL_CAMERA_EVENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    logAction('DATABASE_RESET_DEMO', 'Mfumo umerudishwa kwenye taarifa za kuanzia (Demo Data)', 'backup');
  }, [logAction]);

  // Real-time Today Stats Calculation
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.status === 'completed' && s.timestamp.startsWith(todayStr));
    const todayExpenses = expenses.filter((e) => e.date === todayStr);

    const salesRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const grossProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const expensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - expensesTotal;

    let cashTotal = 0;
    let mobileMoneyTotal = 0;
    let debtTotal = 0;
    let cardBankTotal = 0;

    todaySales.forEach((s) => {
      s.payments.forEach((p) => {
        if (p.method === 'cash') cashTotal += p.amount;
        else if (['mpesa', 'airtel', 'tigopesa', 'halopesa'].includes(p.method)) mobileMoneyTotal += p.amount;
        else if (p.method === 'debt') debtTotal += p.amount;
        else if (['bank', 'card'].includes(p.method)) cardBankTotal += p.amount;
      });
    });

    const lowStockCount = products.filter((p) => isProductActive(p) && p.stockQty <= p.minStock).length;
    const overdueDebtsCount = debts.filter((d) => d.status !== 'paid' && new Date(d.dueDate) < new Date()).length;

    return {
      salesRevenue,
      grossProfit,
      expensesTotal,
      netProfit,
      transactionsCount: todaySales.length,
      cashTotal,
      mobileMoneyTotal,
      debtTotal,
      cardBankTotal,
      lowStockCount,
      overdueDebtsCount,
    };
  }, [sales, expenses, products, debts]);

  const value: AppContextType = {
    profile,
    businessProfile: profile,
    updateProfile,
    updateBusinessProfile: updateProfile,
    setBusinessMode,
    completeSetupWizard,
    resetSetupWizard,

    isAuthenticated,
    isLocked,
    lockSession,
    unlockSession,
    switchUser,
    currentUser,
    setCurrentUser,
    users,
    loginUser,
    logoutUser,
    changePassword,
    resetUserPassword,
    addUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    updateUserPermissions,

    activeSession,
    sessions,
    terminateSession,
    sessionTimeoutMinutes,
    setSessionTimeoutMinutes,

    canAccess,
    hasGranularPermission,
    can,
    hasRole,
    verifyManagerApproval,

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
    t,

    products,
    addProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    hardDeleteProduct,
    adjustStock,
    stockMovements,

    sales,
    completeSale,
    refundSale,
    cancelSale,

    customers,
    addCustomer,
    updateCustomer,
    debts,
    payDebt,

    suppliers,
    addSupplier,
    updateSupplier,
    recordSupplierPayment,

    expenses,
    addExpense,
    deleteExpense,

    barVariances,
    recordBarVariance,

    tables,
    updateTableStatus,

    cameras,
    addCamera,
    updateCamera,
    deleteCamera,
    cameraEvents,
    addCameraEvent,
    logCameraAccess,

    auditLogs,
    logAction,

    exportDatabaseJson,
    exportDataJson: exportDatabaseJson,
    importDatabaseJson,
    importDataJson: importDatabaseJson,
    resetToDemoData,
    clearDemoData,
    startFreshBusiness,

    todayStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
