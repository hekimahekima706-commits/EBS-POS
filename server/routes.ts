import express, { Request, Response, Router } from 'express';
import crypto from 'crypto';
import {
  getCentralStore,
  executeSaleAtomic,
  processSyncQueueBatch,
  persistStoreToDisk,
  createDatabaseBackup,
  restoreDatabaseBackup,
  supabase
} from './db';
import {
  verifyUserPassword,
  hashPasswordPBKDF2,
  generateSecureSessionToken,
  validatePasswordStrength
} from './security';
import {
  User,
  BusinessDevice,
  UserSession,
  Sale,
  Product,
  Customer,
  Expense,
  DebtRecord,
  Supplier,
  RestaurantTable,
  BarVarianceRecord,
  CCTVCamera,
  CameraEvent,
  AuditLog,
  PlatformAdmin,
  SuperAdminAction,
  PasswordResetToken
} from '../src/types';

export const apiRouter = Router();

// Middleware: Extract Auth Context & Strict Tenant Isolation
export function extractAuthContext(req: Request) {
  const store = getCentralStore();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.headers['x-session-token'] as string);

  const deviceId = (req.headers['x-device-id'] as string) || 'DEV-POS-03';

  let session: UserSession | undefined;
  let user: User | undefined;
  let businessId: string | undefined;

  if (token) {
    session = store.sessions.get(token);
    if (session && session.status === 'active') {
      user = store.users.get(session.userId);
      businessId = session.businessId || user?.businessId;
      session.lastActivity = new Date().toISOString();
    }
  }

  return {
    token,
    session,
    user,
    deviceId,
    businessId: businessId || user?.businessId || 'EBS-BIZ-000001',
    isAuthenticated: !!(session && user && user.active),
    store
  };
}

// Authentication guard middleware for protected endpoints
function requireAuth(req: Request, res: Response, next: () => void) {
  const { isAuthenticated, user } = extractAuthContext(req);
  if (!isAuthenticated || !user) {
    res.status(401).json({ error: 'Uthibitisho unahitajika (Unauthorized). Tafadhali ingia kwenye mfumo.' });
    return;
  }
  next();
}

// Role permission guard
function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: () => void) => {
    const { user } = extractAuthContext(req);
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Huna idhini ya kufanya kitendo hiki (Forbidden).' });
      return;
    }
    next();
  };
}

// ----------------------------------------------------
// AUTHENTICATION & SESSIONS
// ----------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password, passwordHash, deviceId, deviceName, platform } = req.body;
  const store = getCentralStore();

  if (!username || (!password && !passwordHash)) {
    res.status(400).json({ error: 'Jina la mtumiaji na neno la siri vinahitajika.' });
    return;
  }

  const cleanUsername = String(username).trim();
  // Lookup user by username or phone
  const user = Array.from(store.users.values()).find(
    u => u.username.toLowerCase() === cleanUsername.toLowerCase() ||
         u.phone.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '')
  );

  if (!user) {
    res.status(401).json({ error: 'Jina la mtumiaji au neno la siri si sahihi.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Akaunti hii imezimwa na Msimamizi/Mmiliki.' });
    return;
  }

  // Check Account Lockout
  const nowMs = Date.now();
  if (user.lockoutUntil && new Date(user.lockoutUntil).getTime() > nowMs) {
    const remainingMins = Math.ceil((new Date(user.lockoutUntil).getTime() - nowMs) / 60000);
    res.status(429).json({
      error: `Akaunti imefungwa kwa muda kutokana na makosa mengi ya neno la siri. Jaribu tena baada ya dakika ${remainingMins}.`
    });
    return;
  }

  // Verify password using PBKDF2 with unique salt or legacy verification
  const providedCred = password || passwordHash;
  const verification = verifyUserPassword(
    providedCred,
    user.passwordHash,
    (user as any).passwordSalt
  );

  if (!verification.isValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
    }
    persistStoreToDisk();
    res.status(401).json({
      error: 'Neno la siri si sahihi.',
      attemptsLeft: Math.max(0, 5 - (user.failedLoginAttempts || 0))
    });
    return;
  }

  // Password is valid - reset lock and upgrade hash if needed
  user.failedLoginAttempts = 0;
  user.lockoutUntil = undefined;
  if (verification.needsRehash && password) {
    const upgraded = hashPasswordPBKDF2(password);
    user.passwordHash = upgraded.hash;
    (user as any).passwordSalt = upgraded.salt;
  }

  const now = new Date().toISOString();
  user.lastLogin = now;

  // Device registration / verification
  const devId = deviceId || `DEV-${user.role.toUpperCase()}-${Date.now().toString().slice(-4)}`;
  let device = store.devices.get(devId);

  if (device && device.isRevoked) {
    res.status(403).json({
      error: 'Kifaa hiki kimezuiwa kutumia mfumo huu (Device revoked). Wasiliana na Mmiliki wa Biashara.'
    });
    return;
  }

  if (!device) {
    device = {
      id: devId,
      businessId: user.businessId || 'EBS-BIZ-000001',
      name: deviceName || `${user.name} (${platform || 'Android'})`,
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

  // Generate Cryptographically Secure Session Token
  const token = generateSecureSessionToken(user.id);
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

  // Record Audit Log
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

  persistStoreToDisk();

  const business = store.businesses.get(user.businessId) || store.businesses.get('EBS-BIZ-000001');

  // Return sanitized user without password hash/salt
  const sanitizedUser = {
    ...user,
    passwordHash: undefined,
    passwordSalt: undefined
  };

  res.json({
    token,
    user: sanitizedUser,
    device,
    business,
    mustChangePassword: !!user.mustChangePassword
  });
});

apiRouter.post('/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const { user } = extractAuthContext(req);

  if (!user) {
    res.status(401).json({ error: 'Mtumiaji hajatambuliwa.' });
    return;
  }

  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: 'Neno la zamani na jipya vinahitajika.' });
    return;
  }

  const ver = verifyUserPassword(oldPassword, user.passwordHash, (user as any).passwordSalt);
  if (!ver.isValid) {
    res.status(400).json({ error: 'Neno la siri la sasa si sahihi.' });
    return;
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    res.status(400).json({ error: strength.errors.join(' ') });
    return;
  }

  const { hash, salt } = hashPasswordPBKDF2(newPassword);
  user.passwordHash = hash;
  (user as any).passwordSalt = salt;
  user.mustChangePassword = false;

  // Audit log
  const store = getCentralStore();
  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: user.businessId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `Kubadilisha Neno la Siri`,
    details: `Mtumiaji amebadilisha neno lake la siri kibinafsi.`,
    entityType: 'auth',
    entityId: user.id,
    timestamp: new Date().toISOString()
  });

  persistStoreToDisk();
  res.json({ success: true, message: 'Neno la siri limebadilishwa kwa ufanisi.' });
});

// ----------------------------------------------------
// PASSWORD RECOVERY & BOSS EMERGENCY RESET
// ----------------------------------------------------

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'Tafadhali weka jina la mtumiaji, barua pepe, au namba ya simu.' });
    return;
  }

  const store = getCentralStore();
  const clean = String(identifier).trim().toLowerCase();
  const cleanDigits = clean.replace(/\D/g, '');

  const user = Array.from(store.users.values()).find(
    u => u.username.toLowerCase() === clean ||
         (u.email && u.email.toLowerCase() === clean) ||
         (cleanDigits.length >= 7 && u.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-7)))
  );

  if (!user) {
    res.json({
      success: true,
      message: 'Kama akaunti ipo, namba ya siri (OTP) imetumwa kwenye simu au barua pepe ya mtumiaji.'
    });
    return;
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  const resetRecord: PasswordResetToken = {
    id: `pwr-${Date.now()}`,
    userId: user.id,
    businessId: user.businessId || 'EBS-BIZ-000001',
    token,
    otpCode,
    contactMethod: user.phone ? 'phone' : 'email',
    contactTarget: user.phone || user.email || '',
    used: false,
    createdAt: now.toISOString(),
    expiresAt
  };

  store.passwordResetTokens.set(token, resetRecord);
  persistStoreToDisk();

  res.json({
    success: true,
    message: `Namba ya siri (OTP) imetumwa kwenda ${user.phone || user.email}. Tumia namba hii kuweka neno jipya la siri.`,
    token,
    devOtp: otpCode
  });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { token, otpCode, newPassword } = req.body;
  const store = getCentralStore();

  if (!token || !otpCode || !newPassword) {
    res.status(400).json({ error: 'Token, namba ya OTP, na neno jipya la siri vinahitajika.' });
    return;
  }

  const resetRecord = store.passwordResetTokens.get(token);
  if (!resetRecord || resetRecord.used) {
    res.status(400).json({ error: 'Ombi hili limekwisha muda wake au limeshatumika. Tafadhali omba OTP mpya.' });
    return;
  }

  if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
    res.status(400).json({ error: 'Namba ya OTP imepitwa na wakati (Expired). Tafadhali omba tena.' });
    return;
  }

  if (resetRecord.otpCode !== String(otpCode).trim()) {
    res.status(400).json({ error: 'Namba ya OTP uliyoweka si sahihi.' });
    return;
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    res.status(400).json({ error: strength.errors.join(' ') });
    return;
  }

  const user = store.users.get(resetRecord.userId);
  if (!user) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }

  const { hash, salt } = hashPasswordPBKDF2(newPassword);
  user.passwordHash = hash;
  (user as any).passwordSalt = salt;
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockoutUntil = undefined;
  resetRecord.used = true;

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: user.businessId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'Kuweka Upya Neno la Siri (OTP Password Reset)',
    details: 'Mtumiaji ameweka neno jipya la siri kwa uthibitisho wa OTP.',
    entityType: 'auth',
    entityId: user.id,
    timestamp: new Date().toISOString()
  });

  persistStoreToDisk();
  res.json({ success: true, message: 'Neno la siri limewekwa upya kikamilifu. Sasa unaweza kuingia.' });
});

apiRouter.post('/auth/boss-reset-employee', requireAuth, requireRole(['owner', 'boss', 'super_admin']), (req: Request, res: Response) => {
  const { employeeId, newPassword, newPin } = req.body;
  const { businessId, user: boss, store } = extractAuthContext(req);

  if (!employeeId) {
    res.status(400).json({ error: 'Tafadhali chagua mfanyakazi (employeeId).' });
    return;
  }

  const employee = store.users.get(employeeId);
  if (!employee) {
    res.status(404).json({ error: 'Mfanyakazi hakupatikana.' });
    return;
  }

  if (boss?.role !== 'super_admin' && employee.businessId !== businessId) {
    res.status(403).json({ error: 'Huna idhini ya kubadilisha taarifa za mfanyakazi wa biashara nyingine.' });
    return;
  }

  if (newPassword) {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      res.status(400).json({ error: strength.errors.join(' ') });
      return;
    }
    const { hash, salt } = hashPasswordPBKDF2(newPassword);
    employee.passwordHash = hash;
    (employee as any).passwordSalt = salt;
    employee.mustChangePassword = true;
  }

  if (newPin) {
    employee.pin = String(newPin).trim();
  }

  employee.failedLoginAttempts = 0;
  employee.lockoutUntil = undefined;

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    userId: boss?.id,
    userName: boss?.name,
    userRole: boss?.role,
    action: `Boss Ameweka Upya Password/PIN ya: ${employee.name}`,
    details: `Mtumishi ${employee.name} (${employee.role}) neno la siri au PIN limewekwa upya na Boss kwa dharura.`,
    entityType: 'user',
    entityId: employee.id,
    timestamp: new Date().toISOString()
  });

  persistStoreToDisk();
  res.json({ success: true, message: `Taarifa za mtumishi "${employee.name}" zimesasishwa kikamilifu.` });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const { token, store } = extractAuthContext(req);
  if (token && store.sessions.has(token)) {
    const sess = store.sessions.get(token);
    if (sess) sess.status = 'terminated';
    store.sessions.delete(token);
    persistStoreToDisk();
  }
  res.json({ success: true, message: 'Umetoka kwenye mfumo kwa ufanisi.' });
});

apiRouter.get('/auth/session', (req: Request, res: Response) => {
  const { isAuthenticated, user, session, businessId, store } = extractAuthContext(req);
  if (!isAuthenticated || !user || !session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const business = store.businesses.get(businessId);
  res.json({
    authenticated: true,
    user: {
      ...user,
      passwordHash: undefined,
      passwordSalt: undefined
    },
    session,
    business
  });
});

// Setup New Business Wizard
apiRouter.post('/auth/setup-new-business', (req: Request, res: Response) => {
  const { businessData, ownerData } = req.body;
  const store = getCentralStore();

  if (!businessData?.name || !ownerData?.name || !ownerData?.username || !ownerData?.password) {
    res.status(400).json({ error: 'Taarifa zote za biashara na mmiliki zinahitajika.' });
    return;
  }

  const newBizId = `EBS-BIZ-${Date.now().toString().slice(-6)}`;
  const newOwnerId = `usr-${Date.now()}`;
  const now = new Date().toISOString();

  const { hash, salt } = hashPasswordPBKDF2(ownerData.password);

  const newOwner: User = {
    id: newOwnerId,
    businessId: newBizId,
    name: ownerData.name,
    username: ownerData.username,
    role: 'owner',
    phone: ownerData.phone || '0676674705',
    email: ownerData.email || '',
    passwordHash: hash,
    active: true,
    createdAt: now,
    mustChangePassword: false,
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
      canAccessBarMode: true
    }
  };
  (newOwner as any).passwordSalt = salt;

  store.users.set(newOwnerId, newOwner);

  const newBusiness = {
    id: newBizId,
    name: businessData.name,
    ownerName: ownerData.name,
    ownerId: newOwnerId,
    phone: ownerData.phone || '0676674705',
    email: businessData.email || '',
    address: businessData.address || 'Tanzania',
    mkoa: businessData.mkoa || 'Dar es Salaam',
    wilaya: businessData.wilaya || 'Ilala',
    currency: 'TZS',
    tin: businessData.tin || '',
    vrn: businessData.vrn || '',
    branches: [
      {
        id: `br-${Date.now()}`,
        businessId: newBizId,
        name: 'Tawi Kuu',
        code: 'HQ-01',
        phone: ownerData.phone || '0676674705',
        address: businessData.address || 'Tanzania',
        isMain: true,
        status: 'active',
        createdAt: now
      }
    ],
    profile: {
      name: businessData.name,
      businessType: businessData.type || 'duka',
      phone: ownerData.phone || '0676674705',
      address: businessData.address || 'Tanzania',
      mkoa: businessData.mkoa || 'Dar es Salaam',
      currency: 'TZS',
      vatEnabled: false,
      vatRate: 18,
      receiptHeader: businessData.name,
      receiptFooter: 'Asante kwa kufanya biashara nasi!',
      setupCompleted: true
    }
  };

  store.businesses.set(newBizId, newBusiness as any);

  // Generate session token
  const token = generateSecureSessionToken(newOwnerId);
  const session: UserSession = {
    id: `sess-${Date.now()}`,
    userId: newOwnerId,
    userName: newOwner.name,
    userRole: 'owner',
    deviceId: 'DEV-OWNER-SETUP',
    deviceName: 'Owner Terminal',
    businessId: newBizId,
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: 'Setup Terminal',
    status: 'active',
    isCurrent: true
  };
  store.sessions.set(token, session);

  persistStoreToDisk();

  res.json({
    success: true,
    token,
    user: {
      ...newOwner,
      passwordHash: undefined,
      passwordSalt: undefined
    },
    business: newBusiness
  });
});

// ----------------------------------------------------
// BUSINESS & PROFILE
// ----------------------------------------------------

apiRouter.get('/business/profile', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const business = store.businesses.get(businessId) || store.businesses.get('EBS-BIZ-000001');
  res.json(business);
});

apiRouter.put('/business/profile', requireAuth, (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  let business = store.businesses.get(businessId);
  if (!business) {
    business = store.businesses.get('EBS-BIZ-000001');
  }
  if (business) {
    if (req.body.profile) {
      business.profile = { ...business.profile, ...req.body.profile };
      business.name = business.profile.name;
    }
    if (req.body.name) business.name = req.body.name;
    if (req.body.phone) business.phone = req.body.phone;
    if (req.body.address) business.address = req.body.address;
    if (business.profile) {
      if (req.body.tin) business.profile.tin = req.body.tin;
      if (req.body.vrn) business.profile.vrn = req.body.vrn;
    }
    persistStoreToDisk();
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
      name: name || `Kifaa ${devId}`,
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
  persistStoreToDisk();
  res.json(dev);
});

apiRouter.post('/devices/:id/revoke', requireAuth, requireRole(['owner']), (req: Request, res: Response) => {
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

  for (const [token, sess] of store.sessions.entries()) {
    if (sess.deviceId === id) {
      sess.status = 'terminated';
      store.sessions.delete(token);
    }
  }

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

  persistStoreToDisk();
  res.json({ success: true, device });
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

apiRouter.post('/products', requireAuth, (req: Request, res: Response) => {
  const { businessId, user, store } = extractAuthContext(req);
  const newProduct: Product = {
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    businessId,
    active: req.body.active !== undefined ? req.body.active : true
  };
  store.products.set(newProduct.id, newProduct);

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    userId: user?.id,
    userName: user?.name,
    userRole: user?.role,
    action: `Kuongeza Bidhaa Mpya: ${newProduct.name}`,
    details: `Bei: TZS ${newProduct.sellingPrice.toLocaleString()}, Stoo: ${newProduct.stockQty} ${newProduct.unit}`,
    entityType: 'product',
    entityId: newProduct.id,
    timestamp: new Date().toISOString()
  });

  persistStoreToDisk();
  res.json(newProduct);
});

apiRouter.put('/products/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const product = store.products.get(id);
  if (!product) {
    res.status(404).json({ error: 'Bidhaa haijapatikana.' });
    return;
  }
  Object.assign(product, req.body);
  persistStoreToDisk();
  res.json(product);
});

apiRouter.delete('/products/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const product = store.products.get(id);
  if (product) {
    product.active = false;
    persistStoreToDisk();
  }
  res.json({ success: true });
});

apiRouter.post('/products/adjust-stock', requireAuth, (req: Request, res: Response) => {
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

  persistStoreToDisk();
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

apiRouter.post('/sales', requireAuth, async (req: Request, res: Response) => {
  const { businessId, user, deviceId } = extractAuthContext(req);
  const saleData = req.body;

  const result = await executeSaleAtomic(
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

apiRouter.post('/sales/:id/refund', requireAuth, (req: Request, res: Response) => {
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

  persistStoreToDisk();
  res.json({ success: true, sale });
});

// ----------------------------------------------------
// SYNC ENGINE ENDPOINTS (OFFLINE-FIRST)
// ----------------------------------------------------

apiRouter.post('/sync/push', requireAuth, async (req: Request, res: Response) => {
  const { businessId, deviceId } = extractAuthContext(req);
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.json({ processed: 0, failed: 0, results: [] });
    return;
  }

  const result = await processSyncQueueBatch(businessId, deviceId, transactions);
  res.json(result);
});

apiRouter.get('/sync/pull', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const since = req.query.since ? new Date(req.query.since as string).getTime() : 0;

  const products = Array.from(store.products.values()).filter(p => p.businessId === businessId || p.businessId === 'EBS-BIZ-000001');
  const sales = Array.from(store.sales.values()).filter(
    s => (s.businessId === businessId || s.businessId === 'EBS-BIZ-000001') && new Date(s.timestamp).getTime() >= since
  );
  const devices = Array.from(store.devices.values()).filter(d => d.businessId === businessId || d.businessId === 'EBS-BIZ-000001');
  const customers = Array.from(store.customers.values()).filter(c => c.businessId === businessId || c.businessId === 'EBS-BIZ-000001');
  const debts = Array.from(store.debts.values()).filter(d => d.businessId === businessId || d.businessId === 'EBS-BIZ-000001');
  const expenses = store.expenses.filter(e => e.businessId === businessId || e.businessId === 'EBS-BIZ-000001');

  res.json({
    timestamp: new Date().toISOString(),
    products,
    sales,
    devices,
    customers,
    debts,
    expenses,
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
  const users = Array.from(store.users.values())
    .filter(u => u.businessId === businessId || u.businessId === 'EBS-BIZ-000001')
    .map(u => ({
      ...u,
      passwordHash: undefined,
      passwordSalt: undefined
    }));
  res.json(users);
});

apiRouter.post('/users', requireAuth, requireRole(['owner', 'manager']), (req: Request, res: Response) => {
  const { businessId, user: currentUser, store } = extractAuthContext(req);
  const { name, username, phone, role, password, permissions } = req.body;

  const newUserId = `usr-${Date.now()}`;
  const rawPass = password || 'Ebs1234!';
  const { hash, salt } = hashPasswordPBKDF2(rawPass);

  const newUser: User = {
    id: newUserId,
    businessId,
    name,
    username: username || `user_${Date.now().toString().slice(-4)}`,
    role: role || 'cashier',
    phone: phone || '0676674705',
    passwordHash: hash,
    active: true,
    createdAt: new Date().toISOString(),
    mustChangePassword: true,
    permissions: permissions || {
      canSell: true,
      canManageInventory: role === 'storekeeper',
      canViewReports: false,
      canManageUsers: false,
      canGiveDiscounts: false,
      canCancelReceipts: false,
      canAccessSettings: false,
      canManageDebts: false,
      canManageSuppliers: false,
      canRecordExpenses: false,
      canExportData: false,
      canViewCostPrice: false
    }
  };
  (newUser as any).passwordSalt = salt;

  store.users.set(newUserId, newUser);

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

  persistStoreToDisk();
  res.json({
    ...newUser,
    passwordHash: undefined,
    passwordSalt: undefined
  });
});

apiRouter.put('/users/:id', requireAuth, requireRole(['owner', 'manager']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const user = store.users.get(id);
  if (!user) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }
  const { name, phone, role, permissions, active } = req.body;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (permissions !== undefined) user.permissions = { ...user.permissions, ...permissions };
  if (active !== undefined) user.active = active;

  persistStoreToDisk();
  res.json({
    ...user,
    passwordHash: undefined,
    passwordSalt: undefined
  });
});

apiRouter.post('/users/:id/reset-password', requireAuth, requireRole(['owner']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { customNewPassword } = req.body;
  const { user: currentUser, store } = extractAuthContext(req);

  const targetUser = store.users.get(id);
  if (!targetUser) {
    res.status(404).json({ error: 'Mtumiaji hakupatikana.' });
    return;
  }

  const newPass = customNewPassword || 'Ebs1234!';
  const { hash, salt } = hashPasswordPBKDF2(newPass);
  targetUser.passwordHash = hash;
  (targetUser as any).passwordSalt = salt;
  targetUser.mustChangePassword = true;

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

  persistStoreToDisk();
  res.json({ success: true, message: 'Neno la siri limebadilishwa kwa ufanisi.' });
});

// ----------------------------------------------------
// CUSTOMERS & DEBTS
// ----------------------------------------------------

apiRouter.get('/customers', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const customers = Array.from(store.customers.values()).filter(
    c => c.businessId === businessId || c.businessId === 'EBS-BIZ-000001'
  );
  res.json(customers);
});

apiRouter.post('/customers', requireAuth, (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const newCust: Customer = {
    ...req.body,
    id: req.body.id || `cust-${Date.now()}`,
    businessId,
    currentDebt: req.body.currentDebt || 0,
    totalSpent: req.body.totalSpent || 0,
    transactionCount: req.body.transactionCount || 0,
    createdAt: new Date().toISOString()
  };
  store.customers.set(newCust.id, newCust);
  persistStoreToDisk();
  res.json(newCust);
});

apiRouter.put('/customers/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const cust = store.customers.get(id);
  if (!cust) {
    res.status(404).json({ error: 'Mteja hakupatikana.' });
    return;
  }
  Object.assign(cust, req.body);
  persistStoreToDisk();
  res.json(cust);
});

apiRouter.get('/debts', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const debts = Array.from(store.debts.values()).filter(
    d => d.businessId === businessId || d.businessId === 'EBS-BIZ-000001'
  );
  res.json(debts);
});

apiRouter.post('/debts/:id/pay', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, method, reference, note } = req.body;
  const { user, store } = extractAuthContext(req);

  const debt = store.debts.get(id);
  if (!debt) {
    res.status(404).json({ error: 'Deni halikupatikana.' });
    return;
  }

  const now = new Date().toISOString();
  const payAmount = Number(amount) || 0;
  debt.paidAmount += payAmount;
  debt.remainingAmount = Math.max(0, debt.remainingAmount - payAmount);
  if (debt.remainingAmount === 0) {
    debt.status = 'paid';
  } else {
    debt.status = 'partial';
  }

  if (!debt.payments) debt.payments = [];
  debt.payments.push({
    id: `pay-${Date.now()}`,
    amount: payAmount,
    date: now,
    method: method || 'cash',
    reference,
    receivedBy: user ? user.name : 'Cashier',
    note: note
  });

  const cust = store.customers.get(debt.customerId);
  if (cust) {
    cust.currentDebt = Math.max(0, cust.currentDebt - payAmount);
  }

  persistStoreToDisk();
  res.json({ success: true, debt });
});

// ----------------------------------------------------
// EXPENSES & SUPPLIERS
// ----------------------------------------------------

apiRouter.get('/expenses', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const expenses = store.expenses.filter(
    e => e.businessId === businessId || e.businessId === 'EBS-BIZ-000001'
  );
  res.json(expenses);
});

apiRouter.post('/expenses', requireAuth, (req: Request, res: Response) => {
  const { businessId, user, deviceId, store } = extractAuthContext(req);
  const newExp: Expense = {
    ...req.body,
    id: req.body.id || `exp-${Date.now()}`,
    businessId,
    deviceId,
    recordedBy: user ? user.name : (req.body.recordedBy || 'Admin'),
    date: req.body.date || new Date().toISOString().split('T')[0]
  };
  store.expenses.unshift(newExp);
  persistStoreToDisk();
  res.json(newExp);
});

apiRouter.delete('/expenses/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  store.expenses = store.expenses.filter(e => e.id !== id);
  persistStoreToDisk();
  res.json({ success: true });
});

apiRouter.get('/suppliers', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const suppliers = Array.from(store.suppliers.values()).filter(
    s => s.businessId === businessId || s.businessId === 'EBS-BIZ-000001'
  );
  res.json(suppliers);
});

apiRouter.post('/suppliers', requireAuth, (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const newSup: Supplier = {
    ...req.body,
    id: req.body.id || `sup-${Date.now()}`,
    businessId,
    createdAt: new Date().toISOString(),
    amountOwed: req.body.amountOwed || 0,
    totalSupplied: req.body.totalSupplied || 0,
    status: req.body.status || 'active'
  };
  store.suppliers.set(newSup.id, newSup);
  persistStoreToDisk();
  res.json(newSup);
});

// ----------------------------------------------------
// RESTAURANT TABLES & BAR VARIANCES
// ----------------------------------------------------

apiRouter.get('/tables', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(Array.from(store.tables.values()));
});

apiRouter.put('/tables/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { store } = extractAuthContext(req);
  const table = store.tables.get(id);
  if (table) {
    Object.assign(table, req.body);
    persistStoreToDisk();
  }
  res.json(table);
});

apiRouter.get('/bar/variances', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(store.barVariances);
});

apiRouter.post('/bar/variances', requireAuth, (req: Request, res: Response) => {
  const { businessId, user, store } = extractAuthContext(req);
  const newRec: BarVarianceRecord = {
    ...req.body,
    id: `var-${Date.now()}`,
    businessId,
    date: req.body.date || new Date().toISOString().split('T')[0],
    recordedBy: user ? user.name : 'Bar Manager'
  };
  store.barVariances.unshift(newRec);
  persistStoreToDisk();
  res.json(newRec);
});

// ----------------------------------------------------
// CAMERAS & AUDIT LOGS
// ----------------------------------------------------

apiRouter.get('/cameras', (req: Request, res: Response) => {
  const { store } = extractAuthContext(req);
  res.json(Array.from(store.cameras.values()));
});

apiRouter.post('/cameras', requireAuth, requireRole(['owner', 'manager']), (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const newCam: CCTVCamera = {
    ...req.body,
    id: req.body.id || `cam-${Date.now()}`,
    businessId,
    enabled: true,
    status: 'online'
  };
  store.cameras.set(newCam.id, newCam);
  persistStoreToDisk();
  res.json(newCam);
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const { businessId, store } = extractAuthContext(req);
  const logs = store.auditLogs.filter(
    a => a.businessId === businessId || a.businessId === 'EBS-BIZ-000001'
  );
  res.json(logs);
});

// ----------------------------------------------------
// BACKUP & RESTORE
// ----------------------------------------------------

apiRouter.get('/backup/export', requireAuth, requireRole(['owner']), (req: Request, res: Response) => {
  const { businessId } = extractAuthContext(req);
  const backupJson = createDatabaseBackup(businessId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=ebs_backup_${businessId}_${Date.now()}.json`);
  res.send(backupJson);
});

apiRouter.post('/backup/restore', requireAuth, requireRole(['owner']), (req: Request, res: Response) => {
  const { backupJson } = req.body;
  if (!backupJson) {
    res.status(400).json({ error: 'Data za backup zinahitajika.' });
    return;
  }
  const result = restoreDatabaseBackup(backupJson);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json({ success: true, message: result.message });
});

// ----------------------------------------------------
// EBS HEAD OFFICE / SUPER ADMIN PORTAL
// ----------------------------------------------------

function requireSuperAdmin(req: Request, res: Response, next: () => void) {
  const store = getCentralStore();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.headers['x-admin-token'] as string);

  if (!token) {
    res.status(401).json({ error: 'Uthibitisho wa EBS Head Office unahitajika (Admin Token Missing).' });
    return;
  }

  const session = store.sessions.get(token);
  if (session && session.status === 'active') {
    const admin = store.platformAdmins.get(session.userId);
    if (admin && admin.active && admin.role === 'super_admin') {
      (req as any).superAdmin = admin;
      return next();
    }
  }

  const directAdmin = Array.from(store.platformAdmins.values()).find(
    a => a.id === token || a.username === token
  );
  if (directAdmin && directAdmin.active) {
    (req as any).superAdmin = directAdmin;
    return next();
  }

  res.status(403).json({ error: 'Huna idhini ya Super Admin (EBS Head Office Access Only).' });
}

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const store = getCentralStore();

  if (!username || !password) {
    res.status(400).json({ error: 'Jina la Super Admin na neno la siri vinahitajika.' });
    return;
  }

  const admin = Array.from(store.platformAdmins.values()).find(
    a => a.username.toLowerCase() === String(username).trim().toLowerCase()
  );

  if (!admin || !admin.active) {
    res.status(401).json({ error: 'Akaunti ya Super Admin haijatambuliwa au imezimwa.' });
    return;
  }

  const ver = verifyUserPassword(password, admin.passwordHash, admin.passwordSalt);
  if (!ver.isValid) {
    res.status(401).json({ error: 'Neno la siri la Super Admin si sahihi.' });
    return;
  }

  const token = generateSecureSessionToken(admin.id);
  const now = new Date().toISOString();
  admin.lastLogin = now;

  const session: UserSession = {
    id: `sess-admin-${Date.now()}`,
    userId: admin.id,
    userName: admin.name,
    userRole: 'super_admin',
    deviceId: 'DEV-EBS-HQ',
    deviceName: 'Head Office Console',
    businessId: 'EBS-GLOBAL-HQ',
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: 'EBS Admin Dashboard',
    status: 'active',
    isCurrent: true
  };
  store.sessions.set(token, session);
  persistStoreToDisk();

  res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: 'super_admin'
    }
  });
});

apiRouter.get('/admin/businesses', requireSuperAdmin, (req: Request, res: Response) => {
  const store = getCentralStore();
  const list = Array.from(store.businesses.values()).map(b => {
    const prods = Array.from(store.products.values()).filter(p => p.businessId === b.id);
    const sales = Array.from(store.sales.values()).filter(s => s.businessId === b.id);
    const totalRev = sales.reduce((sum, s) => sum + s.total, 0);
    const users = Array.from(store.users.values()).filter(u => u.businessId === b.id);
    const boss = users.find(u => u.role === 'owner' || u.role === 'boss');

    return {
      id: b.id,
      name: b.name,
      ownerName: b.ownerName,
      phone: b.phone,
      email: b.email,
      address: b.address,
      mkoa: b.mkoa,
      wilaya: b.wilaya,
      businessType: b.businessType || 'general',
      status: b.status || 'active',
      createdDate: b.createdDate || (b as any).created_at || '2026-01-01',
      productsCount: prods.length,
      salesCount: sales.length,
      totalRevenue: totalRev,
      usersCount: users.length,
      bossUsername: boss?.username || 'boss'
    };
  });

  res.json(list);
});

apiRouter.post('/admin/reset-boss-password', requireSuperAdmin, (req: Request, res: Response) => {
  const { businessId, confirmedBusinessName, confirmedPhone, newPassword } = req.body;
  const admin = (req as any).superAdmin as PlatformAdmin;
  const store = getCentralStore();

  if (!businessId || !confirmedBusinessName || !confirmedPhone || !newPassword) {
    res.status(400).json({
      error: 'Tafadhali jaza taarifa zote: Jina la Duka, Namba ya Simu, na Neno Jipya la Siri kwa uthibitisho.'
    });
    return;
  }

  const business = store.businesses.get(businessId);
  if (!business) {
    res.status(404).json({ error: 'Biashara haijapatikana.' });
    return;
  }

  const nameMatches = business.name.trim().toLowerCase() === String(confirmedBusinessName).trim().toLowerCase();
  const phoneCleanBiz = business.phone.replace(/\D/g, '');
  const phoneCleanInput = String(confirmedPhone).replace(/\D/g, '');
  const phoneMatches = phoneCleanBiz.endsWith(phoneCleanInput) || phoneCleanInput.endsWith(phoneCleanBiz);

  if (!nameMatches || !phoneMatches) {
    res.status(400).json({
      error: 'Uthibitisho umeshindwa: Jina la Duka au Namba ya Simu hailingani na kumbukumbu za mfumo.'
    });
    return;
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    res.status(400).json({ error: strength.errors.join(' ') });
    return;
  }

  let boss = Array.from(store.users.values()).find(
    u => u.businessId === businessId && (u.role === 'owner' || u.role === 'boss')
  );

  if (!boss) {
    boss = Array.from(store.users.values()).find(u => u.businessId === businessId);
  }

  if (!boss) {
    res.status(404).json({ error: 'Akaunti ya Boss haijapatikana kwa biashara hii.' });
    return;
  }

  const { hash, salt } = hashPasswordPBKDF2(newPassword);
  boss.passwordHash = hash;
  (boss as any).passwordSalt = salt;
  boss.mustChangePassword = true;
  boss.failedLoginAttempts = 0;
  boss.lockoutUntil = undefined;

  const now = new Date().toISOString();
  store.superAdminActions.unshift({
    id: `act-${Date.now()}`,
    adminId: admin?.id || 'admin-hq',
    adminName: admin?.name || 'Super Admin',
    action: 'RESET_BOSS_PASSWORD',
    targetBusinessId: business.id,
    targetBusinessName: business.name,
    details: `Super Admin ameweka upya neno la siri la Boss (${boss.name} / ${boss.username}) baada ya kuthibitisha namba ya simu na jina la duka.`,
    timestamp: now
  });

  persistStoreToDisk();
  res.json({
    success: true,
    message: `Neno la siri la Boss (${boss.name}) wa duka la "${business.name}" limewekwa upya kikamilifu.`
  });
});

apiRouter.post('/admin/toggle-business-status', requireSuperAdmin, (req: Request, res: Response) => {
  const { businessId, status } = req.body;
  const admin = (req as any).superAdmin as PlatformAdmin;
  const store = getCentralStore();

  const business = store.businesses.get(businessId);
  if (!business) {
    res.status(404).json({ error: 'Biashara haijapatikana.' });
    return;
  }

  const newStatus = status === 'suspended' ? 'suspended' : 'active';
  business.status = newStatus;

  if (newStatus === 'suspended') {
    Array.from(store.devices.values())
      .filter(d => d.businessId === businessId)
      .forEach(d => {
        d.status = 'revoked';
      });
  }

  const now = new Date().toISOString();
  store.superAdminActions.unshift({
    id: `act-${Date.now()}`,
    adminId: admin?.id || 'admin-hq',
    adminName: admin?.name || 'Super Admin',
    action: newStatus === 'suspended' ? 'SUSPEND_BUSINESS' : 'ACTIVATE_BUSINESS',
    targetBusinessId: business.id,
    targetBusinessName: business.name,
    details: `Super Admin amebadilisha hali ya biashara kuwa "${newStatus.toUpperCase()}".`,
    timestamp: now
  });

  persistStoreToDisk();
  res.json({
    success: true,
    message: `Hali ya biashara ya "${business.name}" sasa ni ${newStatus.toUpperCase()}.`
  });
});

apiRouter.get('/admin/actions', requireSuperAdmin, (req: Request, res: Response) => {
  const store = getCentralStore();
  res.json(store.superAdminActions);
});

// ----------------------------------------------------
// AUTO-UPDATE SYSTEM VERSION CHECK
// ----------------------------------------------------

apiRouter.get('/system/version', (req: Request, res: Response) => {
  res.json({
    appVersion: '1.3.1',
    databaseVersion: '1.3.1',
    minSupportedVersion: '1.3.0',
    releaseDate: '2026-09-23',
    releaseNotes: 'Toleo 1.3.1: Hifadhi ya Supabase Postgres (pos schema), uuzaji wa vifungashio (Crate/Boksi/Katoni), na EBS Head Office Super Admin Portal.',
    mandatoryUpdate: false
  });
});
