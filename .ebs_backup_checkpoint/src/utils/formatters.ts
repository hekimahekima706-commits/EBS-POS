import { PaymentMethod, BusinessMode, UserRole, StockMovementType, CustomerCategory } from '../types';

export function formatTZS(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'TZS 0';
  }
  return `TZS ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '0';
  }
  return Number(val).toLocaleString('en-US');
}

export function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('sw-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('sw-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('sw-TZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export const PAYMENT_METHOD_INFO: Record<
  PaymentMethod,
  { label: string; bg: string; text: string; iconName: string }
> = {
  cash: { label: 'Pesa Taslimu (Cash)', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', iconName: 'Banknote' },
  mpesa: { label: 'M-Pesa (Vodacom)', bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-800 dark:text-red-300', iconName: 'Smartphone' },
  airtel: { label: 'Airtel Money', bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300', iconName: 'Smartphone' },
  tigopesa: { label: 'Tigo Pesa / Mixx', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300', iconName: 'Smartphone' },
  halopesa: { label: 'HaloPesa (Halotel)', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', iconName: 'Smartphone' },
  bank: { label: 'Benki (NMB/CRDB/Nyingine)', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-800 dark:text-purple-300', iconName: 'Building2' },
  card: { label: 'Kadi ya Benki (POS Card)', bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-800 dark:text-indigo-300', iconName: 'CreditCard' },
  debt: { label: 'Mkopo / Deni la Mteja', bg: 'bg-orange-100 dark:bg-orange-950/60', text: 'text-orange-800 dark:text-orange-300', iconName: 'FileText' },
};

export interface BusinessTypeOption {
  id: BusinessMode;
  name: string;
  emoji: string;
  description: string;
  defaultModules: {
    barMode: boolean;
    restaurantMode: boolean;
    cctv: boolean;
  };
}

export const BUSINESS_TYPES_CATALOG: BusinessTypeOption[] = [
  {
    id: 'bar',
    name: 'Bar / Pub',
    emoji: '🍺',
    description: 'Chupa, shots (30ml/60ml), spillage, counter ya vinywaji & CCTV',
    defaultModules: { barMode: true, restaurantMode: false, cctv: true }
  },
  {
    id: 'grocery',
    name: 'Grocery / Duka',
    emoji: '🛒',
    description: 'Vyakula, bidhaa za rejareja, bei za jumla & madeni',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'restaurant',
    name: 'Restaurant / Mgahawa',
    emoji: '🍽️',
    description: 'Meza, maagizo ya jikoni, bili za wateja & wahudumu',
    defaultModules: { barMode: false, restaurantMode: true, cctv: true }
  },
  {
    id: 'hardware',
    name: 'Hardware',
    emoji: '🔧',
    description: 'Vifaa vya ujenzi, mabati, misumari, vipimo & mikopo',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'phone_accessories',
    name: 'Simu & Accessories',
    emoji: '📱',
    description: 'Simu, vioo, chaja, serial numbers (IMEI) & matengenezo',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'general',
    name: 'General Shop',
    emoji: '🏪',
    description: 'Duka la jumla na rejareja lenye bidhaa mchanganyiko',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'electronics',
    name: 'Electronics & Vifaa',
    emoji: '💻',
    description: 'TV, friji, kompyuta, solar & warranty tracking',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'construction',
    name: 'Construction Materials',
    emoji: '🏗️',
    description: 'Saruji, nondo, mchanga, kokoto & usafirishaji wa mizigo',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'spare_parts',
    name: 'Spare Parts (Magari/Pikipiki)',
    emoji: '🚗',
    description: 'Spea za magari, bajaji, pikipiki, vilainishi & namba za modeli',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
  {
    id: 'other',
    name: 'Aina Nyingine ya Biashara',
    emoji: '🏢',
    description: 'Mfumo wa kawaida unaojirekebisha kulingana na mahitaji yako',
    defaultModules: { barMode: false, restaurantMode: false, cctv: true }
  },
];

export const BUSINESS_MODE_INFO: Record<
  BusinessMode,
  { label: string; description: string; emoji: string }
> = {
  bar: { label: 'EBS Bar & Pub Mode', description: 'Usimamizi wa chupa, shots (30ml/60ml), spillage na stoo ya vinywaji', emoji: '🍺' },
  grocery: { label: 'EBS Grocery & Supermarket', description: 'Vyakula, bidhaa za matumizi ya nyumbani na mizani', emoji: '🛒' },
  restaurant: { label: 'EBS Restaurant & Cafe', description: 'Meza, maagizo ya jikoni, wahudumu na bili zilizogawanywa', emoji: '🍽️' },
  hardware: { label: 'EBS Hardware & Ujenzi', description: 'Vifaa vya ujenzi, mabati, rangi, misumari na vipimo', emoji: '🔧' },
  phone_accessories: { label: 'EBS Simu & Accessories', description: 'Simu, chaja, kava, betri na huduma za wateja', emoji: '📱' },
  general: { label: 'EBS General Business', description: 'Hali ya kawaida inayofaa kila aina ya biashara Tanzania', emoji: '🏪' },
  electronics: { label: 'EBS Electronics', description: 'Vifaa vya umeme, TV, Solar, Kompyuta na huduma', emoji: '💻' },
  construction: { label: 'EBS Construction Materials', description: 'Mabati, Saruji, Nondo na usambazaji', emoji: '🏗️' },
  spare_parts: { label: 'EBS Spare Parts', description: 'Spea za magari, pikipiki na vilainishi', emoji: '🚗' },
  other: { label: 'EBS Custom Mode', description: 'Mipangilio maalum ya biashara yako', emoji: '🏢' },
};

export const ROLE_INFO: Record<
  UserRole,
  { label: string; badgeColor: string; description: string }
> = {
  owner: { 
    label: 'Mwenye Biashara (Owner)', 
    badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    description: 'Uwezo kamili: faida, watumiaji, mipangilio, CCTV, audit logs, backup'
  },
  manager: { 
    label: 'Meneja (Manager)', 
    badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300',
    description: 'Kusimamia stoo, bidhaa, ripoti, wateja na wafanyakazi'
  },
  cashier: { 
    label: 'Keshia / Muuzaji (Cashier)', 
    badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    description: 'Kukata risiti, kupokea malipo, kuongeza wateja'
  },
  waiter: { 
    label: 'Mhudumu (Waiter)', 
    badgeColor: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300',
    description: 'Kufungua meza, kupokea oda na kuziwasilisha'
  },
  storekeeper: { 
    label: 'Mweka Hazina / Stoo', 
    badgeColor: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300',
    description: 'Kupokea mizigo ya wasambazaji na kurekebisha hesabu ya stoo'
  },
  accountant: { 
    label: 'Mhasibu (Accountant)', 
    badgeColor: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300',
    description: 'Kufuatilia gharama, ripoti za kifedha, TRA & kodi'
  },
  admin: { 
    label: 'Msimamizi wa Mfumo (Admin)', 
    badgeColor: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300',
    description: 'Msimamizi wa IT na mifumo'
  },
};

export const CUSTOMER_CATEGORY_INFO: Record<
  CustomerCategory,
  { label: string; badgeColor: string; discountText: string }
> = {
  retail: { label: 'Mteja wa Rejareja', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', discountText: 'Bei ya Kawaida' },
  wholesale: { label: 'Mteja wa Jumla', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', discountText: 'Bei ya Jumla' },
  regular: { label: 'Mteja wa Kila Siku (Regular)', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', discountText: 'Mteja Mzoefu' },
  vip: { label: 'Mteja Maalum (VIP)', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', discountText: 'Huduma ya Kipaumbele' },
  business: { label: 'Kampuni / Taasisi', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', discountText: 'Inahitaji Ankara (Invoice)' },
};

export const STOCK_MOVEMENT_INFO: Record<
  StockMovementType,
  { label: string; isPositive: boolean; color: string }
> = {
  purchase: { label: 'Kupokea Mzigo Mpya (Purchase)', isPositive: true, color: 'text-emerald-600' },
  opening_stock: { label: 'Kuanzisha Stoo (Opening)', isPositive: true, color: 'text-blue-600' },
  sale: { label: 'Mauzo ya Kawaida (Sale)', isPositive: false, color: 'text-slate-600' },
  return: { label: 'Kurejeshewa na Mteja (Return)', isPositive: true, color: 'text-indigo-600' },
  adjustment: { label: 'Marekebisho ya Hesabu (Stock Take)', isPositive: true, color: 'text-amber-600' },
  damage: { label: 'Iliyoharibika (Damage)', isPositive: false, color: 'text-red-600' },
  loss: { label: 'Iliyopotea (Loss)', isPositive: false, color: 'text-red-700' },
  spillage: { label: 'Iliyomwagika Bar (Spillage)', isPositive: false, color: 'text-orange-600' },
  wastage: { label: 'Kipimo Kilichopotea (Wastage)', isPositive: false, color: 'text-amber-700' },
  transfer: { label: 'Uhamisho wa Tawi (Transfer)', isPositive: false, color: 'text-purple-600' },
};

export const EXPENSE_CATEGORIES = [
  'LUKU / Umeme',
  'DAWASA / Maji',
  'Kodi ya Pango (Rent)',
  'Mishahara & Posho',
  'Usafiri & Mafuta',
  'Vifaa vya Usafi & Maintenance',
  'Leseni & Ushuru wa TRA',
  'Chakula & Vinywaji vya Wafanyakazi',
  'Mengineyo (Miscellaneous)',
];

export const TANZANIA_REGIONS = [
  'Dar es Salaam',
  'Arusha',
  'Dodoma',
  'Mwanza',
  'Mbeya',
  'Morogoro',
  'Tanga',
  'Kilimanjaro (Moshi)',
  'Zanzibar Mjini Magharibi',
  'Iringa',
  'Kagera (Bukoba)',
  'Kigoma',
  'Mara (Musoma)',
  'Ruvuma (Songea)',
  'Shinyanga',
  'Tabora',
  'Geita',
  'Katavi',
  'Manyara',
  'Njombe',
  'Pwani',
  'Rukwa',
  'Simiyu',
  'Singida',
  'Songwe',
  'Lindi',
  'Mtwara',
];
