var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_sql = __toESM(require("sql.js"), 1);

// src/data/initialData.ts
var INITIAL_BUSINESS_PROFILE = {
  name: "ELLY SMART BAR \u2014 DAR ES SALAAM",
  ownerName: "Selemani Rashid",
  tagline: "Mfumo Mahiri wa Biashara, POS na Usimamizi wa Stoo",
  tin: "134-589-201",
  vrn: "40-002341-K",
  licenseNumber: "BL-DAR-2026-9811",
  address: "Mlimani City, Sam Nujoma Road",
  mkoa: "Dar es Salaam",
  wilaya: "Ubungo",
  phone: "0676674705",
  email: "info@ebsbiz.co.tz",
  currency: "TZS",
  timezone: "Africa/Dar_es_Salaam",
  mode: "bar",
  primaryBusinessType: "Bar / Pub",
  secondaryBusinessTypes: ["Grocery / Duka", "Restaurant"],
  logoUrl: "",
  taxRate: 0,
  enableVat: false,
  enableBarFeatures: true,
  enableRestaurantFeatures: true,
  enableCameraIntegration: true,
  receiptFooterText: "Asante kwa kufanya biashara nasi! Karibu tena.",
  receiptFooter: "Asante kwa kufanya biashara nasi! Karibu tena.",
  vatEnabled: false,
  vatRate: 0,
  requirePinForDiscount: false,
  requirePinForRefund: true,
  lowStockThresholdDefault: 5,
  setupCompleted: true,
  activatedModules: {
    pos: true,
    inventory: true,
    barMode: true,
    restaurantMode: true,
    customers: true,
    suppliers: true,
    expenses: true,
    reports: true,
    employees: true,
    cctv: true,
    calendar: true,
    aiAssistant: true
  }
};
var INITIAL_BUSINESS_ENTITY = {
  id: "EBS-BIZ-000001",
  name: "ELLY SMART BAR",
  ownerName: "Selemani Rashid",
  ownerId: "usr-1",
  phone: "0676674705",
  email: "info@ellysmartbar.co.tz",
  address: "Mlimani City, Sam Nujoma Road",
  mkoa: "Dar es Salaam",
  wilaya: "Ubungo",
  businessType: "Bar / Pub",
  currency: "TZS",
  timezone: "Africa/Dar_es_Salaam",
  createdDate: "2026-01-01T00:00:00Z",
  status: "active",
  branches: [
    {
      id: "br-main",
      businessId: "EBS-BIZ-000001",
      name: "Tawi Kuu - Mlimani City",
      code: "HQ-MLIMANI",
      phone: "0676674705",
      address: "Sam Nujoma Road, Ubungo, Dar es Salaam",
      isMain: true,
      status: "active"
    }
  ],
  profile: INITIAL_BUSINESS_PROFILE
};
var INITIAL_DEVICES = [
  {
    id: "DEV-OWNER-01",
    businessId: "EBS-BIZ-000001",
    name: "Owner Phone (Samsung S24 Ultra)",
    platform: "android",
    appVersion: "v1.3.0",
    databaseVersion: "v1.3.0",
    assignedUserId: "usr-1",
    assignedUserName: "Selemani Rashid (Owner)",
    assignedRole: "owner",
    status: "online",
    isOnline: true,
    registeredAt: "2026-01-01T08:00:00Z",
    lastActive: "2026-08-22T08:00:00Z",
    lastSync: "2026-08-22T08:00:00Z",
    ipAddress: "192.168.1.101",
    isRevoked: false
  },
  {
    id: "DEV-MGR-02",
    businessId: "EBS-BIZ-000001",
    name: "Manager Tablet (Samsung Tab S9)",
    platform: "android",
    appVersion: "v1.3.0",
    databaseVersion: "v1.3.0",
    assignedUserId: "usr-2",
    assignedUserName: "Emmanuel Temu (Manager)",
    assignedRole: "manager",
    status: "online",
    isOnline: true,
    registeredAt: "2026-01-05T09:30:00Z",
    lastActive: "2026-08-22T07:45:00Z",
    lastSync: "2026-08-22T07:45:00Z",
    ipAddress: "192.168.1.102",
    isRevoked: false
  },
  {
    id: "DEV-POS-03",
    businessId: "EBS-BIZ-000001",
    name: "Cashier Kaunta POS (Windows 11)",
    platform: "windows",
    appVersion: "v1.3.0",
    databaseVersion: "v1.3.0",
    assignedUserId: "usr-3",
    assignedUserName: "Neema Lyimo (Cashier)",
    assignedRole: "cashier",
    status: "online",
    isOnline: true,
    registeredAt: "2026-02-10T10:00:00Z",
    lastActive: "2026-08-22T08:05:00Z",
    lastSync: "2026-08-22T08:05:00Z",
    ipAddress: "192.168.1.103",
    isRevoked: false
  },
  {
    id: "DEV-STORE-04",
    businessId: "EBS-BIZ-000001",
    name: "Storekeeper Phone (Xiaomi Redmi)",
    platform: "android",
    appVersion: "v1.3.0",
    databaseVersion: "v1.3.0",
    assignedUserId: "usr-5",
    assignedUserName: "Fatuma Bakari (Storekeeper)",
    assignedRole: "storekeeper",
    status: "online",
    isOnline: true,
    registeredAt: "2026-02-15T08:15:00Z",
    lastActive: "2026-08-22T06:30:00Z",
    lastSync: "2026-08-22T06:30:00Z",
    ipAddress: "192.168.1.105",
    isRevoked: false
  },
  {
    id: "DEV-WAITER-05",
    businessId: "EBS-BIZ-000001",
    name: "Waiter Phone (Infinix Hot 40)",
    platform: "android",
    appVersion: "v1.3.0",
    databaseVersion: "v1.3.0",
    assignedUserId: "usr-4",
    assignedUserName: "Kelvin Massawe (Waiter)",
    assignedRole: "waiter",
    status: "online",
    isOnline: true,
    registeredAt: "2026-03-01T14:00:00Z",
    lastActive: "2026-08-22T07:10:00Z",
    lastSync: "2026-08-22T07:10:00Z",
    ipAddress: "192.168.1.104",
    isRevoked: false
  }
];
var OWNER_PERMS = {
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
  canAccessBarMode: true
};
var MANAGER_PERMS = {
  canViewReports: true,
  canViewProfit: true,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: true,
  canViewAuditLogs: true,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: true,
  canAdjustStock: true,
  canManageProducts: true,
  canMakeSales: true,
  canDeleteSales: false,
  canGiveDiscount: true,
  canRefundSale: true,
  canManageCustomers: true,
  canManageSuppliers: true,
  canManageExpenses: true,
  canManageTables: true,
  canAccessBarMode: true
};
var CASHIER_PERMS = {
  canViewReports: false,
  canViewProfit: false,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: false,
  canViewAuditLogs: false,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: false,
  canAdjustStock: false,
  canManageProducts: false,
  canMakeSales: true,
  canDeleteSales: false,
  canGiveDiscount: false,
  canRefundSale: false,
  canManageCustomers: true,
  canManageSuppliers: false,
  canManageExpenses: false,
  canManageTables: false,
  canAccessBarMode: false
};
var WAITER_PERMS = {
  canViewReports: false,
  canViewProfit: false,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: false,
  canViewAuditLogs: false,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: false,
  canAdjustStock: false,
  canManageProducts: false,
  canMakeSales: true,
  canDeleteSales: false,
  canGiveDiscount: false,
  canRefundSale: false,
  canManageCustomers: false,
  canManageSuppliers: false,
  canManageExpenses: false,
  canManageTables: true,
  canAccessBarMode: true
};
var STOREKEEPER_PERMS = {
  canViewReports: false,
  canViewProfit: false,
  canManageUsers: false,
  canManagePermissions: false,
  canManageCCTV: false,
  canViewAuditLogs: false,
  canManageSettings: false,
  canBackupRestore: false,
  canManageStock: true,
  canAdjustStock: true,
  canManageProducts: true,
  canMakeSales: false,
  canDeleteSales: false,
  canGiveDiscount: false,
  canRefundSale: false,
  canManageCustomers: false,
  canManageSuppliers: true,
  canManageExpenses: false,
  canManageTables: false,
  canAccessBarMode: true
};
var INITIAL_USERS = [
  {
    id: "usr-1",
    businessId: "EBS-BIZ-000001",
    branchId: "br-main",
    name: "Selemani Rashid (Owner)",
    username: "owner01",
    role: "owner",
    phone: "+255 754 111 222",
    email: "owner@ebsbiz.co.tz",
    passwordHash: "e1b642412970a6c896342c5e199144d5f53c093f8fcbffe304b2d4432db3c1af",
    // Owner1234!
    pin: "1234",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastLogin: "2026-08-22T07:15:00Z",
    mustChangePassword: true,
    permissions: OWNER_PERMS,
    canDiscount: true,
    canRefund: true,
    canAdjustStock: true,
    canViewProfit: true,
    canManageUsers: true
  },
  {
    id: "usr-2",
    businessId: "EBS-BIZ-000001",
    branchId: "br-main",
    name: "Emmanuel Temu (Manager)",
    username: "manager01",
    role: "manager",
    phone: "0676674705",
    email: "manager@ebsbiz.co.tz",
    passwordHash: "c825fd6bdfeca06822534a20cdfde1ae04e788dae9c864fa3d91ab7ee23c82d3",
    // Manager1234!
    pin: "2233",
    active: true,
    createdAt: "2026-01-05T00:00:00Z",
    lastLogin: "2026-08-22T06:30:00Z",
    permissions: MANAGER_PERMS,
    canDiscount: true,
    canRefund: true,
    canAdjustStock: true,
    canViewProfit: true,
    canManageUsers: false
  },
  {
    id: "usr-3",
    businessId: "EBS-BIZ-000001",
    branchId: "br-main",
    name: "Neema Lyimo (Cashier)",
    username: "cashier01",
    role: "cashier",
    phone: "+255 786 333 444",
    passwordHash: "25720f4a337adbcbdd0fdf6ddc6035772e073b6c28534485567e5f4c726d1afb",
    // Cashier1234!
    pin: "3344",
    active: true,
    createdAt: "2026-02-10T00:00:00Z",
    lastLogin: "2026-08-22T07:00:00Z",
    permissions: CASHIER_PERMS,
    canDiscount: false,
    canRefund: false,
    canAdjustStock: false,
    canViewProfit: false,
    canManageUsers: false
  },
  {
    id: "usr-4",
    businessId: "EBS-BIZ-000001",
    branchId: "br-main",
    name: "Kelvin Massawe (Waiter)",
    username: "waiter01",
    role: "waiter",
    phone: "+255 765 444 555",
    passwordHash: "e65576ab71ba9ef79c1467be55bb91e7bc6ed9c6994ac4b95883473bd1a91cdf",
    // Waiter1234!
    pin: "4455",
    active: true,
    createdAt: "2026-03-01T00:00:00Z",
    lastLogin: "2026-08-21T18:00:00Z",
    permissions: WAITER_PERMS,
    canDiscount: false,
    canRefund: false,
    canAdjustStock: false,
    canViewProfit: false,
    canManageUsers: false
  },
  {
    id: "usr-5",
    businessId: "EBS-BIZ-000001",
    branchId: "br-main",
    name: "Fatuma Bakari (Storekeeper)",
    username: "store01",
    role: "storekeeper",
    phone: "+255 744 555 666",
    passwordHash: "9ed66be0a981a8f2eb3de93e390c61ef337deb78a81c4a28f11f6da3c00f5205",
    // Store1234!
    pin: "5566",
    active: true,
    createdAt: "2026-02-15T00:00:00Z",
    lastLogin: "2026-08-22T05:45:00Z",
    permissions: STOREKEEPER_PERMS,
    canDiscount: false,
    canRefund: false,
    canAdjustStock: true,
    canViewProfit: false,
    canManageUsers: false
  }
];
var INITIAL_PRODUCTS = [
  // --- BAR & BEVERAGES (Bottles & Servings) ---
  {
    id: "prod-1",
    name: "Kilimanjaro Lager 500ml",
    barcode: "61611000101",
    sku: "BEER-KILI-500",
    category: "Bia & Cider",
    buyingPrice: 2600,
    sellingPrice: 3500,
    stockQty: 48,
    minStock: 12,
    unit: "Chupa",
    supplierId: "sup-1",
    supplierName: "TBL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: true,
    bottleSizeMl: 500
  },
  {
    id: "prod-2",
    name: "Serengeti Premium Lite 500ml",
    barcode: "61611000102",
    sku: "BEER-SBL-500",
    category: "Bia & Cider",
    buyingPrice: 2600,
    sellingPrice: 3500,
    stockQty: 36,
    minStock: 10,
    unit: "Chupa",
    supplierId: "sup-2",
    supplierName: "Serengeti Breweries Ltd",
    active: true,
    productType: "standard",
    isBarItem: true,
    bottleSizeMl: 500
  },
  {
    id: "prod-3",
    name: "Heineken Lager 330ml",
    barcode: "61611000103",
    sku: "BEER-HEIN-330",
    category: "Bia & Cider",
    buyingPrice: 3500,
    sellingPrice: 5e3,
    stockQty: 20,
    minStock: 8,
    unit: "Chupa",
    supplierId: "sup-1",
    supplierName: "TBL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: true,
    bottleSizeMl: 330
  },
  {
    id: "prod-4",
    name: "Johnnie Walker Black Label 750ml",
    barcode: "5000267014203",
    sku: "SPIRIT-JW-BLK-750",
    category: "Spirits & Whisky",
    buyingPrice: 65e3,
    sellingPrice: 85e3,
    stockQty: 8,
    minStock: 2,
    unit: "Chupa",
    supplierId: "sup-2",
    supplierName: "Serengeti Breweries Ltd",
    active: true,
    productType: "bar_bottle",
    isBarItem: true,
    bottleSizeMl: 750,
    servingSizeMl: 30,
    servingsPerBottle: 25,
    sellingPricePerServing: 4500,
    openBottleRemainingMl: 450,
    openBottlesCount: 1
  },
  {
    id: "prod-5",
    name: "Hennessy VS Cognac 700ml",
    barcode: "3245990250008",
    sku: "SPIRIT-HENN-700",
    category: "Spirits & Whisky",
    buyingPrice: 11e4,
    sellingPrice: 145e3,
    stockQty: 4,
    minStock: 2,
    unit: "Chupa",
    supplierId: "sup-2",
    supplierName: "Serengeti Breweries Ltd",
    active: true,
    productType: "bar_bottle",
    isBarItem: true,
    bottleSizeMl: 700,
    servingSizeMl: 30,
    servingsPerBottle: 23,
    sellingPricePerServing: 8e3,
    openBottleRemainingMl: 210,
    openBottlesCount: 1
  },
  {
    id: "prod-6",
    name: "Konyagi Original Spirit 500ml",
    barcode: "61611000201",
    sku: "SPIRIT-KONY-500",
    category: "Spirits & Gin",
    buyingPrice: 12e3,
    sellingPrice: 16e3,
    stockQty: 15,
    minStock: 5,
    unit: "Chupa",
    supplierId: "sup-1",
    supplierName: "TBL Tanzania",
    active: true,
    productType: "bar_bottle",
    isBarItem: true,
    bottleSizeMl: 500,
    servingSizeMl: 30,
    servingsPerBottle: 16,
    sellingPricePerServing: 1500,
    openBottleRemainingMl: 300,
    openBottlesCount: 1
  },
  {
    id: "prod-7",
    name: "Coca Cola 350ml (Kioo)",
    barcode: "61611000301",
    sku: "SODA-COKE-350",
    category: "Soda & Juisi",
    buyingPrice: 750,
    sellingPrice: 1e3,
    stockQty: 72,
    minStock: 24,
    unit: "Chupa",
    supplierId: "sup-3",
    supplierName: "Bakhresa / Azam Group",
    active: true,
    productType: "standard",
    isBarItem: true,
    bottleSizeMl: 350
  },
  {
    id: "prod-8",
    name: "Maji ya Uhai 500ml",
    barcode: "61611000401",
    sku: "WATER-UHAI-500",
    category: "Maji & Vinywaji",
    buyingPrice: 400,
    sellingPrice: 600,
    stockQty: 120,
    minStock: 30,
    unit: "Chupa",
    supplierId: "sup-3",
    supplierName: "Bakhresa / Azam Group",
    active: true,
    productType: "standard",
    isBarItem: true,
    bottleSizeMl: 500
  },
  {
    id: "prod-9",
    name: "Red Bull Energy Drink 250ml",
    barcode: "9002490100070",
    sku: "ENERGY-RB-250",
    category: "Energy Drinks",
    buyingPrice: 3200,
    sellingPrice: 4500,
    stockQty: 30,
    minStock: 10,
    unit: "Kopo",
    supplierId: "sup-1",
    supplierName: "TBL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: true
  },
  {
    id: "prod-10",
    name: "Unga wa Ngano Azam 2kg",
    barcode: "61611000501",
    sku: "GROC-AZAM-2KG",
    category: "Vyakula & Grocery",
    buyingPrice: 3800,
    sellingPrice: 4500,
    stockQty: 25,
    minStock: 5,
    unit: "Pakiti",
    supplierId: "sup-3",
    supplierName: "Bakhresa / Azam Group",
    active: true,
    productType: "standard",
    isBarItem: false
  },
  {
    id: "prod-11",
    name: "Mchele Safi wa Mbeya (1kg)",
    barcode: "61611000502",
    sku: "GROC-RICE-MBY-1KG",
    category: "Vyakula & Grocery",
    buyingPrice: 2800,
    sellingPrice: 3500,
    stockQty: 80,
    minStock: 20,
    unit: "Kg",
    supplierId: "sup-4",
    supplierName: "METL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: false
  },
  {
    id: "prod-12",
    name: "Sukari ya Kilombero 1kg",
    barcode: "61611000503",
    sku: "GROC-SUGAR-1KG",
    category: "Vyakula & Grocery",
    buyingPrice: 3e3,
    sellingPrice: 3600,
    stockQty: 4,
    minStock: 10,
    unit: "Kg",
    supplierId: "sup-4",
    supplierName: "METL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: false
  },
  {
    id: "prod-13",
    name: "Mafuta ya Kupikia Safi 1L",
    barcode: "61611000504",
    sku: "GROC-OIL-SAFI-1L",
    category: "Vyakula & Grocery",
    buyingPrice: 5200,
    sellingPrice: 6200,
    stockQty: 30,
    minStock: 8,
    unit: "Lita",
    supplierId: "sup-4",
    supplierName: "METL Tanzania",
    active: true,
    productType: "standard",
    isBarItem: false
  },
  {
    id: "prod-14",
    name: "Mshikaki wa Ng'ombe / Mbuzi (Platter)",
    barcode: "61611000601",
    sku: "FOOD-BBQ-BEEF",
    category: "Chakula & BBQ",
    buyingPrice: 6e3,
    sellingPrice: 1e4,
    stockQty: 40,
    minStock: 10,
    unit: "Sahani",
    active: true,
    productType: "standard",
    isBarItem: true
  },
  {
    id: "prod-15",
    name: "Chips Mayai / Zege Maalum",
    barcode: "61611000602",
    sku: "FOOD-CHIPS-ZEGE",
    category: "Chakula & BBQ",
    buyingPrice: 2500,
    sellingPrice: 4e3,
    stockQty: 50,
    minStock: 15,
    unit: "Sahani",
    active: true,
    productType: "standard",
    isBarItem: true
  }
];
var INITIAL_CUSTOMERS = [
  {
    id: "cust-1",
    name: "Juma Ally Mwenda",
    phone: "0754 123 456",
    address: "Sinza Mori, Dar es Salaam",
    mkoa: "Dar es Salaam",
    wilaya: "Ubungo",
    customerType: "regular",
    category: "regular",
    creditLimit: 15e4,
    currentDebt: 45e3,
    totalSpent: 42e4,
    transactionCount: 14,
    lastPurchaseDate: "2026-08-21T19:40:00Z",
    createdAt: "2026-06-10T10:00:00Z",
    notes: "Mteja mwaminifu wa jioni, hulipa kila mwisho wa wiki."
  },
  {
    id: "cust-2",
    name: "Mzee Bakari Mwinyi",
    phone: "0786 555 888",
    address: "Kijitonyama, Dar es Salaam",
    mkoa: "Dar es Salaam",
    wilaya: "Kinondoni",
    customerType: "vip",
    category: "vip",
    creditLimit: 1e5,
    currentDebt: 12e4,
    totalSpent: 98e4,
    transactionCount: 22,
    lastPurchaseDate: "2026-08-20T21:10:00Z",
    createdAt: "2026-05-15T14:30:00Z",
    notes: "Deni limevuka ukomo wa TZS 100,000. Inahitaji kumbukumbu kabla ya kutoa kinywaji kipya."
  },
  {
    id: "cust-3",
    name: "Grace Mwangi (Catering)",
    phone: "0713 987 654",
    address: "Mikocheni B, Dar es Salaam",
    mkoa: "Dar es Salaam",
    wilaya: "Kinondoni",
    customerType: "wholesale",
    category: "wholesale",
    creditLimit: 5e5,
    currentDebt: 0,
    totalSpent: 185e4,
    transactionCount: 8,
    lastPurchaseDate: "2026-08-19T11:00:00Z",
    createdAt: "2026-04-20T09:15:00Z",
    notes: "Hununua vinywaji na bidhaa za jumla kwa cash/lipa namba."
  },
  {
    id: "cust-4",
    name: "Salma Hassan",
    phone: "0767 333 222",
    address: "Mabibo External, Dar es Salaam",
    mkoa: "Dar es Salaam",
    wilaya: "Ubungo",
    customerType: "regular",
    category: "retail",
    creditLimit: 8e4,
    currentDebt: 15e3,
    totalSpent: 19e4,
    transactionCount: 5,
    lastPurchaseDate: "2026-08-18T16:20:00Z",
    createdAt: "2026-07-01T16:00:00Z",
    notes: "Alibakiza deni la soda na juice."
  }
];
var INITIAL_DEBTS = [
  {
    id: "debt-1",
    customerId: "cust-1",
    customerName: "Juma Ally Mwenda",
    customerPhone: "0754 123 456",
    saleId: "sale-1038",
    invoiceNo: "INV-1038",
    originalAmount: 65e3,
    paidAmount: 2e4,
    remainingAmount: 45e3,
    status: "partial",
    dueDate: "2026-08-25",
    createdAt: "2026-08-18T19:30:00Z",
    notes: "Bia 10 na nyama choma kwa ajili ya marafiki",
    payments: [
      {
        id: "dp-1",
        amount: 2e4,
        date: "2026-08-20T10:15:00Z",
        receivedBy: "Neema Lyimo (Keshia)",
        method: "mpesa",
        reference: "MP89201948",
        note: "Malipo ya awali kupitia Lipa Namba"
      }
    ]
  },
  {
    id: "debt-2",
    customerId: "cust-2",
    customerName: "Mzee Bakari Mwinyi",
    customerPhone: "0786 555 888",
    saleId: "sale-1025",
    invoiceNo: "INV-1025",
    originalAmount: 12e4,
    paidAmount: 0,
    remainingAmount: 12e4,
    status: "unpaid",
    dueDate: "2026-08-15",
    // Overdue!
    createdAt: "2026-08-08T22:15:00Z",
    notes: "Chupa ya Whisky na chakula cha wageni",
    payments: []
  },
  {
    id: "debt-3",
    customerId: "cust-4",
    customerName: "Salma Hassan",
    customerPhone: "0767 333 222",
    saleId: "sale-1044",
    invoiceNo: "INV-1044",
    originalAmount: 15e3,
    paidAmount: 0,
    remainingAmount: 15e3,
    status: "unpaid",
    dueDate: "2026-08-28",
    createdAt: "2026-08-21T16:00:00Z",
    notes: "Juisi na chakula cha watoto",
    payments: []
  }
];
var INITIAL_SUPPLIERS = [
  {
    id: "sup-1",
    name: "TBL Tanzania Plc",
    phone: "+255 22 219 7000",
    email: "orders@tbl.co.tz",
    address: "Uhuru Street, Ilala, Dar es Salaam",
    contactPerson: "Godfrey Mrema",
    tin: "100-234-567",
    amountOwed: 35e4,
    productsSupplied: ["Kilimanjaro Lager", "Safari Lager", "Castle Lite", "Konyagi"],
    notes: "Hulipwa kwa njia ya benki kila Jumatatu baada ya delivery.",
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "sup-2",
    name: "Serengeti Breweries Ltd (SBL / Diageo)",
    phone: "+255 22 286 0903",
    email: "customercare@sbl.co.tz",
    address: "Chang'ombe Industrial Area, Dar es Salaam",
    contactPerson: "David Kweka",
    tin: "100-345-678",
    amountOwed: 18e4,
    productsSupplied: ["Serengeti Lite", "Guinness", "Johnnie Walker", "Hennessy", "Smirnoff"],
    notes: "Hutoa punguzo la 3% kwa oda za zaidi ya kreti 50.",
    createdAt: "2026-01-12T08:00:00Z"
  },
  {
    id: "sup-3",
    name: "Bakhresa / Said Salim Bakhresa & Co",
    phone: "+255 22 286 1111",
    email: "info@bakhresa.com",
    address: "Bandari Road, Kurasini, Dar es Salaam",
    contactPerson: "Said Juma",
    tin: "100-456-789",
    amountOwed: 0,
    productsSupplied: ["Maji ya Uhai", "Azam Soda", "Unga wa Ngano", "Juisi za Azam"],
    notes: "Malipo ya papo kwa hapo kabla ya upakuaji mzigo.",
    createdAt: "2026-01-15T08:00:00Z"
  },
  {
    id: "sup-4",
    name: "METL Tanzania (Mohammed Enterprises)",
    phone: "+255 22 211 0555",
    email: "sales@metl.net",
    address: "Indira Gandhi Street, Dar es Salaam",
    contactPerson: "Rashid Ali",
    tin: "100-567-890",
    amountOwed: 42e4,
    productsSupplied: ["Mchele wa Mbeya", "Sukari", "Mafuta Safi", "Sabuni"],
    notes: "Delivery ya kila Alhamisi asubuhi.",
    createdAt: "2026-01-20T08:00:00Z"
  }
];
var INITIAL_EXPENSES = [
  {
    id: "exp-1",
    category: "LUKU / Umeme",
    amount: 15e4,
    description: "Umeme wa friji za vinywaji na taa za kaunta",
    date: "2026-08-20",
    recordedBy: "Emmanuel Temu (Meneja)",
    paymentMethod: "mpesa",
    receiptNumber: "LUKU-9820-221"
  },
  {
    id: "exp-2",
    category: "DAWASA / Maji",
    amount: 45e3,
    description: "Bili ya maji ya mwezi Agosti",
    date: "2026-08-18",
    recordedBy: "Emmanuel Temu (Meneja)",
    paymentMethod: "tigopesa",
    receiptNumber: "DAWASA-8819"
  },
  {
    id: "exp-3",
    category: "Mishahara & Posho",
    amount: 32e4,
    description: "Posho ya wiki ya wahudumu na wafanyakazi wa stoo",
    date: "2026-08-16",
    recordedBy: "Selemani Rashid (Owner)",
    paymentMethod: "cash",
    receiptNumber: "VOUCHER-081"
  },
  {
    id: "exp-4",
    category: "Vifaa vya Usafi & Maintenance",
    amount: 28e3,
    description: "Sabuni za kuoshea vyombo na glasi za bar + tishu",
    date: "2026-08-21",
    recordedBy: "Emmanuel Temu (Meneja)",
    paymentMethod: "cash",
    receiptNumber: "REC-CLEAN-04"
  }
];
var INITIAL_SALES = [
  {
    id: "sale-1048",
    invoiceNo: "INV-1048",
    items: [
      {
        productId: "prod-1",
        productName: "Kilimanjaro Lager 500ml",
        category: "Bia & Cider",
        quantity: 4,
        unitPrice: 3500,
        costPrice: 2600,
        discount: 0,
        total: 14e3,
        isServing: false
      },
      {
        productId: "prod-14",
        productName: "Mshikaki wa Ng'ombe / Mbuzi (Platter)",
        category: "Chakula & BBQ",
        quantity: 2,
        unitPrice: 1e4,
        costPrice: 6e3,
        discount: 0,
        total: 2e4,
        isServing: false
      }
    ],
    subtotal: 34e3,
    discount: 0,
    tax: 0,
    total: 34e3,
    profit: 11600,
    payments: [{ method: "cash", amount: 34e3 }],
    paymentMethod: "cash",
    customerId: "cust-1",
    customerName: "Juma Ally Mwenda",
    customerPhone: "0754 123 456",
    cashierId: "usr-3",
    cashierName: "Neema Lyimo",
    status: "completed",
    tableId: "tbl-2",
    tableName: "Meza 2 (Kaunta ya Bar)",
    waiterId: "usr-4",
    waiterName: "Kelvin Massawe",
    timestamp: "2026-08-22T06:45:00Z",
    cameraEventId: "cam-ev-1"
  },
  {
    id: "sale-1047",
    invoiceNo: "INV-1047",
    items: [
      {
        productId: "prod-4",
        productName: "Johnnie Walker Black Label (Shot 30ml)",
        category: "Spirits & Whisky",
        quantity: 3,
        unitPrice: 4500,
        costPrice: 2600,
        discount: 0,
        total: 13500,
        isServing: true,
        servingSizeMl: 30,
        servingsCount: 3
      },
      {
        productId: "prod-8",
        productName: "Maji ya Uhai 500ml",
        category: "Maji & Vinywaji",
        quantity: 1,
        unitPrice: 600,
        costPrice: 400,
        discount: 0,
        total: 600,
        isServing: false
      }
    ],
    subtotal: 14100,
    discount: 0,
    tax: 0,
    total: 14100,
    profit: 5900,
    payments: [{ method: "mpesa", amount: 14100, reference: "MP90291083" }],
    paymentMethod: "mpesa",
    cashierId: "usr-3",
    cashierName: "Neema Lyimo",
    status: "completed",
    timestamp: "2026-08-22T06:10:00Z",
    cameraEventId: "cam-ev-2"
  },
  {
    id: "sale-1046",
    invoiceNo: "INV-1046",
    items: [
      {
        productId: "prod-10",
        productName: "Unga wa Ngano Azam 2kg",
        category: "Vyakula & Grocery",
        quantity: 2,
        unitPrice: 4500,
        costPrice: 3800,
        discount: 0,
        total: 9e3,
        isServing: false
      },
      {
        productId: "prod-13",
        productName: "Mafuta ya Kupikia Safi 1L",
        category: "Vyakula & Grocery",
        quantity: 1,
        unitPrice: 6200,
        costPrice: 5200,
        discount: 0,
        total: 6200,
        isServing: false
      }
    ],
    subtotal: 15200,
    discount: 200,
    tax: 0,
    total: 15e3,
    profit: 2200,
    payments: [{ method: "cash", amount: 15e3 }],
    paymentMethod: "cash",
    cashierId: "usr-3",
    cashierName: "Neema Lyimo",
    status: "completed",
    timestamp: "2026-08-21T17:30:00Z",
    cameraEventId: "cam-ev-3"
  }
];
var INITIAL_TABLES = [
  { id: "tbl-1", name: "Meza 1 (Ndani VIP)", capacity: 4, status: "available" },
  { id: "tbl-2", name: "Meza 2 (Kaunta ya Bar)", capacity: 2, status: "occupied", activeWaiter: "Kelvin Massawe", totalBill: 25e3 },
  { id: "tbl-3", name: "Meza 3 (Veranda / Nje)", capacity: 6, status: "billing", activeWaiter: "Kelvin Massawe", totalBill: 39e3 },
  { id: "tbl-4", name: "Meza 4 (Garden Shaded)", capacity: 4, status: "available" },
  { id: "tbl-5", name: "Meza 5 (Kona ya Lounge)", capacity: 8, status: "reserved" }
];
var INITIAL_BAR_VARIANCE = [
  {
    id: "bv-1",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    productId: "prod-4",
    productName: "Johnnie Walker Black Label 750ml",
    bottleSizeMl: 750,
    openingBottles: 10,
    purchasesBottles: 0,
    totalServingsSold: 32,
    servingSizeMl: 30,
    expectedRemainingBottles: 8,
    expectedRemainingMl: 540,
    actualMeasuredBottles: 8,
    actualMeasuredMl: 450,
    varianceBottles: 0,
    varianceMl: -90,
    wastageMl: 30,
    spillageMl: 60,
    recordedBy: "Emmanuel Temu (Meneja)",
    status: "adjustment_required",
    note: "Tofauti ya ml 90 (makadirio ya shots 3). Spillage ya kawaida ya glasi wakati wa masaa ya msongamano."
  },
  {
    id: "bv-2",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    productId: "prod-6",
    productName: "Konyagi Original Spirit 500ml",
    bottleSizeMl: 500,
    openingBottles: 15,
    purchasesBottles: 0,
    totalServingsSold: 12,
    servingSizeMl: 30,
    expectedRemainingBottles: 14,
    expectedRemainingMl: 140,
    actualMeasuredBottles: 14,
    actualMeasuredMl: 140,
    varianceBottles: 0,
    varianceMl: 0,
    wastageMl: 0,
    spillageMl: 0,
    recordedBy: "Emmanuel Temu (Meneja)",
    status: "normal",
    note: "Hesabu ya vinywaji imelingana kikamilifu."
  }
];
var INITIAL_CAMERAS = [
  {
    id: "cam-1",
    name: "CAM 01 \u2014 Kaunta ya POS & Droo ya Pesa",
    location: "Kaunta Kuu",
    ipOrRtsp: "192.168.1.101",
    port: 554,
    protocol: "rtsp",
    streamUrl: "rtsp://192.168.1.101:554/live/ch1",
    status: "online",
    lastActivity: "Sasa Hivi (Inarekodi)",
    resolution: "1080p Full HD",
    fps: 30,
    sampleVideoType: "counter",
    allowedRoles: ["owner", "manager", "admin"],
    retentionDays: 30
  },
  {
    id: "cam-2",
    name: "CAM 02 \u2014 Eneo la Bar & Chupa za Vinywaji",
    location: "Rafu ya Vinywaji Vikali (Spirits)",
    ipOrRtsp: "192.168.1.102",
    port: 554,
    protocol: "rtsp",
    streamUrl: "rtsp://192.168.1.102:554/live/ch2",
    status: "online",
    lastActivity: "Sasa Hivi (Inarekodi)",
    resolution: "1080p Full HD",
    fps: 25,
    sampleVideoType: "bar",
    allowedRoles: ["owner", "manager", "admin"],
    retentionDays: 30
  },
  {
    id: "cam-3",
    name: "CAM 03 \u2014 Stoo ya Ndani & Upokeaji Mizigo",
    location: "Mlango wa Stoo Kuu",
    ipOrRtsp: "192.168.1.103",
    port: 554,
    protocol: "rtsp",
    streamUrl: "rtsp://192.168.1.103:554/live/ch3",
    status: "online",
    lastActivity: "Dakika 4 zilizopita",
    resolution: "2K QHD",
    fps: 20,
    sampleVideoType: "stock",
    allowedRoles: ["owner", "manager", "admin"],
    retentionDays: 30
  },
  {
    id: "cam-4",
    name: "CAM 04 \u2014 Lango Kuu la Kuingilia & Maegesho",
    location: "Lango Kuu",
    ipOrRtsp: "192.168.1.104",
    port: 554,
    protocol: "rtsp",
    streamUrl: "rtsp://192.168.1.104:554/live/ch4",
    status: "online",
    lastActivity: "Sasa Hivi (Inarekodi)",
    resolution: "1080p Full HD",
    fps: 30,
    sampleVideoType: "entrance",
    allowedRoles: ["owner", "manager", "admin"],
    retentionDays: 30
  }
];
var INITIAL_CAMERA_EVENTS = [
  {
    id: "cam-ev-1",
    cameraId: "cam-1",
    cameraName: "CAM 01 \u2014 Kaunta ya POS",
    timestamp: "2026-08-22T06:45:00Z",
    type: "sale",
    title: "Risiti INV-1048 Imetolewa",
    description: "Muuzaji Neema Lyimo amekata risiti ya TZS 34,000 Pesa Taslimu",
    relatedTransactionId: "sale-1048",
    invoiceNo: "INV-1048",
    operatorName: "Neema Lyimo",
    amount: 34e3,
    snapshotColor: "#059669"
  },
  {
    id: "cam-ev-2",
    cameraId: "cam-1",
    cameraName: "CAM 01 \u2014 Kaunta ya POS",
    timestamp: "2026-08-22T06:10:00Z",
    type: "sale",
    title: "Malipo ya M-Pesa TZS 14,100",
    description: "Oda ya shoti 3 za JW Black Label imelipwa",
    relatedTransactionId: "sale-1047",
    invoiceNo: "INV-1047",
    operatorName: "Neema Lyimo",
    amount: 14100,
    snapshotColor: "#dc2626"
  },
  {
    id: "cam-ev-3",
    cameraId: "cam-2",
    cameraName: "CAM 02 \u2014 Rafu ya Spirits",
    timestamp: "2026-08-21T21:15:00Z",
    type: "variance",
    title: "Kumwaga Shoti (Spillage 30ml)",
    description: "Chupa iliyoteleza kaunta wakati wa kumimina shoti",
    operatorName: "Emmanuel Temu",
    snapshotColor: "#d97706"
  },
  {
    id: "cam-ev-4",
    cameraId: "cam-3",
    cameraName: "CAM 03 \u2014 Mlango wa Stoo",
    timestamp: "2026-08-20T09:30:00Z",
    type: "door",
    title: "Upokeaji Mzigo Mpya wa Vinywaji",
    description: "Kreti 2 za TBL zimehifadhiwa stoo na Fatuma Bakari",
    operatorName: "Fatuma Bakari",
    snapshotColor: "#2563eb"
  }
];
var INITIAL_AUDIT_LOGS = [
  {
    id: "audit-1",
    userId: "usr-1",
    userName: "Selemani Rashid (Owner)",
    userRole: "owner",
    action: "LOGIN_SUCCESS",
    details: "Mwenye biashara ameingia kwenye mfumo kupitia Desktop",
    entityType: "auth",
    timestamp: "2026-08-22T07:15:00Z",
    deviceInfo: "Desktop (Chrome on Linux)"
  },
  {
    id: "audit-2",
    userId: "usr-3",
    userName: "Neema Lyimo",
    userRole: "cashier",
    action: "SALE_CREATED",
    details: "Mauzo ya INV-1048 yamekamilishwa kwa TZS 34,000",
    entityType: "sale",
    entityId: "sale-1048",
    timestamp: "2026-08-22T06:45:00Z",
    deviceInfo: "POS Terminal 01"
  },
  {
    id: "audit-3",
    userId: "usr-2",
    userName: "Emmanuel Temu",
    userRole: "manager",
    action: "BAR_VARIANCE_RECORDED",
    details: "Spillage ya ml 90 imerekodiwa kwa JW Black Label",
    entityType: "bar",
    entityId: "bv-1",
    timestamp: "2026-08-21T21:16:00Z",
    deviceInfo: "Mobile Phone (Android 14)"
  },
  {
    id: "audit-4",
    userId: "usr-1",
    userName: "Selemani Rashid (Owner)",
    userRole: "owner",
    action: "CAMERA_ACCESSED",
    details: "Mmiliki ameangalia CAM 01 (Kaunta ya POS)",
    entityType: "camera",
    entityId: "cam-1",
    timestamp: "2026-08-22T07:20:00Z",
    deviceInfo: "Desktop (Chrome on Linux)"
  }
];

// server/security.ts
var import_crypto = __toESM(require("crypto"), 1);
var PBKDF2_ITERATIONS = 1e5;
var PBKDF2_KEYLEN = 64;
var PBKDF2_DIGEST = "sha512";
var LEGACY_SALT = "ebs_tz_salt_2026";
function generateSalt(length = 16) {
  return import_crypto.default.randomBytes(length).toString("hex");
}
function hashPasswordPBKDF2(password, customSalt) {
  const salt = customSalt || generateSalt();
  const hash = import_crypto.default.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  return { hash, salt };
}
function legacySha256(password, salt = LEGACY_SALT) {
  return import_crypto.default.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}
function verifyUserPassword(providedPassword, storedHash, storedSalt) {
  if (!providedPassword || !storedHash) {
    return { isValid: false, needsRehash: false };
  }
  if (storedSalt) {
    try {
      const computedHash = import_crypto.default.pbkdf2Sync(
        providedPassword,
        storedSalt,
        PBKDF2_ITERATIONS,
        PBKDF2_KEYLEN,
        PBKDF2_DIGEST
      ).toString("hex");
      const bufA = Buffer.from(computedHash, "hex");
      const bufB = Buffer.from(storedHash, "hex");
      if (bufA.length === bufB.length && import_crypto.default.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: false };
      }
    } catch {
    }
  }
  const legHash1 = legacySha256(providedPassword, LEGACY_SALT);
  if (legHash1.toLowerCase() === storedHash.toLowerCase()) {
    return { isValid: true, needsRehash: true };
  }
  const demoPasswords = {
    "owner01": "Owner1234!",
    "manager01": "Manager1234!",
    "cashier01": "Cashier1234!",
    "waiter01": "Waiter1234!",
    "store01": "Store1234!"
  };
  for (const [_, expectedPass] of Object.entries(demoPasswords)) {
    if (providedPassword === expectedPass) {
      const h = legacySha256(expectedPass, LEGACY_SALT);
      if (h.toLowerCase() === storedHash.toLowerCase()) {
        return { isValid: true, needsRehash: true };
      }
    }
  }
  return { isValid: false, needsRehash: false };
}
function generateSecureSessionToken(userId) {
  const randomBytes = import_crypto.default.randomBytes(32).toString("hex");
  return `ebs_sec_${userId}_${randomBytes}`;
}
function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push("Neno la siri lazima liwe na herufi zisizopungua 8.");
  }
  if (!/\d/.test(password)) {
    errors.push("Lazima liwe na angalau tarakimu/namba moja (0-9).");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

// server/db.ts
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var STATE_FILE = import_path.default.join(DATA_DIR, "ebs_state.json");
var SQLITE_FILE = import_path.default.join(DATA_DIR, "ebs_database.sqlite");
var BACKUP_DIR = import_path.default.join(DATA_DIR, "backups");
var store = {
  businesses: /* @__PURE__ */ new Map(),
  devices: /* @__PURE__ */ new Map(),
  users: /* @__PURE__ */ new Map(),
  sessions: /* @__PURE__ */ new Map(),
  products: /* @__PURE__ */ new Map(),
  sales: /* @__PURE__ */ new Map(),
  stockMovements: [],
  customers: /* @__PURE__ */ new Map(),
  debts: /* @__PURE__ */ new Map(),
  suppliers: /* @__PURE__ */ new Map(),
  expenses: [],
  tables: /* @__PURE__ */ new Map(),
  barVariances: [],
  cameras: /* @__PURE__ */ new Map(),
  cameraEvents: [],
  auditLogs: [],
  syncTransactions: /* @__PURE__ */ new Map(),
  schemaVersion: 1
};
var sqliteDb = null;
var isInitialized = false;
function ensureDirectories() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(BACKUP_DIR)) {
    import_fs.default.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}
function persistStoreToDisk() {
  try {
    ensureDirectories();
    const serialized = {
      schemaVersion: store.schemaVersion,
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      businesses: Array.from(store.businesses.entries()),
      devices: Array.from(store.devices.entries()),
      users: Array.from(store.users.entries()),
      sessions: Array.from(store.sessions.entries()),
      products: Array.from(store.products.entries()),
      sales: Array.from(store.sales.entries()),
      stockMovements: store.stockMovements,
      customers: Array.from(store.customers.entries()),
      debts: Array.from(store.debts.entries()),
      suppliers: Array.from(store.suppliers.entries()),
      expenses: store.expenses,
      tables: Array.from(store.tables.entries()),
      barVariances: store.barVariances,
      cameras: Array.from(store.cameras.entries()),
      cameraEvents: store.cameraEvents,
      auditLogs: store.auditLogs,
      syncTransactions: Array.from(store.syncTransactions.entries())
    };
    const tempFile = `${STATE_FILE}.tmp.${Date.now()}`;
    import_fs.default.writeFileSync(tempFile, JSON.stringify(serialized, null, 2), "utf-8");
    import_fs.default.renameSync(tempFile, STATE_FILE);
    if (sqliteDb) {
      try {
        const binary = sqliteDb.export();
        const buffer = Buffer.from(binary);
        const sqliteTemp = `${SQLITE_FILE}.tmp.${Date.now()}`;
        import_fs.default.writeFileSync(sqliteTemp, buffer);
        import_fs.default.renameSync(sqliteTemp, SQLITE_FILE);
      } catch (e) {
        console.error("[EBS Database] SQLite binary export warning:", e);
      }
    }
  } catch (err) {
    console.error("[EBS Database] Error saving database to disk:", err);
  }
}
function initSqliteSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT,
      pin TEXT,
      pin_salt TEXT,
      permissions_json TEXT,
      must_change_password INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      buying_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      stock_qty REAL NOT NULL DEFAULT 0,
      min_stock REAL DEFAULT 5,
      unit TEXT NOT NULL,
      barcode TEXT,
      is_bar_item INTEGER DEFAULT 0,
      bottle_size_ml REAL DEFAULT 750,
      serving_size_ml REAL DEFAULT 30,
      open_bottle_remaining_ml REAL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      device_id TEXT,
      invoice_no TEXT NOT NULL,
      client_transaction_id TEXT,
      total REAL NOT NULL,
      profit REAL NOT NULL,
      payment_method TEXT NOT NULL,
      customer_id TEXT,
      cashier_id TEXT,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      items_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      current_debt REAL DEFAULT 0,
      total_spent REAL DEFAULT 0,
      transaction_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      sale_id TEXT,
      invoice_no TEXT,
      original_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      recorded_by TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT,
      app_version TEXT,
      status TEXT,
      last_active TEXT,
      is_revoked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      entity_type TEXT,
      entity_id TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_sales_biz ON sales(business_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);
}
async function initCentralDatabase() {
  if (isInitialized) return;
  ensureDirectories();
  try {
    const SQL = await (0, import_sql.default)();
    if (import_fs.default.existsSync(SQLITE_FILE)) {
      try {
        const fileBuffer = import_fs.default.readFileSync(SQLITE_FILE);
        sqliteDb = new SQL.Database(fileBuffer);
      } catch {
        sqliteDb = new SQL.Database();
      }
    } else {
      sqliteDb = new SQL.Database();
    }
    initSqliteSchema(sqliteDb);
  } catch (err) {
    console.warn("[EBS Database] SQLite engine initialized with internal memory provider:", err);
  }
  if (import_fs.default.existsSync(STATE_FILE)) {
    try {
      const raw = import_fs.default.readFileSync(STATE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.businesses)) {
        store.businesses = new Map(data.businesses);
      }
      if (Array.isArray(data.devices)) {
        store.devices = new Map(data.devices);
      }
      if (Array.isArray(data.users)) {
        store.users = new Map(data.users);
      }
      if (Array.isArray(data.sessions)) {
        store.sessions = new Map(data.sessions);
      }
      if (Array.isArray(data.products)) {
        store.products = new Map(data.products);
      }
      if (Array.isArray(data.sales)) {
        store.sales = new Map(data.sales);
      }
      if (Array.isArray(data.stockMovements)) {
        store.stockMovements = data.stockMovements;
      }
      if (Array.isArray(data.customers)) {
        store.customers = new Map(data.customers);
      }
      if (Array.isArray(data.debts)) {
        store.debts = new Map(data.debts);
      }
      if (Array.isArray(data.suppliers)) {
        store.suppliers = new Map(data.suppliers);
      }
      if (Array.isArray(data.expenses)) {
        store.expenses = data.expenses;
      }
      if (Array.isArray(data.tables)) {
        store.tables = new Map(data.tables);
      }
      if (Array.isArray(data.barVariances)) {
        store.barVariances = data.barVariances;
      }
      if (Array.isArray(data.cameras)) {
        store.cameras = new Map(data.cameras);
      }
      if (Array.isArray(data.cameraEvents)) {
        store.cameraEvents = data.cameraEvents;
      }
      if (Array.isArray(data.auditLogs)) {
        store.auditLogs = data.auditLogs;
      }
      if (Array.isArray(data.syncTransactions)) {
        store.syncTransactions = new Map(data.syncTransactions);
      }
      store.schemaVersion = data.schemaVersion || 1;
      console.log(`[EBS Database] Successfully loaded persistent database from disk. (${store.products.size} products, ${store.sales.size} sales, ${store.users.size} users, ${store.customers.size} customers).`);
      isInitialized = true;
      return;
    } catch (readErr) {
      console.error("[EBS Database] Error reading existing database file. Preserving and creating safety backup:", readErr);
      const corruptBackup = import_path.default.join(BACKUP_DIR, `corrupt_safety_${Date.now()}.json`);
      import_fs.default.copyFileSync(STATE_FILE, corruptBackup);
    }
  }
  console.log("[EBS Database] Fresh installation detected. Seeding initial business schema...");
  const defaultBizId = INITIAL_BUSINESS_ENTITY.id;
  store.businesses.set(defaultBizId, JSON.parse(JSON.stringify(INITIAL_BUSINESS_ENTITY)));
  INITIAL_DEVICES.forEach((d) => {
    store.devices.set(d.id, { ...d, businessId: defaultBizId });
  });
  const initialPasswords = {
    "usr-1": "Owner1234!",
    "usr-2": "Manager1234!",
    "usr-3": "Cashier1234!",
    "usr-4": "Waiter1234!",
    "usr-5": "Store1234!"
  };
  INITIAL_USERS.forEach((u) => {
    const rawPass = initialPasswords[u.id] || "Owner1234!";
    const { hash, salt } = hashPasswordPBKDF2(rawPass);
    store.users.set(u.id, {
      ...u,
      businessId: defaultBizId,
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: u.id === "usr-1" ? true : false,
      active: true,
      failedLoginAttempts: 0
    });
  });
  INITIAL_PRODUCTS.forEach((p) => {
    store.products.set(p.id, { ...p, businessId: defaultBizId });
  });
  INITIAL_SALES.forEach((s) => {
    store.sales.set(s.id, { ...s, businessId: defaultBizId });
  });
  INITIAL_CUSTOMERS.forEach((c) => {
    store.customers.set(c.id, { ...c, businessId: defaultBizId });
  });
  INITIAL_DEBTS.forEach((d) => {
    store.debts.set(d.id, { ...d, businessId: defaultBizId });
  });
  INITIAL_SUPPLIERS.forEach((s) => {
    store.suppliers.set(s.id, { ...s, businessId: defaultBizId });
  });
  store.expenses = INITIAL_EXPENSES.map((e) => ({ ...e, businessId: defaultBizId }));
  store.auditLogs = INITIAL_AUDIT_LOGS.map((a) => ({ ...a, businessId: defaultBizId }));
  store.barVariances = [...INITIAL_BAR_VARIANCE];
  store.cameraEvents = [...INITIAL_CAMERA_EVENTS];
  INITIAL_TABLES.forEach((t) => store.tables.set(t.id, t));
  INITIAL_CAMERAS.forEach((c) => store.cameras.set(c.id, c));
  persistStoreToDisk();
  isInitialized = true;
  console.log(`[EBS Database] Initial database seeded and persisted to ${STATE_FILE}.`);
}
function getCentralStore() {
  return store;
}
function executeSaleAtomic(businessId, saleData, deviceId, userId, clientTransactionId) {
  if (clientTransactionId) {
    const existing = Array.from(store.sales.values()).find(
      (s) => s.clientTransactionId === clientTransactionId || s.id === clientTransactionId
    );
    if (existing) {
      return { success: true, sale: existing };
    }
  }
  const user = store.users.get(userId);
  const device = store.devices.get(deviceId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let totalCost = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  for (const item of saleData.items) {
    const product = store.products.get(item.productId);
    if (!product) {
      return { success: false, error: `Bidhaa yenye namba ${item.productId} haijapatikana.` };
    }
    const prevStock = product.stockQty;
    if (item.isServing && product.isBarItem) {
      const servingMl = item.servingSizeMl || product.servingSizeMl || 30;
      const bottleMl = product.bottleSizeMl || 750;
      let openMl = product.openBottleRemainingMl ?? bottleMl;
      if (openMl < servingMl) {
        if (product.stockQty > 0) {
          product.stockQty = Math.max(0, product.stockQty - 1);
          openMl = openMl + bottleMl - servingMl;
        } else {
          openMl = Math.max(0, openMl - servingMl);
        }
      } else {
        openMl -= servingMl;
      }
      product.openBottleRemainingMl = openMl;
    } else {
      product.stockQty = Math.max(0, product.stockQty - item.quantity);
    }
    store.stockMovements.push({
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      businessId,
      deviceId,
      productId: product.id,
      productName: product.name,
      type: "sale",
      quantity: -item.quantity,
      previousStock: prevStock,
      newStock: product.stockQty,
      unit: product.unit,
      referenceId: saleData.invoiceNo || `INV-${Date.now()}`,
      reason: `Mauzo ya POS (${item.isServing ? "Shots" : "Pcs"})`,
      userId,
      userName: user ? user.name : "Cashier",
      timestamp: now
    });
    subtotal += item.unitPrice * item.quantity;
    totalDiscount += item.discount || 0;
    totalCost += (item.costPrice || product.buyingPrice || 0) * item.quantity;
  }
  const finalTotal = saleData.total !== void 0 ? saleData.total : subtotal - totalDiscount;
  const finalProfit = saleData.profit !== void 0 ? saleData.profit : finalTotal - totalCost;
  const newSale = {
    id: saleData.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    businessId,
    deviceId,
    deviceName: device ? device.name : "Unknown Device",
    clientTransactionId,
    syncStatus: "synced",
    invoiceNo: saleData.invoiceNo || `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(store.sales.size + 1).padStart(4, "0")}`,
    items: saleData.items,
    subtotal,
    discount: totalDiscount,
    tax: saleData.tax || 0,
    total: finalTotal,
    profit: finalProfit,
    payments: saleData.payments || [{ method: saleData.paymentMethod || "cash", amount: finalTotal }],
    paymentMethod: saleData.paymentMethod || "cash",
    customerId: saleData.customerId,
    customerName: saleData.customerName,
    customerPhone: saleData.customerPhone,
    cashierId: userId,
    cashierName: user ? user.name : saleData.cashierName || "Keshia",
    status: "completed",
    tableId: saleData.tableId,
    tableName: saleData.tableName,
    waiterId: saleData.waiterId,
    waiterName: saleData.waiterName,
    timestamp: saleData.timestamp || now,
    notes: saleData.notes,
    cameraEventId: saleData.cameraEventId
  };
  store.sales.set(newSale.id, newSale);
  if (newSale.paymentMethod === "debt" && newSale.customerId) {
    const cust = store.customers.get(newSale.customerId);
    if (cust) {
      cust.currentDebt += newSale.total;
      cust.totalSpent += newSale.total;
      cust.transactionCount += 1;
      cust.lastPurchaseDate = now;
      const debtId = `debt-${Date.now()}`;
      store.debts.set(debtId, {
        id: debtId,
        businessId,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        saleId: newSale.id,
        invoiceNo: newSale.invoiceNo,
        originalAmount: newSale.total,
        paidAmount: 0,
        remainingAmount: newSale.total,
        status: "unpaid",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        createdAt: now,
        notes: `Mauzo ya mkopo risiti ${newSale.invoiceNo}`,
        payments: []
      });
    }
  }
  store.auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    businessId,
    deviceId,
    deviceName: device ? device.name : "Unknown Device",
    userId,
    userName: user ? user.name : "User",
    userRole: user ? user.role : "cashier",
    action: `Kukamilisha Mauzo #${newSale.invoiceNo}`,
    details: `Kiasi: TZS ${newSale.total.toLocaleString()} (${newSale.paymentMethod.toUpperCase()}) - Bidhaa ${newSale.items.length}`,
    entityType: "sale",
    entityId: newSale.id,
    timestamp: now
  });
  if (device) {
    device.lastActive = now;
    device.lastSync = now;
    device.status = "online";
  }
  persistStoreToDisk();
  return { success: true, sale: newSale };
}
function processSyncQueueBatch(businessId, deviceId, transactions) {
  const results = [];
  let processed = 0;
  let failed = 0;
  const device = store.devices.get(deviceId);
  if (device && device.isRevoked) {
    return {
      processed: 0,
      failed: transactions.length,
      results: transactions.map((t) => ({
        localId: t.localId,
        status: "failed",
        error: "Kifaa hiki kimezuiwa (Device access revoked)."
      }))
    };
  }
  for (const tx of transactions) {
    try {
      if (tx.entityType === "sale") {
        const saleResult = executeSaleAtomic(
          businessId,
          tx.payload,
          deviceId,
          tx.userId,
          tx.localId
        );
        if (saleResult.success && saleResult.sale) {
          results.push({
            localId: tx.localId,
            globalId: saleResult.sale.id,
            status: "synced"
          });
          processed++;
        } else {
          results.push({
            localId: tx.localId,
            status: "failed",
            error: saleResult.error || "Failed to process sale."
          });
          failed++;
        }
      } else if (tx.entityType === "stock_adjustment") {
        const { productId, newQty, reason, userId, userName } = tx.payload;
        const prod = store.products.get(productId);
        if (prod) {
          const prev = prod.stockQty;
          prod.stockQty = newQty;
          store.stockMovements.push({
            id: `mov-${Date.now()}`,
            businessId,
            deviceId,
            productId: prod.id,
            productName: prod.name,
            type: "adjustment",
            quantity: newQty - prev,
            previousStock: prev,
            newStock: newQty,
            unit: prod.unit,
            reason: reason || "Marekebisho ya stoo (Offline sync)",
            userId,
            userName,
            timestamp: tx.createdAt || (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        results.push({ localId: tx.localId, status: "synced" });
        processed++;
      } else if (tx.entityType === "expense") {
        store.expenses.unshift({
          ...tx.payload,
          id: tx.payload.id || `exp-${Date.now()}`,
          businessId,
          deviceId
        });
        results.push({ localId: tx.localId, status: "synced" });
        processed++;
      } else if (tx.entityType === "customer") {
        store.customers.set(tx.payload.id, {
          ...tx.payload,
          businessId
        });
        results.push({ localId: tx.localId, status: "synced" });
        processed++;
      } else {
        results.push({ localId: tx.localId, status: "synced" });
        processed++;
      }
    } catch (err) {
      results.push({
        localId: tx.localId,
        status: "failed",
        error: err?.message || "Unknown processing error"
      });
      failed++;
    }
  }
  if (device) {
    device.lastSync = (/* @__PURE__ */ new Date()).toISOString();
    device.lastActive = (/* @__PURE__ */ new Date()).toISOString();
    device.status = "online";
  }
  persistStoreToDisk();
  return { processed, failed, results };
}
function createDatabaseBackup(businessId) {
  ensureDirectories();
  const backupData = {
    version: "1.3.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    businessId,
    business: store.businesses.get(businessId),
    products: Array.from(store.products.values()).filter((p) => p.businessId === businessId),
    sales: Array.from(store.sales.values()).filter((s) => s.businessId === businessId),
    stockMovements: store.stockMovements.filter((m) => m.businessId === businessId),
    customers: Array.from(store.customers.values()).filter((c) => c.businessId === businessId),
    debts: Array.from(store.debts.values()).filter((d) => d.businessId === businessId),
    suppliers: Array.from(store.suppliers.values()).filter((s) => s.businessId === businessId),
    expenses: store.expenses.filter((e) => e.businessId === businessId),
    tables: Array.from(store.tables.values()),
    barVariances: store.barVariances,
    cameras: Array.from(store.cameras.values()),
    auditLogs: store.auditLogs.filter((a) => a.businessId === businessId),
    devices: Array.from(store.devices.values()).filter((d) => d.businessId === businessId),
    // Export users without password hashes for security
    users: Array.from(store.users.values()).filter((u) => u.businessId === businessId).map((u) => ({
      id: u.id,
      businessId: u.businessId,
      name: u.name,
      username: u.username,
      role: u.role,
      phone: u.phone,
      active: u.active,
      permissions: u.permissions
    }))
  };
  const backupFilename = import_path.default.join(BACKUP_DIR, `ebs_backup_${businessId}_${Date.now()}.json`);
  import_fs.default.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2), "utf-8");
  return JSON.stringify(backupData, null, 2);
}
function restoreDatabaseBackup(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.business || !Array.isArray(data.products)) {
      return { success: false, message: "Faili la backup halina muundo sahihi wa EBS." };
    }
    ensureDirectories();
    const safetySnapshot = import_path.default.join(BACKUP_DIR, `pre_restore_safety_${Date.now()}.json`);
    if (import_fs.default.existsSync(STATE_FILE)) {
      import_fs.default.copyFileSync(STATE_FILE, safetySnapshot);
    }
    const bizId = data.business.id || "EBS-BIZ-000001";
    store.businesses.set(bizId, data.business);
    if (Array.isArray(data.products)) {
      data.products.forEach((p) => store.products.set(p.id, { ...p, businessId: bizId }));
    }
    if (Array.isArray(data.customers)) {
      data.customers.forEach((c) => store.customers.set(c.id, { ...c, businessId: bizId }));
    }
    if (Array.isArray(data.debts)) {
      data.debts.forEach((d) => store.debts.set(d.id, { ...d, businessId: bizId }));
    }
    if (Array.isArray(data.suppliers)) {
      data.suppliers.forEach((s) => store.suppliers.set(s.id, { ...s, businessId: bizId }));
    }
    if (Array.isArray(data.expenses)) {
      store.expenses = data.expenses.map((e) => ({ ...e, businessId: bizId }));
    }
    if (Array.isArray(data.sales)) {
      data.sales.forEach((s) => store.sales.set(s.id, { ...s, businessId: bizId }));
    }
    if (Array.isArray(data.stockMovements)) {
      store.stockMovements = data.stockMovements;
    }
    if (Array.isArray(data.auditLogs)) {
      store.auditLogs = data.auditLogs;
    }
    persistStoreToDisk();
    return { success: true, message: "Database imerejeshwa kwa ufanisi kutoka kwenye Backup." };
  } catch (err) {
    return { success: false, message: `Hitilafu wakati wa kurejesha backup: ${err.message}` };
  }
}

// server/routes.ts
var import_express = require("express");
var apiRouter = (0, import_express.Router)();
function extractAuthContext(req) {
  const store2 = getCentralStore();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-session-token"];
  const deviceId = req.headers["x-device-id"] || "DEV-POS-03";
  let session;
  let user;
  let businessId;
  if (token) {
    session = store2.sessions.get(token);
    if (session && session.status === "active") {
      user = store2.users.get(session.userId);
      businessId = session.businessId || user?.businessId;
      session.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
  return {
    token,
    session,
    user,
    deviceId,
    businessId: businessId || user?.businessId || "EBS-BIZ-000001",
    isAuthenticated: !!(session && user && user.active),
    store: store2
  };
}
function requireAuth(req, res, next) {
  const { isAuthenticated, user } = extractAuthContext(req);
  if (!isAuthenticated || !user) {
    res.status(401).json({ error: "Uthibitisho unahitajika (Unauthorized). Tafadhali ingia kwenye mfumo." });
    return;
  }
  next();
}
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const { user } = extractAuthContext(req);
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: "Huna idhini ya kufanya kitendo hiki (Forbidden)." });
      return;
    }
    next();
  };
}
apiRouter.post("/auth/login", (req, res) => {
  const { username, password, passwordHash, deviceId, deviceName, platform } = req.body;
  const store2 = getCentralStore();
  if (!username || !password && !passwordHash) {
    res.status(400).json({ error: "Jina la mtumiaji na neno la siri vinahitajika." });
    return;
  }
  const cleanUsername = String(username).trim();
  const user = Array.from(store2.users.values()).find(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.phone.replace(/\s+/g, "") === cleanUsername.replace(/\s+/g, "")
  );
  if (!user) {
    res.status(401).json({ error: "Jina la mtumiaji au neno la siri si sahihi." });
    return;
  }
  if (!user.active) {
    res.status(403).json({ error: "Akaunti hii imezimwa na Msimamizi/Mmiliki." });
    return;
  }
  const nowMs = Date.now();
  if (user.lockoutUntil && new Date(user.lockoutUntil).getTime() > nowMs) {
    const remainingMins = Math.ceil((new Date(user.lockoutUntil).getTime() - nowMs) / 6e4);
    res.status(429).json({
      error: `Akaunti imefungwa kwa muda kutokana na makosa mengi ya neno la siri. Jaribu tena baada ya dakika ${remainingMins}.`
    });
    return;
  }
  const providedCred = password || passwordHash;
  const verification = verifyUserPassword(
    providedCred,
    user.passwordHash,
    user.passwordSalt
  );
  if (!verification.isValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    }
    persistStoreToDisk();
    res.status(401).json({
      error: "Neno la siri si sahihi.",
      attemptsLeft: Math.max(0, 5 - (user.failedLoginAttempts || 0))
    });
    return;
  }
  user.failedLoginAttempts = 0;
  user.lockoutUntil = void 0;
  if (verification.needsRehash && password) {
    const upgraded = hashPasswordPBKDF2(password);
    user.passwordHash = upgraded.hash;
    user.passwordSalt = upgraded.salt;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  user.lastLogin = now;
  const devId = deviceId || `DEV-${user.role.toUpperCase()}-${Date.now().toString().slice(-4)}`;
  let device = store2.devices.get(devId);
  if (device && device.isRevoked) {
    res.status(403).json({
      error: "Kifaa hiki kimezuiwa kutumia mfumo huu (Device revoked). Wasiliana na Mmiliki wa Biashara."
    });
    return;
  }
  if (!device) {
    device = {
      id: devId,
      businessId: user.businessId || "EBS-BIZ-000001",
      name: deviceName || `${user.name} (${platform || "Android"})`,
      platform: platform || "android",
      appVersion: "v1.3.0",
      databaseVersion: "v1.3.0",
      assignedUserId: user.id,
      assignedUserName: `${user.name} (${user.role})`,
      assignedRole: user.role,
      status: "online",
      isOnline: true,
      registeredAt: now,
      lastActive: now,
      lastSync: now,
      isRevoked: false
    };
    store2.devices.set(devId, device);
  } else {
    device.status = "online";
    device.isOnline = true;
    device.lastActive = now;
    device.assignedUserId = user.id;
    device.assignedUserName = `${user.name} (${user.role})`;
    device.assignedRole = user.role;
  }
  const token = generateSecureSessionToken(user.id);
  const session = {
    id: `sess-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    deviceId: devId,
    deviceName: device.name,
    businessId: user.businessId,
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: `${device.name} (${device.platform})`,
    status: "active",
    isCurrent: true
  };
  store2.sessions.set(token, session);
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: user.businessId,
    deviceId: devId,
    deviceName: device.name,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `Kuingia Kwenye Mfumo (Login)`,
    details: `Mtumiaji ameingia kupitia kifaa "${device.name}" (${device.platform})`,
    entityType: "auth",
    entityId: user.id,
    timestamp: now
  });
  persistStoreToDisk();
  const business = store2.businesses.get(user.businessId) || store2.businesses.get("EBS-BIZ-000001");
  const sanitizedUser = {
    ...user,
    passwordHash: void 0,
    passwordSalt: void 0
  };
  res.json({
    token,
    user: sanitizedUser,
    device,
    business,
    mustChangePassword: !!user.mustChangePassword
  });
});
apiRouter.post("/auth/change-password", requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { user } = extractAuthContext(req);
  if (!user) {
    res.status(401).json({ error: "Mtumiaji hajatambuliwa." });
    return;
  }
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Neno la zamani na jipya vinahitajika." });
    return;
  }
  const ver = verifyUserPassword(oldPassword, user.passwordHash, user.passwordSalt);
  if (!ver.isValid) {
    res.status(400).json({ error: "Neno la siri la sasa si sahihi." });
    return;
  }
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    res.status(400).json({ error: strength.errors.join(" ") });
    return;
  }
  const { hash, salt } = hashPasswordPBKDF2(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.mustChangePassword = false;
  const store2 = getCentralStore();
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: user.businessId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `Kubadilisha Neno la Siri`,
    details: `Mtumiaji amebadilisha neno lake la siri kibinafsi.`,
    entityType: "auth",
    entityId: user.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  persistStoreToDisk();
  res.json({ success: true, message: "Neno la siri limebadilishwa kwa ufanisi." });
});
apiRouter.post("/auth/logout", (req, res) => {
  const { token, store: store2 } = extractAuthContext(req);
  if (token && store2.sessions.has(token)) {
    const sess = store2.sessions.get(token);
    if (sess) sess.status = "terminated";
    store2.sessions.delete(token);
    persistStoreToDisk();
  }
  res.json({ success: true, message: "Umetoka kwenye mfumo kwa ufanisi." });
});
apiRouter.get("/auth/session", (req, res) => {
  const { isAuthenticated, user, session, businessId, store: store2 } = extractAuthContext(req);
  if (!isAuthenticated || !user || !session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  const business = store2.businesses.get(businessId);
  res.json({
    authenticated: true,
    user: {
      ...user,
      passwordHash: void 0,
      passwordSalt: void 0
    },
    session,
    business
  });
});
apiRouter.post("/auth/setup-new-business", (req, res) => {
  const { businessData, ownerData } = req.body;
  const store2 = getCentralStore();
  if (!businessData?.name || !ownerData?.name || !ownerData?.username || !ownerData?.password) {
    res.status(400).json({ error: "Taarifa zote za biashara na mmiliki zinahitajika." });
    return;
  }
  const newBizId = `EBS-BIZ-${Date.now().toString().slice(-6)}`;
  const newOwnerId = `usr-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { hash, salt } = hashPasswordPBKDF2(ownerData.password);
  const newOwner = {
    id: newOwnerId,
    businessId: newBizId,
    name: ownerData.name,
    username: ownerData.username,
    role: "owner",
    phone: ownerData.phone || "0676674705",
    email: ownerData.email || "",
    passwordHash: hash,
    active: true,
    createdAt: now,
    mustChangePassword: false,
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
      canAccessBarMode: true
    }
  };
  newOwner.passwordSalt = salt;
  store2.users.set(newOwnerId, newOwner);
  const newBusiness = {
    id: newBizId,
    name: businessData.name,
    ownerName: ownerData.name,
    ownerId: newOwnerId,
    phone: ownerData.phone || "0676674705",
    email: businessData.email || "",
    address: businessData.address || "Tanzania",
    mkoa: businessData.mkoa || "Dar es Salaam",
    wilaya: businessData.wilaya || "Ilala",
    currency: "TZS",
    tin: businessData.tin || "",
    vrn: businessData.vrn || "",
    branches: [
      {
        id: `br-${Date.now()}`,
        businessId: newBizId,
        name: "Tawi Kuu",
        code: "HQ-01",
        phone: ownerData.phone || "0676674705",
        address: businessData.address || "Tanzania",
        isMain: true,
        status: "active",
        createdAt: now
      }
    ],
    profile: {
      name: businessData.name,
      businessType: businessData.type || "duka",
      phone: ownerData.phone || "0676674705",
      address: businessData.address || "Tanzania",
      mkoa: businessData.mkoa || "Dar es Salaam",
      currency: "TZS",
      vatEnabled: false,
      vatRate: 18,
      receiptHeader: businessData.name,
      receiptFooter: "Asante kwa kufanya biashara nasi!",
      setupCompleted: true
    }
  };
  store2.businesses.set(newBizId, newBusiness);
  const token = generateSecureSessionToken(newOwnerId);
  const session = {
    id: `sess-${Date.now()}`,
    userId: newOwnerId,
    userName: newOwner.name,
    userRole: "owner",
    deviceId: "DEV-OWNER-SETUP",
    deviceName: "Owner Terminal",
    businessId: newBizId,
    token,
    loginTime: now,
    lastActivity: now,
    deviceInfo: "Setup Terminal",
    status: "active",
    isCurrent: true
  };
  store2.sessions.set(token, session);
  persistStoreToDisk();
  res.json({
    success: true,
    token,
    user: {
      ...newOwner,
      passwordHash: void 0,
      passwordSalt: void 0
    },
    business: newBusiness
  });
});
apiRouter.get("/business/profile", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const business = store2.businesses.get(businessId) || store2.businesses.get("EBS-BIZ-000001");
  res.json(business);
});
apiRouter.put("/business/profile", requireAuth, (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  let business = store2.businesses.get(businessId);
  if (!business) {
    business = store2.businesses.get("EBS-BIZ-000001");
  }
  if (business) {
    if (req.body.profile) {
      business.profile = { ...business.profile, ...req.body.profile };
      business.name = business.profile.name;
    }
    if (req.body.name) business.name = req.body.name;
    if (req.body.phone) business.phone = req.body.phone;
    if (req.body.address) business.address = req.body.address;
    if (business.profile) {
      if (req.body.tin) business.profile.tin = req.body.tin;
      if (req.body.vrn) business.profile.vrn = req.body.vrn;
    }
    persistStoreToDisk();
  }
  res.json(business);
});
apiRouter.get("/devices", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const devices = Array.from(store2.devices.values()).filter(
    (d) => d.businessId === businessId || d.businessId === "EBS-BIZ-000001"
  );
  res.json(devices);
});
apiRouter.post("/devices/register", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const { id, name, platform, appVersion, assignedUserId, assignedUserName, assignedRole } = req.body;
  const devId = id || `DEV-${Date.now().toString().slice(-6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let dev = store2.devices.get(devId);
  if (!dev) {
    dev = {
      id: devId,
      businessId,
      name: name || `Kifaa ${devId}`,
      platform: platform || "android",
      appVersion: appVersion || "v1.3.0",
      databaseVersion: "v1.3.0",
      assignedUserId,
      assignedUserName,
      assignedRole,
      status: "online",
      isOnline: true,
      registeredAt: now,
      lastActive: now,
      lastSync: now,
      isRevoked: false
    };
  } else {
    dev.name = name || dev.name;
    dev.lastActive = now;
    dev.status = dev.isRevoked ? "revoked" : "online";
    if (assignedUserId) {
      dev.assignedUserId = assignedUserId;
      dev.assignedUserName = assignedUserName;
      dev.assignedRole = assignedRole;
    }
  }
  store2.devices.set(devId, dev);
  persistStoreToDisk();
  res.json(dev);
});
apiRouter.post("/devices/:id/revoke", requireAuth, requireRole(["owner"]), (req, res) => {
  const { id } = req.params;
  const { user, store: store2 } = extractAuthContext(req);
  const device = store2.devices.get(id);
  if (!device) {
    res.status(404).json({ error: "Kifaa hakikupatikana." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  device.isRevoked = true;
  device.status = "revoked";
  device.revokedAt = now;
  device.revokedBy = user ? user.name : "Mmiliki (Owner)";
  for (const [token, sess] of store2.sessions.entries()) {
    if (sess.deviceId === id) {
      sess.status = "terminated";
      store2.sessions.delete(token);
    }
  }
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: device.businessId,
    deviceId: id,
    deviceName: device.name,
    userId: user?.id || "usr-1",
    userName: user?.name || "Owner",
    userRole: "owner",
    action: `Kufuta Idhini ya Kifaa (Revoke Device Access)`,
    details: `Idhini ya kifaa "${device.name}" (${device.id}) imefutwa mara moja.`,
    entityType: "device",
    entityId: device.id,
    timestamp: now
  });
  persistStoreToDisk();
  res.json({ success: true, device });
});
apiRouter.get("/products", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const products = Array.from(store2.products.values()).filter(
    (p) => p.businessId === businessId || p.businessId === "EBS-BIZ-000001"
  );
  res.json(products);
});
apiRouter.post("/products", requireAuth, (req, res) => {
  const { businessId, user, store: store2 } = extractAuthContext(req);
  const newProduct = {
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    businessId,
    active: req.body.active !== void 0 ? req.body.active : true
  };
  store2.products.set(newProduct.id, newProduct);
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    userId: user?.id,
    userName: user?.name,
    userRole: user?.role,
    action: `Kuongeza Bidhaa Mpya: ${newProduct.name}`,
    details: `Bei: TZS ${newProduct.sellingPrice.toLocaleString()}, Stoo: ${newProduct.stockQty} ${newProduct.unit}`,
    entityType: "product",
    entityId: newProduct.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  persistStoreToDisk();
  res.json(newProduct);
});
apiRouter.put("/products/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  const product = store2.products.get(id);
  if (!product) {
    res.status(404).json({ error: "Bidhaa haijapatikana." });
    return;
  }
  Object.assign(product, req.body);
  persistStoreToDisk();
  res.json(product);
});
apiRouter.delete("/products/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  const product = store2.products.get(id);
  if (product) {
    product.active = false;
    persistStoreToDisk();
  }
  res.json({ success: true });
});
apiRouter.post("/products/adjust-stock", requireAuth, (req, res) => {
  const { productId, newStock, reason, unit } = req.body;
  const { businessId, user, deviceId, store: store2 } = extractAuthContext(req);
  const product = store2.products.get(productId);
  if (!product) {
    res.status(404).json({ error: "Bidhaa haijapatikana." });
    return;
  }
  const prevStock = product.stockQty;
  product.stockQty = newStock;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  store2.stockMovements.push({
    id: `mov-${Date.now()}`,
    businessId,
    deviceId,
    productId: product.id,
    productName: product.name,
    type: "adjustment",
    quantity: newStock - prevStock,
    previousStock: prevStock,
    newStock,
    unit: unit || product.unit,
    reason: reason || "Marekebisho ya Stoo",
    userId: user?.id || "usr-1",
    userName: user?.name || "Msimamizi wa Stoo",
    timestamp: now
  });
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    deviceId,
    userId: user?.id || "usr-1",
    userName: user?.name || "Storekeeper",
    userRole: user?.role || "storekeeper",
    action: `Kurekebisha Stoo: ${product.name}`,
    details: `Ilitoka ${prevStock} hadi ${newStock} ${product.unit}. Sababu: ${reason || "Ukaguzi"}`,
    entityType: "stock",
    entityId: product.id,
    timestamp: now
  });
  persistStoreToDisk();
  res.json({ success: true, product });
});
apiRouter.get("/sales", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const sales = Array.from(store2.sales.values()).filter((s) => s.businessId === businessId || s.businessId === "EBS-BIZ-000001").sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(sales);
});
apiRouter.post("/sales", requireAuth, (req, res) => {
  const { businessId, user, deviceId } = extractAuthContext(req);
  const saleData = req.body;
  const result = executeSaleAtomic(
    businessId,
    saleData,
    deviceId,
    user?.id || saleData.cashierId || "usr-3",
    saleData.clientTransactionId
  );
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result.sale);
});
apiRouter.post("/sales/:id/refund", requireAuth, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { businessId, user, deviceId, store: store2 } = extractAuthContext(req);
  const sale = store2.sales.get(id);
  if (!sale) {
    res.status(404).json({ error: "Risiti haijapatikana." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  sale.status = "refunded";
  sale.refundReason = reason || "Kufuta/Kurejesha risiti";
  sale.refundedBy = user?.name || "Msimamizi";
  sale.refundedAt = now;
  for (const item of sale.items) {
    const product = store2.products.get(item.productId);
    if (product) {
      product.stockQty += item.quantity;
      store2.stockMovements.push({
        id: `mov-${Date.now()}`,
        businessId,
        deviceId,
        productId: product.id,
        productName: product.name,
        type: "return",
        quantity: item.quantity,
        previousStock: product.stockQty - item.quantity,
        newStock: product.stockQty,
        unit: product.unit,
        reason: `Refund ya Mauzo #${sale.invoiceNo}`,
        userId: user?.id || "usr-1",
        userName: user?.name || "Meneja",
        timestamp: now
      });
    }
  }
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    deviceId,
    userId: user?.id || "usr-1",
    userName: user?.name || "Meneja",
    userRole: user?.role || "manager",
    action: `Kufanya Refund ya Mauzo #${sale.invoiceNo}`,
    details: `Kiasi: TZS ${sale.total.toLocaleString()}. Sababu: ${reason || "N/A"}`,
    entityType: "sale",
    entityId: sale.id,
    timestamp: now
  });
  persistStoreToDisk();
  res.json({ success: true, sale });
});
apiRouter.post("/sync/push", requireAuth, (req, res) => {
  const { businessId, deviceId } = extractAuthContext(req);
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.json({ processed: 0, failed: 0, results: [] });
    return;
  }
  const result = processSyncQueueBatch(businessId, deviceId, transactions);
  res.json(result);
});
apiRouter.get("/sync/pull", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const since = req.query.since ? new Date(req.query.since).getTime() : 0;
  const products = Array.from(store2.products.values()).filter((p) => p.businessId === businessId || p.businessId === "EBS-BIZ-000001");
  const sales = Array.from(store2.sales.values()).filter(
    (s) => (s.businessId === businessId || s.businessId === "EBS-BIZ-000001") && new Date(s.timestamp).getTime() >= since
  );
  const devices = Array.from(store2.devices.values()).filter((d) => d.businessId === businessId || d.businessId === "EBS-BIZ-000001");
  const customers = Array.from(store2.customers.values()).filter((c) => c.businessId === businessId || c.businessId === "EBS-BIZ-000001");
  const debts = Array.from(store2.debts.values()).filter((d) => d.businessId === businessId || d.businessId === "EBS-BIZ-000001");
  const expenses = store2.expenses.filter((e) => e.businessId === businessId || e.businessId === "EBS-BIZ-000001");
  res.json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    products,
    sales,
    devices,
    customers,
    debts,
    expenses,
    totalProducts: products.length
  });
});
apiRouter.get("/live/overview", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const salesList = Array.from(store2.sales.values()).filter(
    (s) => (s.businessId === businessId || s.businessId === "EBS-BIZ-000001") && s.timestamp.startsWith(todayStr) && s.status === "completed"
  );
  let salesRevenue = 0;
  let grossProfit = 0;
  let cashTotal = 0;
  let mobileMoneyTotal = 0;
  let cardBankTotal = 0;
  let debtTotal = 0;
  salesList.forEach((s) => {
    salesRevenue += s.total;
    grossProfit += s.profit;
    if (s.paymentMethod === "cash") cashTotal += s.total;
    else if (["mpesa", "airtel", "tigopesa", "halopesa"].includes(s.paymentMethod)) mobileMoneyTotal += s.total;
    else if (["card", "bank"].includes(s.paymentMethod)) cardBankTotal += s.total;
    else if (s.paymentMethod === "debt") debtTotal += s.total;
  });
  const todayExpenses = store2.expenses.filter(
    (e) => (e.businessId === businessId || e.businessId === "EBS-BIZ-000001") && e.date.startsWith(todayStr)
  );
  const expensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const devices = Array.from(store2.devices.values());
  const activeDevices = devices.filter((d) => d.status === "online" && !d.isRevoked);
  const products = Array.from(store2.products.values());
  const lowStockCount = products.filter((p) => p.active && p.stockQty <= p.minStock).length;
  const totalDebtBalance = Array.from(store2.debts.values()).filter((d) => d.status !== "paid").reduce((sum, d) => sum + d.remainingAmount, 0);
  const recentSales = Array.from(store2.sales.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  res.json({
    businessId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    metrics: {
      salesRevenue,
      grossProfit,
      expensesTotal,
      netProfit: grossProfit - expensesTotal,
      cashTotal,
      mobileMoneyTotal,
      cardBankTotal,
      debtTotal,
      transactionsCount: salesList.length,
      lowStockCount,
      totalDebtBalance
    },
    activeDevicesCount: activeDevices.length,
    activeDevices,
    totalDevicesCount: devices.length,
    recentSales
  });
});
apiRouter.get("/users", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const users = Array.from(store2.users.values()).filter((u) => u.businessId === businessId || u.businessId === "EBS-BIZ-000001").map((u) => ({
    ...u,
    passwordHash: void 0,
    passwordSalt: void 0
  }));
  res.json(users);
});
apiRouter.post("/users", requireAuth, requireRole(["owner", "manager"]), (req, res) => {
  const { businessId, user: currentUser, store: store2 } = extractAuthContext(req);
  const { name, username, phone, role, password, permissions } = req.body;
  const newUserId = `usr-${Date.now()}`;
  const rawPass = password || "Ebs1234!";
  const { hash, salt } = hashPasswordPBKDF2(rawPass);
  const newUser = {
    id: newUserId,
    businessId,
    name,
    username: username || `user_${Date.now().toString().slice(-4)}`,
    role: role || "cashier",
    phone: phone || "0676674705",
    passwordHash: hash,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    mustChangePassword: true,
    permissions: permissions || {
      canSell: true,
      canManageInventory: role === "storekeeper",
      canViewReports: false,
      canManageUsers: false,
      canGiveDiscounts: false,
      canCancelReceipts: false,
      canAccessSettings: false,
      canManageDebts: false,
      canManageSuppliers: false,
      canRecordExpenses: false,
      canExportData: false,
      canViewCostPrice: false
    }
  };
  newUser.passwordSalt = salt;
  store2.users.set(newUserId, newUser);
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId,
    userId: currentUser?.id || "usr-1",
    userName: currentUser?.name || "Owner",
    userRole: currentUser?.role || "owner",
    action: `Kusajili Mfanyakazi Mpya: ${newUser.name}`,
    details: `Nafasi: ${newUser.role.toUpperCase()}, Simu: ${newUser.phone}`,
    entityType: "user",
    entityId: newUser.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  persistStoreToDisk();
  res.json({
    ...newUser,
    passwordHash: void 0,
    passwordSalt: void 0
  });
});
apiRouter.put("/users/:id", requireAuth, requireRole(["owner", "manager"]), (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  const user = store2.users.get(id);
  if (!user) {
    res.status(404).json({ error: "Mtumiaji hakupatikana." });
    return;
  }
  const { name, phone, role, permissions, active } = req.body;
  if (name !== void 0) user.name = name;
  if (phone !== void 0) user.phone = phone;
  if (role !== void 0) user.role = role;
  if (permissions !== void 0) user.permissions = { ...user.permissions, ...permissions };
  if (active !== void 0) user.active = active;
  persistStoreToDisk();
  res.json({
    ...user,
    passwordHash: void 0,
    passwordSalt: void 0
  });
});
apiRouter.post("/users/:id/reset-password", requireAuth, requireRole(["owner"]), (req, res) => {
  const { id } = req.params;
  const { customNewPassword } = req.body;
  const { user: currentUser, store: store2 } = extractAuthContext(req);
  const targetUser = store2.users.get(id);
  if (!targetUser) {
    res.status(404).json({ error: "Mtumiaji hakupatikana." });
    return;
  }
  const newPass = customNewPassword || "Ebs1234!";
  const { hash, salt } = hashPasswordPBKDF2(newPass);
  targetUser.passwordHash = hash;
  targetUser.passwordSalt = salt;
  targetUser.mustChangePassword = true;
  store2.auditLogs.unshift({
    id: `log-${Date.now()}`,
    businessId: targetUser.businessId,
    userId: currentUser?.id || "usr-1",
    userName: currentUser?.name || "Owner",
    userRole: "owner",
    action: `Kubadilisha Neno la Siri la Mfanyakazi`,
    details: `Mmiliki amebadilisha neno la siri la mtumiaji "${targetUser.name}".`,
    entityType: "user",
    entityId: targetUser.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  persistStoreToDisk();
  res.json({ success: true, message: "Neno la siri limebadilishwa kwa ufanisi." });
});
apiRouter.get("/customers", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const customers = Array.from(store2.customers.values()).filter(
    (c) => c.businessId === businessId || c.businessId === "EBS-BIZ-000001"
  );
  res.json(customers);
});
apiRouter.post("/customers", requireAuth, (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const newCust = {
    ...req.body,
    id: req.body.id || `cust-${Date.now()}`,
    businessId,
    currentDebt: req.body.currentDebt || 0,
    totalSpent: req.body.totalSpent || 0,
    transactionCount: req.body.transactionCount || 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  store2.customers.set(newCust.id, newCust);
  persistStoreToDisk();
  res.json(newCust);
});
apiRouter.put("/customers/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  const cust = store2.customers.get(id);
  if (!cust) {
    res.status(404).json({ error: "Mteja hakupatikana." });
    return;
  }
  Object.assign(cust, req.body);
  persistStoreToDisk();
  res.json(cust);
});
apiRouter.get("/debts", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const debts = Array.from(store2.debts.values()).filter(
    (d) => d.businessId === businessId || d.businessId === "EBS-BIZ-000001"
  );
  res.json(debts);
});
apiRouter.post("/debts/:id/pay", requireAuth, (req, res) => {
  const { id } = req.params;
  const { amount, method, reference, note } = req.body;
  const { user, store: store2 } = extractAuthContext(req);
  const debt = store2.debts.get(id);
  if (!debt) {
    res.status(404).json({ error: "Deni halikupatikana." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const payAmount = Number(amount) || 0;
  debt.paidAmount += payAmount;
  debt.remainingAmount = Math.max(0, debt.remainingAmount - payAmount);
  if (debt.remainingAmount === 0) {
    debt.status = "paid";
  } else {
    debt.status = "partial";
  }
  if (!debt.payments) debt.payments = [];
  debt.payments.push({
    id: `pay-${Date.now()}`,
    amount: payAmount,
    date: now,
    method: method || "cash",
    reference,
    receivedBy: user ? user.name : "Cashier",
    note
  });
  const cust = store2.customers.get(debt.customerId);
  if (cust) {
    cust.currentDebt = Math.max(0, cust.currentDebt - payAmount);
  }
  persistStoreToDisk();
  res.json({ success: true, debt });
});
apiRouter.get("/expenses", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const expenses = store2.expenses.filter(
    (e) => e.businessId === businessId || e.businessId === "EBS-BIZ-000001"
  );
  res.json(expenses);
});
apiRouter.post("/expenses", requireAuth, (req, res) => {
  const { businessId, user, deviceId, store: store2 } = extractAuthContext(req);
  const newExp = {
    ...req.body,
    id: req.body.id || `exp-${Date.now()}`,
    businessId,
    deviceId,
    recordedBy: user ? user.name : req.body.recordedBy || "Admin",
    date: req.body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  store2.expenses.unshift(newExp);
  persistStoreToDisk();
  res.json(newExp);
});
apiRouter.delete("/expenses/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  store2.expenses = store2.expenses.filter((e) => e.id !== id);
  persistStoreToDisk();
  res.json({ success: true });
});
apiRouter.get("/suppliers", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const suppliers = Array.from(store2.suppliers.values()).filter(
    (s) => s.businessId === businessId || s.businessId === "EBS-BIZ-000001"
  );
  res.json(suppliers);
});
apiRouter.post("/suppliers", requireAuth, (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const newSup = {
    ...req.body,
    id: req.body.id || `sup-${Date.now()}`,
    businessId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    amountOwed: req.body.amountOwed || 0,
    totalSupplied: req.body.totalSupplied || 0,
    status: req.body.status || "active"
  };
  store2.suppliers.set(newSup.id, newSup);
  persistStoreToDisk();
  res.json(newSup);
});
apiRouter.get("/tables", (req, res) => {
  const { store: store2 } = extractAuthContext(req);
  res.json(Array.from(store2.tables.values()));
});
apiRouter.put("/tables/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { store: store2 } = extractAuthContext(req);
  const table = store2.tables.get(id);
  if (table) {
    Object.assign(table, req.body);
    persistStoreToDisk();
  }
  res.json(table);
});
apiRouter.get("/bar/variances", (req, res) => {
  const { store: store2 } = extractAuthContext(req);
  res.json(store2.barVariances);
});
apiRouter.post("/bar/variances", requireAuth, (req, res) => {
  const { businessId, user, store: store2 } = extractAuthContext(req);
  const newRec = {
    ...req.body,
    id: `var-${Date.now()}`,
    businessId,
    date: req.body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    recordedBy: user ? user.name : "Bar Manager"
  };
  store2.barVariances.unshift(newRec);
  persistStoreToDisk();
  res.json(newRec);
});
apiRouter.get("/cameras", (req, res) => {
  const { store: store2 } = extractAuthContext(req);
  res.json(Array.from(store2.cameras.values()));
});
apiRouter.post("/cameras", requireAuth, requireRole(["owner", "manager"]), (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const newCam = {
    ...req.body,
    id: req.body.id || `cam-${Date.now()}`,
    businessId,
    enabled: true,
    status: "online"
  };
  store2.cameras.set(newCam.id, newCam);
  persistStoreToDisk();
  res.json(newCam);
});
apiRouter.get("/audit-logs", (req, res) => {
  const { businessId, store: store2 } = extractAuthContext(req);
  const logs = store2.auditLogs.filter(
    (a) => a.businessId === businessId || a.businessId === "EBS-BIZ-000001"
  );
  res.json(logs);
});
apiRouter.get("/backup/export", requireAuth, requireRole(["owner"]), (req, res) => {
  const { businessId } = extractAuthContext(req);
  const backupJson = createDatabaseBackup(businessId);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename=ebs_backup_${businessId}_${Date.now()}.json`);
  res.send(backupJson);
});
apiRouter.post("/backup/restore", requireAuth, requireRole(["owner"]), (req, res) => {
  const { backupJson } = req.body;
  if (!backupJson) {
    res.status(400).json({ error: "Data za backup zinahitajika." });
    return;
  }
  const result = restoreDatabaseBackup(backupJson);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json({ success: true, message: result.message });
});

// server.ts
import_dotenv.default.config();
var rootDir = process.cwd();
var aiClient = null;
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  await initCentralDatabase();
  app.use(import_express2.default.json({ limit: "10mb" }));
  app.use("/api", apiRouter);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "EBS - Enterprise Business System", version: "1.3.0" });
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const message = req.body.message || req.body.prompt;
      const businessContext = req.body.businessContext || req.body.businessData || {};
      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message or prompt is required" });
        return;
      }
      const ai = getAiClient();
      if (!ai) {
        const reply2 = generateLocalAiResponse(message, businessContext);
        res.json({ reply: reply2, source: "local-engine" });
        return;
      }
      const systemInstruction = `Wewe ni "EBS AI Msaidizi wa Biashara" \u2014 mtaalamu mshauri wa biashara na mchambuzi wa mifumo ya biashara nchini Tanzania.
Unawasiliana kwa lugha ya Kiswahili fasaha, rahisi na cha kitaalamu cha kibiashara.
Unapewa data halisi za biashara (mauzo ya leo, faida, bidhaa zinazouzika, bidhaa zinazoisha, madeni ya wateja, gharama, na takwimu za Bar/Stoo).
Kanuni zako kuu:
1. Tumia data halisi zilizopo, usitunge namba au takwimu za uongo.
2. Nukuu fedha kwa Shilingi za Tanzania (TZS au Tsh).
3. Toa ushauri wenye tija wa kuongeza faida, kupunguza upotevu, kudhibiti madeni na kuboresha utendaji kazi wa wafanyakazi.
4. Kuhusu Bar na Stoo, tumia lugha ya staha na ya kitaalamu (kama vile "Tofauti ya stoo", "Upotevu/Wastage", "Inahitaji ukaguzi").
5. Jibu kwa muundo nadhifu wenye pointi (bullet points au aya fupi zinazosomeka kirahisi).

Data Halisi za Biashara Hivi Sasa:
${JSON.stringify(businessContext || {}, null, 2)}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      const reply = response.text || generateLocalAiResponse(message, businessContext);
      res.json({ reply, source: "gemini" });
    } catch (error) {
      console.error("AI Error:", error);
      const fallbackReply = generateLocalAiResponse(
        req.body.message || req.body.prompt || "",
        req.body.businessContext || req.body.businessData || {}
      );
      res.json({ reply: fallbackReply, source: "local-fallback", error: error?.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EBS Server is running on http://0.0.0.0:${PORT}`);
  });
}
function generateLocalAiResponse(query, ctx) {
  const q = (query || "").toLowerCase();
  const salesToday = ctx?.salesToday || 0;
  const profitToday = ctx?.profitToday || 0;
  const expensesToday = ctx?.expensesToday || 0;
  const totalDebt = ctx?.totalDebt || 0;
  const lowStockCount = ctx?.lowStockCount || 0;
  const topProducts = ctx?.topProducts || [];
  const mode = ctx?.businessMode || "Duka";
  if (q.includes("mauzo") || q.includes("nimeuza")) {
    return `\u{1F4CA} **Muhtasari wa Mauzo ya Leo:**

\u2022 Jumla ya Mauzo: **TZS ${salesToday.toLocaleString()}**
\u2022 Makadirio ya Faida ya Mauzo: **TZS ${profitToday.toLocaleString()}**
\u2022 Gharama za Leo: **TZS ${expensesToday.toLocaleString()}**
\u2022 Faida Halisi Baada ya Gharama: **TZS ${(profitToday - expensesToday).toLocaleString()}**

\u{1F4A1} *Ushauri:* Hakikisha malipo yote ya fedha taslimu (Cash) na mitandao ya simu yamehesabiwa na kulinganishwa kabla ya kufunga siku.`;
  }
  if (q.includes("bidhaa") || q.includes("inauza") || q.includes("maarufu")) {
    const prodList = topProducts.length > 0 ? topProducts.map((p, i) => `${i + 1}. **${p.name}** \u2014 Imeuzwa: ${p.qty} (${p.revenue ? "TZS " + p.revenue.toLocaleString() : ""})`).join("\n") : "Hakuna miamala ya kutosha bado leo.";
    return `\u{1F3C6} **Bidhaa Zinazoongoza kwa Mauzo:**

${prodList}

\u{1F4A1} *Ushauri:* Hakikisha bidhaa hizi hazikauki stoo kwa kuwasiliana na wasambazaji mapema.`;
  }
  if (q.includes("isha") || q.includes("stoo") || q.includes("stock")) {
    return `\u{1F4E6} **Hali ya Stoo na Bidhaa:**

\u2022 Kuna bidhaa **${lowStockCount}** ambazo zimefikia au ziko chini ya kiwango cha tahadhari (Minimum Stock).
\u2022 Nenda kwenye sehemu ya **Stoo / Bidhaa** kuona orodha na kurekodi manunuzi mapya kutoka kwa wasambazaji.`;
  }
  if (q.includes("madeni") || q.includes("deni") || q.includes("mkopo")) {
    return `\u{1F4B3} **Hali ya Mikopo na Madeni ya Wateja:**

\u2022 Jumla ya madeni ambayo hayajalipwa: **TZS ${totalDebt.toLocaleString()}**

\u{1F4A1} *Ushauri:* Weka ukomo wa mkopo (Credit Limit) kwa wateja wote na watumie vikumbusho vya malipo kwa wateja waliopitisha tarehe ya makubaliano.`;
  }
  if (q.includes("faida") || q.includes("pungua")) {
    return `\u{1F4C8} **Uchambuzi wa Faida na Gharama:**

\u2022 Mauzo: **TZS ${salesToday.toLocaleString()}**
\u2022 Faida Ghafi (Gross Profit): **TZS ${profitToday.toLocaleString()}**
\u2022 Gharama za Uendeshaji: **TZS ${expensesToday.toLocaleString()}**
\u2022 Faida Halisi (Net Profit): **TZS ${(profitToday - expensesToday).toLocaleString()}**

Ili kuongeza faida:
1. Punguza gharama zisizo za lazima za kila siku.
2. Weka mkazo kwenye bidhaa zenye faida kubwa kwa kila kipimo (kama vile Shots/Vinywaji vikali au bidhaa za bei ya jumla).`;
  }
  return `Habari! Mimi ni **EBS AI Msaidizi wa Biashara**. 

Nipo hapa kukusaidia kuchambua mwenendo wa biashara yako (${mode}).

Unaweza kuniuliza maswali kama:
\u2022 *"Nimeuza kiasi gani leo?"*
\u2022 *"Bidhaa gani imeuza zaidi leo?"*
\u2022 *"Ni bidhaa zipi zinakaribia kuisha stoo?"*
\u2022 *"Jumla ya madeni ya wateja ni kiasi gani?"*
\u2022 *"Nipe ushauri wa kuboresha faida ya biashara yangu"*`;
}
startServer();
//# sourceMappingURL=server.cjs.map
