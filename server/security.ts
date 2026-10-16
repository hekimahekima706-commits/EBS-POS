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
 * Safe Tanzanian phone number normalizer:
 * Formats valid mobile numbers into canonical E.164 without plus: 255XXXXXXXXX (12 digits)
 * Examples:
 * - '0754111222' -> '255754111222'
 * - '+255 754 111 222' -> '255754111222'
 * - '255754111222' -> '255754111222'
 * - '0625674705' -> '255625674705'
 * Null-safe; ignores empty, null, or non-numeric inputs.
 */
export function normalizeTanzanianPhone(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('255') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '255' + digits.slice(1);
  }
  if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return '255' + digits;
  }
  return digits;
}

/**
 * Compare two phone numbers safely without ambiguous substring matching.
 * Requires both numbers to be valid non-empty phone strings that resolve
 * to the exact same canonical normalized phone number.
 */
export function matchPhoneNumbers(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB || typeof phoneA !== 'string' || typeof phoneB !== 'string') {
    return false;
  }
  const normA = normalizeTanzanianPhone(phoneA);
  const normB = normalizeTanzanianPhone(phoneB);
  if (!normA || !normB) return false;

  // Both must have at least 9 digits and be strictly equal
  if (normA.length >= 9 && normB.length >= 9 && normA === normB) {
    return true;
  }
  return false;
}

/**
 * Secure constant-time password verification supporting both modern PBKDF2
 * and legacy SHA-256 ('ebs_tz_salt_2026' from src/utils/security.ts: hashPassword).
 * Flags legacy passwords for automatic rehash upon successful login.
 */
export function verifyUserPassword(
  providedPassword: string,
  storedHash: string,
  storedSalt?: string
): { isValid: boolean; needsRehash: boolean } {
  if (
    !providedPassword ||
    !storedHash ||
    typeof providedPassword !== 'string' ||
    typeof storedHash !== 'string'
  ) {
    return { isValid: false, needsRehash: false };
  }

  const cleanStoredHash = storedHash.trim();
  const cleanSalt = storedSalt && typeof storedSalt === 'string' ? storedSalt.trim() : undefined;

  if (!cleanStoredHash) {
    return { isValid: false, needsRehash: false };
  }

  // 1. Verify with PBKDF2 and stored salt (100,000 iterations, 64-byte keylen = 128 hex chars)
  if (cleanSalt) {
    try {
      const computedHash = crypto
        .pbkdf2Sync(providedPassword, cleanSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
        .toString('hex');

      const bufA = Buffer.from(computedHash, 'hex');
      const bufB = Buffer.from(cleanStoredHash, 'hex');

      if (bufA.length === bufB.length && bufA.length === PBKDF2_KEYLEN && crypto.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: false };
      }
    } catch {
      // Continue to test legacy hash
    }
  }

  // 2. Verify with legacy SHA-256 hash (exact formula from src/utils/security.ts: hashPassword)
  // Formula: SHA-256("${salt}:${password}")
  const candidateSalts: string[] = [];
  if (cleanSalt && cleanSalt !== LEGACY_SALT) {
    candidateSalts.push(cleanSalt);
  }
  candidateSalts.push(LEGACY_SALT);

  for (const salt of candidateSalts) {
    try {
      const computedSha256 = crypto
        .createHash('sha256')
        .update(`${salt}:${providedPassword}`)
        .digest('hex');

      const bufA = Buffer.from(computedSha256, 'hex');
      const bufB = Buffer.from(cleanStoredHash, 'hex');

      if (bufA.length === bufB.length && bufA.length === 32 && crypto.timingSafeEqual(bufA, bufB)) {
        // Matched legacy SHA-256; flag for rehash to modern PBKDF2
        return { isValid: true, needsRehash: true };
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 3. Constant-time check if provided password was already a direct 64-char SHA-256 hex hash
  if (cleanStoredHash.length === 64 && providedPassword.trim().length === 64) {
    try {
      const bufA = Buffer.from(providedPassword.trim(), 'hex');
      const bufB = Buffer.from(cleanStoredHash, 'hex');
      if (bufA.length === bufB.length && bufA.length === 32 && crypto.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: true };
      }
    } catch {
      // Ignore
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
