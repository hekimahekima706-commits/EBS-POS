import { User, AuthResponse, BusinessProfile } from '../types';
import { supabaseClient } from './supabaseClient';
import { hashPassword } from './security';
import { INITIAL_USERS } from '../data/initialData';

const STORAGE_KEY = 'ebs_tanzania_data_v1_1';

export interface RegisterBusinessOwnerParams {
  business: {
    id?: string;
    name: string;
    ownerName?: string;
    phone: string;
    email?: string;
    address?: string;
    mkoa?: string;
    wilaya?: string;
    tin?: string;
    licenseNumber?: string;
    tagline?: string;
    logoUrl?: string;
    mode?: string;
    businessType?: string;
    primaryBusinessType?: string;
    secondaryBusinessTypes?: string[];
    currency?: string;
    timezone?: string;
    enableBarFeatures?: boolean;
    enableRestaurantFeatures?: boolean;
    enableCameraIntegration?: boolean;
    activatedModules?: any;
    branches?: any[];
    profile?: any;
    [key: string]: any;
  };
  owner: {
    id?: string;
    name: string;
    username: string;
    phone: string;
    email?: string;
    password?: string;
    pin?: string;
    [key: string]: any;
  };
}

export interface RegisterResult {
  success: boolean;
  businessId?: string;
  user?: User;
  error?: string;
  errorStep?: 'signUp' | 'businesses' | 'profiles' | 'validation';
  details?: string;
}

/**
 * Strips any undefined properties from object so Supabase never receives undefined columns
 */
function cleanRecord<T extends Record<string, any>>(record: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
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
 */
export function sanitizeUser(rawUser: any): User {
  if (!rawUser || typeof rawUser !== 'object') {
    return INITIAL_USERS[0];
  }

  const safeName = ensureValidUserName(rawUser);
  const safeUsername = (rawUser.username || safeName.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'user').trim();

  return {
    ...rawUser,
    id: rawUser.id || `usr-${Date.now()}`,
    name: safeName,
    username: safeUsername,
    role: rawUser.role || 'cashier',
    phone: rawUser.phone || '',
    email: rawUser.email || '',
    passwordHash: rawUser.passwordHash || rawUser.password_hash || '',
    active: rawUser.active !== undefined ? Boolean(rawUser.active) : true,
    createdAt: rawUser.createdAt || rawUser.created_at || new Date().toISOString(),
    permissions: rawUser.permissions || INITIAL_USERS[0].permissions,
  };
}

/**
 * Registers a new business and its owner profile to Supabase database:
 * 1. Executes Supabase Auth signUp if configured.
 * 2. Creates the business record in the `businesses` table and retrieves the generated `business_id`.
 * 3. Inserts the owner profile into `app_users` table linked to that `business_id`.
 * Returns clear errors with step identification for UI display.
 */
export async function registerBusinessOwner(params: RegisterBusinessOwnerParams): Promise<RegisterResult> {
  const { business, owner } = params;

  // Validation
  if (!business?.name?.trim()) {
    return {
      success: false,
      error: 'Tafadhali weka jina la biashara.',
      errorStep: 'validation',
    };
  }
  if (!owner?.name?.trim() || !owner?.username?.trim()) {
    return {
      success: false,
      error: 'Tafadhali weka jina kamili na jina la kuingilia (username) la mmiliki.',
      errorStep: 'validation',
    };
  }

  const cleanUsername = owner.username.toLowerCase().trim().replace(/\s+/g, '');
  const cleanPhone = (owner.phone || business.phone || '').trim();
  const generatedBizId = business.id || `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let finalBusinessId: string = generatedBizId;
  let authUserId: string | null = null;

  // If Supabase client is configured, execute real cloud synchronization
  if (supabaseClient) {
    // -------------------------------------------------------------
    // STEP 1: Supabase Auth signUp
    // -------------------------------------------------------------
    const authEmail = (owner.email && owner.email.includes('@'))
      ? owner.email.trim()
      : `${cleanUsername}@ebsbiz.local`;

    if (owner.password) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
          email: authEmail,
          password: owner.password,
          options: {
            data: {
              name: owner.name.trim(),
              username: cleanUsername,
              phone: cleanPhone,
              role: 'owner',
            },
          },
        });

        if (authError) {
          console.error('[Registration Pipeline - Step 1: Supabase Auth signUp ERROR]', {
            email: authEmail,
            error: authError,
            message: authError.message,
            status: authError.status,
          });
          const msg = authError.message || 'Hitilafu ya Supabase Auth';
          // If error is NOT "already registered", return actionable error to display in UI
          if (!msg.toLowerCase().includes('already registered')) {
            return {
              success: false,
              error: `Supabase Auth (signUp) Imefeli: ${msg}`,
              errorStep: 'signUp',
              details: authError.status ? `Kodi ya Hadhi: ${authError.status}` : undefined,
            };
          }
        }

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (err: any) {
        console.error('[Registration Pipeline - Step 1: Supabase signUp EXCEPTION]', err);
        return {
          success: false,
          error: `Hitilafu ya mtandao wakati wa signUp Supabase: ${err?.message || err}`,
          errorStep: 'signUp',
        };
      }
    }

    // -------------------------------------------------------------
    // STEP 2: Create record in `businesses` table & retrieve business_id
    // Required fields: store_name, owner_name, business_type, phone
    // -------------------------------------------------------------
    const cleanStoreName = (business.name || (business as any).store_name || (business as any).storeName || 'EBS Business').trim();
    const cleanOwnerName = (owner.name || (business as any).ownerName || (business as any).owner_name || 'Mmiliki').trim();
    const cleanBusinessType = (business as any).business_type || (business as any).businessType || business.mode || 'general';

    const businessRecord: any = cleanRecord({
      id: generatedBizId,
      name: cleanStoreName,             // Standard name column
      store_name: cleanStoreName,       // Required schema field
      owner_name: cleanOwnerName,       // Required schema field
      owner_id: authUserId || null,
      phone: cleanPhone,                // Required schema field
      business_type: cleanBusinessType, // Required schema field
      email: business.email || owner.email || null,
      address: business.address || null,
      mkoa: business.mkoa || null,
      wilaya: business.wilaya || null,
      currency: business.currency || 'TZS',
      timezone: business.timezone || 'Africa/Dar_es_Salaam',
      status: 'active',
      branches: business.branches || [],
      profile: {
        ...business,
        name: cleanStoreName,
        store_name: cleanStoreName,
        ownerName: cleanOwnerName,
        owner_name: cleanOwnerName,
        business_type: cleanBusinessType,
        phone: cleanPhone,
        setupCompleted: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      let bizRes = await supabaseClient.from('businesses').insert(businessRecord).select('id, name').single();

      if (bizRes.error) {
        console.error('[Registration Pipeline - Step 2: Supabase businesses table INSERT ERROR]', {
          table: 'businesses',
          code: bizRes.error.code,
          message: bizRes.error.message,
          details: bizRes.error.details,
          hint: bizRes.error.hint,
          payload: businessRecord,
          fullError: bizRes.error,
        });

        // If specific extra column is rejected (42703), retry with minimal core fields
        if (bizRes.error.code === '42703' || bizRes.error.message?.includes('column')) {
          const coreBusinessRecord = cleanRecord({
            id: generatedBizId,
            name: cleanStoreName,
            store_name: cleanStoreName,
            owner_name: cleanOwnerName,
            business_type: cleanBusinessType,
            phone: cleanPhone,
            email: business.email || owner.email || null,
            created_at: new Date().toISOString(),
          });
          console.warn('[Registration Pipeline] Retrying businesses insert with minimal core schema fields:', coreBusinessRecord);
          bizRes = await supabaseClient.from('businesses').insert(coreBusinessRecord).select('id').single();
        }
      }

      if (bizRes.error) {
        console.error('[Registration Pipeline - Step 2: businesses table insert FAILED permanently]', {
          code: bizRes.error.code,
          message: bizRes.error.message,
          details: bizRes.error.details,
          hint: bizRes.error.hint,
        });

        const isRls = bizRes.error.message.toLowerCase().includes('policy') ||
                      bizRes.error.code === '42501' ||
                      bizRes.error.message.toLowerCase().includes('row-level security');
        const rlsNote = isRls
          ? ' [Sababu: Row-Level Security (RLS) imewashwa kwenye Supabase bila sera ya kuruhusu INSERT ya biashara kwenye jedwali la businesses. Weka sera ya RLS au lemaza RLS kwenye Supabase SQL Editor].'
          : '';

        return {
          success: false,
          error: `Hitilafu ya Supabase wakati wa kuhifadhi Biashara (businesses): ${bizRes.error.message}${rlsNote}`,
          errorStep: 'businesses',
          details: bizRes.error.details || bizRes.error.hint,
        };
      }

      // Retrieve the generated business_id from Supabase
      if (bizRes.data?.id) {
        finalBusinessId = bizRes.data.id;
      }
    } catch (err: any) {
      console.error('[Registration Pipeline - Step 2: businesses table EXCEPTION]', err);
      return {
        success: false,
        error: `Hitilafu ya mtandao wakati wa kutengeneza biashara kwenye Supabase: ${err?.message || err}`,
        errorStep: 'businesses',
      };
    }

    // -------------------------------------------------------------
    // STEP 3: Insert owner profile strictly into `profiles` table
    // Fallback handling for: branch_id, active, role, name (never undefined)
    // -------------------------------------------------------------
    const passwordHash = owner.password ? await hashPassword(owner.password) : '';
    const ownerUserId = authUserId || owner.id || `usr-owner-${Date.now()}`;

    // Explicit fallback handling to guarantee no undefined values
    const safeName = (owner.name || (owner as any).fullName || owner.username || 'Mmiliki').trim();
    const safeBranchId = owner.branch_id || business.branch_id || null;
    const safeActive = owner.active !== undefined ? Boolean(owner.active) : true;
    const safeRole: string = (owner.role as any) || 'boss'; // mapped to boss / owner

    const ownerProfileRecord: any = cleanRecord({
      id: ownerUserId,
      business_id: finalBusinessId,
      branch_id: safeBranchId,
      name: safeName,
      full_name: safeName,
      username: cleanUsername,
      role: safeRole,
      phone: cleanPhone,
      email: owner.email || null,
      password_hash: passwordHash,
      pin: owner.pin || '1234',
      active: safeActive,
      must_change_password: false,
      failed_login_attempts: 0,
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
      can_discount: true,
      can_refund: true,
      can_adjust_stock: true,
      can_view_profit: true,
      can_manage_users: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    });

    try {
      // Strictly target `profiles` table
      let userRes = await supabaseClient.from('profiles').insert(ownerProfileRecord).select().single();

      if (userRes.error) {
        console.error('[Registration Pipeline - Step 3: Supabase profiles table INSERT ERROR]', {
          table: 'profiles',
          code: userRes.error.code,
          message: userRes.error.message,
          details: userRes.error.details,
          hint: userRes.error.hint,
          payload: ownerProfileRecord,
          fullError: userRes.error,
        });

        // If extra columns do not exist in profiles table (code 42703), retry with core fields
        if (userRes.error.code === '42703' || userRes.error.message?.includes('column')) {
          const coreProfileRecord = cleanRecord({
            id: ownerUserId,
            business_id: finalBusinessId,
            branch_id: safeBranchId,
            name: safeName,
            full_name: safeName,
            username: cleanUsername,
            role: safeRole,
            phone: cleanPhone,
            email: owner.email || null,
            password_hash: passwordHash,
            pin: owner.pin || '1234',
            active: safeActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.warn('[Registration Pipeline] Retrying profiles insert with standard core columns:', coreProfileRecord);
          userRes = await supabaseClient.from('profiles').insert(coreProfileRecord).select().single();
        }
      }

      if (userRes.error) {
        console.error('[Registration Pipeline - Step 3: profiles insert FAILED permanently]', {
          code: userRes.error.code,
          message: userRes.error.message,
          details: userRes.error.details,
          hint: userRes.error.hint,
        });

        const isRls = userRes.error.message.toLowerCase().includes('policy') ||
                      userRes.error.code === '42501' ||
                      userRes.error.message.toLowerCase().includes('row-level security');
        const rlsNote = isRls
          ? ' [Sababu: Row-Level Security (RLS) imewashwa kwenye Supabase bila sera ya kuruhusu INSERT ya mmiliki kwenye jedwali la profiles. Tafadhali tekeleza sera ya RLS au lemaza RLS kwenye Supabase SQL Editor].'
          : '';

        return {
          success: false,
          error: `Hitilafu ya Supabase wakati wa kusajili wasifu wa Mmiliki (profiles): ${userRes.error.message}${rlsNote}`,
          errorStep: 'profiles',
          details: userRes.error.details || userRes.error.hint,
        };
      }
    } catch (err: any) {
      console.error('[Registration Pipeline - Step 3: profiles table EXCEPTION]', err);
      return {
        success: false,
        error: `Hitilafu ya mtandao wakati wa kusajili mmiliki kwenye profiles: ${err?.message || err}`,
        errorStep: 'profiles',
      };
    }
  }

  // Construct normalized User object
  const passwordHash = owner.password ? await hashPassword(owner.password) : '';
  const sanitizedUser = sanitizeUser({
    id: authUserId || owner.id || `usr-owner-${Date.now()}`,
    businessId: finalBusinessId,
    name: owner.name.trim(),
    username: cleanUsername,
    phone: cleanPhone,
    email: owner.email || '',
    role: 'owner',
    passwordHash,
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
  });

  return {
    success: true,
    businessId: finalBusinessId,
    user: sanitizedUser,
  };
}

/**
 * Authenticates a user with username/phone and password, returning guaranteed sanitized user data
 */
export async function loginUser(usernameOrPhone: string, pass: string): Promise<AuthResponse> {
  const cleanIdentifier = (usernameOrPhone || '').toLowerCase().trim();
  const cleanPhone = (usernameOrPhone || '').replace(/\D/g, '');

  if (!cleanIdentifier && !cleanPhone) {
    return { success: false, message: 'Weka username au namba ya simu.' };
  }

  // 1. Try Supabase if available (strictly targets profiles table)
  if (supabaseClient) {
    try {
      const supaRes = await supabaseClient
        .from('profiles')
        .select('*')
        .or(`username.ilike.${cleanIdentifier},phone.eq.${cleanPhone || cleanIdentifier}`)
        .limit(1);

      if (supaRes.error) {
        console.error('[AuthService - loginUser: profiles table query ERROR]', {
          table: 'profiles',
          code: supaRes.error.code,
          message: supaRes.error.message,
          details: supaRes.error.details,
          hint: supaRes.error.hint,
          identifier: cleanIdentifier,
        });
      }

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

  // 2. Fallback to Local Storage / Seed users
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
    const savedUser = localStorage.getItem(`${STORAGE_KEY}_current_user`);
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

      if (res.error) {
        console.error('[AuthService - getCurrentUserProfile: profiles table query ERROR]', {
          table: 'profiles',
          code: res.error.code,
          message: res.error.message,
          details: res.error.details,
          userId,
        });
      }

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

export default {
  registerBusinessOwner,
  loginUser,
  getCurrentUserProfile,
  ensureValidUserName,
  sanitizeUser,
};
