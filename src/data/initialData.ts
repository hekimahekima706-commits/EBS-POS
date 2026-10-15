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
  BusinessEntity, 
  BusinessDevice, 
  StockMovement, 
  UserPermissions 
} from '../types';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: '',
  ownerName: '',
  tagline: 'Mfumo Mahiri wa Biashara, POS na Usimamizi wa Stoo',
  tin: '',
  vrn: '',
  licenseNumber: '',
  address: '',
  mkoa: 'Dar es Salaam',
  wilaya: 'Ilala',
  phone: '',
  email: '',
  currency: 'TZS',
  timezone: 'Africa/Dar_es_Salaam',
  mode: 'grocery',
  primaryBusinessType: 'Duka / Grocery',
  secondaryBusinessTypes: [],
  logoUrl: '',
  taxRate: 0,
  enableVat: false,
  enableBarFeatures: false,
  enableRestaurantFeatures: false,
  enablePharmacyFeatures: false,
  pharmacyCouncilRegNo: '',
  supervisingPharmacist: '',
  enableCameraIntegration: false,
  receiptFooterText: 'Asante kwa kufanya biashara nasi! Karibu tena.',
  receiptFooter: 'Asante kwa kufanya biashara nasi! Karibu tena.',
  vatEnabled: false,
  vatRate: 0,
  requirePinForDiscount: false,
  requirePinForRefund: true,
  lowStockThresholdDefault: 5,
  setupCompleted: false,
  activatedModules: {
    pos: true,
    inventory: true,
    barMode: false,
    pharmacyMode: false,
    restaurantMode: false,
    customers: true,
    suppliers: true,
    expenses: true,
    reports: true,
    employees: true,
    cctv: false,
    calendar: true,
    aiAssistant: true,
  }
};

export const INITIAL_BUSINESS_ENTITY: BusinessEntity = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Biashara Yangu',
  ownerName: 'Mmiliki',
  ownerId: 'usr-1',
  phone: '',
  email: '',
  address: '',
  mkoa: 'Dar es Salaam',
  wilaya: 'Ilala',
  businessType: 'Duka / Retail',
  currency: 'TZS',
  timezone: 'Africa/Dar_es_Salaam',
  createdDate: new Date().toISOString(),
  status: 'active',
  branches: [
    {
      id: 'br-main',
      businessId: '00000000-0000-4000-8000-000000000001',
      name: 'Tawi Kuu',
      code: 'HQ-MAIN',
      phone: '',
      address: '',
      isMain: true,
      status: 'active',
    }
  ],
  profile: INITIAL_BUSINESS_PROFILE
};

export const INITIAL_DEVICES: BusinessDevice[] = [];

// Permissions templates for user roles
export const ADMIN_PERMS: UserPermissions = {
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
};

export const MANAGER_PERMS: UserPermissions = {
  canViewReports: true,
  canViewProfit: true,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: true,
  canViewAuditLogs: true,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: true,
  canAdjustStock: true,
  canManageProducts: true,
  canMakeSales: true,
  canDeleteSales: false,
  canGiveDiscount: true,
  canRefundSale: true,
  canManageCustomers: true,
  canManageSuppliers: true,
  canManageExpenses: true,
  canManageTables: true,
  canAccessBarMode: true,
};

export const CASHIER_PERMS: UserPermissions = {
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
};

export const WAITER_PERMS: UserPermissions = {
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
  canManageCustomers: false,
  canManageSuppliers: false,
  canManageExpenses: false,
  canManageTables: true,
  canAccessBarMode: true,
};

export const STOREKEEPER_PERMS: UserPermissions = {
  canViewReports: false,
  canViewProfit: false,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: false,
  canViewAuditLogs: false,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: true,
  canAdjustStock: true,
  canManageProducts: true,
  canMakeSales: false,
  canDeleteSales: false,
  canGiveDiscount: false,
  canRefundSale: false,
  canManageCustomers: false,
  canManageSuppliers: true,
  canManageExpenses: false,
  canManageTables: false,
  canAccessBarMode: true,
};

// System Initial State: Clean and ready for real production use (Zero demo data)
export const INITIAL_USERS: User[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_DEBTS: DebtRecord[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];
export const INITIAL_TABLES: RestaurantTable[] = [];
export const INITIAL_BAR_VARIANCE: BarVarianceRecord[] = [];
export const INITIAL_CAMERAS: CCTVCamera[] = [];
export const INITIAL_CAMERA_EVENTS: CameraEvent[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
