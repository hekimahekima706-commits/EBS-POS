/**
 * Product Activity & Status Utilities for EBS Enterprise Business System
 * 
 * Handles robust boolean checks across SQLite integers (0/1),
 * string values ("0"/"false"), and native booleans (false/true).
 */

export function isProductActive(
  p: { active?: boolean | number | string | null } | null | undefined
): boolean {
  if (!p) return false;
  if (
    p.active === false ||
    p.active === 0 ||
    p.active === '0' ||
    p.active === 'false'
  ) {
    return false;
  }
  return true;
}

export function filterActiveProducts<T extends { active?: boolean | number | string | null }>(
  products: T[]
): T[] {
  if (!Array.isArray(products)) return [];
  return products.filter(isProductActive);
}

export function isDemoProduct(p: { id: string } | null | undefined): boolean {
  if (!p || !p.id) return false;
  return (
    p.id.startsWith('prod-demo-') ||
    p.id.startsWith('prod-ph-') ||
    p.id.startsWith('prod-1') ||
    p.id.startsWith('prod-2') ||
    p.id.startsWith('prod-3') ||
    p.id.startsWith('prod-4') ||
    p.id.startsWith('prod-5') ||
    p.id.startsWith('prod-6') ||
    p.id.startsWith('prod-7') ||
    p.id.startsWith('prod-8') ||
    p.id.startsWith('prod-9') ||
    /^prod-\d+$/.test(p.id)
  );
}

/**
 * Pharmacy Expiry Tracking & Analysis
 * 🔴 Expired: Strict block from sales & security alert
 * 🟡 Expiring Soon (<30 or <90 days): Alert for FEFO dispensing
 * 🟢 Good / Valid
 */
export interface ExpiryAnalysis {
  status: 'expired' | 'critical_30' | 'warning_90' | 'good' | 'unknown';
  daysLeft: number;
  daysRemaining: number;
  badgeText: string;
  badgeColorClass: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function isMedicineExpired(expiryDate?: string | null): boolean {
  if (!expiryDate || !expiryDate.trim()) return false;
  return getMedicineExpiryStatus(expiryDate).isExpired;
}

export function getMedicineExpiryStatus(expiryDate?: string | null): ExpiryAnalysis {
  if (!expiryDate || !expiryDate.trim()) {
    return {
      status: 'unknown',
      daysLeft: 9999,
      daysRemaining: 9999,
      badgeText: 'Haijawekwa Tarehe',
      badgeColorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) {
    return {
      status: 'unknown',
      daysLeft: 9999,
      daysRemaining: 9999,
      badgeText: 'Tarehe Batili',
      badgeColorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const expZero = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime();
  const diffDays = Math.round((expZero - todayZero) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const pastDays = Math.abs(diffDays);
    return {
      status: 'expired',
      daysLeft: diffDays,
      daysRemaining: diffDays,
      badgeText: diffDays === 0 ? '🔴 Inaisha Leo!' : `🔴 Imeisha Muda (siku ${pastDays})`,
      badgeColorClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'critical_30',
      daysLeft: diffDays,
      daysRemaining: diffDays,
      badgeText: `🟡 Inaisha Karibuni (siku ${diffDays})`,
      badgeColorClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      isExpired: false,
      isExpiringSoon: true,
    };
  }

  if (diffDays <= 90) {
    return {
      status: 'warning_90',
      daysLeft: diffDays,
      daysRemaining: diffDays,
      badgeText: `🟡 Inaisha Chini ya 90d (siku ${diffDays})`,
      badgeColorClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
      isExpired: false,
      isExpiringSoon: true,
    };
  }

  return {
    status: 'good',
    daysLeft: diffDays,
    daysRemaining: diffDays,
    badgeText: `🟢 Bado Nzuri (${diffDays}d)`,
    badgeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    isExpired: false,
    isExpiringSoon: false,
  };
}

/**
 * Common quick-pick dosage presets for Tanzanian pharmacies
 */
export const COMMON_DOSAGE_PRESETS = [
  'Kidonge 1 mara 3 kwa siku (1x3) baada ya chakula',
  'Vidonge 2 mara 3 kwa siku (2x3) baada ya chakula',
  'Kidonge 1 mara 2 kwa siku (1x2) asubuhi na jioni',
  'Kidonge 1 mara 1 kwa siku (1x1) usiku kabla ya kulala',
  'Kapsuli 1 mara 3 kwa siku (1x3) kila baada ya saa 8 kwa siku 5',
  'Kijiko 1 cha chakula (10ml) mara 3 kwa siku kwa siku 5',
  'Kijiko 1 cha chai (5ml) mara 3 kwa siku kwa siku 5',
  'Matone 2 mara 3 kwa siku kwenye sikio/jicho lililoathirika',
  'Paka safu nyembamba asubuhi na jioni eneo husika',
  'Tumia vidonge 2 kwa pamoja kuanzia (STAT)',
  'Tumia pale tu maumivu yanapozidi (PRN - Ikihitajika)',
];

/**
 * Dosage forms available for medicines
 */
export const PHARMACY_DOSAGE_FORMS = [
  'Vidonge (Tablets)',
  'Kapsuli (Capsules)',
  'Shira (Syrup)',
  'Mchanganyiko (Suspension)',
  'Sindano (Injection)',
  'Matone (Eye/Ear Drops)',
  'Mafuta / Gel (Ointment)',
  'Poda (Powder)',
  'Kivutio (Inhaler)',
  'Suppository (Vichomeo)',
  'Pia / Plasta (Pessaries/Patches)',
  'Nyinginezo (Other)',
];

