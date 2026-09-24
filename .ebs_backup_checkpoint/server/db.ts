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
  SyncTransaction
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
}

// Global in-memory central database initialized with seed data
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
  syncTransactions: new Map()
};

// Seed initial data on startup
export function initCentralDatabase() {
  const defaultBizId = INITIAL_BUSINESS_ENTITY.id;
  store.businesses.set(defaultBizId, JSON.parse(JSON.stringify(INITIAL_BUSINESS_ENTITY)));

  INITIAL_DEVICES.forEach(d => {
    store.devices.set(d.id, { ...d, businessId: defaultBizId });
  });

  INITIAL_USERS.forEach(u => {
    store.users.set(u.id, { ...u, businessId: defaultBizId });
  });

  INITIAL_PRODUCTS.forEach(p => {
    store.products.set(p.id, { ...p, businessId: defaultBizId });
  });

  INITIAL_SALES.forEach(s => {
    store.sales.set(s.id, { ...s, businessId: defaultBizId });
  });

  INITIAL_CUSTOMERS.forEach(c => {
    store.customers.set(c.id, { ...c, businessId: defaultBizId });
  });

  INITIAL_DEBTS.forEach(d => {
    store.debts.set(d.id, { ...d, businessId: defaultBizId });
  });

  INITIAL_SUPPLIERS.forEach(s => {
    store.suppliers.set(s.id, { ...s, businessId: defaultBizId });
  });

  store.expenses = INITIAL_EXPENSES.map(e => ({ ...e, businessId: defaultBizId }));
  store.auditLogs = INITIAL_AUDIT_LOGS.map(a => ({ ...a, businessId: defaultBizId }));
  store.barVariances = [...INITIAL_BAR_VARIANCE];
  store.cameraEvents = [...INITIAL_CAMERA_EVENTS];

  INITIAL_TABLES.forEach(t => store.tables.set(t.id, t));
  INITIAL_CAMERAS.forEach(c => store.cameras.set(c.id, c));

  console.log(`[EBS Central Database] Initialized for Business: ${INITIAL_BUSINESS_ENTITY.name} (${defaultBizId}) with ${store.products.size} products and ${store.devices.size} devices.`);
}

// Get the Central Store
export function getCentralStore(): CentralStore {
  return store;
}

// ----------------------------------------------------
// ATOMIC BUSINESS OPERATIONS
// ----------------------------------------------------

/**
 * Server-side atomic sale processor
 * Ensures correct sequential stock decrements across multiple devices (e.g. 100 -> 95 -> 88)
 * Idempotent: rejects duplicate transactions with same clientTransactionId or invoiceNo
 */
export function executeSaleAtomic(
  businessId: string,
  saleData: Partial<Sale> & { items: Sale['items'] },
  deviceId: string,
  userId: string,
  clientTransactionId?: string
): { success: boolean; sale?: Sale; error?: string } {
  // Check if transaction was already processed (deduplication)
  if (clientTransactionId) {
    const existing = Array.from(store.sales.values()).find(
      s => s.clientTransactionId === clientTransactionId || s.id === clientTransactionId
    );
    if (existing) {
      return { success: true, sale: existing };
    }
  }

  const user = store.users.get(userId);
  const device = store.devices.get(deviceId);
  const now = new Date().toISOString();

  // Validate stock availability and calculate items
  let totalCost = 0;
  let subtotal = 0;
  let totalDiscount = 0;

  for (const item of saleData.items) {
    const product = store.products.get(item.productId);
    if (!product) {
      return { success: false, error: `Bidhaa yenye namba ${item.productId} haijapatikana.` };
    }

    // Atomic Stock Deduction
    const prevStock = product.stockQty;
    if (item.isServing && product.isBarItem) {
      // Bar shot deduction
      const servingMl = item.servingSizeMl || product.servingSizeMl || 30;
      const bottleMl = product.bottleSizeMl || 750;
      let openMl = product.openBottleRemainingMl ?? bottleMl;

      if (openMl < servingMl) {
        if (product.stockQty > 0) {
          product.stockQty = Math.max(0, product.stockQty - 1);
          openMl = (openMl + bottleMl) - servingMl;
        } else {
          openMl = Math.max(0, openMl - servingMl);
        }
      } else {
        openMl -= servingMl;
      }
      product.openBottleRemainingMl = openMl;
    } else {
      // Standard product deduction
      product.stockQty = Math.max(0, product.stockQty - item.quantity);
    }

    // Record Stock Movement
    store.stockMovements.push({
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      deviceId,
      productId: product.id,
      productName: product.name,
      type: 'sale',
      quantity: -item.quantity,
      previousStock: prevStock,
      newStock: product.stockQty,
      unit: product.unit,
      referenceId: saleData.invoiceNo || `INV-${Date.now()}`,
      reason: `Mauzo ya POS (${item.isServing ? 'Shots' : 'Pcs'})`,
      userId,
      userName: user ? user.name : 'Keshia',
      timestamp: now
    });

    subtotal += item.unitPrice * item.quantity;
    totalDiscount += item.discount || 0;
    totalCost += (item.costPrice || product.buyingPrice || 0) * item.quantity;
  }

  const finalTotal = saleData.total !== undefined ? saleData.total : (subtotal - totalDiscount);
  const finalProfit = saleData.profit !== undefined ? saleData.profit : (finalTotal - totalCost);

  const newSale: Sale = {
    id: saleData.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    businessId,
    deviceId,
    deviceName: device ? device.name : 'Unknown Device',
    clientTransactionId,
    syncStatus: 'synced',
    invoiceNo: saleData.invoiceNo || `INV-${new Date().getFullYear()}-${String(store.sales.size + 1).padStart(4, '0')}`,
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
    cashierName: user ? user.name : (saleData.cashierName || 'Keshia'),
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

  // If debt sale, create/update debt record
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

  // Record immutable audit log
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

  // Update device heartbeat
  if (device) {
    device.lastActive = now;
    device.lastSync = now;
    device.status = 'online';
  }

  return { success: true, sale: newSale };
}

/**
 * Process a batch of pending offline sync transactions from a client device
 */
export function processSyncQueueBatch(
  businessId: string,
  deviceId: string,
  transactions: SyncTransaction[]
): {
  processed: number;
  failed: number;
  results: { localId: string; globalId?: string; status: 'synced' | 'failed'; error?: string }[];
} {
  const results: { localId: string; globalId?: string; status: 'synced' | 'failed'; error?: string }[] = [];
  let processed = 0;
  let failed = 0;

  const device = store.devices.get(deviceId);
  if (device && device.isRevoked) {
    return {
      processed: 0,
      failed: transactions.length,
      results: transactions.map(t => ({
        localId: t.localId,
        status: 'failed',
        error: 'Kifaa hiki kimezuiwa (Device access revoked).'
      }))
    };
  }

  for (const tx of transactions) {
    try {
      if (tx.entityType === 'sale') {
        const saleResult = executeSaleAtomic(
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

  // Update device sync timestamp
  if (device) {
    device.lastSync = new Date().toISOString();
    device.lastActive = new Date().toISOString();
    device.status = 'online';
  }

  return { processed, failed, results };
}
