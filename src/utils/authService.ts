import { User, AuthResponse, BusinessProfile } from '../types';
import { supabaseClient } from './supabaseClient';
import { hashPassword } from './security';
import { INITIAL_USERS } from '../data/initialData';
import { Device } from '@capacitor/device';
import { getApiBaseUrl, getLocalDeviceIdentity, isSystemOnline, isSimulatedOffline } from './syncEngine';

const STORAGE_KEY = 'ebs_tanzania_data_v1_1';

/**
 * Validates whether a string is a standard UUID v4 format
 */
export function isValidUUID(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Generates a valid RFC4122 v4 UUID using crypto.randomUUID with fallback
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the physical hardware device ID using Capacitor Device API
 * with fallback to persistent unique identifier in localStorage.
 */
export async function getHardwareDeviceId(): Promise<string> {
  try {
    const info = await Device.getId();
    if (info && info.identifier && info.identifier.trim().length > 3) {
      return info.identifier.trim();
    }
  } catch (e) {
    console.warn('[Device Lock] Failed to get Capacitor device ID, using local fallback:', e);
  }

  let localId = typeof localStorage !== 'undefined' ? localStorage.getItem('ebs_device_hardware_id') : null;
  if (!localId) {
    localId = `DEV-${generateUUID()}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ebs_device_hardware_id', localId);
    }
  }
  return localId;
}

/**
 * Checks whether the current physical device is allowed to register a new trial account
 */
export async function checkDeviceTrialEligibility(): Promise<{ eligible: boolean; message?: string }> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ebs_trial_expired_locked') === 'true') {
      return {
        eligible: false,
        message: 'Kifaa hiki kimeshatumia muda wa majaribio (Trial Expired). Huwezi kusajili akaunti mpya ya majaribio kwenye kifaa hiki. Tafadhali wasiliana na EBS kwa leseni kamili.',
      };
    }

    const deviceId = await getHardwareDeviceId();

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('registered_devices')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!error && data) {
        const isExpired =
          Boolean(data.trial_expired) ||
          Boolean(data.block_new_trial) ||
          (data.trial_expires_at && new Date(data.trial_expires_at) < new Date());

        if (isExpired) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ebs_trial_expired_locked', 'true');
          }
          return {
            eligible: false,
            message: 'Kifaa hiki kimeshatumia muda wa majaribio (Trial Expired). Huwezi kusajili tena akaunti ya majaribio kwenye kifaa hiki. Wasiliana na EBS.',
          };
        }
      }
    }
    return { eligible: true };
  } catch (err) {
    console.warn('[Device Lock] Device check notice:', err);
    return { eligible: true };
  }
}

export interface RegisterBusinessOwnerParams {
  business?: {
    id?: string;
    name?: string;
    store_name?: string;
    storeName?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    address?: string;
    mkoa?: string;
    wilaya?: string;
    tin?: string;
    vrn?: string;
    licenseNumber?: string;
    tagline?: string;
    logoUrl?: string;
    mode?: string;
    businessType?: string;
    business_type?: string;
    type?: string;
    primaryBusinessType?: string;
    currency?: string;
    timezone?: string;
    branches?: any[];
    profile?: any;
    [key: string]: any;
  };
  businessData?: any;
  owner?: {
    id?: string;
    name?: string;
    fullName?: string;
    full_name?: string;
    username?: string;
    phone?: string;
    email?: string;
    password?: string;
    pin?: string;
    [key: string]: any;
  };
  ownerData?: any;
}

export interface RegisterResult {
  success: boolean;
  businessId?: string;
  userId?: string;
  user?: User;
  token?: string;
  error?: string;
  errorStep?: 'signUp' | 'businesses' | 'profiles' | 'validation' | 'server';
  details?: string;
}

/**
 * Ensures user object has a valid, non-null, non-empty name
 */
export function ensureValidUserName(rawUser: any): string {
  if (!rawUser) return 'Mtumiaji';
  const name = rawUser?.name || rawUser?.full_name || rawUser?.fullName || rawUser?.display_name;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  if (typeof rawUser.username === 'string' && rawUser.username.trim().length > 0) {
    return rawUser.username.trim();
  }
  if (typeof rawUser.phone === 'string' && rawUser.phone.trim().length > 0) {
    return rawUser.phone.trim();
  }
  return 'Mtumiaji';
}

/**
 * Sanitizes and normalizes user object from database or storage to guarantee all required fields
 * Enforces Boss/Owner profit viewing privileges while locking out cashier/waiter/storekeeper.
 */
export function sanitizeUser(rawUser: any): User {
  if (!rawUser || typeof rawUser !== 'object') {
    return INITIAL_USERS[0];
  }

  const safeName = ensureValidUserName(rawUser);
  const safeUsername = (rawUser.username || safeName.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'user').trim();
  const rawRole = (rawUser.role || 'cashier').toString().toLowerCase().trim();

  // Role categorization for profit privileges:
  // Boss & Owner MUST view profit clearly (unhide blur)
  const isOwnerOrBoss = rawRole === 'owner' || rawRole === 'boss' || rawRole === 'super_admin' || rawRole === 'admin';
  // Restricted roles: Cashier, Waiter, Storekeeper MUST NOT view profit margins
  const isRestrictedRole = rawRole === 'cashier' || rawRole === 'waiter' || rawRole === 'storekeeper' || rawRole === 'store';

  const canViewProfit = isOwnerOrBoss ? true : isRestrictedRole ? false : Boolean(rawUser.canViewProfit ?? rawUser.can_view_profit ?? rawUser.permissions?.canViewProfit ?? true);

  const basePermissions = rawUser.permissions || (isOwnerOrBoss ? INITIAL_USERS[0].permissions : INITIAL_USERS[2].permissions);
  const permissions = {
    ...basePermissions,
    canViewProfit,
    canViewReports: isOwnerOrBoss ? true : (rawUser.permissions?.canViewReports ?? (rawRole === 'manager' || rawRole === 'accountant')),
  };

  return {
    ...rawUser,
    id: rawUser.id || generateUUID(),
    businessId: rawUser.businessId || rawUser.business_id,
    branchId: rawUser.branchId || rawUser.branch_id,
    name: safeName,
    username: safeUsername,
    role: (isOwnerOrBoss ? 'owner' : rawUser.role || 'cashier') as any,
    phone: rawUser.phone || '',
    email: rawUser.email || '',
    passwordHash: rawUser.passwordHash || rawUser.password_hash || '',
    active: rawUser.active !== undefined ? Boolean(rawUser.active) : true,
    createdAt: rawUser.createdAt || rawUser.created_at || new Date().toISOString(),
    canViewProfit,
    permissions,
    canDiscount: rawUser.canDiscount ?? true,
    canRefund: rawUser.canRefund ?? isOwnerOrBoss,
    canAdjustStock: rawUser.canAdjustStock ?? isOwnerOrBoss,
    canManageUsers: rawUser.canManageUsers ?? isOwnerOrBoss,
  };
}

/**
 * Registers a new business and its owner using the local EBS API endpoint:
 * POST /api/auth/setup-new-business
 * 
 * Complies with all system specifications:
 * - Sends businessData and ownerData in format expected by server
 * - Saves ebs_user, ebs_business_id, ebs_session_token, and ebs_branch_id to localStorage
 * - Returns success, businessId, userId, user, token
 * - Maintains offline resilience and non-blocking background sync
 */
export async function registerBusinessOwner(params: RegisterBusinessOwnerParams): Promise<RegisterResult> {
  const biz = params.business || (params as any).businessData || {};
  const own = params.owner || (params as any).ownerData || {};

  const businessName = (biz.name || biz.store_name || biz.storeName || 'EBS Business').trim();
  const ownerName = (own.name || own.fullName || own.full_name || biz.ownerName || 'Mmiliki').trim();
  const cleanUsername = (own.username || '').toLowerCase().trim().replace(/\s+/g, '');
  const password = (own.password || '').trim();
  const phone = (own.phone || biz.phone || '').trim();
  const email = (own.email || biz.email || '').trim();
  const address = (biz.address || '').trim();
  const mkoa = (biz.mkoa || '').trim();
  const wilaya = (biz.wilaya || '').trim();
  const currency = (biz.currency || 'TZS').trim();
  const tin = (biz.tin || '').trim();
  const vrn = (biz.vrn || '').trim();
  const cleanBizType = (biz.type || biz.businessType || biz.business_type || biz.mode || 'duka').toString().trim();

  // Basic validation
  if (!businessName) {
    return {
      success: false,
      error: 'Tafadhali weka jina la biashara.',
      errorStep: 'validation',
    };
  }
  if (!ownerName || !cleanUsername) {
    return {
      success: false,
      error: 'Tafadhali weka jina kamili na jina la kuingilia (username) la mmiliki.',
      errorStep: 'validation',
    };
  }
  if (!password) {
    return {
      success: false,
      error: 'Tafadhali weka neno la siri (password) la mmiliki.',
      errorStep: 'validation',
    };
  }

  // Construct payload formatted for POST /api/auth/setup-new-business
  const businessData = {
    name: businessName,
    type: cleanBizType,
    phone: phone || '0676674705',
    email: email || '',
    address: address || 'Tanzania',
    mkoa: mkoa || 'Dar es Salaam',
    wilaya: wilaya || 'Ilala',
    currency: currency || 'TZS',
    tin: tin || '',
    vrn: vrn || '',
  };

  const ownerData = {
    name: ownerName,
    username: cleanUsername,
    password: password,
    phone: phone || '0676674705',
    email: email || '',
  };

  try {
    const apiBase = getApiBaseUrl();
    const apiUrl = `${apiBase}/api/auth/setup-new-business`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessData,
        ownerData,
      }),
    });

    const resData = await response.json();

    if (!response.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || resData.message || 'Hitilafu wakati wa kusajili biashara kwenye seva.',
        errorStep: 'server',
        details: resData.details,
      };
    }

    const businessId: string = resData.business?.id || resData.businessId || resData.user?.businessId || `EBS-BIZ-${Date.now()}`;
    const userId: string = resData.user?.id || resData.userId || `usr-${Date.now()}`;
    const token: string | undefined = resData.token;
    const branchId: string | undefined = resData.business?.branches?.[0]?.id || resData.branchId;

    // Construct fully normalized, compatible User entity
    const rawUser = resData.user || {};
    const sanitizedUser: User = sanitizeUser({
      ...rawUser,
      id: userId,
      businessId,
      branchId,
      name: ensureValidUserName(rawUser) || ownerName,
      username: cleanUsername,
      role: 'owner',
      phone: rawUser.phone || phone,
      email: rawUser.email || email,
      active: true,
      createdAt: rawUser.createdAt || new Date().toISOString(),
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
        ...(rawUser.permissions || {}),
      },
      granularPermissions: {
        view_sales: true,
        create_sale: true,
        cancel_sale: true,
        refund_sale: true,
        apply_discount: true,
        change_price: true,
        view_products: true,
        create_product: true,
        edit_product: true,
        deactivate_product: true,
        change_selling_price: true,
        view_cost_price: true,
        view_stock: true,
        receive_stock: true,
        adjust_stock: true,
        approve_adjustment: true,
        transfer_stock: true,
        view_customers: true,
        create_customer: true,
        edit_customer: true,
        view_customer_debt: true,
        record_customer_payment: true,
        view_suppliers: true,
        create_supplier: true,
        purchase_stock: true,
        record_supplier_payment: true,
        view_sales_report: true,
        view_profit: true,
        view_expenses: true,
        export_reports: true,
        view_users: true,
        create_user: true,
        edit_user: true,
        deactivate_user: true,
        reset_user_password: true,
        manage_roles: true,
        view_audit_logs: true,
        manage_sessions: true,
        security_settings: true,
        view_camera: true,
        view_recordings: true,
        manage_cameras: true,
        business_settings: true,
        pos_settings: true,
        inventory_settings: true,
        appearance_settings: true,
        language_settings: true,
        backup_restore: true,
        ...(rawUser.granularPermissions || {}),
      },
      canDiscount: true,
      canRefund: true,
      canAdjustStock: true,
      canViewProfit: true,
      canManageUsers: true,
    });

    // Save registration tokens and identities to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ebs_user', JSON.stringify(sanitizedUser));
      localStorage.setItem('ebs_business_id', businessId);
      if (token) {
        localStorage.setItem('ebs_session_token', token);
      }
      if (branchId) {
        localStorage.setItem('ebs_branch_id', branchId);
      }
    }

    // Non-blocking background sync to Supabase if configured (failsafe)
    if (supabaseClient) {
      (async () => {
        try {
          await supabaseClient.from('businesses').upsert({
            id: businessId,
            name: businessName,
            owner_name: ownerName,
            phone,
            email,
            business_type: cleanBizType,
            address,
            mkoa,
            wilaya,
            currency,
            tin,
            vrn,
            status: 'active',
          });
          await supabaseClient.from('profiles').upsert({
            id: userId,
            business_id: businessId,
            name: ownerName,
            username: cleanUsername,
            phone,
            email,
            role: 'owner',
            active: true,
          });
        } catch (supaErr) {
          console.warn('[Registration] Background Supabase sync notice (non-blocking):', supaErr);
        }
      })().catch(() => {});
    }

    return {
      success: true,
      businessId,
      userId,
      user: sanitizedUser,
      token,
    };
  } catch (err: any) {
    console.warn('[registerBusinessOwner] Local API fetch failed, executing offline resilient registration:', err);
    // Offline resilient fallback if server is temporarily unreachable
    const fallbackBizId = `EBS-BIZ-${Date.now().toString().slice(-6)}`;
    const fallbackUserId = generateUUID();
    const fallbackPassHash = await hashPassword(password);
    const fallbackUser: User = sanitizeUser({
      id: fallbackUserId,
      businessId: fallbackBizId,
      name: ownerName,
      username: cleanUsername,
      role: 'owner',
      phone,
      email,
      passwordHash: fallbackPassHash,
      active: true,
      createdAt: new Date().toISOString(),
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
      canDiscount: true,
      canRefund: true,
      canAdjustStock: true,
      canViewProfit: true,
      canManageUsers: true,
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ebs_user', JSON.stringify(fallbackUser));
      localStorage.setItem('ebs_business_id', fallbackBizId);
    }

    return {
      success: true,
      businessId: fallbackBizId,
      userId: fallbackUserId,
      user: fallbackUser,
    };
  }
}

/**
 * Backward compatibility alias for registerBusiness
 */
export const registerBusiness = registerBusinessOwner;

/**
 * Authenticates a user with username/phone and password, returning guaranteed sanitized user data
 */
export async function loginUser(usernameOrPhone: string, pass: string): Promise<AuthResponse> {
  const cleanIdentifier = (usernameOrPhone || '').toLowerCase().trim();
  const cleanPhone = (usernameOrPhone || '').replace(/\D/g, '');

  if (!cleanIdentifier && !cleanPhone) {
    return { success: false, message: 'Weka username au namba ya simu.' };
  }
  if (!pass) {
    return { success: false, message: 'Tafadhali ingiza neno la siri.' };
  }

  const device = getLocalDeviceIdentity();

  // 1. Try Central Server API first if online
  if (isSystemOnline() && !isSimulatedOffline()) {
    try {
      const apiBase = getApiBaseUrl();
      const apiUrl = `${apiBase}/api/auth/login`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanIdentifier,
          password: pass,
          deviceId: device.id,
          deviceName: device.name,
          platform: device.platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token && data.user) {
          const user = sanitizeUser(data.user);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ebs_user', JSON.stringify(user));
            localStorage.setItem('ebs_session_token', data.token);
            if (user.businessId) {
              localStorage.setItem('ebs_business_id', user.businessId);
            }
          }
          return {
            success: true,
            user,
            mustChangePassword: Boolean(data.mustChangePassword || user.mustChangePassword),
          };
        }
      } else {
        // Explicit server response (e.g. 401 invalid credentials, 403 inactive/revoked, 429 lockout)
        // Must not bypass server response for remote accounts
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errJson.error || 'Jina la mtumiaji au neno la siri si sahihi.',
        };
      }
    } catch (apiErr) {
      console.warn('[loginUser] Central Server unreachable, falling back to offline POS check:', apiErr);
    }
  }

  // 2. Try Supabase if available (strictly targets profiles table)
  if (supabaseClient) {
    try {
      const supaRes = await supabaseClient
        .from('profiles')
        .select('*')
        .or(`username.ilike.${cleanIdentifier},phone.eq.${cleanPhone || cleanIdentifier}`)
        .limit(1);

      const supaUsers = supaRes.data;
      if (!supaRes.error && supaUsers && supaUsers.length > 0) {
        const rawUser = supaUsers[0];
        const user = sanitizeUser(rawUser);

        if (!user.active) {
          return { success: false, message: 'Akaunti hii imesitishwa. Wasiliana na mwenye duka.' };
        }

        const inputHash = await hashPassword(pass);
        const match = inputHash === user.passwordHash ||
                      pass === rawUser.password ||
                      pass === rawUser.password_hash ||
                      pass === rawUser.pin;

        if (match) {
          return {
            success: true,
            user,
            mustChangePassword: !!user.mustChangePassword,
          };
        }
      }
    } catch (e) {
      console.error('[AuthService - loginUser: profiles query EXCEPTION]', e);
    }
  }

  // 3. Fallback to Local Storage / Seed users
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    const users: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;

    const targetUser = users.find((u) => {
      if (!u) return false;
      const matchUsername = (u.username || '').toLowerCase() === cleanIdentifier;
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const matchPhone = cleanPhone.length > 5 && uPhone.includes(cleanPhone);
      return matchUsername || matchPhone;
    });

    if (!targetUser) {
      return { success: false, message: 'Username au Namba ya Simu haijapatikana.' };
    }

    const sanitized = sanitizeUser(targetUser);

    if (!sanitized.active) {
      return { success: false, message: 'Akaunti hii imesitishwa. Wasiliana na Mwenye Biashara.' };
    }

    const inputHash = await hashPassword(pass);
    if (inputHash !== sanitized.passwordHash && pass !== sanitized.pin) {
      return { success: false, message: 'Neno la siri (Password) si sahihi.' };
    }

    return {
      success: true,
      user: sanitized,
      mustChangePassword: !!sanitized.mustChangePassword,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Hitilafu ya kuingia' };
  }
}

/**
 * Retrieves the current logged in user profile, guaranteed to have non-null name
 */
export async function getCurrentUserProfile(userId?: string): Promise<User | null> {
  try {
    // 1. Check local session storage first
    const savedUser = localStorage.getItem(`${STORAGE_KEY}_current_user`) || localStorage.getItem('ebs_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && typeof parsed === 'object') {
        if (!userId || parsed.id === userId) {
          return sanitizeUser(parsed);
        }
      }
    }

    // 2. Check Supabase profiles table if userId provided
    if (supabaseClient && userId) {
      const res = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!res.error && res.data) {
        return sanitizeUser(res.data);
      }
    }

    // 3. Fallback to seed user
    return sanitizeUser(INITIAL_USERS[0]);
  } catch {
    return sanitizeUser(INITIAL_USERS[0]);
  }
}

export const authService = {
  registerBusinessOwner,
  registerBusiness: registerBusinessOwner,
  generateUUID,
  loginUser,
  getCurrentUserProfile,
  ensureValidUserName,
  sanitizeUser,
  getHardwareDeviceId,
  checkDeviceTrialEligibility,
  isValidUUID,
};

// Compatibility for any dynamic property assignment like authService.registerBusiness = registerBusinessOwner
(authService as any).registerBusiness = registerBusinessOwner;

export default authService;
