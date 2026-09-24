// Password hashing and crypto security utilities for Tanzanian EBS

/**
 * SHA-256 Hash with salt for secure local storage of user passwords.
 * Never stores plain-text passwords.
 */
export async function hashPassword(password: string, salt: string = 'ebs_tz_salt_2026'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates password strength according to EBS requirements:
 * - Minimum 8 characters
 * - At least one number
 * - Suggests uppercase and lowercase
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
  feedback: string;
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Neno la siri lazima liwe na herufi zisizopungua 8.');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Lazima liwe na angalau namba moja (0-9).');
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  let feedback = 'Neno Dhaifu';
  if (score >= 3) feedback = 'Neno Imara Sana';
  else if (score >= 2) feedback = 'Neno la Wastani';

  return {
    isValid: errors.length === 0,
    score,
    errors,
    feedback
  };
}

/**
 * Validate Tanzanian phone number format
 * Accepts: 07XXXXXXXX, 06XXXXXXXX, +255XXXXXXXXX, 255XXXXXXXXX
 */
export function validateTanzanianPhone(phone: string): { isValid: boolean; formatted: string; error?: string } {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!cleaned) {
    return { isValid: false, formatted: phone, error: 'Namba ya simu inahitajika.' };
  }

  // Check valid patterns
  if (/^0[67]\d{8}$/.test(cleaned)) {
    const formatted = `+255 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    return { isValid: true, formatted };
  }

  if (/^(?:\+255|255)[67]\d{8}$/.test(cleaned)) {
    const digits = cleaned.startsWith('+') ? cleaned.slice(4) : cleaned.slice(3);
    const formatted = `+255 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return { isValid: true, formatted };
  }

  return { 
    isValid: false, 
    formatted: phone, 
    error: 'Namba ya simu ianze na 06/07 au +255 (mfano: 0754 123 456).' 
  };
}
