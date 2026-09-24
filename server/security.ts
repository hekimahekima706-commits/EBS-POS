import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const LEGACY_SALT = 'ebs_tz_salt_2026';

/**
 * Generate cryptographically secure random salt
 */
export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password with PBKDF2 and unique per-user salt
 */
export function hashPasswordPBKDF2(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || generateSalt();
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { hash, salt };
}

/**
 * Secure constant-time password verification using PBKDF2 with unique per-user salt
 */
export function verifyUserPassword(
  providedPassword: string,
  storedHash: string,
  storedSalt?: string
): { isValid: boolean; needsRehash: boolean } {
  if (!providedPassword || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  // 1. Verify with PBKDF2 and stored salt
  if (storedSalt) {
    try {
      const computedHash = crypto.pbkdf2Sync(
        providedPassword,
        storedSalt,
        PBKDF2_ITERATIONS,
        PBKDF2_KEYLEN,
        PBKDF2_DIGEST
      ).toString('hex');

      const bufA = Buffer.from(computedHash, 'hex');
      const bufB = Buffer.from(storedHash, 'hex');

      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: false };
      }
    } catch {
      return { isValid: false, needsRehash: false };
    }
  }

  return { isValid: false, needsRehash: false };
}

/**
 * Generate cryptographically secure random session token
 */
export function generateSecureSessionToken(userId: string): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `ebs_sec_${userId}_${randomBytes}`;
}

/**
 * Generate secure PIN hash and salt
 */
export function hashPin(pin: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || generateSalt(8);
  const hash = crypto.pbkdf2Sync(pin, salt, 20000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Neno la siri lazima liwe na herufi zisizopungua 8.');
  }
  if (!/\d/.test(password)) {
    errors.push('Lazima liwe na angalau tarakimu/namba moja (0-9).');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function verifyPin(providedPin: string, storedPinOrHash: string, storedSalt?: string): boolean {
  if (!providedPin || !storedPinOrHash) return false;

  // If plain pin stored in legacy record
  if (providedPin === storedPinOrHash) return true;

  if (storedSalt) {
    const computed = crypto.pbkdf2Sync(providedPin, storedSalt, 20000, 32, 'sha256').toString('hex');
    return computed === storedPinOrHash;
  }

  return false;
}
