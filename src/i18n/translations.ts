// Translation dictionary for Tanzanian EBS V1.3.0 (Swahili default & English)

export type TranslationKey = 
  | 'app.title'
  | 'app.tagline'
  | 'auth.welcome'
  | 'auth.welcome_back'
  | 'auth.login_subtitle'
  | 'auth.username_or_phone'
  | 'auth.password'
  | 'auth.login_btn'
  | 'auth.logging_in'
  | 'auth.forgot_password'
  | 'auth.change_password'
  | 'auth.demo_users'
  | 'auth.demo_click_hint'
  | 'auth.lockout_msg'
  | 'auth.invalid_credentials'
  | 'auth.account_inactive'
  | 'auth.first_login_title'
  | 'auth.first_login_subtitle'
  | 'auth.temp_password'
  | 'auth.new_password'
  | 'auth.confirm_password'
  | 'auth.save_new_password'
  | 'auth.password_changed_success'
  | 'auth.passwords_must_match'
  | 'auth.min_8_chars'
  | 'auth.lock_screen'
  | 'auth.unlock'
  | 'auth.enter_pin_or_pass'
  | 'auth.switch_user'
  | 'auth.session_expired'
  | 'auth.logout'
  | 'auth.unauthorized_access'
  | 'auth.manager_approval_required'
  | 'auth.enter_manager_pin'
  | 'auth.approve'
  | 'auth.cancel'
  // Nav
  | 'nav.dashboard'
  | 'nav.pos'
  | 'nav.inventory'
  | 'nav.bar_mode'
  | 'nav.customers'
  | 'nav.debts'
  | 'nav.suppliers'
  | 'nav.expenses'
  | 'nav.reports'
  | 'nav.employees'
  | 'nav.camera'
  | 'nav.calendar'
  | 'nav.ai_assistant'
  | 'nav.settings'
  | 'nav.more'
  // Roles
  | 'role.owner'
  | 'role.manager'
  | 'role.cashier'
  | 'role.waiter'
  | 'role.storekeeper'
  | 'role.accountant'
  | 'role.admin'
  // Dashboard
  | 'dashboard.sales_today'
  | 'dashboard.profit_today'
  | 'dashboard.expenses_today'
  | 'dashboard.total_debts'
  | 'dashboard.low_stock_alerts'
  | 'dashboard.quick_sale'
  | 'dashboard.my_shift'
  | 'dashboard.active_orders'
  | 'dashboard.recent_sales'
  | 'dashboard.top_products'
  | 'dashboard.audit_activity'
  | 'dashboard.stock_health'
  // Common
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.search'
  | 'common.actions'
  | 'common.status'
  | 'common.total'
  | 'common.date'
  | 'common.user'
  | 'common.phone'
  | 'common.name'
  | 'common.branch'
  | 'common.currency_tzs'
  | 'common.success'
  | 'common.error'
  | 'common.loading'
  | 'common.confirm'
  | 'common.required'
  // Appearance & Theme
  | 'theme.title'
  | 'theme.mode'
  | 'theme.dark'
  | 'theme.light'
  | 'theme.system'
  | 'theme.primary_color'
  | 'theme.font_size'
  | 'theme.small'
  | 'theme.normal'
  | 'theme.large'
  | 'theme.bg_style'
  | 'theme.density'
  | 'theme.language';

export const TRANSLATIONS: Record<'sw' | 'en', Record<TranslationKey, string>> = {
  sw: {
    'app.title': 'EBS SMART BIZ',
    'app.tagline': 'Mfumo Mahiri wa Mauzo, Stoo na Usimamizi wa Biashara',
    'auth.welcome': 'KARIBU EBS',
    'auth.welcome_back': 'Karibu Tena',
    'auth.login_subtitle': 'Ingiza namba ya simu au username na neno la siri ili kuendelea.',
    'auth.username_or_phone': 'Username au Namba ya Simu',
    'auth.password': 'Neno la Siri (Password)',
    'auth.login_btn': 'Ingia Kwenye Mfumo',
    'auth.logging_in': 'Inahakiki...',
    'auth.forgot_password': 'Umesahau password?',
    'auth.change_password': 'Badilisha Password',
    'auth.demo_users': 'Akaunti za Majaribio (Bofya Kujaribu Cheo)',
    'auth.demo_click_hint': 'Chagua cheo hapa chini ili kuingia moja kwa moja bila kuandika:',
    'auth.lockout_msg': 'Majaribio mengi ya kuingia yasiyo sahihi. Tafadhali subiri kwa sekunde:',
    'auth.invalid_credentials': 'Username/Namba ya simu au Password siyo sahihi.',
    'auth.account_inactive': 'Akaunti hii imesitishwa na Mwenye Biashara.',
    'auth.first_login_title': 'Uwekaji wa Neno Jipya la Siri',
    'auth.first_login_subtitle': 'Kwa usalama wa biashara, unahitajika kubadilisha neno la siri la muda kabla ya kutumia mfumo.',
    'auth.temp_password': 'Neno la Siri la Sasa / la Muda',
    'auth.new_password': 'Neno Jipya la Siri (Angalau herufi 8)',
    'auth.confirm_password': 'Thibitisha Neno Jipya',
    'auth.save_new_password': 'Hifadhi na Uingie',
    'auth.password_changed_success': 'Neno la siri limebadilishwa kikamilifu.',
    'auth.passwords_must_match': 'Maneno ya siri mapya hayafanani.',
    'auth.min_8_chars': 'Neno la siri lazima liwe na herufi zisizopungua 8 na namba.',
    'auth.lock_screen': 'Funga EBS (Lock Screen)',
    'auth.unlock': 'Fungua Mfumo',
    'auth.enter_pin_or_pass': 'Ingiza PIN au Password kuendelea',
    'auth.switch_user': 'Badilisha Mtumiaji',
    'auth.session_expired': 'Muda wa matumizi umekwisha kwa kutokuwepo shughuli. Tafadhali ingia tena.',
    'auth.logout': 'Toka (Logout)',
    'auth.unauthorized_access': 'Hauna ruhusa ya kufungua sehemu hii ya mfumo.',
    'auth.manager_approval_required': 'Idhini ya Meneja au Mwenye Biashara Inahitajika',
    'auth.enter_manager_pin': 'Ingiza PIN/Password ya Msimamizi Kuidhinisha:',
    'auth.approve': 'Idhinisha',
    'auth.cancel': 'Ghairi',

    'nav.dashboard': 'Dashibodi',
    'nav.pos': 'Mauzo (POS)',
    'nav.inventory': 'Bidhaa & Stoo',
    'nav.bar_mode': 'Bar & Vinywaji',
    'nav.customers': 'Wateja & Madeni',
    'nav.debts': 'Madeni ya Wateja',
    'nav.suppliers': 'Wasambazaji',
    'nav.expenses': 'Gharama',
    'nav.reports': 'Ripoti za Biashara',
    'nav.employees': 'Wafanyakazi & Ruhusa',
    'nav.camera': 'Camera CCTV',
    'nav.calendar': 'Kalenda ya Matukio',
    'nav.ai_assistant': 'AI Msaidizi',
    'nav.settings': 'Mipangilio & Backup',
    'nav.more': 'Zaidi',

    'role.owner': 'Mwenye Biashara (Owner)',
    'role.manager': 'Meneja (Manager)',
    'role.cashier': 'Muuzaji (Cashier)',
    'role.waiter': 'Muhudumu (Waiter)',
    'role.storekeeper': 'Mweka Stoo (Storekeeper)',
    'role.accountant': 'Mhasibu (Accountant)',
    'role.admin': 'Msimamizi Mkuu (Admin)',

    'dashboard.sales_today': 'Mauzo ya Leo',
    'dashboard.profit_today': 'Faida ya Leo',
    'dashboard.expenses_today': 'Gharama za Leo',
    'dashboard.total_debts': 'Jumla ya Madeni ya Wateja',
    'dashboard.low_stock_alerts': 'Tahadhari ya Bidhaa Zinazoisha',
    'dashboard.quick_sale': 'Anza Mauzo Mapya (POS)',
    'dashboard.my_shift': 'Muhtasari wa Shift Yangu',
    'dashboard.active_orders': 'Oda Zinazoendelea',
    'dashboard.recent_sales': 'Miamala ya Hivi Karibuni',
    'dashboard.top_products': 'Bidhaa Zinazoongoza kwa Mauzo',
    'dashboard.audit_activity': 'Matukio ya Hivi Karibuni ya Wafanyakazi',
    'dashboard.stock_health': 'Hali ya Mali na Stoo',

    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.delete': 'Futa',
    'common.edit': 'Hariri',
    'common.search': 'Tafuta...',
    'common.actions': 'Vitendo',
    'common.status': 'Hali',
    'common.total': 'Jumla',
    'common.date': 'Tarehe',
    'common.user': 'Mtumiaji',
    'common.phone': 'Simu',
    'common.name': 'Jina',
    'common.branch': 'Tawi',
    'common.currency_tzs': 'TZS',
    'common.success': 'Imefanikiwa',
    'common.error': 'Hitilafu',
    'common.loading': 'Inapakia...',
    'common.confirm': 'Thibitisha',
    'common.required': 'Inahitajika',

    'theme.title': 'Mwonekano & Mandhari',
    'theme.mode': 'Hali ya Mandhari (Theme)',
    'theme.dark': 'Giza (Dark Mode)',
    'theme.light': 'Mwanga (Light Mode)',
    'theme.system': 'Kama Mfumo wa Kifaa (System)',
    'theme.primary_color': 'Rangi Kuu ya Biashara',
    'theme.font_size': 'Ukubwa wa Maandishi (Font Size)',
    'theme.small': 'Ndogo (Compact)',
    'theme.normal': 'Wastani (Standard)',
    'theme.large': 'Kubwa (Large Accessibility)',
    'theme.bg_style': 'Mtindo wa Background',
    'theme.density': 'Msongamano wa Menyu',
    'theme.language': 'Lugha ya Mfumo'
  },

  en: {
    'app.title': 'EBS SMART BIZ',
    'app.tagline': 'Intelligent Business POS, Stock & Management System',
    'auth.welcome': 'WELCOME TO EBS',
    'auth.welcome_back': 'Welcome Back',
    'auth.login_subtitle': 'Enter your username or phone number and password to continue.',
    'auth.username_or_phone': 'Username or Phone Number',
    'auth.password': 'Password',
    'auth.login_btn': 'Sign In to System',
    'auth.logging_in': 'Authenticating...',
    'auth.forgot_password': 'Forgot Password?',
    'auth.change_password': 'Change Password',
    'auth.demo_users': 'Demo Roles (Click to test role)',
    'auth.demo_click_hint': 'Select any role below to log in directly without typing:',
    'auth.lockout_msg': 'Too many failed login attempts. Please wait for seconds:',
    'auth.invalid_credentials': 'Invalid username/phone number or password.',
    'auth.account_inactive': 'This account has been deactivated by the Business Owner.',
    'auth.first_login_title': 'Mandatory Password Setup',
    'auth.first_login_subtitle': 'For your security, you must update your temporary password before accessing the system.',
    'auth.temp_password': 'Current / Temporary Password',
    'auth.new_password': 'New Secure Password (Min 8 characters)',
    'auth.confirm_password': 'Confirm New Password',
    'auth.save_new_password': 'Save and Continue',
    'auth.password_changed_success': 'Password updated successfully.',
    'auth.passwords_must_match': 'New passwords do not match.',
    'auth.min_8_chars': 'Password must be at least 8 characters with numbers.',
    'auth.lock_screen': 'Lock EBS Screen',
    'auth.unlock': 'Unlock System',
    'auth.enter_pin_or_pass': 'Enter PIN or Password to unlock',
    'auth.switch_user': 'Switch User',
    'auth.session_expired': 'Your session has expired due to inactivity. Please log in again.',
    'auth.logout': 'Sign Out (Logout)',
    'auth.unauthorized_access': 'You do not have authorization to view this section.',
    'auth.manager_approval_required': 'Manager or Owner Approval Required',
    'auth.enter_manager_pin': 'Enter Supervisor PIN/Password to Authorize:',
    'auth.approve': 'Authorize',
    'auth.cancel': 'Cancel',

    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Point of Sale (POS)',
    'nav.inventory': 'Products & Stock',
    'nav.bar_mode': 'Bar & Drinks',
    'nav.customers': 'Customers & Credit',
    'nav.debts': 'Customer Debts',
    'nav.suppliers': 'Suppliers',
    'nav.expenses': 'Expenses',
    'nav.reports': 'Financial Reports',
    'nav.employees': 'Staff & Roles',
    'nav.camera': 'CCTV Surveillance',
    'nav.calendar': 'Event Calendar',
    'nav.ai_assistant': 'AI Assistant',
    'nav.settings': 'Settings & Backup',
    'nav.more': 'More',

    'role.owner': 'Business Owner',
    'role.manager': 'Manager',
    'role.cashier': 'Cashier',
    'role.waiter': 'Waiter / Server',
    'role.storekeeper': 'Storekeeper',
    'role.accountant': 'Accountant',
    'role.admin': 'Administrator',

    'dashboard.sales_today': "Today's Sales",
    'dashboard.profit_today': "Today's Gross Profit",
    'dashboard.expenses_today': "Today's Expenses",
    'dashboard.total_debts': 'Total Customer Receivables',
    'dashboard.low_stock_alerts': 'Low Stock Warnings',
    'dashboard.quick_sale': 'Start POS Sale',
    'dashboard.my_shift': 'My Shift Summary',
    'dashboard.active_orders': 'Active Table Orders',
    'dashboard.recent_sales': 'Recent Transactions',
    'dashboard.top_products': 'Top Selling Items',
    'dashboard.audit_activity': 'Recent Staff Activities',
    'dashboard.stock_health': 'Inventory Valuation & Health',

    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search...',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.total': 'Total',
    'common.date': 'Date',
    'common.user': 'User',
    'common.phone': 'Phone',
    'common.name': 'Name',
    'common.branch': 'Branch',
    'common.currency_tzs': 'TZS',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.required': 'Required',

    'theme.title': 'Appearance & Theme',
    'theme.mode': 'Theme Mode',
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    'theme.system': 'Device System Default',
    'theme.primary_color': 'Primary Brand Color',
    'theme.font_size': 'Font Scaling',
    'theme.small': 'Small (Compact)',
    'theme.normal': 'Standard',
    'theme.large': 'Large (Accessible)',
    'theme.bg_style': 'Background Style',
    'theme.density': 'Menu Density',
    'theme.language': 'Interface Language'
  }
};

export function t(key: TranslationKey, lang: 'sw' | 'en' = 'sw'): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.sw[key] || key;
}
