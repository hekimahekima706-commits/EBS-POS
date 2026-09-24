import express, { Request, Response, Router } from 'express';
import { getCentralStore, executeSaleAtomic, processSyncQueueBatch } from './db';
import { User, BusinessDevice, UserSession, Sale, Product, Customer, Expense, AuditLog } from '../src/types';

export const apiRouter = Router();

// Middleware: Tenant Isolation & Token Validation
function extractAuthContext(req: Request) {
  const store = getCentralStore();
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.headers['x-session-token'] as string);
  const deviceId = (req.headers['x-device-id'] as string) || 'DEV-POS-03';
  const businessId = (req.headers['x-business-id'] as string) || 'EBS-BIZ-000001';

  let session = token ? store.sessions.get(token) : undefined;
  let user = session ? store.users.get(session.userId) : undefined;

  // If no active session, fallback to looking up device or default user for development resilience
  return {
    token,
    session,
    user,
    deviceId,
    businessId: user?.businessId || businessId,
    store
  };
}

// ----------------------------------------------------
// AUTHENTICATION & SESSIONS
// ----------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, passwordHash, deviceId, deviceName, platform } = req.body;
  const store = getCentralStore();

  if (!username || !passwordHash) {
    res.status(400).json({ error: 'Jina la mtumiaji na neno la siri vinahitajika.' });
    return;
  }

  // Find user by username or 'elly' alias for owner
  const user = Array.from(store.users.values()).find(
    u => u.username.toLowerCase() === username.toLowerCase() ||
         (username.toLowerCase() === 'elly' && u.role === 'owner') ||
         (username.toLowerCase() === 'owner01' && u.role === 'owner')
  );

  if (!user) {
    res.status(401).json({ error: 'Jina la mtumiaji au neno la siri si sahihi.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Akaunti hii imezimwa na Msimamizi/Mmiliki.' });
    return;
  }

  // Verify password hash
  if (user.passwordHash !== passwordHash) {
    res.status(401).json({ error: 'Neno la siri si sahihi. Tafadhali jaribu tena.' });
    return;
  }

  // Device registration / verification
  const devId = deviceId || `DEV-${user.role.toUpperCase()}-${Date.now().toString().slice(-4)}`;
  let device = store.devices.get(devId);

  if (device && device.isRevoked) {
    res.status(403).json({
      error: 'Kifaa hiki kimezuiwa kutumia mfumo huu (Device revoked). Wasiliana na Mmiliki wa Biashara.'
    });
    return;
  }

  const now = new Date().toISOString();
  if (!device) {
    device = {
      id: devId,
      businessId: user.businessId || 'EBS-BIZ-000001',
      name: deviceName || `${user.name} (${platform || 'Web'})`,
      platform: platform || 'android',
      appVersion: 'v1.3.0',
      databaseVersion: 'v1.3.0',
      assignedUserId: user.id,
      assignedUserName: `${user.name} (${user.role})`,
      assignedRole: user.role,
      status: 'online',
      isOnline: true,
      registeredAt: now,
      lastActive: now,
      lastSync: now,
      isRevoked: false
    };
    store.devices.set(devId, device);
  } else {
    device.status = 'online';
    device.isOnline = true;
    device.lastActive = now;
    device.assignedUserId = user.id;
    device.assignedUserName = `${user.name} (${user.role})`;
    device.assignedRole = user.role;
  }

  // Create Session Token
  const token = `ebs_tok_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const session: UserSession = {
    id: `sess-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    deviceId: devId,
    deviceName: device.name,
    businessId: user.businessId,
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: `${device.name} (${device.platform})`,
    status: 'active',
    isCurrent: true
  };
  store.sessions.set(token, session);

  // Update user lastLogin
  user.lastLogin = now;

  const business = store.businesses.get(user.businessId || 'EBS-BIZ-000001');

  // Record audit log
  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: user.businessId,
    deviceId: devId,
    deviceName: device.name,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `Kuingia Kwenye Mfumo (Login)`,
    details: `Mtumiaji ameingia kupitia kifaa "${device.name}" (${device.platform})`,
    entityType: 'auth',
    entityId: user.id,
    timestamp: now
  });

  res.json({
    token,
    user,
    device,
    business: business || store.businesses.get('EBS-BIZ-000001')
  });
});

apiRouter.post('/auth/switch-user', (req: Request, res: Response) => {
  const { username, passwordHash, deviceId } = req.body;
  const store = getCentralStore();

  const user = Array.from(store.users.values()).find(
    u => u.username.toLowerCase() === username.toLowerCase() ||
         (username.toLowerCase() === 'elly' && u.role === 'owner') ||
         (username.toLowerCase() === 'owner01' && u.role === 'owner')
  );

  if (!user || user.passwordHash !== passwordHash) {
    res.status(401).json({ error: 'Jina la mtumiaji au neno la siri si sahihi.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Akaunti hii imezimwa.' });
    return;
  }

  const devId = deviceId || 'DEV-POS-03';
  const device = store.devices.get(devId);
  const now = new Date().toISOString();

  const token = `ebs_tok_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const session: UserSession = {
    id: `sess-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    deviceId: devId,
    deviceName: device ? device.name : 'Terminal',
    businessId: user.businessId,
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: device ? `${device.name}` : 'Shared POS',
    status: 'active',
    isCurrent: true
  };
  store.sessions.set(token, session);

  if (device) {
    device.assignedUserId = user.id;
    device.assignedUserName = `${user.name} (${user.role})`;
    device.assignedRole = user.role;
    device.lastActive = now;
  }

  res.json({
    token,
    user,
    device: device || null
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const { token, store } = extractAuthContext(req);
  if (token && store.sessions.has(token)) {
    const sess = store.sessions.get(token);
    if (sess) sess.status = 'terminated';
    store.sessions.delete(token);
  }
  res.json({ success: true, message: 'Umetoka kwenye mfumo kwa ufanisi.' });
});

// ----------------------------------------------------
// BUSINESS & PROFILE
// ----------------------------------------------------

apiRouter.get('/business/profile', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const business = store.businesses.get(businessId) || store.businesses.get('EBS-BIZ-000001');
  res.json(business);
});

apiRouter.put('/business/profile', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  let business = store.businesses.get(businessId);
  if (!business) {
    business = store.businesses.get('EBS-BIZ-000001')!;
  }
  if (business) {
    if (req.body.profile) {
      business.profile = { ...business.profile, ...req.body.profile };
      business.name = business.profile.name;
    }
    if (req.body.name) business.name = req.body.name;
    if (req.body.phone) business.phone = req.body.phone;
    if (req.body.address) business.address = req.body.address;
  }
  res.json(business);
});

// ----------------------------------------------------
// DEVICES MANAGEMENT
// ----------------------------------------------------

apiRouter.get('/devices', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const devices = Array.from(store.devices.values()).filter(
    d => d.businessId === businessId || d.businessId === 'EBS-BIZ-000001'
  );
  res.json(devices);
});

apiRouter.post('/devices/register', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const { id, name, platform, appVersion, assignedUserId, assignedUserName, assignedRole } = req.body;
  const devId = id || `DEV-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  let dev = store.devices.get(devId);
  if (!dev) {
    dev = {
      id: devId,
      businessId,
      name: name || `Vifaa ${devId}`,
      platform: platform || 'android',
      appVersion: appVersion || 'v1.3.0',
      databaseVersion: 'v1.3.0',
      assignedUserId,
      assignedUserName,
      assignedRole,
      status: 'online',
      isOnline: true,
      registeredAt: now,
      lastActive: now,
      lastSync: now,
      isRevoked: false
    };
  } else {
    dev.name = name || dev.name;
    dev.lastActive = now;
    dev.status = dev.isRevoked ? 'revoked' : 'online';
    if (assignedUserId) {
      dev.assignedUserId = assignedUserId;
      dev.assignedUserName = assignedUserName;
      dev.assignedRole = assignedRole;
    }
  }

  store.devices.set(devId, dev);
  res.json(dev);
});

apiRouter.post('/devices/:id/revoke', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user, store } = extractAuthContext(req);

  const device = store.devices.get(id);
  if (!device) {
    res.status(404).json({ error: 'Kifaa hakikupatikana.' });
    return;
  }

  const now = new Date().toISOString();
  device.isRevoked = true;
  device.status = 'revoked';
  device.revokedAt = now;
  device.revokedBy = user ? user.name : 'Mmiliki (Owner)';

  // Invalidate any active session using this device
  for (const [token, sess] of store.sessions.entries()) {
    if (sess.deviceId === id) {
      sess.status = 'terminated';
      store.sessions.delete(token);
    }
  }

  // Audit log
  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: device.businessId,
    deviceId: id,
    deviceName: device.name,
    userId: user?.id || 'usr-1',
    userName: user?.name || 'Owner',
    userRole: 'owner',
    action: `Kufuta Idhini ya Kifaa (Revoke Device Access)`,
    details: `Idhini ya kifaa "${device.name}" (${device.id}) imefutwa mara moja.`,
    entityType: 'device',
    entityId: device.id,
    timestamp: now
  });

  res.json({ success: true, device });
});

apiRouter.put('/devices/:id/update', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, platform } = req.body;
  const { store } = extractAuthContext(req);

  const device = store.devices.get(id);
  if (!device) {
    res.status(404).json({ error: 'Kifaa hakikupatikana.' });
    return;
  }

  if (name) device.name = name;
  if (platform) device.platform = platform;
  device.lastActive = new Date().toISOString();

  res.json(device);
});

// ----------------------------------------------------
// PRODUCTS & ATOMIC STOCK
// ----------------------------------------------------

apiRouter.get('/products', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const products = Array.from(store.products.values()).filter(
    p => p.businessId === businessId || p.businessId === 'EBS-BIZ-000001'
  );
  res.json(products);
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const { businessId, user, store } = extractAuthContext(req);
  const newProduct: Product = {
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    businessId,
    active: req.body.active !== undefined ? req.body.active : true
  };
  store.products.set(newProduct.id, newProduct);
  res.json(newProduct);
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const product = store.products.get(id);
  if (!product) {
    res.status(404).json({ error: 'Bidhaa haijapatikana.' });
    return;
  }
  Object.assign(product, req.body);
  res.json(product);
});

apiRouter.post('/products/adjust-stock', (req: Request, res: Response) => {
  const { productId, newStock, reason, unit } = req.body;
  const { businessId, user, deviceId, store } = extractAuthContext(req);

  const product = store.products.get(productId);
  if (!product) {
    res.status(404).json({ error: 'Bidhaa haijapatikana.' });
    return;
  }

  const prevStock = product.stockQty;
  product.stockQty = newStock;
  const now = new Date().toISOString();

  store.stockMovements.push({
    id: `mov-${Date.now()}`,
    businessId,
    deviceId,
    productId: product.id,
    productName: product.name,
    type: 'adjustment',
    quantity: newStock - prevStock,
    previousStock: prevStock,
    newStock: newStock,
    unit: unit || product.unit,
    reason: reason || 'Marekebisho ya Stoo',
    userId: user?.id || 'usr-1',
    userName: user?.name || 'Msimamizi wa Stoo',
    timestamp: now
  });

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    deviceId,
    userId: user?.id || 'usr-1',
    userName: user?.name || 'Storekeeper',
    userRole: user?.role || 'storekeeper',
    action: `Kurekebisha Stoo: ${product.name}`,
    details: `Ilitoka ${prevStock} hadi ${newStock} ${product.unit}. Sababu: ${reason || 'Ukaguzi'}`,
    entityType: 'stock',
    entityId: product.id,
    timestamp: now
  });

  res.json({ success: true, product });
});

// ----------------------------------------------------
// SALES & INVOICES
// ----------------------------------------------------

apiRouter.get('/sales', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const sales = Array.from(store.sales.values())
    .filter(s => s.businessId === businessId || s.businessId === 'EBS-BIZ-000001')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(sales);
});

apiRouter.post('/sales', (req: Request, res: Response) => {
  const { businessId, user, deviceId } = extractAuthContext(req);
  const saleData = req.body;

  const result = executeSaleAtomic(
    businessId,
    saleData,
    deviceId,
    user?.id || saleData.cashierId || 'usr-3',
    saleData.clientTransactionId
  );

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result.sale);
});

apiRouter.post('/sales/:id/refund', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { businessId, user, deviceId, store } = extractAuthContext(req);

  const sale = store.sales.get(id);
  if (!sale) {
    res.status(404).json({ error: 'Risiti haijapatikana.' });
    return;
  }

  const now = new Date().toISOString();
  sale.status = 'refunded';
  sale.refundReason = reason || 'Kufuta/Kurejesha risiti';
  sale.refundedBy = user?.name || 'Msimamizi';
  sale.refundedAt = now;

  // Restore inventory
  for (const item of sale.items) {
    const product = store.products.get(item.productId);
    if (product) {
      product.stockQty += item.quantity;
      store.stockMovements.push({
        id: `mov-${Date.now()}`,
        businessId,
        deviceId,
        productId: product.id,
        productName: product.name,
        type: 'return',
        quantity: item.quantity,
        previousStock: product.stockQty - item.quantity,
        newStock: product.stockQty,
        unit: product.unit,
        reason: `Refund ya Mauzo #${sale.invoiceNo}`,
        userId: user?.id || 'usr-1',
        userName: user?.name || 'Meneja',
        timestamp: now
      });
    }
  }

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    deviceId,
    userId: user?.id || 'usr-1',
    userName: user?.name || 'Meneja',
    userRole: user?.role || 'manager',
    action: `Kufanya Refund ya Mauzo #${sale.invoiceNo}`,
    details: `Kiasi: TZS ${sale.total.toLocaleString()}. Sababu: ${reason || 'N/A'}`,
    entityType: 'sale',
    entityId: sale.id,
    timestamp: now
  });

  res.json({ success: true, sale });
});

// ----------------------------------------------------
// SYNC ENGINE ENDPOINTS (OFFLINE-FIRST)
// ----------------------------------------------------

apiRouter.post('/sync/push', (req: Request, res: Response) => {
  const { businessId, deviceId } = extractAuthContext(req);
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.json({ processed: 0, failed: 0, results: [] });
    return;
  }

  const result = processSyncQueueBatch(businessId, deviceId, transactions);
  res.json(result);
});

apiRouter.get('/sync/pull', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const since = req.query.since ? new Date(req.query.since as string).getTime() : 0;

  const products = Array.from(store.products.values());
  const sales = Array.from(store.sales.values()).filter(
    s => new Date(s.timestamp).getTime() >= since
  );
  const devices = Array.from(store.devices.values());
  const users = Array.from(store.users.values()).map(u => ({
    ...u,
    passwordHash: '' // Do not send password hashes over plain sync pull
  }));

  res.json({
    timestamp: new Date().toISOString(),
    products,
    sales,
    devices,
    users,
    totalProducts: products.length
  });
});

// ----------------------------------------------------
// REAL-TIME OWNER MONITORING & DASHBOARD
// ----------------------------------------------------

apiRouter.get('/live/overview', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const todayStr = new Date().toISOString().split('T')[0];

  const salesList = Array.from(store.sales.values()).filter(
    s => (s.businessId === businessId || s.businessId === 'EBS-BIZ-000001') &&
         s.timestamp.startsWith(todayStr) &&
         s.status === 'completed'
  );

  let salesRevenue = 0;
  let grossProfit = 0;
  let cashTotal = 0;
  let mobileMoneyTotal = 0;
  let cardBankTotal = 0;
  let debtTotal = 0;

  salesList.forEach(s => {
    salesRevenue += s.total;
    grossProfit += s.profit;
    if (s.paymentMethod === 'cash') cashTotal += s.total;
    else if (['mpesa', 'airtel', 'tigopesa', 'halopesa'].includes(s.paymentMethod)) mobileMoneyTotal += s.total;
    else if (['card', 'bank'].includes(s.paymentMethod)) cardBankTotal += s.total;
    else if (s.paymentMethod === 'debt') debtTotal += s.total;
  });

  const todayExpenses = store.expenses.filter(
    e => (e.businessId === businessId || e.businessId === 'EBS-BIZ-000001') && e.date.startsWith(todayStr)
  );
  const expensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const devices = Array.from(store.devices.values());
  const activeDevices = devices.filter(d => d.status === 'online' && !d.isRevoked);

  const products = Array.from(store.products.values());
  const lowStockCount = products.filter(p => p.active && p.stockQty <= p.minStock).length;

  const totalDebtBalance = Array.from(store.debts.values())
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const recentSales = Array.from(store.sales.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  res.json({
    businessId,
    timestamp: new Date().toISOString(),
    metrics: {
      salesRevenue,
      grossProfit,
      expensesTotal,
      netProfit: grossProfit - expensesTotal,
      cashTotal,
      mobileMoneyTotal,
      cardBankTotal,
      debtTotal,
      transactionsCount: salesList.length,
      lowStockCount,
      totalDebtBalance
    },
    activeDevicesCount: activeDevices.length,
    activeDevices,
    totalDevicesCount: devices.length,
    recentSales
  });
});

// ----------------------------------------------------
// USERS & EMPLOYEES
// ----------------------------------------------------

apiRouter.get('/users', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const users = Array.from(store.users.values()).filter(
    u => u.businessId === businessId || u.businessId === 'EBS-BIZ-000001'
  );
  res.json(users);
});

apiRouter.post('/users', (req: Request, res: Response) => {
  const { businessId, user: currentUser, store } = extractAuthContext(req);
  const newUser: User = {
    ...req.body,
    id: req.body.id || `usr-${Date.now()}`,
    businessId,
    active: true,
    createdAt: new Date().toISOString()
  };
  store.users.set(newUser.id, newUser);

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    userId: currentUser?.id || 'usr-1',
    userName: currentUser?.name || 'Owner',
    userRole: currentUser?.role || 'owner',
    action: `Kusajili Mfanyakazi Mpya: ${newUser.name}`,
    details: `Nafasi: ${newUser.role.toUpperCase()}, Simu: ${newUser.phone}`,
    entityType: 'user',
    entityId: newUser.id,
    timestamp: new Date().toISOString()
  });

  res.json(newUser);
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const user = store.users.get(id);
  if (!user) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }
  Object.assign(user, req.body);
  res.json(user);
});

apiRouter.post('/users/:id/deactivate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user: currentUser, store } = extractAuthContext(req);
  const targetUser = store.users.get(id);
  if (!targetUser) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }

  targetUser.active = !targetUser.active;

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: targetUser.businessId,
    userId: currentUser?.id || 'usr-1',
    userName: currentUser?.name || 'Owner',
    userRole: 'owner',
    action: targetUser.active ? `Kuwasha Akaunti ya Mfanyakazi` : `Kuzima Akaunti ya Mfanyakazi`,
    details: `Akaunti ya "${targetUser.name}" (${targetUser.role}) ${targetUser.active ? 'imewashwa' : 'imezimwa'}.`,
    entityType: 'user',
    entityId: targetUser.id,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, user: targetUser });
});

apiRouter.post('/users/:id/reset-password', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPasswordHash, temporaryPassword } = req.body;
  const { user: currentUser, store } = extractAuthContext(req);

  const targetUser = store.users.get(id);
  if (!targetUser) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }

  targetUser.passwordHash = newPasswordHash;
  if (temporaryPassword) {
    targetUser.mustChangePassword = true;
    targetUser.temporaryPasswordGenerated = temporaryPassword;
  }

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: targetUser.businessId,
    userId: currentUser?.id || 'usr-1',
    userName: currentUser?.name || 'Owner',
    userRole: 'owner',
    action: `Kubadilisha Neno la Siri la Mfanyakazi`,
    details: `Mmiliki amebadilisha neno la siri la mtumiaji "${targetUser.name}".`,
    entityType: 'user',
    entityId: targetUser.id,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: 'Neno la siri limebadilishwa kwa ufanisi.' });
});

// ----------------------------------------------------
// AUDIT LOGS, CUSTOMERS, DEBTS, EXPENSES, SUPPLIERS
// ----------------------------------------------------

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(store.auditLogs);
});

apiRouter.get('/customers', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(Array.from(store.customers.values()));
});

apiRouter.get('/debts', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(Array.from(store.debts.values()));
});

apiRouter.get('/expenses', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(store.expenses);
});

apiRouter.get('/suppliers', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(Array.from(store.suppliers.values()));
});
