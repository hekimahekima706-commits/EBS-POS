import { UserRole, PermissionKey, GranularPermissions, User, AnyPermissionKey } from '../types';

export interface PermissionDefinition {
  key: PermissionKey;
  category: 'Mauzo (Sales)' | 'Bidhaa (Products)' | 'Stoo (Stock)' | 'Wateja (Customers)' | 'Wasambazaji (Suppliers)' | 'Ripoti (Reports)' | 'Wafanyakazi (Employees)' | 'Usalama (Security)' | 'Kamera (Camera)' | 'Mipangilio (Settings)';
  labelSw: string;
  labelEn: string;
  descriptionSw: string;
  descriptionEn: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Sales
  {
    key: 'view_sales',
    category: 'Mauzo (Sales)',
    labelSw: 'Kuangalia Mauzo',
    labelEn: 'View Sales',
    descriptionSw: 'Kuweza kuona historia ya risiti na miamala ya mauzo.',
    descriptionEn: 'Ability to view sales receipts and transaction history.'
  },
  {
    key: 'create_sale',
    category: 'Mauzo (Sales)',
    labelSw: 'Kufanya Mauzo (POS)',
    labelEn: 'Create Sale (POS)',
    descriptionSw: 'Kuweza kuingiza mauzo mapya na kutoa risiti kwenye POS.',
    descriptionEn: 'Ability to ring up new sales and print receipts in POS.'
  },
  {
    key: 'cancel_sale',
    category: 'Mauzo (Sales)',
    labelSw: 'Kufuta / Kughairi Muamala',
    labelEn: 'Cancel Sale',
    descriptionSw: 'Kughairi mauzo yaliyokamilika na kurudisha stock.',
    descriptionEn: 'Cancel completed sales and restore stock.'
  },
  {
    key: 'refund_sale',
    category: 'Mauzo (Sales)',
    labelSw: 'Kufanya Refund',
    labelEn: 'Process Refund',
    descriptionSw: 'Kurudisha pesa za mauzo kwa mteja aliyeleta bidhaa/fedha.',
    descriptionEn: 'Refund money to customer with stock return.'
  },
  {
    key: 'apply_discount',
    category: 'Mauzo (Sales)',
    labelSw: 'Kutoa Punguzo (Discount)',
    labelEn: 'Apply Discount',
    descriptionSw: 'Kutoa punguzo la bei wakati wa mauzo.',
    descriptionEn: 'Apply price discount during POS checkout.'
  },
  {
    key: 'change_price',
    category: 'Mauzo (Sales)',
    labelSw: 'Kubadili Bei ya Mauzo Papo Hapo',
    labelEn: 'Override Price at POS',
    descriptionSw: 'Kuingiza bei ya makubaliano tofauti na bei rasmi kwenye POS.',
    descriptionEn: 'Override standard selling price manually during checkout.'
  },

  // Products
  {
    key: 'view_products',
    category: 'Bidhaa (Products)',
    labelSw: 'Kuangalia Orodha ya Bidhaa',
    labelEn: 'View Products',
    descriptionSw: 'Kutafuta na kuona bei za bidhaa.',
    descriptionEn: 'Search and view product catalog and prices.'
  },
  {
    key: 'create_product',
    category: 'Bidhaa (Products)',
    labelSw: 'Kusajili Bidhaa Mpya',
    labelEn: 'Create Product',
    descriptionSw: 'Kuingiza bidhaa mpya kwenye mfumo.',
    descriptionEn: 'Add new items into the product catalog.'
  },
  {
    key: 'edit_product',
    category: 'Bidhaa (Products)',
    labelSw: 'Kuhariri Taarifa za Bidhaa',
    labelEn: 'Edit Product Details',
    descriptionSw: 'Kubadilisha jina, kategoria, barcode, au picha ya bidhaa.',
    descriptionEn: 'Edit product name, category, barcode, or image.'
  },
  {
    key: 'deactivate_product',
    category: 'Bidhaa (Products)',
    labelSw: 'Kufuta / Kuzima Bidhaa',
    labelEn: 'Deactivate Product',
    descriptionSw: 'Kuzima bidhaa isionekane tena kwenye mauzo.',
    descriptionEn: 'Deactivate product from active POS listing.'
  },
  {
    key: 'change_selling_price',
    category: 'Bidhaa (Products)',
    labelSw: 'Kubadilisha Bei ya Kuuza',
    labelEn: 'Change Selling Price',
    descriptionSw: 'Kuweka au kurekebisha bei rasmi ya kuuzia.',
    descriptionEn: 'Set or update official standard selling price.'
  },
  {
    key: 'view_cost_price',
    category: 'Bidhaa (Products)',
    labelSw: 'Kuona Bei ya Kununulia (Cost Price)',
    labelEn: 'View Cost Price',
    descriptionSw: 'Kuona gharama halisi ya ununuzi na faida ghafi ya bidhaa.',
    descriptionEn: 'View wholesale purchase cost and gross margins.'
  },

  // Stock
  {
    key: 'view_stock',
    category: 'Stoo (Stock)',
    labelSw: 'Kuangalia Idadi ya Stock',
    labelEn: 'View Stock Quantities',
    descriptionSw: 'Kuangalia idadi ya bidhaa zilizopo stoo.',
    descriptionEn: 'Check available inventory balances in warehouse/shelves.'
  },
  {
    key: 'receive_stock',
    category: 'Stoo (Stock)',
    labelSw: 'Kupokea Mzigo Mpya (Stock Intake)',
    labelEn: 'Receive Stock (Purchase Intake)',
    descriptionSw: 'Kuingiza mzigo uliotoka kwa msambazaji au kiwandani.',
    descriptionEn: 'Record incoming stock from suppliers or purchase orders.'
  },
  {
    key: 'adjust_stock',
    category: 'Stoo (Stock)',
    labelSw: 'Kurekebisha Idadi ya Stock',
    labelEn: 'Adjust Stock Quantities',
    descriptionSw: 'Kurekebisha stock baada ya ukaguzi au spillage/uharibifu.',
    descriptionEn: 'Adjust stock for physical audit, spillage, or breakage.'
  },
  {
    key: 'approve_adjustment',
    category: 'Stoo (Stock)',
    labelSw: 'Kuidhinisha Marekebisho ya Stock',
    labelEn: 'Approve Stock Adjustments',
    descriptionSw: 'Kupitisha marekebisho ya idadi kubwa ya stock yaliyowekwa na storekeeper.',
    descriptionEn: 'Authorize major stock variance reconciliation.'
  },
  {
    key: 'transfer_stock',
    category: 'Stoo (Stock)',
    labelSw: 'Kuhamisha Stock (Stoo kwenda Bar / Tawi)',
    labelEn: 'Transfer Stock',
    descriptionSw: 'Kutoa stock kutoka stoo kuu kwenda kaunta/tawi jingine.',
    descriptionEn: 'Transfer stock between main store and counter/branches.'
  },

  // Customers
  {
    key: 'view_customers',
    category: 'Wateja (Customers)',
    labelSw: 'Kuangalia Orodha ya Wateja',
    labelEn: 'View Customers',
    descriptionSw: 'Kufungua majina na namba za wateja.',
    descriptionEn: 'View registered customer directory.'
  },
  {
    key: 'create_customer',
    category: 'Wateja (Customers)',
    labelSw: 'Kusajili Mteja Mpya',
    labelEn: 'Create Customer',
    descriptionSw: 'Kuweka taarifa za mteja mpya.',
    descriptionEn: 'Register new customer profile.'
  },
  {
    key: 'edit_customer',
    category: 'Wateja (Customers)',
    labelSw: 'Kuhariri Taarifa za Mteja',
    labelEn: 'Edit Customer',
    descriptionSw: 'Kubadili namba ya simu au eneo la mteja.',
    descriptionEn: 'Update customer contact or address details.'
  },
  {
    key: 'view_customer_debt',
    category: 'Wateja (Customers)',
    labelSw: 'Kuona Madeni ya Wateja',
    labelEn: 'View Customer Debts',
    descriptionSw: 'Kuangalia daftari la madeni na kiasi anachodaiwa kila mteja.',
    descriptionEn: 'Inspect customer debt ledgers and outstanding balances.'
  },
  {
    key: 'record_customer_payment',
    category: 'Wateja (Customers)',
    labelSw: 'Kupokea Malipo ya Deni',
    labelEn: 'Record Debt Payment',
    descriptionSw: 'Kuingiza malipo ya deni na kupunguza salio la mteja.',
    descriptionEn: 'Record credit settlement payments from customers.'
  },

  // Suppliers
  {
    key: 'view_suppliers',
    category: 'Wasambazaji (Suppliers)',
    labelSw: 'Kuangalia Wasambazaji',
    labelEn: 'View Suppliers',
    descriptionSw: 'Kuona orodha ya kampuni zinazosambaza bidhaa.',
    descriptionEn: 'View supplier directory and contact information.'
  },
  {
    key: 'create_supplier',
    category: 'Wasambazaji (Suppliers)',
    labelSw: 'Kusajili Msambazaji Mpya',
    labelEn: 'Create Supplier',
    descriptionSw: 'Kuweka taarifa za msambazaji mpya.',
    descriptionEn: 'Add new supplier vendor profile.'
  },
  {
    key: 'purchase_stock',
    category: 'Wasambazaji (Suppliers)',
    labelSw: 'Kufanya Ununuzi kwa Msambazaji',
    labelEn: 'Create Purchase Order',
    descriptionSw: 'Kuingiza oda ya ununuzi na kuongeza deni la msambazaji.',
    descriptionEn: 'Record purchases on cash or credit from suppliers.'
  },
  {
    key: 'record_supplier_payment',
    category: 'Wasambazaji (Suppliers)',
    labelSw: 'Kulipa Msambazaji',
    labelEn: 'Record Supplier Payment',
    descriptionSw: 'Kuingiza kumbukumbu ya fedha zilizolipwa kwa msambazaji.',
    descriptionEn: 'Record cash/bank settlement paid to supplier.'
  },

  // Reports
  {
    key: 'view_sales_report',
    category: 'Ripoti (Reports)',
    labelSw: 'Kuangalia Ripoti ya Mauzo',
    labelEn: 'View Sales Report',
    descriptionSw: 'Kuona ripoti ya mauzo ya siku, wiki au mwezi.',
    descriptionEn: 'Inspect daily, weekly, and monthly sales graphs and charts.'
  },
  {
    key: 'view_profit',
    category: 'Ripoti (Reports)',
    labelSw: 'Kuona Faida na Hesabu Nyeti (Profit)',
    labelEn: 'View Profit & Margins',
    descriptionSw: 'Kuona faida halisi (Net/Gross Profit) na mchanganuo wa kifedha.',
    descriptionEn: 'Access sensitive profit figures, margins, and financial balance.'
  },
  {
    key: 'view_expenses',
    category: 'Ripoti (Reports)',
    labelSw: 'Kuangalia na Kuingiza Gharama (Expenses)',
    labelEn: 'View & Manage Expenses',
    descriptionSw: 'Kurekodi matumizi ya uendeshaji wa biashara.',
    descriptionEn: 'View and record operational business expenses.'
  },
  {
    key: 'export_reports',
    category: 'Ripoti (Reports)',
    labelSw: 'Kupakua Ripoti (Export Excel/PDF)',
    labelEn: 'Export Reports (Excel/PDF)',
    descriptionSw: 'Kupakua ripoti kwa matumizi ya uhasibu au benki.',
    descriptionEn: 'Download financial statements and spreadsheets.'
  },

  // Employees
  {
    key: 'view_users',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kuangalia Wafanyakazi',
    labelEn: 'View Employees',
    descriptionSw: 'Kuona orodha ya wafanyakazi na nafasi zao.',
    descriptionEn: 'View employee roster and assigned roles.'
  },
  {
    key: 'create_user',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kusajili Mfanyakazi Mpya',
    labelEn: 'Create Employee',
    descriptionSw: 'Kutengeneza akaunti ya mfanyakazi na nenosiri la muda.',
    descriptionEn: 'Register new employee with temporary login credentials.'
  },
  {
    key: 'edit_user',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kuhariri Mfanyakazi',
    labelEn: 'Edit Employee',
    descriptionSw: 'Kubadilisha taarifa au cheo cha mfanyakazi.',
    descriptionEn: 'Update employee information or assigned job title.'
  },
  {
    key: 'deactivate_user',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kuzima / Kusitisha Akaunti',
    labelEn: 'Deactivate Account',
    descriptionSw: 'Kuzuia mfanyakazi asiweze kuingia tena kwenye mfumo.',
    descriptionEn: 'Disable login access for suspended or former employees.'
  },
  {
    key: 'reset_user_password',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kuweka Upya Password ya Mfanyakazi',
    labelEn: 'Reset Employee Password',
    descriptionSw: 'Kutoa nenosiri jipya la muda bila kuona la zamani.',
    descriptionEn: 'Generate new temporary password requiring change on first login.'
  },
  {
    key: 'manage_roles',
    category: 'Wafanyakazi (Employees)',
    labelSw: 'Kupanga Ruhusa (Permissions Matrix)',
    labelEn: 'Manage Roles & Permissions',
    descriptionSw: 'Kugawa au kuondoa ruhusa kwa kila cheo au mtu binafsi.',
    descriptionEn: 'Assign and customize granular permissions for each role.'
  },

  // Security
  {
    key: 'view_audit_logs',
    category: 'Usalama (Security)',
    labelSw: 'Kuangalia Kumbukumbu za Matukio (Audit Logs)',
    labelEn: 'View Security Audit Logs',
    descriptionSw: 'Kufuatilia nani kaingia, kafanya refund, au kurekebisha stock.',
    descriptionEn: 'Inspect comprehensive audit trail of all staff activities.'
  },
  {
    key: 'manage_sessions',
    category: 'Usalama (Security)',
    labelSw: 'Kusimamia Vifaa na Sessions za Kuingia',
    labelEn: 'Manage Active Sessions & Devices',
    descriptionSw: 'Kuona vifaa vinavyotumika na kutoa (remote logout) session.',
    descriptionEn: 'View connected terminals and force remote session termination.'
  },
  {
    key: 'security_settings',
    category: 'Usalama (Security)',
    labelSw: 'Mipangilio ya Usalama (Lockout, PIN, Timeout)',
    labelEn: 'Security Policies & Inactivity Lock',
    descriptionSw: 'Kuweka muda wa auto-lock na sera ya password.',
    descriptionEn: 'Configure auto-lock duration, lockout attempts, and policies.'
  },

  // Camera
  {
    key: 'view_camera',
    category: 'Kamera (Camera)',
    labelSw: 'Kuangalia CCTV Live Streams',
    labelEn: 'View Live CCTV Feeds',
    descriptionSw: 'Kutazama picha za moja kwa moja za kamera za ulinzi.',
    descriptionEn: 'Watch real-time live feeds from registered security cameras.'
  },
  {
    key: 'view_recordings',
    category: 'Kamera (Camera)',
    labelSw: 'Kuona Matukio Yaliyonaswa (Snapshot Events)',
    labelEn: 'View Surveillance Events & Snapshots',
    descriptionSw: 'Kuona picha na video zilizofungamana na risiti za mauzo au droo.',
    descriptionEn: 'Audit snapshot events linked to cash drawer and refund transactions.'
  },
  {
    key: 'manage_cameras',
    category: 'Kamera (Camera)',
    labelSw: 'Kusajili na Kusanidi Kamera za IP/RTSP',
    labelEn: 'Configure IP/RTSP Cameras',
    descriptionSw: 'Kuweka IP, Port, Stream URL na jina la kamera.',
    descriptionEn: 'Add and edit IP camera addresses, ports, and stream URLs.'
  },

  // Settings
  {
    key: 'business_settings',
    category: 'Mipangilio (Settings)',
    labelSw: 'Mipangilio ya Taarifa za Biashara',
    labelEn: 'Business Profile Settings',
    descriptionSw: 'Kubadilisha Jina, TIN, VRN, Anuani na Nembo ya Biashara.',
    descriptionEn: 'Edit business name, TIN, address, and receipt logo.'
  },
  {
    key: 'pos_settings',
    category: 'Mipangilio (Settings)',
    labelSw: 'Mipangilio ya POS & Risiti',
    labelEn: 'POS & Receipt Configuration',
    descriptionSw: 'Kuweka ujumbe wa chini ya risiti, VAT, na njia za malipo.',
    descriptionEn: 'Configure receipt footer, tax rates, and accepted payment methods.'
  },
  {
    key: 'inventory_settings',
    category: 'Mipangilio (Settings)',
    labelSw: 'Mipangilio ya Stoo & Bar',
    labelEn: 'Inventory & Bar Setup',
    descriptionSw: 'Kuweka vipimo vya chupa (ml), shots, spillage, na tahadhari ya stock.',
    descriptionEn: 'Configure bottle sizes, shot portions, and stock alert levels.'
  },
  {
    key: 'appearance_settings',
    category: 'Mipangilio (Settings)',
    labelSw: 'Mwonekano, Rangi & Mandhari (Appearance)',
    labelEn: 'Appearance, Theme & Color Palette',
    descriptionSw: 'Kubadili mandhari ya Light/Dark, rangi kuu, na ukubwa wa maandishi.',
    descriptionEn: 'Customize Light/Dark mode, primary brand colors, and font scaling.'
  },
  {
    key: 'language_settings',
    category: 'Mipangilio (Settings)',
    labelSw: 'Lugha ya Mfumo (Language)',
    labelEn: 'System Language',
    descriptionSw: 'Kubadili lugha kati ya Kiswahili na Kiingereza.',
    descriptionEn: 'Switch system language between Swahili and English.'
  },
  {
    key: 'backup_restore',
    category: 'Mipangilio (Settings)',
    labelSw: 'Kuhifadhi Nakala & Kurejesha Data (Backup/Restore)',
    labelEn: 'Backup & Database Restore',
    descriptionSw: 'Kupakua backup ya JSON na kurejesha mfumo.',
    descriptionEn: 'Export complete JSON database backup and restore records.'
  }
];

// Default Granular Permission Matrix by Role
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, GranularPermissions> = {
  owner: {
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
    backup_restore: true
  },

  manager: {
    view_sales: true,
    create_sale: true,
    cancel_sale: false,
    refund_sale: true,
    apply_discount: true,
    change_price: true,
    view_products: true,
    create_product: true,
    edit_product: true,
    deactivate_product: false,
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
    create_user: false,
    edit_user: false,
    deactivate_user: false,
    reset_user_password: false,
    manage_roles: false,
    view_audit_logs: true,
    manage_sessions: false,
    security_settings: false,
    view_camera: true,
    view_recordings: true,
    manage_cameras: false,
    business_settings: false,
    pos_settings: false,
    inventory_settings: true,
    appearance_settings: true,
    language_settings: true,
    backup_restore: false
  },

  cashier: {
    view_sales: true,
    create_sale: true,
    cancel_sale: false,
    refund_sale: false,
    apply_discount: false,
    change_price: false,
    view_products: true,
    create_product: false,
    edit_product: false,
    deactivate_product: false,
    change_selling_price: false,
    view_cost_price: false,
    view_stock: true,
    receive_stock: false,
    adjust_stock: false,
    approve_adjustment: false,
    transfer_stock: false,
    view_customers: true,
    create_customer: true,
    edit_customer: false,
    view_customer_debt: true,
    record_customer_payment: true,
    view_suppliers: false,
    create_supplier: false,
    purchase_stock: false,
    record_supplier_payment: false,
    view_sales_report: false,
    view_profit: false,
    view_expenses: false,
    export_reports: false,
    view_users: false,
    create_user: false,
    edit_user: false,
    deactivate_user: false,
    reset_user_password: false,
    manage_roles: false,
    view_audit_logs: false,
    manage_sessions: false,
    security_settings: false,
    view_camera: false,
    view_recordings: false,
    manage_cameras: false,
    business_settings: false,
    pos_settings: false,
    inventory_settings: false,
    appearance_settings: true,
    language_settings: true,
    backup_restore: false
  },

  storekeeper: {
    view_sales: false,
    create_sale: false,
    cancel_sale: false,
    refund_sale: false,
    apply_discount: false,
    change_price: false,
    view_products: true,
    create_product: true,
    edit_product: true,
    deactivate_product: false,
    change_selling_price: false,
    view_cost_price: false,
    view_stock: true,
    receive_stock: true,
    adjust_stock: true,
    approve_adjustment: false,
    transfer_stock: true,
    view_customers: false,
    create_customer: false,
    edit_customer: false,
    view_customer_debt: false,
    record_customer_payment: false,
    view_suppliers: true,
    create_supplier: true,
    purchase_stock: true,
    record_supplier_payment: false,
    view_sales_report: false,
    view_profit: false,
    view_expenses: false,
    export_reports: false,
    view_users: false,
    create_user: false,
    edit_user: false,
    deactivate_user: false,
    reset_user_password: false,
    manage_roles: false,
    view_audit_logs: false,
    manage_sessions: false,
    security_settings: false,
    view_camera: false,
    view_recordings: false,
    manage_cameras: false,
    business_settings: false,
    pos_settings: false,
    inventory_settings: true,
    appearance_settings: true,
    language_settings: true,
    backup_restore: false
  },

  waiter: {
    view_sales: true,
    create_sale: true,
    cancel_sale: false,
    refund_sale: false,
    apply_discount: false,
    change_price: false,
    view_products: true,
    create_product: false,
    edit_product: false,
    deactivate_product: false,
    change_selling_price: false,
    view_cost_price: false,
    view_stock: false,
    receive_stock: false,
    adjust_stock: false,
    approve_adjustment: false,
    transfer_stock: false,
    view_customers: true,
    create_customer: false,
    edit_customer: false,
    view_customer_debt: false,
    record_customer_payment: false,
    view_suppliers: false,
    create_supplier: false,
    purchase_stock: false,
    record_supplier_payment: false,
    view_sales_report: false,
    view_profit: false,
    view_expenses: false,
    export_reports: false,
    view_users: false,
    create_user: false,
    edit_user: false,
    deactivate_user: false,
    reset_user_password: false,
    manage_roles: false,
    view_audit_logs: false,
    manage_sessions: false,
    security_settings: false,
    view_camera: false,
    view_recordings: false,
    manage_cameras: false,
    business_settings: false,
    pos_settings: false,
    inventory_settings: false,
    appearance_settings: true,
    language_settings: true,
    backup_restore: false
  },

  accountant: {
    view_sales: true,
    create_sale: false,
    cancel_sale: false,
    refund_sale: false,
    apply_discount: false,
    change_price: false,
    view_products: true,
    create_product: false,
    edit_product: false,
    deactivate_product: false,
    change_selling_price: false,
    view_cost_price: true,
    view_stock: true,
    receive_stock: false,
    adjust_stock: false,
    approve_adjustment: false,
    transfer_stock: false,
    view_customers: true,
    create_customer: true,
    edit_customer: true,
    view_customer_debt: true,
    record_customer_payment: true,
    view_suppliers: true,
    create_supplier: true,
    purchase_stock: false,
    record_supplier_payment: true,
    view_sales_report: true,
    view_profit: true,
    view_expenses: true,
    export_reports: true,
    view_users: false,
    create_user: false,
    edit_user: false,
    deactivate_user: false,
    reset_user_password: false,
    manage_roles: false,
    view_audit_logs: true,
    manage_sessions: false,
    security_settings: false,
    view_camera: false,
    view_recordings: false,
    manage_cameras: false,
    business_settings: false,
    pos_settings: false,
    inventory_settings: false,
    appearance_settings: true,
    language_settings: true,
    backup_restore: false
  },

  admin: {
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
    backup_restore: true
  }
};

/**
 * Checks whether a given user possesses the specified granular or legacy permission key.
 * If user has specific granular override, that is used; otherwise defaults to role template.
 */
export function hasPermission(user: User | null | undefined, permissionKey: AnyPermissionKey): boolean {
  if (!user) return false;
  if (!user.active) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;

  // Map legacy keys
  const legacyMap: Record<string, PermissionKey> = {
    canMakeSales: 'create_sale',
    canViewDashboard: 'view_sales_report',
    canViewStock: 'view_stock',
    canManageStock: 'adjust_stock',
    canAccessBarMode: 'create_sale',
    canViewDebts: 'view_customer_debt',
    canManageCustomers: 'create_customer',
    canViewSuppliers: 'view_suppliers',
    canManageSuppliers: 'create_supplier',
    canViewExpenses: 'view_expenses',
    canManageExpenses: 'view_expenses',
    canViewReports: 'view_sales_report',
    canManageUsers: 'manage_roles',
    canViewAuditLogs: 'view_audit_logs',
    canViewCCTV: 'view_camera',
    canManageSettings: 'business_settings',
    canBackupRestore: 'backup_restore',
    canRefundSale: 'refund_sale',
    canGiveDiscount: 'apply_discount',
    canDeleteSales: 'cancel_sale',
    canViewProfit: 'view_profit',
  };

  const actualKey = (legacyMap[permissionKey as string] || permissionKey) as PermissionKey;

  // Check custom individual override if set
  if (user.granularPermissions && user.granularPermissions[actualKey] !== undefined) {
    return !!user.granularPermissions[actualKey];
  }

  // Fallback to role defaults
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role];
  if (roleDefaults && roleDefaults[actualKey] !== undefined) {
    return roleDefaults[actualKey];
  }

  // Fallback to user.permissions legacy object if present
  if (user.permissions && typeof user.permissions === 'object') {
    const legacyPerms = user.permissions as unknown as Record<string, boolean>;
    if (legacyPerms[permissionKey] !== undefined) {
      return legacyPerms[permissionKey];
    }
  }

  return false;
}
