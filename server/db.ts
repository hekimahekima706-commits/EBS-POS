import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  BusinessEntity,
  BusinessDevice,
  User,
  UserSession,
  Product,
  Sale,
  StockMovement,
  Customer,
  DebtRecord,
  Supplier,
  Expense,
  RestaurantTable,
  BarVarianceRecord,
  CCTVCamera,
  CameraEvent,
  AuditLog,
  SyncTransaction,
  PlatformAdmin,
  SuperAdminAction,
  PasswordResetToken
} from '../src/types';
import {
  INITIAL_BUSINESS_ENTITY,
  INITIAL_DEVICES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_DEBTS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_SALES,
  INITIAL_AUDIT_LOGS,
  INITIAL_TABLES,
  INITIAL_BAR_VARIANCE,
  INITIAL_CAMERAS,
  INITIAL_CAMERA_EVENTS
} from '../src/data/initialData';
import { hashPasswordPBKDF2 } from './security';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'ebs_state.json');
const SQLITE_FILE = path.join(DATA_DIR, 'ebs_database.sqlite');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// ----------------------------------------------------
// SUPABASE CLIENT INITIALIZATION (SCHEMA: pos)
// ----------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient<any, any, any> | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'pos' },
        auth: { persistSession: false },
      })
    : null;

if (supabase) {
  console.log('[EBS Database] Supabase client initialized on schema "pos" with endpoint:', supabaseUrl);
} else {
  console.log('[EBS Database] Supabase credentials not set in env. Operating with local persistent SQLite/JSON engine.');
}

export interface CentralStore {
  businesses: Map<string, BusinessEntity>;
  devices: Map<string, BusinessDevice>;
  users: Map<string, User>;
  sessions: Map<string, UserSession>;
  products: Map<string, Product>;
  sales: Map<string, Sale>;
  stockMovements: StockMovement[];
  customers: Map<string, Customer>;
  debts: Map<string, DebtRecord>;
  suppliers: Map<string, Supplier>;
  expenses: Expense[];
  tables: Map<string, RestaurantTable>;
  barVariances: BarVarianceRecord[];
  cameras: Map<string, CCTVCamera>;
  cameraEvents: CameraEvent[];
  auditLogs: AuditLog[];
  syncTransactions: Map<string, SyncTransaction>;
  platformAdmins: Map<string, PlatformAdmin>;
  superAdminActions: SuperAdminAction[];
  passwordResetTokens: Map<string, PasswordResetToken>;
  schemaVersion: number;
}

// Global in-memory reactive store
const store: CentralStore = {
  businesses: new Map(),
  devices: new Map(),
  users: new Map(),
  sessions: new Map(),
  products: new Map(),
  sales: new Map(),
  stockMovements: [],
  customers: new Map(),
  debts: new Map(),
  suppliers: new Map(),
  expenses: [],
  tables: new Map(),
  barVariances: [],
  cameras: new Map(),
  cameraEvents: [],
  auditLogs: [],
  syncTransactions: new Map(),
  platformAdmins: new Map(),
  superAdminActions: [],
  passwordResetTokens: new Map(),
  schemaVersion: 2
};

let sqliteDb: Database | null = null;
let isInitialized = false;

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Persist store state to Supabase Postgres (pos schema) & local disk fallback
 */
export async function persistStoreToDisk(): Promise<void> {
  try {
    ensureDirectories();

    // 1. Persist to local disk snapshot for instantaneous local fallback
    const serialized = {
      schemaVersion: store.schemaVersion,
      savedAt: new Date().toISOString(),
      businesses: Array.from(store.businesses.entries()),
      devices: Array.from(store.devices.entries()),
      users: Array.from(store.users.entries()),
      sessions: Array.from(store.sessions.entries()),
      products: Array.from(store.products.entries()),
      sales: Array.from(store.sales.entries()),
      stockMovements: store.stockMovements,
      customers: Array.from(store.customers.entries()),
      debts: Array.from(store.debts.entries()),
      suppliers: Array.from(store.suppliers.entries()),
      expenses: store.expenses,
      tables: Array.from(store.tables.entries()),
      barVariances: store.barVariances,
      cameras: Array.from(store.cameras.entries()),
      cameraEvents: store.cameraEvents,
      auditLogs: store.auditLogs,
      syncTransactions: Array.from(store.syncTransactions.entries()),
      platformAdmins: Array.from(store.platformAdmins.entries()),
      superAdminActions: store.superAdminActions,
      passwordResetTokens: Array.from(store.passwordResetTokens.entries())
    };

    const tempFile = `${STATE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(serialized, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);

    // 2. Synchronize to Supabase Postgres if available
    if (supabase) {
      syncToSupabase().catch((err) => {
        console.warn('[EBS Database] Supabase background sync warning:', err?.message || err);
      });
    }
  } catch (err) {
    console.error('[EBS Database] Error saving database state:', err);
  }
}

/**
 * Push core changes to Supabase Postgres (pos schema)
 */
async function syncToSupabase(): Promise<void> {
  if (!supabase) return;

  try {
    // Sync businesses
    for (const [id, biz] of store.businesses.entries()) {
      await supabase.from('businesses').upsert({
        id,
        name: biz.name,
        owner_name: biz.ownerName,
        owner_id: biz.ownerId,
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        mkoa: biz.mkoa,
        wilaya: biz.wilaya,
        business_type: biz.businessType || 'general',
        currency: biz.currency || 'TZS',
        timezone: biz.timezone || 'Africa/Dar_es_Salaam',
        status: biz.status || 'active',
        branches: biz.branches || [],
        profile: biz.profile || {},
        updated_at: new Date().toISOString()
      });
    }

    // Sync users
    for (const [id, u] of store.users.entries()) {
      await supabase.from('users').upsert({
        id,
        business_id: u.businessId || 'EBS-BIZ-000001',
        branch_id: u.branchId,
        name: u.name,
        username: u.username,
        role: u.role,
        phone: u.phone,
        email: u.email,
        password_hash: u.passwordHash,
        password_salt: u.passwordSalt,
        pin: u.pin,
        pin_salt: u.pinSalt,
        active: u.active ?? true,
        must_change_password: u.mustChangePassword ?? false,
        failed_login_attempts: u.failedLoginAttempts || 0,
        permissions: u.permissions || {},
        can_discount: u.canDiscount ?? false,
        can_refund: u.canRefund ?? false,
        can_adjust_stock: u.canAdjustStock ?? false,
        can_view_profit: u.canViewProfit ?? false,
        can_manage_users: u.canManageUsers ?? false
      });
    }

    // Sync products
    for (const [id, p] of store.products.entries()) {
      await supabase.from('products').upsert({
        id,
        business_id: p.businessId || 'EBS-BIZ-000001',
        branch_id: p.branchId,
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        category: p.category,
        buying_price: p.buyingPrice,
        selling_price: p.sellingPrice,
        stock_qty: p.stockQty,
        min_stock: p.minStock,
        unit: p.unit,
        base_unit: p.baseUnit || p.unit,
        packaging_units: p.packagingUnits || [],
        supplier_id: p.supplierId,
        supplier_name: p.supplierName,
        active: p.active ?? true,
        product_type: p.productType || 'standard',
        is_bar_item: p.isBarItem ?? false,
        bottle_size_ml: p.bottleSizeMl,
        serving_size_ml: p.servingSizeMl,
        servings_per_bottle: p.servingsPerBottle,
        selling_price_per_serving: p.sellingPricePerServing,
        open_bottle_remaining_ml: p.openBottleRemainingMl,
        open_bottles_count: p.openBottlesCount || 0,
        is_pharmacy_item: p.isPharmacyItem ?? false,
        brand_name: p.brandName,
        generic_name: p.genericName,
        batch_number: p.batchNumber,
        expiry_date: p.expiryDate ? p.expiryDate.split('T')[0] : null,
        dosage_form: p.dosageForm,
        strength: p.strength,
        medicine_type: p.medicineType,
        dosage_instruction: p.dosageInstruction,
        updated_at: new Date().toISOString()
      });
    }

    // Sync platform admins
    for (const [id, adm] of store.platformAdmins.entries()) {
      await supabase.from('platform_admins').upsert({
        id,
        username: adm.username,
        name: adm.name,
        email: adm.email,
        phone: adm.phone,
        password_hash: adm.passwordHash,
        password_salt: adm.passwordSalt,
        role: 'super_admin',
        active: adm.active ?? true
      });
    }
  } catch (syncErr) {
    console.warn('[EBS Database] syncToSupabase non-blocking error:', syncErr);
  }
}

/**
 * Initialize SQLite WebAssembly Engine
 */
function initSqliteSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT,
      pin TEXT,
      pin_salt TEXT,
      permissions_json TEXT,
      must_change_password INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      buying_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      stock_qty REAL NOT NULL DEFAULT 0,
      min_stock REAL DEFAULT 5,
      unit TEXT NOT NULL,
      barcode TEXT,
      is_bar_item INTEGER DEFAULT 0,
      bottle_size_ml REAL DEFAULT 750,
      serving_size_ml REAL DEFAULT 30,
      open_bottle_remaining_ml REAL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      device_id TEXT,
      invoice_no TEXT NOT NULL,
      client_transaction_id TEXT,
      total REAL NOT NULL,
      profit REAL NOT NULL,
      payment_method TEXT NOT NULL,
      customer_id TEXT,
      cashier_id TEXT,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      items_json TEXT NOT NULL
    );
  `);
}

/**
 * Initialize Central Database
 * 1. Checks Supabase Postgres (pos schema) first if configured.
 * 2. If Supabase has data, loads directly into memory store.
 * 3. Falls back seamlessly to local persistent state.
 * 4. Ensures at least one super_admin account exists for EBS Head Office.
 */
export async function initCentralDatabase(): Promise<void> {
  if (isInitialized) return;

  ensureDirectories();

  // 1. Initialize local SQLite Engine
  try {
    const SQL = await initSqlJs();
    if (fs.existsSync(SQLITE_FILE)) {
      try {
        const fileBuffer = fs.readFileSync(SQLITE_FILE);
        sqliteDb = new SQL.Database(fileBuffer);
      } catch {
        sqliteDb = new SQL.Database();
      }
    } else {
      sqliteDb = new SQL.Database();
    }
    initSqliteSchema(sqliteDb);
  } catch (err) {
    console.warn('[EBS Database] SQLite engine initialized with memory provider:', err);
  }

  // 2. Check Supabase Postgres (pos schema) first
  let loadedFromSupabase = false;
  if (supabase) {
    try {
      console.log('[EBS Database] Querying Supabase schema "pos"...');
      const { data: bizData, error: bizErr } = await supabase.from('businesses').select('*');

      if (!bizErr && bizData && bizData.length > 0) {
        console.log(`[EBS Database] Found ${bizData.length} business(es) in Supabase. Loading tables...`);
        for (const b of bizData) {
          store.businesses.set(b.id, {
            id: b.id,
            name: b.name,
            ownerName: b.owner_name,
            ownerId: b.owner_id,
            phone: b.phone,
            email: b.email,
            address: b.address,
            mkoa: b.mkoa,
            wilaya: b.wilaya,
            businessType: b.business_type,
            currency: b.currency,
            timezone: b.timezone,
            status: b.status,
            branches: b.branches || [],
            profile: b.profile || {},
            createdDate: b.created_at
          });
        }

        // Load users from Supabase
        const { data: userData } = await supabase.from('users').select('*');
        if (userData) {
          userData.forEach((u: any) => {
            store.users.set(u.id, {
              id: u.id,
              businessId: u.business_id,
              branchId: u.branch_id,
              name: u.name,
              username: u.username,
              role: u.role,
              phone: u.phone,
              email: u.email,
              passwordHash: u.password_hash,
              passwordSalt: u.password_salt,
              pin: u.pin,
              pinSalt: u.pin_salt,
              active: u.active,
              mustChangePassword: u.must_change_password,
              failedLoginAttempts: u.failed_login_attempts || 0,
              permissions: u.permissions || {},
              canDiscount: u.can_discount,
              canRefund: u.can_refund,
              canAdjustStock: u.can_adjust_stock,
              canViewProfit: u.can_view_profit,
              canManageUsers: u.can_manage_users,
              createdAt: u.created_at,
              lastLogin: u.last_login
            });
          });
        }

        // Load products from Supabase
        const { data: prodData } = await supabase.from('products').select('*');
        if (prodData) {
          prodData.forEach((p: any) => {
            store.products.set(p.id, {
              id: p.id,
              businessId: p.business_id,
              branchId: p.branch_id,
              name: p.name,
              barcode: p.barcode,
              sku: p.sku,
              category: p.category,
              buyingPrice: Number(p.buying_price),
              sellingPrice: Number(p.selling_price),
              stockQty: Number(p.stock_qty),
              minStock: Number(p.min_stock),
              unit: p.unit,
              baseUnit: p.base_unit || p.unit,
              packagingUnits: p.packaging_units || [],
              supplierId: p.supplier_id,
              supplierName: p.supplier_name,
              active: p.active,
              productType: p.product_type || 'standard',
              isBarItem: p.is_bar_item,
              bottleSizeMl: p.bottle_size_ml ? Number(p.bottle_size_ml) : undefined,
              servingSizeMl: p.serving_size_ml ? Number(p.serving_size_ml) : undefined,
              servingsPerBottle: p.servings_per_bottle ? Number(p.servings_per_bottle) : undefined,
              sellingPricePerServing: p.selling_price_per_serving ? Number(p.selling_price_per_serving) : undefined,
              openBottleRemainingMl: p.open_bottle_remaining_ml ? Number(p.open_bottle_remaining_ml) : undefined,
              openBottlesCount: p.open_bottles_count ? Number(p.open_bottles_count) : 0,
              isPharmacyItem: p.is_pharmacy_item,
              brandName: p.brand_name,
              genericName: p.generic_name,
              batchNumber: p.batch_number,
              expiryDate: p.expiry_date,
              dosageForm: p.dosage_form,
              strength: p.strength,
              medicineType: p.medicine_type,
              dosageInstruction: p.dosage_instruction
            });
          });
        }

        // Load sales from Supabase
        const { data: salesData } = await supabase.from('sales').select('*').limit(500);
        if (salesData) {
          salesData.forEach((s: any) => {
            store.sales.set(s.id, {
              id: s.id,
              businessId: s.business_id,
              deviceId: s.device_id,
              deviceName: s.device_name,
              clientTransactionId: s.client_transaction_id,
              syncStatus: s.sync_status,
              invoiceNo: s.invoice_no,
              items: s.items || [],
              subtotal: Number(s.subtotal),
              discount: Number(s.discount),
              tax: Number(s.tax),
              total: Number(s.total),
              profit: Number(s.profit),
              payments: s.payments || [],
              paymentMethod: s.payment_method,
              customerId: s.customer_id,
              customerName: s.customer_name,
              customerPhone: s.customer_phone,
              cashierId: s.cashier_id,
              cashierName: s.cashier_name,
              status: s.status,
              tableId: s.table_id,
              tableName: s.table_name,
              waiterId: s.waiter_id,
              waiterName: s.waiter_name,
              notes: s.notes,
              timestamp: s.timestamp
            });
          });
        }

        // Load platform admins from Supabase
        const { data: adminData } = await supabase.from('platform_admins').select('*');
        if (adminData) {
          adminData.forEach((a: any) => {
            store.platformAdmins.set(a.id, {
              id: a.id,
              username: a.username,
              name: a.name,
              email: a.email,
              phone: a.phone,
              passwordHash: a.password_hash,
              passwordSalt: a.password_salt,
              role: 'super_admin',
              active: a.active,
              createdAt: a.created_at,
              lastLogin: a.last_login
            });
          });
        }

        loadedFromSupabase = true;
        console.log(`[EBS Database] Successfully hydrated from Supabase (${store.products.size} products, ${store.users.size} users, ${store.sales.size} sales).`);
      }
    } catch (sbErr) {
      console.warn('[EBS Database] Could not read from Supabase directly:', sbErr);
    }
  }

  // 3. If not loaded from Supabase, check local state file
  if (!loadedFromSupabase && fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data.businesses)) store.businesses = new Map(data.businesses);
      if (Array.isArray(data.devices)) store.devices = new Map(data.devices);
      if (Array.isArray(data.users)) store.users = new Map(data.users);
      if (Array.isArray(data.sessions)) store.sessions = new Map(data.sessions);
      if (Array.isArray(data.products)) store.products = new Map(data.products);
      if (Array.isArray(data.sales)) store.sales = new Map(data.sales);
      if (Array.isArray(data.stockMovements)) store.stockMovements = data.stockMovements;
      if (Array.isArray(data.customers)) store.customers = new Map(data.customers);
      if (Array.isArray(data.debts)) store.debts = new Map(data.debts);
      if (Array.isArray(data.suppliers)) store.suppliers = new Map(data.suppliers);
      if (Array.isArray(data.expenses)) store.expenses = data.expenses;
      if (Array.isArray(data.tables)) store.tables = new Map(data.tables);
      if (Array.isArray(data.barVariances)) store.barVariances = data.barVariances;
      if (Array.isArray(data.cameras)) store.cameras = new Map(data.cameras);
      if (Array.isArray(data.cameraEvents)) store.cameraEvents = data.cameraEvents;
      if (Array.isArray(data.auditLogs)) store.auditLogs = data.auditLogs;
      if (Array.isArray(data.syncTransactions)) store.syncTransactions = new Map(data.syncTransactions);
      if (Array.isArray(data.platformAdmins)) store.platformAdmins = new Map(data.platformAdmins);
      if (Array.isArray(data.superAdminActions)) store.superAdminActions = data.superAdminActions;
      if (Array.isArray(data.passwordResetTokens)) store.passwordResetTokens = new Map(data.passwordResetTokens);

      console.log(`[EBS Database] Loaded state from local disk (${store.products.size} products, ${store.users.size} users).`);
    } catch (readErr) {
      console.error('[EBS Database] Error reading local state file:', readErr);
    }
  }

  // 4. If store has no products/business yet, seed default business structure (WITHOUT demo passwords!)
  if (store.businesses.size === 0) {
    console.log('[EBS Database] Initializing business structure (awaiting boss registration)...');
    const defaultBizId = INITIAL_BUSINESS_ENTITY.id;
    store.businesses.set(defaultBizId, JSON.parse(JSON.stringify(INITIAL_BUSINESS_ENTITY)));

    INITIAL_DEVICES.forEach((d) => {
      store.devices.set(d.id, { ...d, businessId: defaultBizId });
    });

    INITIAL_PRODUCTS.forEach((p) => {
      store.products.set(p.id, { ...p, businessId: defaultBizId });
    });

    INITIAL_CUSTOMERS.forEach((c) => {
      store.customers.set(c.id, { ...c, businessId: defaultBizId });
    });

    INITIAL_DEBTS.forEach((d) => {
      store.debts.set(d.id, { ...d, businessId: defaultBizId });
    });

    INITIAL_SUPPLIERS.forEach((s) => {
      store.suppliers.set(s.id, { ...s, businessId: defaultBizId });
    });

    store.expenses = INITIAL_EXPENSES.map((e) => ({ ...e, businessId: defaultBizId }));
    store.auditLogs = INITIAL_AUDIT_LOGS.map((a) => ({ ...a, businessId: defaultBizId }));
    store.barVariances = [...INITIAL_BAR_VARIANCE];
    store.cameraEvents = [...INITIAL_CAMERA_EVENTS];

    INITIAL_TABLES.forEach((t) => store.tables.set(t.id, t));
    INITIAL_CAMERAS.forEach((c) => store.cameras.set(c.id, c));
  }

  // 5. Ensure at least one EBS Head Office Platform Admin exists
  if (store.platformAdmins.size === 0) {
    const { hash, salt } = hashPasswordPBKDF2('SuperAdmin2026!#');
    const superAdminUser: PlatformAdmin = {
      id: 'admin-ebs-head-office',
      username: 'ebs_admin',
      name: 'EBS Head Office Super Admin',
      email: 'superadmin@ebsbiz.co.tz',
      phone: '+255 700 000 001',
      passwordHash: hash,
      passwordSalt: salt,
      role: 'super_admin',
      active: true,
      createdAt: new Date().toISOString()
    };
    store.platformAdmins.set(superAdminUser.id, superAdminUser);
    console.log('[EBS Database] Initialized EBS Head Office Platform Admin (username: ebs_admin).');
  }

  persistStoreToDisk();
  isInitialized = true;
}

export function getCentralStore(): CentralStore {
  return store;
}

// ----------------------------------------------------
// ATOMIC BUSINESS OPERATIONS WITH SUPABASE / POSTGRES RPC
// ----------------------------------------------------

/**
 * Server-side atomic sale processor
 * Executes stock decrement in base units and writes to Supabase / store
 * Prevents race conditions when multiple devices sell simultaneously
 */
export async function executeSaleAtomic(
  businessId: string,
  saleData: Partial<Sale> & { items: Sale['items'] },
  deviceId: string,
  userId: string,
  clientTransactionId?: string
): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  // Idempotency check
  if (clientTransactionId) {
    const existing = Array.from(store.sales.values()).find(
      (s) => s.clientTransactionId === clientTransactionId || s.id === clientTransactionId
    );
    if (existing) {
      return { success: true, sale: existing };
    }
  }

  // 1. Try Supabase Postgres RPC pos.execute_sale_atomic if Supabase is connected
  if (supabase) {
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_sale_atomic', {
        p_business_id: businessId,
        p_sale_data: saleData,
        p_device_id: deviceId,
        p_user_id: userId,
        p_client_transaction_id: clientTransactionId || null
      });

      if (!rpcError && rpcResult && rpcResult.success && rpcResult.sale) {
        const sale = rpcResult.sale as Sale;
        store.sales.set(sale.id, sale);

        // Update in-memory stock based on items
        for (const item of sale.items) {
          const prod = store.products.get(item.productId);
          if (prod) {
            const deduction =
              item.isPackage && item.unitsPerPackage
                ? item.quantity * item.unitsPerPackage
                : item.quantity;
            prod.stockQty = Math.max(0, prod.stockQty - deduction);
          }
        }

        persistStoreToDisk();
        return { success: true, sale };
      }
    } catch (rpcErr) {
      console.warn('[EBS Database] Supabase RPC failed, using server atomic lock fallback:', rpcErr);
    }
  }

  // 2. Server-side Atomic Transaction Fallback
  const user = store.users.get(userId);
  const device = store.devices.get(deviceId);
  const now = new Date().toISOString();

  let totalCost = 0;
  let subtotal = 0;
  let totalDiscount = 0;

  for (const item of saleData.items) {
    const product = store.products.get(item.productId);
    if (!product) {
      return { success: false, error: `Bidhaa yenye namba ${item.productId} haijapatikana.` };
    }

    const prevStock = product.stockQty;

    // Handle Packaging Units (Crate / Boksi / Katoni) vs Standard Pieces vs Bar Shots
    if (item.isPackage && item.unitsPerPackage && item.unitsPerPackage > 0) {
      const baseUnitsDeduction = item.quantity * item.unitsPerPackage;
      product.stockQty = Math.max(0, product.stockQty - baseUnitsDeduction);
    } else if (item.isServing && product.isBarItem) {
      const servingMl = item.servingSizeMl || product.servingSizeMl || 30;
      const bottleMl = product.bottleSizeMl || 750;
      let openMl = product.openBottleRemainingMl ?? bottleMl;

      if (openMl < servingMl) {
        if (product.stockQty > 0) {
          product.stockQty = Math.max(0, product.stockQty - 1);
          openMl = openMl + bottleMl - servingMl;
        } else {
          openMl = Math.max(0, openMl - servingMl);
        }
      } else {
        openMl -= servingMl;
      }
      product.openBottleRemainingMl = openMl;
    } else {
      product.stockQty = Math.max(0, product.stockQty - item.quantity);
    }

    const deductionQty =
      item.isPackage && item.unitsPerPackage ? item.quantity * item.unitsPerPackage : item.quantity;

    store.stockMovements.push({
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      deviceId,
      productId: product.id,
      productName: product.name,
      type: 'sale',
      quantity: -deductionQty,
      previousStock: prevStock,
      newStock: product.stockQty,
      unit: product.unit,
      referenceId: saleData.invoiceNo || `INV-${Date.now()}`,
      reason: `Mauzo ya POS (${item.isPackage ? item.packageName || 'Kifungashio' : item.isServing ? 'Shots' : 'Pcs'})`,
      userId,
      userName: user ? user.name : 'Cashier',
      timestamp: now
    });

    subtotal += item.unitPrice * item.quantity;
    totalDiscount += item.discount || 0;
    totalCost += (item.costPrice || product.buyingPrice || 0) * item.quantity;
  }

  const finalTotal = saleData.total !== undefined ? saleData.total : subtotal - totalDiscount;
  const finalProfit = saleData.profit !== undefined ? saleData.profit : finalTotal - totalCost;

  const newSale: Sale = {
    id: saleData.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    businessId,
    deviceId,
    deviceName: device ? device.name : 'Unknown Device',
    clientTransactionId,
    syncStatus: 'synced',
    invoiceNo:
      saleData.invoiceNo ||
      `INV-${new Date().getFullYear()}-${String(store.sales.size + 1).padStart(5, '0')}`,
    items: saleData.items,
    subtotal,
    discount: totalDiscount,
    tax: saleData.tax || 0,
    total: finalTotal,
    profit: finalProfit,
    payments: saleData.payments || [{ method: saleData.paymentMethod || 'cash', amount: finalTotal }],
    paymentMethod: saleData.paymentMethod || 'cash',
    customerId: saleData.customerId,
    customerName: saleData.customerName,
    customerPhone: saleData.customerPhone,
    cashierId: userId,
    cashierName: user ? user.name : saleData.cashierName || 'Keshia',
    status: 'completed',
    tableId: saleData.tableId,
    tableName: saleData.tableName,
    waiterId: saleData.waiterId,
    waiterName: saleData.waiterName,
    timestamp: saleData.timestamp || now,
    notes: saleData.notes,
    cameraEventId: saleData.cameraEventId
  };

  store.sales.set(newSale.id, newSale);

  // If debt payment
  if (newSale.paymentMethod === 'debt' && newSale.customerId) {
    const cust = store.customers.get(newSale.customerId);
    if (cust) {
      cust.currentDebt += newSale.total;
      cust.totalSpent += newSale.total;
      cust.transactionCount += 1;
      cust.lastPurchaseDate = now;

      const debtId = `debt-${Date.now()}`;
      store.debts.set(debtId, {
        id: debtId,
        businessId,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        saleId: newSale.id,
        invoiceNo: newSale.invoiceNo,
        originalAmount: newSale.total,
        paidAmount: 0,
        remainingAmount: newSale.total,
        status: 'unpaid',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: now,
        notes: `Mauzo ya mkopo risiti ${newSale.invoiceNo}`,
        payments: []
      });
    }
  }

  // Audit log
  store.auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    deviceId,
    deviceName: device ? device.name : 'Unknown Device',
    userId,
    userName: user ? user.name : 'User',
    userRole: user ? user.role : 'cashier',
    action: `Kukamilisha Mauzo #${newSale.invoiceNo}`,
    details: `Kiasi: TZS ${newSale.total.toLocaleString()} (${newSale.paymentMethod.toUpperCase()}) - Bidhaa ${newSale.items.length}`,
    entityType: 'sale',
    entityId: newSale.id,
    timestamp: now
  });

  if (device) {
    device.lastActive = now;
    device.lastSync = now;
    device.status = 'online';
  }

  persistStoreToDisk();

  return { success: true, sale: newSale };
}

/**
 * Process offline sync batch
 */
export async function processSyncQueueBatch(
  businessId: string,
  deviceId: string,
  transactions: SyncTransaction[]
): Promise<{
  processed: number;
  failed: number;
  results: { localId: string; globalId?: string; status: 'synced' | 'failed'; error?: string }[];
}> {
  const results: { localId: string; globalId?: string; status: 'synced' | 'failed'; error?: string }[] = [];
  let processed = 0;
  let failed = 0;

  const device = store.devices.get(deviceId);
  if (device && device.isRevoked) {
    return {
      processed: 0,
      failed: transactions.length,
      results: transactions.map((t) => ({
        localId: t.localId,
        status: 'failed',
        error: 'Kifaa hiki kimezuiwa (Device access revoked).'
      }))
    };
  }

  for (const tx of transactions) {
    try {
      if (tx.entityType === 'sale') {
        const saleResult = await executeSaleAtomic(
          businessId,
          tx.payload,
          deviceId,
          tx.userId,
          tx.localId
        );
        if (saleResult.success && saleResult.sale) {
          results.push({
            localId: tx.localId,
            globalId: saleResult.sale.id,
            status: 'synced'
          });
          processed++;
        } else {
          results.push({
            localId: tx.localId,
            status: 'failed',
            error: saleResult.error || 'Failed to process sale.'
          });
          failed++;
        }
      } else if (tx.entityType === 'stock_adjustment') {
        const { productId, newQty, reason, userId, userName } = tx.payload;
        const prod = store.products.get(productId);
        if (prod) {
          const prev = prod.stockQty;
          prod.stockQty = newQty;
          store.stockMovements.push({
            id: `mov-${Date.now()}`,
            businessId,
            deviceId,
            productId: prod.id,
            productName: prod.name,
            type: 'adjustment',
            quantity: newQty - prev,
            previousStock: prev,
            newStock: newQty,
            unit: prod.unit,
            reason: reason || 'Marekebisho ya stoo (Offline sync)',
            userId,
            userName,
            timestamp: tx.createdAt || new Date().toISOString()
          });
        }
        results.push({ localId: tx.localId, status: 'synced' });
        processed++;
      } else if (tx.entityType === 'expense') {
        store.expenses.unshift({
          ...tx.payload,
          id: tx.payload.id || `exp-${Date.now()}`,
          businessId,
          deviceId
        });
        results.push({ localId: tx.localId, status: 'synced' });
        processed++;
      } else if (tx.entityType === 'customer') {
        store.customers.set(tx.payload.id, {
          ...tx.payload,
          businessId
        });
        results.push({ localId: tx.localId, status: 'synced' });
        processed++;
      } else {
        results.push({ localId: tx.localId, status: 'synced' });
        processed++;
      }
    } catch (err: any) {
      results.push({
        localId: tx.localId,
        status: 'failed',
        error: err?.message || 'Unknown processing error'
      });
      failed++;
    }
  }

  if (device) {
    device.lastSync = new Date().toISOString();
    device.lastActive = new Date().toISOString();
    device.status = 'online';
  }

  persistStoreToDisk();

  return { processed, failed, results };
}

/**
 * Create Database Backup JSON
 */
export function createDatabaseBackup(businessId: string): string {
  ensureDirectories();
  const backupData = {
    version: '1.3.1',
    exportedAt: new Date().toISOString(),
    businessId,
    business: store.businesses.get(businessId),
    products: Array.from(store.products.values()).filter((p) => p.businessId === businessId),
    sales: Array.from(store.sales.values()).filter((s) => s.businessId === businessId),
    stockMovements: store.stockMovements.filter((m) => m.businessId === businessId),
    customers: Array.from(store.customers.values()).filter((c) => c.businessId === businessId),
    debts: Array.from(store.debts.values()).filter((d) => d.businessId === businessId),
    suppliers: Array.from(store.suppliers.values()).filter((s) => s.businessId === businessId),
    expenses: store.expenses.filter((e) => e.businessId === businessId),
    tables: Array.from(store.tables.values()),
    barVariances: store.barVariances,
    cameras: Array.from(store.cameras.values()),
    auditLogs: store.auditLogs.filter((a) => a.businessId === businessId),
    devices: Array.from(store.devices.values()).filter((d) => d.businessId === businessId),
    users: Array.from(store.users.values())
      .filter((u) => u.businessId === businessId)
      .map((u) => ({
        id: u.id,
        businessId: u.businessId,
        name: u.name,
        username: u.username,
        role: u.role,
        phone: u.phone,
        active: u.active,
        permissions: u.permissions
      }))
  };

  const backupFilename = path.join(BACKUP_DIR, `ebs_backup_${businessId}_${Date.now()}.json`);
  fs.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2), 'utf-8');
  return JSON.stringify(backupData, null, 2);
}

/**
 * Restore database from backup JSON
 */
export function restoreDatabaseBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data.business || !Array.isArray(data.products)) {
      return { success: false, message: 'Faili la backup halina muundo sahihi wa EBS.' };
    }

    ensureDirectories();
    const safetySnapshot = path.join(BACKUP_DIR, `pre_restore_safety_${Date.now()}.json`);
    if (fs.existsSync(STATE_FILE)) {
      fs.copyFileSync(STATE_FILE, safetySnapshot);
    }

    const bizId = data.business.id || 'EBS-BIZ-000001';
    store.businesses.set(bizId, data.business);

    if (Array.isArray(data.products)) {
      data.products.forEach((p: Product) => store.products.set(p.id, { ...p, businessId: bizId }));
    }
    if (Array.isArray(data.customers)) {
      data.customers.forEach((c: Customer) => store.customers.set(c.id, { ...c, businessId: bizId }));
    }
    if (Array.isArray(data.debts)) {
      data.debts.forEach((d: DebtRecord) => store.debts.set(d.id, { ...d, businessId: bizId }));
    }
    if (Array.isArray(data.suppliers)) {
      data.suppliers.forEach((s: Supplier) => store.suppliers.set(s.id, { ...s, businessId: bizId }));
    }
    if (Array.isArray(data.expenses)) {
      store.expenses = data.expenses.map((e: Expense) => ({ ...e, businessId: bizId }));
    }
    if (Array.isArray(data.sales)) {
      data.sales.forEach((s: Sale) => store.sales.set(s.id, { ...s, businessId: bizId }));
    }
    if (Array.isArray(data.stockMovements)) {
      store.stockMovements = data.stockMovements;
    }
    if (Array.isArray(data.auditLogs)) {
      store.auditLogs = data.auditLogs;
    }

    persistStoreToDisk();
    return { success: true, message: 'Database imerejeshwa kwa ufanisi kutoka kwenye Backup.' };
  } catch (err: any) {
    return { success: false, message: `Hitilafu wakati wa kurejesha backup: ${err.message}` };
  }
}
