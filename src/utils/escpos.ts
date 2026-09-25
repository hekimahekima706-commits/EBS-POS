/**
 * ESC/POS Thermal Receipt Engine for EBS (Enterprise Business System)
 * Supports 58mm (32 columns) and 80mm (48 columns) thermal paper.
 * Enables direct Bluetooth (Web Bluetooth), USB (WebUSB / WebSerial), RawBT Android Intent,
 * and binary file download (.bin / .escpos) for thermal POS printers.
 */

import { Sale, BusinessProfile } from '../types';
import { PAYMENT_METHOD_INFO, formatDateTime } from './formatters';

export type ThermalPaperWidth = '58mm' | '80mm';

export interface EscPosOptions {
  width?: ThermalPaperWidth;
  openDrawer?: boolean;
  cutPaper?: boolean;
  includeQr?: boolean;
  feedLines?: number;
  viewMode?: 'standard' | 'pharmacy';
}

// Common ESC/POS Command Byte Sequences
export const ESC = 0x1b;
export const FS = 0x1c;
export const GS = 0x1d;
export const LF = 0x0a;
export const CR = 0x0d;

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  /** Initialize / reset printer */
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  /** Set character code table (CP437 default for US/Standard ASCII) */
  setCodeTable(table: number = 0): this {
    this.buffer.push(ESC, 0x74, table);
    return this;
  }

  /** Set text alignment: 0=Left, 1=Center, 2=Right */
  align(alignment: 'left' | 'center' | 'right'): this {
    const code = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, code);
    return this;
  }

  /** Bold text on/off */
  bold(enable: boolean = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  /** Underline text: 0=none, 1=single, 2=thick */
  underline(mode: 0 | 1 | 2 = 1): this {
    this.buffer.push(ESC, 0x2d, mode);
    return this;
  }

  /** Inverted print (white text on black background) */
  invert(enable: boolean = true): this {
    this.buffer.push(GS, 0x42, enable ? 1 : 0);
    return this;
  }

  /**
   * Set text size
   * widthMultiplier: 1-8
   * heightMultiplier: 1-8
   */
  size(widthMultiplier: number = 1, heightMultiplier: number = 1): this {
    const w = Math.min(Math.max(widthMultiplier - 1, 0), 7);
    const h = Math.min(Math.max(heightMultiplier - 1, 0), 7);
    const n = (w << 4) | h;
    this.buffer.push(GS, 0x21, n);
    return this;
  }

  /** Reset text size to 1x normal */
  normalSize(): this {
    return this.size(1, 1);
  }

  /** Append raw line feed */
  newLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  /** Write plain ASCII/CP437 text without line feed */
  text(str: string): this {
    // Sanitize string to standard ASCII printable range
    const clean = sanitizeForThermal(str);
    for (let i = 0; i < clean.length; i++) {
      this.buffer.push(clean.charCodeAt(i) & 0xff);
    }
    return this;
  }

  /** Write text and add line feed */
  line(str: string = ''): this {
    if (str) this.text(str);
    this.buffer.push(LF);
    return this;
  }

  /** Print a horizontal rule / divider */
  divider(char: string = '-', width: number = 32): this {
    const lineStr = char.repeat(Math.max(0, width)).substring(0, width);
    return this.line(lineStr);
  }

  /** Print left and right aligned text on the same line */
  row(left: string, right: string, width: number = 32): this {
    const cleanLeft = sanitizeForThermal(left);
    const cleanRight = sanitizeForThermal(right);

    const availableSpaces = width - cleanLeft.length - cleanRight.length;
    if (availableSpaces >= 1) {
      const formatted = cleanLeft + ' '.repeat(availableSpaces) + cleanRight;
      return this.line(formatted);
    } else {
      // If combined length is too long, wrap left and print right on next or clipped
      if (cleanLeft.length > width - cleanRight.length - 1) {
        const truncatedLeft = cleanLeft.substring(0, width - cleanRight.length - 2) + '.';
        const spaces = width - truncatedLeft.length - cleanRight.length;
        return this.line(truncatedLeft + ' '.repeat(Math.max(1, spaces)) + cleanRight);
      }
      return this.line(cleanLeft).line(' '.repeat(Math.max(0, width - cleanRight.length)) + cleanRight);
    }
  }

  /** Print 3-column table row (e.g. ITEM, QTY, TOTAL) */
  columns3(col1: string, col2: string, col3: string, width: number = 48): this {
    const c1 = sanitizeForThermal(col1);
    const c2 = sanitizeForThermal(col2);
    const c3 = sanitizeForThermal(col3);

    if (width <= 32) {
      // 58mm: compress
      const w1 = 16;
      const w2 = 6;
      const w3 = 10;
      const s1 = c1.padEnd(w1).substring(0, w1);
      const s2 = c2.padStart(w2).substring(0, w2);
      const s3 = c3.padStart(w3).substring(0, w3);
      return this.line(s1 + s2 + s3);
    } else {
      // 80mm: spacious
      const w1 = 26;
      const w2 = 8;
      const w3 = 14;
      const s1 = c1.padEnd(w1).substring(0, w1);
      const s2 = c2.padStart(w2).substring(0, w2);
      const s3 = c3.padStart(w3).substring(0, w3);
      return this.line(s1 + s2 + s3);
    }
  }

  /** Feed n lines */
  feed(lines: number = 3): this {
    this.buffer.push(ESC, 0x64, Math.min(Math.max(lines, 1), 255));
    return this;
  }

  /** Cut paper (partial cut with feed) */
  cut(fullCut: boolean = false): this {
    if (fullCut) {
      this.buffer.push(GS, 0x56, 0x00); // Full cut
    } else {
      this.buffer.push(GS, 0x56, 0x41, 0x03); // Feed 3 lines and cut
    }
    return this;
  }

  /** Pulse cash drawer pin 2 (standard RJ11 / RJ12 cash drawer kick) */
  kickCashDrawer(): this {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  /** Standard ESC/POS 2D QR Code generator */
  qrCode(data: string, moduleSize: number = 6): this {
    if (!data) return this;
    const cleanData = sanitizeForThermal(data);
    const bytes = Array.from(cleanData).map((c) => c.charCodeAt(0) & 0xff);
    const len = bytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // 1. Select QR Model (Model 2)
    this.buffer.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. Set Module Size (size: 1 - 16)
    const mSize = Math.min(Math.max(moduleSize, 3), 10);
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, mSize);
    // 3. Set Error Correction Level (48 = L, 49 = M, 50 = Q, 51 = H)
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // 4. Store Data in QR Symbol Storage Area
    this.buffer.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...bytes);
    // 5. Print QR Symbol
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.newLine();
    return this;
  }

  /** Return final Uint8Array of ESC/POS bytes */
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /** Return raw buffer numbers */
  getRawBuffer(): number[] {
    return this.buffer;
  }
}

/**
 * Strips non-ASCII characters that cause thermal printers to output gibberish.
 * Replaces common Swahili/East African accented characters with plain equivalents.
 */
export function sanitizeForThermal(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•]/g, '*')
    .replace(/[^\x20-\x7E\r\n\t]/g, ' '); // keep standard printable ASCII
}

/**
 * Generates an ESC/POS binary receipt for a given Sale & BusinessProfile.
 */
export function generateEscPosReceipt(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {}
): Uint8Array {
  const widthChars = options.width === '80mm' ? 48 : 32;
  const builder = new EscPosBuilder();

  // 1. Kick Cash Drawer if requested
  if (options.openDrawer) {
    builder.kickCashDrawer();
  }

  builder.init().setCodeTable(0);

  // 2. Business Header (Centered)
  builder.align('center');
  builder.bold(true).size(widthChars === 48 ? 2 : 1, 2);
  builder.line(profile.name || 'EBS ENTERPRISE BIZ');
  builder.normalSize().bold(false);

  if (profile.tagline) {
    builder.line(profile.tagline);
  }

  if (profile.address || profile.mkoa) {
    const loc = [profile.address, profile.wilaya, profile.mkoa].filter(Boolean).join(', ');
    if (loc) builder.line(loc);
  }

  if (profile.phone) {
    builder.line(`Simu: ${profile.phone}`);
  }

  if (profile.tin) {
    builder.line(`TIN: ${profile.tin}` + (profile.vrn ? ` | VRN: ${profile.vrn}` : ''));
  }

  // Pharmacy council reg if pharmacy
  if (options.viewMode === 'pharmacy' && profile.pharmacyCouncilRegNo) {
    builder.line(`Reg: ${profile.pharmacyCouncilRegNo}`);
    if (profile.supervisingPharmacist) {
      builder.line(`Msimamizi: ${profile.supervisingPharmacist}`);
    }
  }

  builder.divider('=', widthChars);

  // 3. Receipt Metadata (Left aligned)
  builder.align('left');
  const receiptTitle =
    options.viewMode === 'pharmacy'
      ? 'HATI YA DAWA NA RISITI'
      : 'RISITI YA MAUZO / CASH SALE';
  builder.bold(true).line(receiptTitle).bold(false);

  builder.row('Risiti No:', sale.invoiceNo, widthChars);
  builder.row('Tarehe:', formatDateTime(sale.timestamp), widthChars);
  builder.row('Keshia:', sale.cashierName, widthChars);

  if (sale.customerName) {
    builder.row('Mteja:', sale.customerName, widthChars);
  }

  if (sale.tableName) {
    builder.row('Meza:', sale.tableName + (sale.waiterName ? ` (${sale.waiterName})` : ''), widthChars);
  }

  if (options.viewMode === 'pharmacy' && (sale.patientName || sale.prescriptionNumber)) {
    if (sale.patientName) builder.row('Mgonjwa:', sale.patientName, widthChars);
    if (sale.prescriptionNumber) builder.row('Cheti No:', sale.prescriptionNumber, widthChars);
  }

  builder.divider('-', widthChars);

  // 4. Line Items Table
  builder.align('left');
  if (widthChars === 48) {
    builder.bold(true);
    builder.columns3('BIDHAA', 'IDADI', 'JUMLA (TZS)', widthChars);
    builder.bold(false);
    builder.divider('-', widthChars);

    for (const item of sale.items) {
      const itemName = item.productName || (item as any).name || 'Bidhaa';
      const unitLabel = item.packagingUnitName ? ` [${item.packagingUnitName}]` : '';
      const fullName = itemName + unitLabel;

      const qtyPrice = `${item.quantity} x ${item.unitPrice.toLocaleString()}`;
      const lineTotal = `${item.total.toLocaleString()}`;

      builder.line(fullName);
      builder.row(`  ${qtyPrice}`, lineTotal, widthChars);

      if (options.viewMode === 'pharmacy' && item.dosageInstruction) {
        builder.line(`  Dozi: ${item.dosageInstruction}`);
      }
      if (item.batchNumber || item.expiryDate) {
        const batchInfo = [
          item.batchNumber ? `Batch: ${item.batchNumber}` : '',
          item.expiryDate ? `Exp: ${item.expiryDate}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        builder.line(`  ${batchInfo}`);
      }
    }
  } else {
    // 58mm (32 chars) compact layout
    for (const item of sale.items) {
      const itemName = item.productName || (item as any).name || 'Bidhaa';
      const unitLabel = item.packagingUnitName ? ` [${item.packagingUnitName}]` : '';
      builder.bold(true).line(itemName + unitLabel).bold(false);

      const qtyPrice = `${item.quantity} x ${item.unitPrice.toLocaleString()}`;
      const lineTotal = `${item.total.toLocaleString()} TZS`;
      builder.row(` ${qtyPrice}`, lineTotal, widthChars);

      if (options.viewMode === 'pharmacy' && item.dosageInstruction) {
        builder.line(` * Dozi: ${item.dosageInstruction}`);
      }
      if (item.batchNumber || item.expiryDate) {
        const batchInfo = [
          item.batchNumber ? `B:${item.batchNumber}` : '',
          item.expiryDate ? `E:${item.expiryDate}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        builder.line(`   ${batchInfo}`);
      }
    }
  }

  builder.divider('-', widthChars);

  // 5. Totals & Tax
  builder.align('left');
  builder.row('Jumla Ndogo:', `${sale.subtotal.toLocaleString()} TZS`, widthChars);

  if (sale.discount && sale.discount > 0) {
    builder.row('Punguzo:', `-${sale.discount.toLocaleString()} TZS`, widthChars);
  }

  if (sale.tax && sale.tax > 0) {
    builder.row('Kodi (VAT):', `${sale.tax.toLocaleString()} TZS`, widthChars);
  }

  builder.bold(true).size(1, 2);
  builder.row('JUMLA KUU:', `${sale.total.toLocaleString()} TZS`, widthChars);
  builder.normalSize().bold(false);

  builder.divider('-', widthChars);

  // 6. Payment Methods
  builder.bold(true).line('MALIPO:').bold(false);
  for (const p of sale.payments) {
    const methodLabel = PAYMENT_METHOD_INFO[p.method]?.label || p.method;
    const ref = p.reference ? ` (${p.reference})` : '';
    builder.row(` ${methodLabel}${ref}`, `${p.amount.toLocaleString()} TZS`, widthChars);
  }

  const totalPaid = (sale as any).amountPaid || sale.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > sale.total) {
    const change = totalPaid - sale.total;
    builder.row(' Kiasi Kilichotolewa:', `${totalPaid.toLocaleString()} TZS`, widthChars);
    builder.row(' Chenji / Baki:', `${change.toLocaleString()} TZS`, widthChars);
  }

  // 7. Pharmacy Health & Safety Advisory
  if (options.viewMode === 'pharmacy') {
    builder.divider('-', widthChars);
    builder.align('left');
    builder.bold(true).line('TAHADHARI YA DAWA:').bold(false);
    builder.line('1. Hifadhi mahali pakavu na baridi chini ya 30C.');
    builder.line('2. Weka mbali kabisa na watoto.');
    builder.line('3. Maliza dozi yote kama ulivyoelekezwa.');
  }

  // 8. Footer & QR Code
  builder.divider('=', widthChars);
  builder.align('center');

  if (options.includeQr !== false) {
    // Generate QR containing invoice verification payload
    const qrPayload = `EBS|INV:${sale.invoiceNo}|TOT:${sale.total}|DATE:${sale.timestamp}|BIZ:${profile.name || ''}`;
    builder.qrCode(qrPayload, widthChars === 48 ? 6 : 5);
  }

  if (profile.receiptFooterText || profile.receiptFooter) {
    const footer = profile.receiptFooterText || profile.receiptFooter || '';
    builder.line(footer);
  } else {
    builder.line('Asante kwa Biashara Yako! Karibu Tena.');
  }

  builder.line('EBS Enterprise POS - Biashara Kidigital');
  builder.line('www.ebsbiz.co.tz');

  // 9. Feed & Cut
  const feedCount = options.feedLines ?? 4;
  builder.feed(feedCount);

  if (options.cutPaper !== false) {
    builder.cut(false);
  }

  return builder.build();
}

/**
 * Generates a human-readable monospace text preview simulating the physical paper roll.
 */
export function generateEscPosTextPreview(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {}
): string {
  const width = options.width === '80mm' ? 48 : 32;
  const lines: string[] = [];

  const center = (text: string) => {
    const clean = sanitizeForThermal(text);
    if (clean.length >= width) return clean.substring(0, width);
    const leftPad = Math.floor((width - clean.length) / 2);
    return ' '.repeat(leftPad) + clean;
  };

  const row = (left: string, right: string) => {
    const cLeft = sanitizeForThermal(left);
    const cRight = sanitizeForThermal(right);
    const spaces = width - cLeft.length - cRight.length;
    if (spaces >= 1) return cLeft + ' '.repeat(spaces) + cRight;
    return cLeft.substring(0, width - cRight.length - 1) + ' ' + cRight;
  };

  lines.push(center('*** RISITI YA KIELEKTRONIKI (ESC/POS) ***'));
  lines.push(center(profile.name || 'EBS ENTERPRISE BIZ'));
  if (profile.tagline) lines.push(center(profile.tagline));
  if (profile.address) lines.push(center(profile.address));
  if (profile.phone) lines.push(center(`Simu: ${profile.phone}`));
  if (profile.tin) lines.push(center(`TIN: ${profile.tin}`));

  lines.push('='.repeat(width));
  lines.push(options.viewMode === 'pharmacy' ? 'HATI YA DAWA NA RISITI' : 'RISITI YA MAUZO');
  lines.push(row('Risiti No:', sale.invoiceNo));
  lines.push(row('Tarehe:', formatDateTime(sale.timestamp)));
  lines.push(row('Keshia:', sale.cashierName));
  if (sale.customerName) lines.push(row('Mteja:', sale.customerName));
  if (sale.tableName) lines.push(row('Meza:', sale.tableName));

  lines.push('-'.repeat(width));
  for (const item of sale.items) {
    const itemName = item.productName || (item as any).name || 'Bidhaa';
    const unit = item.packagingUnitName ? ` [${item.packagingUnitName}]` : '';
    lines.push(itemName + unit);
    lines.push(row(` ${item.quantity} x ${item.unitPrice.toLocaleString()}`, `${item.total.toLocaleString()} TZS`));
  }

  lines.push('-'.repeat(width));
  lines.push(row('Jumla Ndogo:', `${sale.subtotal.toLocaleString()} TZS`));
  if (sale.discount) lines.push(row('Punguzo:', `-${sale.discount.toLocaleString()} TZS`));
  if (sale.tax) lines.push(row('Kodi (VAT):', `${sale.tax.toLocaleString()} TZS`));
  lines.push(row('JUMLA KUU:', `${sale.total.toLocaleString()} TZS`));

  lines.push('-'.repeat(width));
  lines.push('MALIPO:');
  for (const p of sale.payments) {
    const label = PAYMENT_METHOD_INFO[p.method]?.label || p.method;
    lines.push(row(` * ${label}`, `${p.amount.toLocaleString()} TZS`));
  }

  lines.push('='.repeat(width));
  lines.push(center('[ QR CODE: VERIFIED SALE ]'));
  lines.push(center(sale.invoiceNo));
  lines.push(center(profile.receiptFooterText || 'Asante kwa Biashara Yako!'));
  lines.push(center('EBS Enterprise POS Tanzania'));
  lines.push(center('- - - [ KATA KARATASI HAPA ] - - -'));

  return lines.join('\n');
}

/**
 * Downloads receipt as a raw binary file (.bin / .escpos / .prn)
 * Compatible with thermal printer utility tools, USB flash drives, and print spoolers.
 */
export function downloadEscPosFile(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {},
  fileExtension: 'bin' | 'escpos' | 'raw' = 'bin'
): void {
  const bytes = generateEscPosReceipt(sale, profile, options);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `EBS-Receipt-${sale.invoiceNo}.${fileExtension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts ESC/POS bytes into Base64 string.
 */
export function exportReceiptAsBase64(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {}
): string {
  const bytes = generateEscPosReceipt(sale, profile, options);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Triggers Android RawBT Print App URL scheme
 * Allows any Android device with RawBT or Bluetooth Print service to print instantly.
 */
export function openRawBtIntent(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {}
): boolean {
  try {
    const base64Data = exportReceiptAsBase64(sale, profile, options);
    // RawBT standard URL scheme
    const intentUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;
    window.location.href = intentUrl;
    return true;
  } catch (err) {
    console.error('Failed to launch RawBT intent:', err);
    return false;
  }
}

/**
 * Connects and prints directly via Web Bluetooth API (Bluetooth Thermal Printer).
 * Compatible with standard Bluetooth POS receipt printers (Xprinter, Rongta, Goojprt, Munbyn, etc.).
 */
export async function printViaWebBluetooth(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {},
  onStatusUpdate?: (status: string) => void
): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    return {
      success: false,
      error: 'Web Bluetooth haipatikani kwenye kivinjari hiki. Tumia Chrome au Edge kwenye Android/PC au pakua faili la .bin.',
    };
  }

  try {
    onStatusUpdate?.('Inatafuta printa ya Bluetooth iliyo karibu...');

    // Standard POS printer Bluetooth services & common serial/vendor GATT UUIDs
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Receipt Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
        '0000e0ff-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device || !device.gatt) {
      return { success: false, error: 'Hakuna kifaa cha Bluetooth kilichochaguliwa.' };
    }

    onStatusUpdate?.(`Inaunganisha na ${device.name || 'Printa ya Bluetooth'}...`);
    const server = await device.gatt.connect();

    onStatusUpdate?.('Inatafuta huduma ya kuchapa...');
    const services = await server.getPrimaryServices();

    let writeCharacteristic: any = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      } catch {
        continue;
      }
    }

    if (!writeCharacteristic) {
      return {
        success: false,
        error: 'Printa ya Bluetooth imeunganishwa lakini haikupatikana chaneli ya kuandikia (Write characteristic).',
      };
    }

    onStatusUpdate?.('Inatuma data ya risiti (ESC/POS)...');
    const bytes = generateEscPosReceipt(sale, profile, options);

    // Write in chunks (max 100 bytes per chunk to avoid BLE buffer overflow)
    const chunkSize = 100;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      if (writeCharacteristic.writeValueWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // Small pause between chunks
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    onStatusUpdate?.('Risiti imechapwa kwa mafanikio!');
    return { success: true };
  } catch (err: any) {
    console.error('Bluetooth print error:', err);
    return {
      success: false,
      error: err?.message || 'Hitilafu wakati wa kuunganisha na printa ya Bluetooth.',
    };
  }
}

/**
 * Connects and prints directly via WebUSB / WebSerial API (USB POS Thermal Printer).
 */
export async function printViaWebUsbOrSerial(
  sale: Sale,
  profile: BusinessProfile,
  options: EscPosOptions = {},
  onStatusUpdate?: (status: string) => void
): Promise<{ success: boolean; error?: string }> {
  const bytes = generateEscPosReceipt(sale, profile, options);

  // 1. Try Web Serial API (Most reliable for USB-to-Serial / USB POS on Chrome/Edge/Android)
  if (typeof navigator !== 'undefined' && (navigator as any).serial) {
    try {
      onStatusUpdate?.('Inatafuta printa ya USB kupitia Serial Port...');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 }); // standard ESC/POS baud

      onStatusUpdate?.('Inatuma data za ESC/POS kupitia USB...');
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();

      onStatusUpdate?.('Risiti imechapwa kupitia USB kwa mafanikio!');
      return { success: true };
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.warn('WebSerial error, trying WebUSB fallback:', err);
      }
    }
  }

  // 2. Try WebUSB API
  if (typeof navigator !== 'undefined' && (navigator as any).usb) {
    try {
      onStatusUpdate?.('Inatafuta kifaa cha USB Printer...');
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Find OUT endpoint
      const outEndpoint = device.configuration?.interfaces[0]?.alternate?.endpoints?.find(
        (e: any) => e.direction === 'out'
      );
      const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

      onStatusUpdate?.('Inatuma data kwa printa ya USB...');
      await device.transferOut(endpointNumber, bytes);
      await device.close();

      onStatusUpdate?.('Risiti imechapwa kwa mafanikio!');
      return { success: true };
    } catch (err: any) {
      console.error('WebUSB print error:', err);
      return {
        success: false,
        error: err?.message || 'Hitilafu ya USB printer. Hakikisha printa imewashwa na kuchomekwa.',
      };
    }
  }

  return {
    success: false,
    error: 'WebUSB na WebSerial hazipatikani. Tafadhali pakua faili la .bin au tumia printa ya kawaida ya mfumo.',
  };
}
