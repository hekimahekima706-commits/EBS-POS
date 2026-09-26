export type BusinessMode = 
  | 'bar' 
  | 'pharmacy'
  | 'grocery' 
  | 'restaurant' 
  | 'hardware' 
  | 'phone_accessories' 
  | 'general' 
  | 'electronics' 
  | 'construction' 
  | 'spare_parts' 
  | 'other';

export type ProductType = 'standard' | 'bar_bottle' | 'service' | 'recipe' | 'fractional' | 'medicine';

export type MedicineClassification = 'OTC' | 'POM' | 'controlled';

export type DosageForm = 
  | 'tablets'
  | 'capsules'
  | 'syrup'
  | 'suspension'
  | 'injection'
  | 'drops'
  | 'ointment'
  | 'powder'
  | 'inhaler'
  | 'other';

export type UserRole = 
  | 'owner' 
  | 'boss'
  | 'super_admin'
  | 'manager' 
  | 'cashier' 
  | 'waiter' 
  | 'storekeeper' 
  | 'accountant' 
  | 'admin';

export type PermissionKey =
  // Sales
  | 'view_sales'
  | 'create_sale'
  | 'cancel_sale'
  | 'refund_sale'
  | 'apply_discount'
  | 'change_price'
  // Products
  | 'view_products'
  | 'create_product'
  | 'edit_product'
  | 'deactivate_product'
  | 'change_selling_price'
  | 'view_cost_price'
  // Stock
  | 'view_stock'
  | 'receive_stock'
  | 'adjust_stock'
  | 'approve_adjustment'
  | 'transfer_stock'
  // Customers
  | 'view_customers'
  | 'create_customer'
  | 'edit_customer'
  | 'view_customer_debt'
  | 'record_customer_payment'
  // Suppliers
  | 'view_suppliers'
  | 'create_supplier'
  | 'purchase_stock'
  | 'record_supplier_payment'
  // Reports
  | 'view_sales_report'
  | 'view_profit'
  | 'view_expenses'
  | 'export_reports'
  // Employees
  | 'view_users'
  | 'create_user'
  | 'edit_user'
  | 'deactivate_user'
  | 'reset_user_password'
  | 'manage_roles'
  // Security
  | 'view_audit_logs'
  | 'manage_sessions'
  | 'security_settings'
  // Camera
  | 'view_camera'
  | 'view_recordings'
  | 'manage_cameras'
  // Settings
  | 'business_settings'
  | 'pos_settings'
  | 'inventory_settings'
  | 'appearance_settings'
  | 'language_settings'
  | 'backup_restore';

export type GranularPermissions = Record<PermissionKey, boolean>;

export interface UserPermissions {
  canViewReports: boolean;
  canViewProfit: boolean;
  canManageUsers: boolean;
  canManagePermissions: boolean;
  canManageCCTV: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
  canBackupRestore: boolean;
  canManageStock: boolean;
  canAdjustStock: boolean;
  canManageProducts: boolean;
  canMakeSales: boolean;
  canDeleteSales: boolean;
  canGiveDiscount: boolean;
  canRefundSale: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canManageExpenses: boolean;
  canManageTables: boolean;
  canAccessBarMode: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'oled' | 'system';
export type PrimaryColor = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
export type FontSize = 'small' | 'normal' | 'large';
export type BackgroundStyle = 'default' | 'solid' | 'subtle_pattern' | 'logo_watermark';
export type InterfaceDensity = 'compact' | 'comfortable' | 'spacious';
export type AppLanguage = 'sw' | 'en';
export type Language = AppLanguage;

export type LegacyPermissionKey = keyof UserPermissions | 'canViewDashboard' | 'canViewStock' | 'canViewDebts' | 'canViewSuppliers' | 'canViewExpenses' | 'canViewCCTV';
export type AnyPermissionKey = PermissionKey | LegacyPermissionKey;

export interface UserPreferences {
  themeMode?: ThemeMode;
  primaryColor?: PrimaryColor;
  fontSize?: FontSize;
  backgroundStyle?: BackgroundStyle;
  language?: AppLanguage;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  deviceId?: string;
  deviceName?: string;
  businessId?: string;
  token?: string;
  loginTime: string;
  lastActivity: string;
  deviceInfo: string;
  ipAddress?: string;
  status: 'active' | 'locked' | 'expired' | 'terminated';
  isCurrent?: boolean;
}

export type DevicePlatform = 'android' | 'windows' | 'ios' | 'web' | 'linux' | 'macos' | 'pos';
export type DeviceStatus = 'online' | 'sync_pending' | 'offline' | 'revoked';

export interface BusinessDevice {
  id: string; // e.g. DEV-ANDROID-001, DEV-POS-002
  businessId: string;
  name: string; // e.g. "Owner Android Phone", "Cashier POS 01"
  platform: DevicePlatform;
  appVersion: string; // e.g. "v1.3.0"
  databaseVersion: string; // e.g. "v1.3.0"
  assignedUserId?: string;
  assignedUserName?: string;
  assignedRole?: UserRole;
  status: DeviceStatus;
  isOnline?: boolean;
  registeredAt: string;
  lastActive: string;
  lastSync: string;
  ipAddress?: string;
  isRevoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  token?: string;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncTransaction {
  localId: string; // DEVICE-ID + LOCAL-SEQ + TIMESTAMP
  globalId?: string;
  businessId: string;
  userId: string;
  userName: string;
  deviceId: string;
  deviceName: string;
  entityType: 'sale' | 'stock_adjustment' | 'customer' | 'debt_payment' | 'expense' | 'bar_variance';
  action: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  attemptCount: number;
  lastError?: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  isMain: boolean;
  status: 'active' | 'inactive';
}

export interface BusinessEntity {
  id: string; // e.g. "EBS-BIZ-000001"
  name: string;
  ownerName: string;
  ownerId?: string;
  phone: string;
  email: string;
  address: string;
  mkoa: string;
  wilaya: string;
  businessType: string;
  currency: string;
  timezone: string;
  createdDate: string;
  status: 'active' | 'suspended' | 'trial';
  branches: Branch[];
  profile: BusinessProfile;
}

export interface User {
  id: string;
  businessId?: string;
  branchId?: string;
  name: string;
  username: string;
  role: UserRole;
  phone: string;
  email?: string;
  passwordHash: string; // Securely hashed, never plain text
  passwordSalt?: string; // Cryptographic salt for PBKDF2
  pin?: string;
  pinSalt?: string;
  active: boolean;
  branch?: string;
  createdAt: string;
  lastLogin?: string;
  failedLoginAttempts?: number;
  lockoutUntil?: string;
  mustChangePassword?: boolean;
  temporaryPasswordGenerated?: string;
  preferences?: UserPreferences;
  permissions: UserPermissions;
  granularPermissions?: Partial<GranularPermissions>;
  
  // Backward compatibility fields
  canDiscount?: boolean;
  canRefund?: boolean;
  canAdjustStock?: boolean;
  canViewProfit?: boolean;
  canManageUsers?: boolean;
}

export type PaymentMethod = 
  | 'cash' 
  | 'mpesa' 
  | 'airtel' 
  | 'tigopesa' 
  | 'halopesa' 
  | 'bank' 
  | 'card' 
  | 'debt';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface PackagingUnit {
  id: string;
  name: string; // mf. "Crate (Chupa 24)", "Boksi (Pcs 12)", "Katoni (Pkt 50)"
  unitsPerPackage: number; // Idadi ya vipimo vya ndani (base units)
  buyingPrice: number; // Bei ya ununuzi wa kifungashio kizima
  sellingPrice: number; // Bei ya kuuzia kifungashio kizima
  barcode?: string;
}

export interface Product {
  id: string;
  businessId?: string;
  branchId?: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQty: number; // In whole units (e.g. bottles, packs, pieces)
  minStock: number;
  reorderLevel?: number; // alias
  unit: string; // e.g. "Chupa", "Pakiti", "Kg", "Bati", "Box"
  baseUnit?: string; // e.g. "Chupa", "Pcs", "Kipande"
  supplierId?: string;
  supplierName?: string;
  active: boolean;
  productType: ProductType;

  // Packaging Units (Vifungashio vya Jumla: Crate, Boksi, Katoni) 📦
  packagingUnits?: PackagingUnit[];
  
  // Bar Mode Specific Fields 🍺
  isBarItem?: boolean;
  bottleSizeMl?: number; // e.g. 750ml, 1000ml, 500ml
  servingSizeMl?: number; // e.g. 30ml, 60ml, 100ml
  servingsPerBottle?: number; // Calculated: bottleSizeMl / servingSizeMl (e.g. 25 shots)
  sellingPricePerServing?: number; // e.g. 3,500 TZS per 30ml shot
  openBottleRemainingMl?: number; // Remaining liquid in currently opened active bottle
  openBottlesCount?: number; // Number of open bottles currently on the shelf

  // Pharmacy & Drug Specific Fields 💊
  isPharmacyItem?: boolean;
  brandName?: string; // Jina la Biashara (mf. Panadol Extra, Amoxil, Coartem)
  genericName?: string; // Jina la Kisayansi / Kemikali (mf. Paracetamol, Amoxicillin)
  batchNumber?: string; // Nambari ya Baachi (mf. ALU-4402, BTH-2024-91)
  expiryDate?: string; // Tarehe ya Kuisha Muda (YYYY-MM-DD)
  dosageForm?: string; // Aina ya Umbo la Dawa (Vidonge, Shira, Kapsuli, n.k.)
  strength?: string; // Kipimo (mf. 500mg, 250mg/5ml)
  medicineType?: MedicineClassification; // POM, OTC, controlled
  dosageInstruction?: string; // Default dosage instruction
}

export type StockMovementType = 
  | 'purchase' 
  | 'sale' 
  | 'return' 
  | 'adjustment' 
  | 'damage' 
  | 'loss' 
  | 'spillage' 
  | 'wastage' 
  | 'transfer' 
  | 'opening_stock';

export interface StockMovement {
  id: string;
  businessId?: string;
  branchId?: string;
  deviceId?: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  unit: string;
  referenceId?: string; // sale invoice, PO number, etc.
  reason: string;
  note?: string;
  userId: string;
  userName: string;
  timestamp: string;
  varianceMl?: number; // For bar shots/milliliters
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
  isServing?: boolean; // If sold as a shot/glass
  servingSizeMl?: number;
  servingsCount?: number;
  notes?: string;

  // Packaging Fields (Uuzaji kwa Crate / Boksi / Katoni) 📦
  isPackage?: boolean;
  packageUnitId?: string;
  packagingUnitId?: string;
  packageName?: string;
  packagingUnitName?: string;
  unitsPerPackage?: number;
  baseUnitEquivalentQuantity?: number;

  // Pharmacy Dispensing Fields 💊
  isPharmacyItem?: boolean;
  brandName?: string;
  genericName?: string;
  batchNumber?: string;
  expiryDate?: string;
  dosageForm?: string;
  strength?: string;
  medicineType?: MedicineClassification;
  dosageInstruction?: string; // Maelekezo ya dozi (mf. "Kidonge 1 mara 3 kwa siku")
}

export interface Sale {
  id: string;
  businessId?: string;
  branchId?: string;
  deviceId?: string;
  deviceName?: string;
  clientTransactionId?: string; // DEVICE-ID + LOCAL-SEQ + TIMESTAMP
  syncStatus?: SyncStatus;
  invoiceNo: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  payments: PaymentSplit[];
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  status: 'completed' | 'cancelled' | 'refunded';
  refundReason?: string;
  refundedBy?: string;
  refundedAt?: string;
  tableId?: string;
  tableName?: string;
  waiterId?: string;
  waiterName?: string;
  timestamp: string;
  notes?: string;
  cameraEventId?: string; // Link to surveillance timestamp

  // Pharmacy Dispensing Slip Fields 💊
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  prescriptionNumber?: string; // Namba ya Cheti cha Daktari (Rx No)
  pharmacistName?: string; // Mfamasia Mtoaji
  isDispensing?: boolean;
}

export type CustomerCategory = 'retail' | 'wholesale' | 'regular' | 'vip' | 'business';

export interface Customer {
  id: string;
  businessId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  mkoa?: string;
  wilaya?: string;
  customerType: 'individual' | 'wholesale' | 'vip' | 'regular'; // backward compatibility
  category: CustomerCategory;
  creditLimit: number;
  currentDebt: number;
  totalSpent: number;
  transactionCount: number;
  lastPurchaseDate?: string;
  notes?: string;
  tin?: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  receivedBy: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
}

export interface DebtRecord {
  id: string;
  businessId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleId?: string;
  invoiceNo: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partial' | 'paid';
  dueDate: string;
  createdAt: string;
  notes?: string;
  payments: DebtPayment[];
}

export interface Supplier {
  id: string;
  businessId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  tin?: string;
  amountOwed: number;
  productsSupplied?: string[];
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  businessId?: string;
  branchId?: string;
  deviceId?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
}

export interface AuditLog {
  id: string;
  businessId?: string;
  deviceId?: string;
  deviceName?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  entityType: 'sale' | 'product' | 'stock' | 'debt' | 'expense' | 'user' | 'setting' | 'auth' | 'bar' | 'camera' | 'backup' | 'device' | 'sync';
  entityId?: string;
  timestamp: string;
  deviceInfo?: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  currentOrderId?: string;
  activeWaiter?: string;
  totalBill?: number;
}

export interface BarVarianceRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  bottleSizeMl?: number;
  openingBottles?: number;
  purchasesBottles?: number;
  totalServingsSold?: number; // in shots (e.g. 80 shots)
  servingSizeMl?: number; // 30ml
  expectedRemainingBottles?: number;
  expectedRemainingMl?: number;
  actualMeasuredBottles?: number;
  actualMeasuredMl?: number;
  expectedStockBottles?: number;
  expectedOpenBottleMl?: number;
  physicalStockBottles?: number;
  physicalOpenBottleMl?: number;
  varianceBottles: number;
  varianceMl: number;
  wastageMl?: number;
  spillageMl?: number;
  recordedBy?: string;
  status: 'investigation_required' | 'adjustment_required' | 'resolved' | 'normal' | 'balanced' | 'slight_variance' | 'major_shortage';
  note?: string;
  notes?: string;
}

export interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  ipAddress?: string;
  ipOrRtsp?: string;
  rtspPort?: number;
  port?: number;
  rtspPath?: string;
  username?: string;
  password?: string;
  passwordMasked?: string;
  protocol?: 'rtsp' | 'http' | 'onvif' | 'hls' | 'webrtc' | 'mjpeg';
  streamUrl?: string;
  status: 'online' | 'offline' | 'recording';
  lastActivity?: string;
  lastSeen?: string;
  resolution?: string;
  fps?: number;
  sampleVideoType?: 'counter' | 'stock' | 'bar' | 'entrance';
  allowedRoles?: UserRole[];
  retentionDays?: number;
  notes?: string;
}

export interface CameraEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  type: 'sale' | 'refund' | 'after_hours' | 'door' | 'variance' | 'manual' | 'discount' | 'unusual_activity';
  title: string;
  description: string;
  relatedTransactionId?: string;
  invoiceNo?: string;
  operatorName?: string;
  amount?: number;
  snapshotColor: string;
}

export interface ActiveModules {
  pos: boolean;
  inventory: boolean;
  barMode: boolean;
  pharmacyMode?: boolean;
  restaurantMode: boolean;
  customers: boolean;
  suppliers: boolean;
  expenses: boolean;
  reports: boolean;
  employees: boolean;
  cctv: boolean;
  calendar: boolean;
  aiAssistant: boolean;
}

export interface BusinessProfile {
  name: string;
  ownerName: string;
  tagline: string;
  tin: string;
  vrn: string;
  licenseNumber?: string;
  pharmacyCouncilRegNo?: string; // Namba ya Usajili wa Baraza la Famasi Tanzania / TMDA
  supervisingPharmacist?: string; // Mfamasia Msimamizi
  address: string;
  mkoa: string;
  wilaya: string;
  phone: string;
  email: string;
  currency: string; // "TZS"
  timezone: string; // "Africa/Dar_es_Salaam"
  mode: BusinessMode;
  primaryBusinessType: string;
  secondaryBusinessTypes: string[];
  logoUrl?: string;
  taxRate: number; // e.g. 18 for 18% VAT or 0
  enableVat: boolean;
  enableBarFeatures: boolean;
  enableRestaurantFeatures: boolean;
  enablePharmacyFeatures?: boolean;
  enableCameraIntegration: boolean;
  receiptFooterText: string;
  receiptFooter?: string; // alias
  vatEnabled?: boolean; // alias
  vatRate?: number; // alias
  requirePinForDiscount: boolean;
  requirePinForRefund: boolean;
  lowStockThresholdDefault: number;
  thermalPrinterWidth?: '58mm' | '80mm';
  kickCashDrawerOnPrint?: boolean;
  cutPaperOnPrint?: boolean;
  setupCompleted: boolean;
  activatedModules: ActiveModules;
}

// Platform Admin / EBS Head Office Types 🏢
export interface PlatformAdmin {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  passwordSalt?: string;
  role: 'super_admin';
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface SuperAdminAction {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetBusinessId?: string;
  targetBusinessName?: string;
  details: string;
  timestamp: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  businessId: string;
  token: string;
  otpCode: string;
  contactMethod: 'phone' | 'email';
  contactTarget: string;
  used: boolean;
  createdAt: string;
  expiresAt: string;
}


export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
}
