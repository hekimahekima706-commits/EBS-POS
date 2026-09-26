import { User, AuthResponse, BusinessProfile } from '../types';
import { supabaseClient } from './supabaseClient';
import { hashPassword } from './security';
import { INITIAL_USERS } from '../data/initialData';

const STORAGE_KEY = 'ebs_tanzania_data_v1_1';

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
 * Authenticates a user with username/phone and password, returning guaranteed sanitized user data
 */
export async function loginUser(usernameOrPhone: string, pass: string): Promise<AuthResponse> {
  const cleanIdentifier = (usernameOrPhone || '').toLowerCase().trim();
  const cleanPhone = (usernameOrPhone || '').replace(/\D/g, '');

  if (!cleanIdentifier && !cleanPhone) {
    return { success: false, message: 'Weka username au namba ya simu.' };
  }

  // 1. Try Supabase if available
  if (supabaseClient) {
    try {
      const { data: supaUsers, error } = await supabaseClient
        .from('users')
        .select('*')
        .or(`username.ilike.${cleanIdentifier},phone.eq.${cleanPhone || cleanIdentifier}`)
        .limit(1);

      if (!error && supaUsers && supaUsers.length > 0) {
        const rawUser = supaUsers[0];
        const user = sanitizeUser(rawUser);

        if (!user.active) {
          return { success: false, message: 'Akaunti hii imesitishwa. Wasiliana na mwenye duka.' };
        }

        const inputHash = await hashPassword(pass);
        const match = inputHash === user.passwordHash || pass === rawUser.password || pass === rawUser.pin;

        if (match) {
          return {
            success: true,
            user,
            mustChangePassword: !!user.mustChangePassword,
          };
        }
      }
    } catch (e) {
      console.warn('Supabase auth fallback to local:', e);
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

    // 2. Check Supabase if userId provided
    if (supabaseClient && userId) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return sanitizeUser(data);
      }
    }

    // 3. Fallback to seed user
    return sanitizeUser(INITIAL_USERS[0]);
  } catch {
    return sanitizeUser(INITIAL_USERS[0]);
  }
}

export default {
  loginUser,
  getCurrentUserProfile,
  ensureValidUserName,
  sanitizeUser,
};
